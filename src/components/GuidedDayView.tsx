import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, Clock, HelpCircle, MoreHorizontal } from 'lucide-react';
import { Assignment } from '@/hooks/useAssignments';
import { useAssignmentCompletion } from '@/hooks/useAssignmentCompletion';
import { useToast } from '@/hooks/use-toast';
import { parseTimeString } from '@/utils/timeAwareness';

interface GuidedDayViewProps {
  assignments: Assignment[];
  studentName: string;
  formattedDate?: string; // yyyy-MM-dd from dashboard
  onAssignmentUpdate?: () => void;
}

const TEST_MODE_MESSAGES = {
  'complete': 'TEST MODE: Marked complete (not saved)',
  'more-time': 'TEST MODE: Need more time (not saved)',
  'stuck': 'TEST MODE: Marked for help (not saved)'
};

export function GuidedDayView({ assignments, studentName, onAssignmentUpdate, formattedDate }: GuidedDayViewProps) {
  const TEST_MODE = true; // Toggle this for testing
  
  console.log('Raw assignments received:', assignments);
  console.log('Assignment dates:', assignments.map(a => ({
    title: a.title,
    scheduled_date: a.scheduled_date,
    scheduled_block: a.scheduled_block
  })));
  console.log('Filtered assignments:', assignments.filter(a => {
    const matches = a.completion_status !== 'completed';
    console.log(`${a.title}: status=${a.completion_status}, matches=${matches}`);
    return matches;
  }));
// Use assignments as authoritative list from parent
console.log('GuidedDay assignments count:', assignments.length);
// Use parent order; filter out completed only
const todaysScheduledAssignments = assignments.filter(a => a.completion_status !== 'completed');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'running' | 'break'>('idle');
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [breakRemaining, setBreakRemaining] = useState(0);
  const [nextAllowedStartAt, setNextAllowedStartAt] = useState<Date | null>(null);
  
  const [incompleteAssignments, setIncompleteAssignments] = useState<Assignment[]>(() => 
    todaysScheduledAssignments
  );
  
  const { updateAssignmentStatus, isLoading: isUpdating } = useAssignmentCompletion();
  const { toast } = useToast();

  // Keep a stable local list in TEST_MODE; sync in real mode
  useEffect(() => {
    if (TEST_MODE) {
      // Initialize once when data arrives (avoid mid-session resets)
      if (incompleteAssignments.length === 0 && assignments.length > 0) {
        const init = assignments.filter(a => a.completion_status !== 'completed');
        setIncompleteAssignments(init);
        setCurrentIndex(0);
      }
      return;
    }
    // In real mode, keep in sync with parent
    const next = assignments.filter(a => a.completion_status !== 'completed');
    setIncompleteAssignments(next);
    setCurrentIndex(0);
  }, [assignments, incompleteAssignments.length, TEST_MODE]);

  const currentAssignment = incompleteAssignments[currentIndex] as any as (Assignment & { _blockStart?: string; _blockEnd?: string; _isAssignmentBlock?: boolean; });

  type GuidedItem = Assignment & {
    _blockStart?: string;
    _blockEnd?: string;
    _isAssignmentBlock?: boolean;
  };

  const toDateAt = (timeStr?: string): Date | null => {
    if (!timeStr || !formattedDate) return null;
    const { hours, minutes } = parseTimeString(timeStr);
    const [y, m, d] = formattedDate.split('-').map(Number);
    const dt = new Date(y, (m - 1), d, hours, minutes, 0, 0);
    return dt;
  };

  const getBlockDurationSec = (item?: GuidedItem): number => {
    if (!item?._blockStart || !item?._blockEnd) return (item as any)?.actual_estimated_minutes ? ((item as any).actual_estimated_minutes as number) * 60 : 20 * 60;
    const s = toDateAt(item._blockStart)!;
    const e = toDateAt(item._blockEnd)!;
    return Math.max(0, Math.floor((e.getTime() - s.getTime()) / 1000));
  };

  // Timer for running phase
  useEffect(() => {
    if (phase !== 'running' || !startedAt) return;
    const id = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          // auto-complete when timer ends
          handleAction('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, startedAt]);

  // Countdown for break phase until next block scheduled start
  useEffect(() => {
    if (phase !== 'break' || !nextAllowedStartAt) return;
    const tick = () => {
      const now = Date.now();
      const remain = Math.max(0, Math.floor((nextAllowedStartAt.getTime() - now) / 1000));
      setBreakRemaining(remain);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, nextAllowedStartAt]);

  const handleStartAssignment = () => {
    const item = currentAssignment as GuidedItem;
    const duration = getBlockDurationSec(item);
    setTimeRemaining(duration);
    setStartedAt(new Date());
    setPhase('running');
  };

  const computeNextAllowedStart = (): Date | null => {
    const next = incompleteAssignments[currentIndex + 1] as any as GuidedItem | undefined;
    if (!next || !next._blockStart) return null;
    const nextStart = toDateAt(next._blockStart);
    return nextStart ?? null;
  };

  const finishAndBreak = () => {
    const nextStart = computeNextAllowedStart();
    if (!nextStart) {
      // last item: remove current and show done
      setIncompleteAssignments(prev => prev.filter((_, i) => i !== currentIndex));
      setPhase('idle');
      setStartedAt(null);
      setTimeRemaining(0);
      if (!TEST_MODE) onAssignmentUpdate?.();
      return;
    }
    setNextAllowedStartAt(nextStart);
    setBreakRemaining(Math.max(0, Math.floor((nextStart.getTime() - Date.now()) / 1000)));
    setPhase('break');
    setStartedAt(null);
    setTimeRemaining(0);
    // remove current from list and keep index stable
    setIncompleteAssignments(prev => prev.filter((_, i) => i !== currentIndex));
  };

  const handleAction = async (action: 'complete' | 'more-time' | 'stuck') => {
    const item = currentAssignment as GuidedItem;
    if (!item) return;
    
    if (TEST_MODE) {
      if (action === 'more-time') {
        // Move current to end of queue
        setIncompleteAssignments(prev => {
          const cur = prev[currentIndex];
          const rest = prev.filter((_, i) => i !== currentIndex);
          return [...rest, cur];
        });
        setPhase('idle');
        setStartedAt(null);
        setTimeRemaining(0);
      } else if (action === 'complete') {
        finishAndBreak();
      } else {
        // Remove from queue (stuck)
        setIncompleteAssignments(prev => prev.filter((_, i) => i !== currentIndex));
        setPhase('idle');
        setStartedAt(null);
        setTimeRemaining(0);
      }
      toast({ title: TEST_MODE_MESSAGES[action], description: `${item.title}` });
      return;
    }
    
    // TODO: Real database logic here when TEST_MODE = false
  };

  const canStartNext = phase === 'break' && (!nextAllowedStartAt || breakRemaining <= 0);

  const startNextBlock = () => {
    if (!canStartNext) return;
    setPhase('idle');
    setNextAllowedStartAt(null);
    setBreakRemaining(0);
    // After removal, the next item is at the same index; no increment needed
    setCurrentIndex((idx) => Math.min(idx, Math.max(0, incompleteAssignments.length - 1)));
    if (!TEST_MODE) onAssignmentUpdate?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!incompleteAssignments.length) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">All assignments complete!</h3>
          <p className="text-muted-foreground">Great work today, {studentName}!</p>
        </CardContent>
      </Card>
    );
  }

  // Break screen
  if (phase === 'break') {
    const next = incompleteAssignments[currentIndex] as any as GuidedItem | undefined;
    const nextLabel = next?.title ?? 'Next block';
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {breakRemaining > 0 ? `Break time: ${formatTime(breakRemaining)}` : 'Break complete'}
          </p>
        </div>
        
        <Card className="bg-card border border-border">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Great work!</h3>
            {next && next._blockStart && (
              <p className="text-sm text-muted-foreground">
                Next starts at {next._blockStart}: {nextLabel}
              </p>
            )}
            <Button 
              onClick={startNextBlock}
              disabled={!canStartNext}
              className="flex items-center gap-2"
            >
              Start next block
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Assignment {currentAssignmentIndex + 1} of {incompleteAssignments.length}
        </p>
      </div>
      
      <Card className="bg-card border border-border">
        <CardHeader>
          <div className="flex flex-col gap-1">
            <div className="text-lg font-semibold text-gray-600">
              {currentAssignment.subject || currentAssignment.course_name || 'Assignment'}
            </div>
            <h3 className="text-2xl font-bold">
              {currentAssignment.title}
            </h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Estimated: {currentAssignment.actual_estimated_minutes || 30} minutes</span>
            {currentAssignment.course_name && (
              <span>Course: {currentAssignment.course_name}</span>
            )}
          </div>

          {/* Instructions section */}
          <div className="bg-muted/50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-foreground mb-2">Instructions:</h4>
            <p className="text-sm text-muted-foreground">
              {currentAssignment.instructions || "Check your textbook or course materials"}
            </p>
          </div>

          {isTimerActive && (
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-foreground">
                {formatTime(elapsedTime)}
              </div>
              <p className="text-sm text-muted-foreground">Time spent</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            {!isTimerActive ? (
              <Button 
                onClick={handleStartAssignment}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Assignment
              </Button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Button 
                  onClick={() => handleAction('complete')}
                  disabled={isUpdating}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </Button>
                <Button 
                  onClick={() => handleAction('more-time')}
                  disabled={isUpdating}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Clock className="h-4 w-4" />
                  Need More Time
                </Button>
                <Button 
                  onClick={() => handleAction('stuck')}
                  disabled={isUpdating}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  <HelpCircle className="h-4 w-4" />
                  Stuck - Need Help
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}