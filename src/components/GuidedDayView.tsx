import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, Clock, HelpCircle, MoreHorizontal } from 'lucide-react';
import { Assignment } from '@/hooks/useAssignments';
import { useAssignmentCompletion } from '@/hooks/useAssignmentCompletion';
import { useToast } from '@/hooks/use-toast';

interface GuidedDayViewProps {
  assignments: Assignment[];
  studentName: string;
  onAssignmentUpdate?: () => void;
}

export function GuidedDayView({ assignments, studentName, onAssignmentUpdate }: GuidedDayViewProps) {
  console.log('All assignments:', assignments);
  console.log('Today date:', new Date().toISOString().split('T')[0]);
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Make incompleteAssignments a state variable
  const [incompleteAssignments, setIncompleteAssignments] = useState<Assignment[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    return assignments
      .filter(a => a.completion_status !== 'completed' && a.scheduled_date === today)
      .sort((a, b) => (a.scheduled_block || 0) - (b.scheduled_block || 0));
  });
  
  const { updateAssignmentStatus, isLoading: isUpdating } = useAssignmentCompletion();
  const { toast } = useToast();

  // Update incompleteAssignments when assignments prop changes
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setIncompleteAssignments(assignments
      .filter(a => a.completion_status !== 'completed' && a.scheduled_date === today)
      .sort((a, b) => (a.scheduled_block || 0) - (b.scheduled_block || 0))
    );
    setCurrentAssignmentIndex(0);
  }, [assignments]);

  const currentAssignment = incompleteAssignments[currentAssignmentIndex];

  // Simple timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, startTime]);

  const handleStartAssignment = () => {
    setIsTimerActive(true);
    setStartTime(new Date());
    setElapsedTime(0);
  };

  const handleCompleteAssignment = async () => {
    if (!currentAssignment) return;

    try {
      await updateAssignmentStatus(currentAssignment, {
        completionStatus: 'completed',
        progressPercentage: 100,
        actualMinutes: Math.ceil(elapsedTime / 60),
        difficultyRating: 'medium',
        notes: `Completed in guided day mode in ${Math.ceil(elapsedTime / 60)} minutes`
      });

      toast({
        title: "Great work!",
        description: "Assignment completed successfully."
      });

      moveToNextAssignment();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not complete assignment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleNeedMoreTime = async () => {
    if (!currentAssignment) return;

    try {
      await updateAssignmentStatus(currentAssignment, {
        completionStatus: 'in_progress',
        progressPercentage: 50,
        actualMinutes: Math.ceil(elapsedTime / 60),
        difficultyRating: 'medium',
        notes: `Needs more time - paused after ${Math.ceil(elapsedTime / 60)} minutes`
      });

      toast({
        title: "No problem!",
        description: "We'll come back to this later"
      });

      // Add current assignment to end of array and move to next
      setIncompleteAssignments([...incompleteAssignments, currentAssignment]);
      moveToNextAssignment();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update assignment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleStuckNeedHelp = async () => {
    if (!currentAssignment) return;

    try {
      await updateAssignmentStatus(currentAssignment, {
        completionStatus: 'stuck',
        progressPercentage: 25,
        actualMinutes: Math.ceil(elapsedTime / 60),
        difficultyRating: 'hard',
        notes: `Student stuck - needs help after ${Math.ceil(elapsedTime / 60)} minutes`
      });

      toast({
        title: "Got it!",
        description: "Marked for help - keep going!"
      });

      moveToNextAssignment();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update assignment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const moveToNextAssignment = () => {
    setIsTimerActive(false);
    setStartTime(null);
    setElapsedTime(0);
    
    if (currentAssignmentIndex < incompleteAssignments.length - 1) {
      setCurrentAssignmentIndex(currentAssignmentIndex + 1);
    }

    onAssignmentUpdate?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Assignment {currentAssignmentIndex + 1} of {incompleteAssignments.length}
        </p>
      </div>
      
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{currentAssignment.title}</span>
            <Badge variant="secondary">
              {currentAssignment.subject}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Estimated: {currentAssignment.actual_estimated_minutes || 30} minutes</span>
            {currentAssignment.course_name && (
              <span>Course: {currentAssignment.course_name}</span>
            )}
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
                  onClick={handleCompleteAssignment}
                  disabled={isUpdating}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </Button>
                <Button 
                  onClick={handleNeedMoreTime}
                  disabled={isUpdating}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Clock className="h-4 w-4" />
                  Need More Time
                </Button>
                <Button 
                  onClick={handleStuckNeedHelp}
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