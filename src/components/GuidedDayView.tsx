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
  const today = new Date().toLocaleDateString('en-CA'); // Gets actual current date
  console.log('Today date:', today);
  
  // Filter for today's scheduled assignments only
  const todaysScheduledAssignments = assignments.filter(a => 
    a.scheduled_date === today && 
    a.scheduled_block !== null && 
    a.completion_status !== 'completed'
  ).sort((a, b) => (a.scheduled_block || 0) - (b.scheduled_block || 0));
  
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionCountdown, setTransitionCountdown] = useState(5); // 5 seconds only!
  
  const [incompleteAssignments, setIncompleteAssignments] = useState<Assignment[]>(() => 
    todaysScheduledAssignments
  );
  
  const { updateAssignmentStatus, isLoading: isUpdating } = useAssignmentCompletion();
  const { toast } = useToast();

  // Update incompleteAssignments when assignments prop changes
  useEffect(() => {
    const filtered = assignments.filter(a => 
      a.scheduled_date === today && 
      a.scheduled_block !== null && 
      a.completion_status !== 'completed'
    ).sort((a, b) => (a.scheduled_block || 0) - (b.scheduled_block || 0));
    
    setIncompleteAssignments(filtered);
    setCurrentAssignmentIndex(0);
  }, [assignments, today]);

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

  // Transition countdown effect
  useEffect(() => {
    if (showTransition && transitionCountdown > 0) {
      const timer = setTimeout(() => setTransitionCountdown(transitionCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showTransition && transitionCountdown === 0) {
      // Auto-advance
      setShowTransition(false);
      setTransitionCountdown(5);
      moveToNextAssignment();
    }
  }, [showTransition, transitionCountdown]);

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
        // Reset timer
        setIsTimerActive(false);
        setElapsedTime(0);
      } else if (action === 'complete') {
        console.log('Before complete - assignments:', incompleteAssignments.length);
        console.log('Current index:', currentAssignmentIndex);
        const updatedAssignments = incompleteAssignments.filter(a => a.id !== currentAssignment.id);
        console.log('After filter - assignments:', updatedAssignments.length);
        setIncompleteAssignments(updatedAssignments);
        
        // Only show transition if there are more assignments
        if (updatedAssignments.length > 0) {
          setShowTransition(true);
          setTransitionCountdown(5);
        }
        
        setIsTimerActive(false);
        setElapsedTime(0);
      } else {
        // Remove from queue (stuck)
        setIncompleteAssignments(prev => prev.filter(a => a.id !== currentAssignment.id));
        setIsTimerActive(false);
        setElapsedTime(0);
      }
      
      toast({
        title: TEST_MODE_MESSAGES[action],
        description: `${currentAssignment.title}`
      });
      
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

  const getTransitionMessage = (prevSubject: string, nextSubject: string) => {
    if (nextSubject === 'Math' || nextSubject === 'Science') {
      return "Deep breath! Grab your calculator and notebook.";
    } else if (nextSubject === 'Literature' || nextSubject === 'History') {
      return "Quick stretch! Get your reading materials.";
    } else {
      return "Nice work! Get ready for the next one.";
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

  // Show transition screen
  if (showTransition) {
    const nextAssignment = incompleteAssignments[currentAssignmentIndex + 1];
    const currentSubject = currentAssignment?.subject || currentAssignment?.course_name || '';
    const nextSubject = nextAssignment?.subject || nextAssignment?.course_name || '';
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Assignment {currentAssignmentIndex + 1} of {incompleteAssignments.length}
          </p>
        </div>
        
        <Card className="bg-card border border-border">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Assignment Complete!</h3>
            <p className="text-sm text-muted-foreground mb-4">Next in {transitionCountdown}...</p>
            <p className="text-lg text-foreground mb-4">
              {getTransitionMessage(currentSubject, nextSubject)}
            </p>
            <Button 
              onClick={() => setTransitionCountdown(0)}
              className="flex items-center gap-2"
            >
              Ready now!
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