import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertTriangle, Play } from 'lucide-react';
import { useAssignmentCompletion } from '@/hooks/useAssignmentCompletion';
import { useToast } from '@/hooks/use-toast';
import { StatusChip } from '@/components/StatusChip';

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
  
  
  
  const { updateAssignmentStatus, isLoading: isUpdating } = useAssignmentCompletion();
  const { toast } = useToast();

  const handleStatusUpdate = async (status: 'completed' | 'in_progress' | 'stuck') => {
    if (!assignment) return;

    try {
      await updateAssignmentStatus(assignment, {
        completionStatus: status,
        progressPercentage: status === 'completed' ? 100 : status === 'in_progress' ? 50 : 25,
        actualMinutes: assignment.actual_estimated_minutes || 30,
        difficultyRating: 'medium',
        notes: status === 'stuck' ? 'Student marked as stuck - needs help' : '',
        stuckReason: status === 'stuck' ? 'Student requested help' : undefined
      });

      // Check if assignment is urgent (due today or overdue)
      const isUrgent = assignment.due_date && 
        new Date(assignment.due_date) <= new Date(new Date().setHours(23, 59, 59, 999));

      toast({
        title: status === 'completed' ? "Great work!" : 
               status === 'in_progress' ? "Keep going!" : 
               "Help is on the way!",
        description: status === 'completed' ? "Assignment completed successfully." :
                    status === 'in_progress' ? (isUrgent 
                      ? "We'll reschedule this urgent assignment as soon as possible." 
                      : "We'll reschedule this for tomorrow.") :
                    "This task will be prioritized for help."
      });

      onAssignmentUpdate?.();
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

  const getBlockType = (): 'assignment' | 'co-op' | 'movement' | 'lunch' | 'travel' | 'bible' | 'prep' => {
    if (!block.isAssignmentBlock) {
      const subject = block.subject.toLowerCase();
      if (subject.includes('movement')) return 'movement';
      if (subject.includes('lunch')) return 'lunch';
      if (subject.includes('co-op')) return 'co-op';
      if (subject.includes('travel')) return 'travel';
      if (subject.includes('bible')) return 'bible';
      if (subject.includes('prep')) return 'prep';
      return 'co-op'; // Default for non-assignment blocks
    }
    return 'assignment';
  };

  if (!block.isAssignmentBlock) {
    const blockType = getBlockType();
    return (
      <Card className="border-border">
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
            <StatusChip type={blockType} size="sm" />
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
            <StatusChip type="assignment" size="sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const cognitiveInfo = getCognitiveLoadInfo(assignment.cognitive_load);

  return (
    <>
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
            <StatusChip 
              type="assignment" 
              status={assignment.completion_status === 'completed' ? 'completed' : 
                     assignment.completion_status === 'in_progress' ? 'need-more-time' :
                     assignment.completion_status === 'stuck' ? 'stuck' : 'pending'} 
              size="sm" 
            />
            <span className="text-xs text-muted-foreground">
              {assignment.actual_estimated_minutes || 30} min
            </span>
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

        {/* Action Buttons - Only for quick status updates */}
        {assignment.completion_status !== 'completed' && (
          <div className="flex items-center gap-2 pt-2">
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
              onClick={() => handleStatusUpdate('in_progress')}
              disabled={isUpdating}
              className="flex items-center gap-1"
            >
              <Clock className="h-3 w-3" />
              Need More Time
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusUpdate('stuck')}
              disabled={isUpdating}
              className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              <AlertTriangle className="h-3 w-3" />
              Stuck - Need Help
            </Button>
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
    </>
  );
}