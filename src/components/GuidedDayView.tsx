import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, Clock } from 'lucide-react';
import { Assignment } from '@/hooks/useAssignments';
import { useAssignmentCompletion } from '@/hooks/useAssignmentCompletion';
import { useToast } from '@/hooks/use-toast';

interface GuidedDayViewProps {
  assignments: Assignment[];
  studentName: string;
  onAssignmentUpdate?: () => void;
}

export function GuidedDayView({ assignments, studentName, onAssignmentUpdate }: GuidedDayViewProps) {
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const { updateAssignmentStatus, isLoading: isUpdating } = useAssignmentCompletion();
  const { toast } = useToast();

  // Filter to only incomplete assignments
  const incompleteAssignments = assignments.filter(
    assignment => assignment.completion_status !== 'completed'
  );

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

      // Move to next assignment or reset
      setIsTimerActive(false);
      setStartTime(null);
      setElapsedTime(0);
      
      if (currentAssignmentIndex < incompleteAssignments.length - 1) {
        setCurrentAssignmentIndex(currentAssignmentIndex + 1);
      }

      onAssignmentUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not complete assignment. Please try again.",
        variant: "destructive"
      });
    }
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
              <Button 
                onClick={handleCompleteAssignment}
                disabled={isUpdating}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Complete Assignment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}