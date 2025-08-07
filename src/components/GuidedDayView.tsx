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

const TEST_MODE_MESSAGES = {
  'complete': 'TEST MODE: Marked complete (not saved)',
  'more-time': 'TEST MODE: Need more time (not saved)',
  'stuck': 'TEST MODE: Marked for help (not saved)'
};

export function GuidedDayView({ assignments, studentName, onAssignmentUpdate }: GuidedDayViewProps) {
  const TEST_MODE = true; // Toggle this for testing
  
  console.log('All assignments:', assignments);
  console.log('Today date:', new Date().toISOString().split('T')[0]);
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Just use what's passed in - it's already today's schedule
  const [incompleteAssignments, setIncompleteAssignments] = useState<Assignment[]>(() => 
    assignments.filter(a => a.completion_status !== 'completed')
  );
  
  const { updateAssignmentStatus, isLoading: isUpdating } = useAssignmentCompletion();
  const { toast } = useToast();

  // Update incompleteAssignments when assignments prop changes
  useEffect(() => {
    setIncompleteAssignments(assignments.filter(a => a.completion_status !== 'completed'));
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

  const handleAction = async (action: 'complete' | 'more-time' | 'stuck') => {
    if (!currentAssignment) return;
    
    if (TEST_MODE) {
      console.log(`TEST MODE: ${action} - ${currentAssignment.title}`);
      
      if (action === 'more-time') {
        // Add to end of queue
        setIncompleteAssignments(prev => [...prev.filter(a => a.id !== currentAssignment.id), currentAssignment]);
      } else {
        // Remove from queue (complete or stuck)
        setIncompleteAssignments(prev => prev.filter(a => a.id !== currentAssignment.id));
      }
      
      toast({
        title: TEST_MODE_MESSAGES[action],
        description: `${currentAssignment.title}`
      });
      
      // Reset timer
      setIsTimerActive(false);
      setElapsedTime(0);
      return;
    }
    
    // TODO: Real database logic here when TEST_MODE = false
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