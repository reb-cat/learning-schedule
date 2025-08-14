import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, CheckCircle, Clock, HelpCircle, ArrowRight, Coffee, Activity } from 'lucide-react';
import { Assignment } from '@/hooks/useAssignments';
import { useAssignmentCompletion } from '@/hooks/useAssignmentCompletion';
import { useToast } from '@/hooks/use-toast';
import { parseTimeString } from '@/utils/timeAwareness';
import { StatusChip } from '@/components/StatusChip';

interface EnhancedGuidedDayViewProps {
  assignments: Assignment[];
  studentName: string;
  formattedDate?: string;
  onAssignmentUpdate?: () => void;
}

interface BlockWithAssignment extends Assignment {
  _blockStart?: string;
  _blockEnd?: string;
  _isAssignmentBlock?: boolean;
  _blockType?: 'assignment' | 'co-op' | 'movement' | 'lunch' | 'travel' | 'bible' | 'prep';
}

export function EnhancedGuidedDayView({ 
  assignments, 
  studentName, 
  onAssignmentUpdate, 
  formattedDate 
}: EnhancedGuidedDayViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'running' | 'early-completion-choice' | 'earned-break'>('idle');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [earnedBreakTime, setEarnedBreakTime] = useState(0);
  const [blocks, setBlocks] = useState<BlockWithAssignment[]>([]);

  const { updateAssignmentStatus, isLoading: isUpdating } = useAssignmentCompletion();
  const { toast } = useToast();

  // Initialize blocks from assignments
  useEffect(() => {
    const incompleteBlocks = assignments.filter(a => a.completion_status !== 'completed');
    setBlocks(incompleteBlocks as BlockWithAssignment[]);
    setCurrentIndex(0);
  }, [assignments]);

  const currentBlock = blocks[currentIndex];

  const getBlockDuration = (block: BlockWithAssignment): number => {
    if (block?._blockStart && block?._blockEnd) {
      const start = parseTimeFromBlock(block._blockStart);
      const end = parseTimeFromBlock(block._blockEnd);
      return (end.getTime() - start.getTime()) / 1000;
    }
    return (block?.actual_estimated_minutes || 30) * 60;
  };

  const parseTimeFromBlock = (timeStr: string): Date => {
    if (!formattedDate) return new Date();
    const { hours, minutes } = parseTimeString(timeStr);
    const [year, month, day] = formattedDate.split('-').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  const getBlockType = (block: BlockWithAssignment): 'assignment' | 'co-op' | 'movement' | 'lunch' | 'travel' | 'bible' | 'prep' => {
    if (block._blockType) return block._blockType;
    if (block.subject?.toLowerCase().includes('movement')) return 'movement';
    if (block.subject?.toLowerCase().includes('lunch')) return 'lunch';
    if (block.subject?.toLowerCase().includes('co-op')) return 'co-op';
    if (block.subject?.toLowerCase().includes('travel')) return 'travel';
    if (block.subject?.toLowerCase().includes('bible')) return 'bible';
    if (block.subject?.toLowerCase().includes('prep')) return 'prep';
    return 'assignment';
  };

  const isBinaryBlock = (blockType: string): boolean => {
    return ['movement', 'lunch', 'travel'].includes(blockType);
  };

  // Countdown timer
  useEffect(() => {
    if (phase !== 'running' && phase !== 'earned-break') return;
    
    const interval = setInterval(() => {
      if (phase === 'running') {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time expired - show completion options
            setPhase('early-completion-choice');
            return 0;
          }
          return prev - 1;
        });
      } else if (phase === 'earned-break') {
        setEarnedBreakTime(prev => {
          if (prev <= 1) {
            handleNextBlock();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const handleStartBlock = () => {
    const duration = getBlockDuration(currentBlock);
    setTimeRemaining(duration);
    setTotalTime(duration);
    setPhase('running');
  };

  const handleComplete = async () => {
    const blockType = getBlockType(currentBlock);
    
    if (isBinaryBlock(blockType)) {
      // Binary blocks: just mark complete and move on
      await markBlockComplete();
      handleNextBlock();
    } else {
      // Assignment blocks: offer choice if finished early
      if (timeRemaining > 60 && phase === 'running') { // More than 1 minute left
        setPhase('early-completion-choice');
      } else {
        await markBlockComplete();
        handleNextBlock();
      }
    }
  };

  const markBlockComplete = async () => {
    if (!currentBlock) return;
    
    try {
      await updateAssignmentStatus(currentBlock, {
        status: 'completed',
        timeSpent: Math.ceil((totalTime - timeRemaining) / 60),
        difficulty: 'medium',
        progress: 100
      });
      
      toast({
        title: "Great work!",
        description: `${currentBlock.title} completed successfully.`
      });
      
      onAssignmentUpdate?.();
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: "Error",
        description: "Could not update status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleNeedMoreTime = async () => {
    if (!currentBlock) return;
    
    try {
      await updateAssignmentStatus(currentBlock, {
        status: 'in_progress',
        timeSpent: Math.ceil((totalTime - timeRemaining) / 60),
        difficulty: 'medium',
        progress: 50
      });
      
      // Move to end of queue for rescheduling
      setBlocks(prev => {
        const remaining = prev.slice(currentIndex + 1);
        const current = prev[currentIndex];
        return [...remaining, current];
      });
      
      toast({
        title: "Assignment rescheduled",
        description: "We'll come back to this later today."
      });
      
      setPhase('idle');
      onAssignmentUpdate?.();
    } catch (error) {
      console.error('Error rescheduling:', error);
    }
  };

  const handleStuck = async () => {
    if (!currentBlock) return;
    
    try {
      await updateAssignmentStatus(currentBlock, {
        status: 'stuck',
        timeSpent: Math.ceil((totalTime - timeRemaining) / 60),
        difficulty: 'hard',
        progress: 25,
        notes: 'Student marked as stuck - needs help'
      });
      
      // Remove from queue
      setBlocks(prev => prev.filter((_, i) => i !== currentIndex));
      
      toast({
        title: "Help is on the way!",
        description: "This task has been flagged for assistance."
      });
      
      setPhase('idle');
      onAssignmentUpdate?.();
    } catch (error) {
      console.error('Error marking stuck:', error);
    }
  };

  const handleContinueToNext = async () => {
    await markBlockComplete();
    handleNextBlock();
  };

  const handleTakeEarnedBreak = async () => {
    await markBlockComplete();
    setEarnedBreakTime(timeRemaining);
    setPhase('earned-break');
  };

  const handleNextBlock = () => {
    setBlocks(prev => prev.filter((_, i) => i !== currentIndex));
    setPhase('idle');
    setTimeRemaining(0);
    setTotalTime(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    if (totalTime === 0) return 0;
    return ((totalTime - timeRemaining) / totalTime) * 100;
  };

  // All blocks completed
  if (!blocks.length) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold mb-2">All blocks complete!</h3>
          <p className="text-muted-foreground">Amazing work today, {studentName}!</p>
        </CardContent>
      </Card>
    );
  }

  // Earned break phase
  if (phase === 'earned-break') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-8 text-center space-y-4">
          <div className="text-4xl mb-4">☕</div>
          <h3 className="text-xl font-semibold text-green-800">Earned Break Time!</h3>
          <p className="text-green-700">You finished early - enjoy your reward!</p>
          <div className="text-3xl font-mono font-bold text-green-600">
            {formatTime(earnedBreakTime)}
          </div>
          <p className="text-sm text-green-600">
            Until next block starts automatically
          </p>
        </CardContent>
      </Card>
    );
  }

  const blockType = getBlockType(currentBlock);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Block {currentIndex + 1} of {blocks.length}
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusChip type={blockType} />
                {currentBlock.subject && (
                  <span className="text-sm text-muted-foreground">
                    {currentBlock.subject}
                  </span>
                )}
              </div>
              <CardTitle className="text-xl">
                {currentBlock.title}
              </CardTitle>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              {currentBlock._blockStart && currentBlock._blockEnd && (
                <div>{currentBlock._blockStart} - {currentBlock._blockEnd}</div>
              )}
              <div>{Math.ceil(getBlockDuration(currentBlock) / 60)} minutes</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Timer and Progress */}
          {phase === 'running' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Time Remaining</span>
                <span className="text-2xl font-mono font-bold text-foreground">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <Progress value={getProgress()} className="h-2" />
            </div>
          )}

          {/* Instructions */}
          {currentBlock.instructions && (
            <Alert>
              <AlertDescription>
                {currentBlock.instructions}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {phase === 'idle' && (
              <Button 
                onClick={handleStartBlock}
                className="flex items-center gap-2"
                size="lg"
              >
                <Play className="h-4 w-4" />
                Start {isBinaryBlock(blockType) ? 'Block' : 'Assignment'}
              </Button>
            )}

            {phase === 'running' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button 
                  onClick={handleComplete}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Done!
                </Button>
                <Button 
                  onClick={handleNeedMoreTime}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Need More Time
                </Button>
                <Button 
                  onClick={handleStuck}
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <HelpCircle className="h-4 w-4" />
                  Need Help
                </Button>
              </div>
            )}

            {phase === 'early-completion-choice' && (
              <div className="space-y-3">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Great job finishing early! What would you like to do?
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button 
                    onClick={handleContinueToNext}
                    className="flex items-center gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Continue to Next Block
                  </Button>
                  <Button 
                    onClick={handleTakeEarnedBreak}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Coffee className="h-4 w-4" />
                    Take Earned Break ({formatTime(timeRemaining)})
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}