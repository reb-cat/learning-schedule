import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertTriangle, Play, RotateCcw } from 'lucide-react';
import { useAssignmentCompletion } from '@/hooks/useAssignmentCompletion';
import { useToast } from '@/hooks/use-toast';

interface StudentBlockDisplayProps {
  block: {
    start: string;
    end: string;
    subject: string;
    block?: number;
    isAssignmentBlock: boolean;
  };
  assignment?: any;
  studentName: string;
  onAssignmentUpdate?: () => void;
  isLoading?: boolean;
}

export function StudentBlockDisplay({ 
  block, 
  assignment, 
  studentName,
  onAssignmentUpdate,
  isLoading: isBlockLoading = false
}: StudentBlockDisplayProps) {
  const [showTransition, setShowTransition] = useState(false);
  const { updateAssignmentStatus, isLoading: isUpdating } = useAssignmentCompletion();
  const { toast } = useToast();

  const handleStatusUpdate = async (status: 'completed' | 'in_progress' | 'stuck') => {
    console.log('handleStatusUpdate called with status:', status);
    
    if (!assignment) {
      console.log('No assignment provided');
      return;
    }

    console.log('Assignment object:', assignment);

    try {
      console.log('About to call updateAssignmentStatus');
      
      // Test direct supabase call
      const { supabase } = await import('@/integrations/supabase/client');
      console.log('Supabase client imported:', !!supabase);
      
      const testResult = await supabase
        .from('assignments')
        .select('id, completion_status')
        .eq('id', assignment.id)
        .single();
      
      console.log('Test query result:', testResult);
      
      await updateAssignmentStatus(assignment, {
        completionStatus: status,
        progressPercentage: status === 'completed' ? 100 : status === 'in_progress' ? 50 : 25,
        actualMinutes: assignment.actual_estimated_minutes || 30,
        difficultyRating: 'medium',
        notes: status === 'stuck' ? 'Student marked as stuck - needs help' : '',
        stuckReason: status === 'stuck' ? 'Student requested help' : undefined
      });

      toast({
        title: status === 'completed' ? "Great work!" : 
               status === 'in_progress' ? "Keep going!" : 
               "Help is on the way!",
        description: status === 'completed' ? "Assignment completed successfully." :
                    status === 'in_progress' ? "We'll reschedule this for tomorrow." :
                    "This task will be prioritized for help."
      });

      // Debounce the update to prevent rapid successive calls
      setTimeout(() => {
        onAssignmentUpdate?.();
      }, 200);
    } catch (error) {
      console.error('Error updating assignment status:', error);
      toast({
        title: "Error",
        description: "Could not update assignment status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'in_progress': return 'bg-blue-50 border-blue-200';
      case 'stuck': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getCognitiveLoadInfo = (load?: string) => {
    switch (load) {
      case 'heavy': return { color: 'bg-red-100 text-red-800', tip: 'Take your time with this one!' };
      case 'medium': return { color: 'bg-yellow-100 text-yellow-800', tip: 'Steady focus needed.' };
      case 'light': return { color: 'bg-green-100 text-green-800', tip: 'This should be quick!' };
      default: return { color: 'bg-gray-100 text-gray-800', tip: '' };
    }
  };

  const needsGrounding = assignment?.cognitive_load === 'heavy' || 
                         ['Math', 'Science'].includes(assignment?.subject);

  if (!block.isAssignmentBlock) {
    return (
      <Card className="bg-muted border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="font-medium text-sm text-muted-foreground">
                {block.start} - {block.end}
              </div>
              <div className="font-semibold text-foreground">
                {block.subject}
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Fixed Class
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assignment) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="font-medium text-sm text-muted-foreground">
                {block.start} - {block.end}
              </div>
              <div className="font-semibold text-foreground">
                Open Study Block
              </div>
              {block.block && (
                <Badge variant="outline" className="text-xs">
                  Block {block.block}
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              Available
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cognitiveInfo = getCognitiveLoadInfo(assignment.cognitive_load);

  return (
    <Card className={`border ${getStatusColor(assignment.completion_status)}`}>
      <CardContent className="p-4 space-y-3">
        {/* Block Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="font-medium text-sm text-muted-foreground">
              {block.start} - {block.end}
            </div>
            <div className="font-semibold text-foreground">
              {assignment.title}
            </div>
            {block.block && (
              <Badge variant="outline" className="text-xs">
                Block {block.block}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cognitiveInfo.color}>
              {assignment.cognitive_load || 'medium'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {assignment.actual_estimated_minutes || 30} min
            </Badge>
          </div>
        </div>

        {/* Subject and Course */}
        <div className="text-sm text-muted-foreground">
          {assignment.subject} {assignment.course_name && `• ${assignment.course_name}`}
        </div>

        {/* Cognitive Load Tip */}
        {cognitiveInfo.tip && (
          <div className="text-sm text-blue-600 italic">
            💡 {cognitiveInfo.tip}
          </div>
        )}

        {/* Grounding Activity Reminder */}
        {needsGrounding && assignment.completion_status !== 'completed' && (
          <Alert className="bg-blue-50 border-blue-200">
            <Play className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Before you start:</strong> Take 2-3 minutes to do some deep breathing or light stretching. This helps your brain get ready for focused work!
            </AlertDescription>
          </Alert>
        )}

        {/* Transition Preview */}
        {showTransition && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Getting ready:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Gather your materials for {assignment.subject}</li>
                <li>Clear your workspace</li>
                <li>Set a timer for {assignment.actual_estimated_minutes || 30} minutes</li>
                <li>Take a deep breath - you've got this!</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {assignment.completion_status !== 'completed' && (
          <div className="flex items-center gap-2 pt-2">
            {!showTransition ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransition(true)}
                className="flex items-center gap-1"
              >
                <Play className="h-3 w-3" />
                Get Ready
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={isUpdating}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-3 w-3" />
                  Done!
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Need More Time button clicked');
                    handleStatusUpdate('in_progress');
                  }}
                  disabled={isUpdating}
                  className="flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  Need More Time
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Stuck button clicked');
                    handleStatusUpdate('stuck');
                  }}
                  disabled={isUpdating}
                  className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Stuck - Need Help
                </Button>
              </>
            )}
          </div>
        )}

        {/* Completed Status */}
        {assignment.completion_status === 'completed' && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Completed! Great work! 🎉
          </div>
        )}
      </CardContent>
    </Card>
  );
}