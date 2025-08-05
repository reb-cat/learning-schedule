import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Assignment } from '@/hooks/useAssignments';

interface AlertBannerProps {
  abigailAssignments: Assignment[];
  khalilAssignments: Assignment[];
}

export const AlertBanner = ({ abigailAssignments, khalilAssignments }: AlertBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  const getAllCriticalAlerts = () => {
    const allAssignments = [...abigailAssignments, ...khalilAssignments];
    
    // Filter out split assignment parts - only track the parent assignments
    const trackableAssignments = allAssignments.filter(assignment => 
      !assignment.is_split_assignment || !assignment.parent_assignment_id
    );
    
    const blocked = trackableAssignments.filter(assignment => 
      assignment.urgency === 'overdue' && 
      assignment.cognitive_load === 'heavy' &&
      assignment.completion_status !== 'completed'
    );
    
    const atRisk = trackableAssignments.filter(assignment => 
      assignment.urgency === 'due_today' && 
      assignment.cognitive_load === 'heavy' &&
      assignment.completion_status !== 'completed'
    );

    return { blocked, atRisk };
  };

  const { blocked, atRisk } = getAllCriticalAlerts();
  const hasAlerts = blocked.length > 0 || atRisk.length > 0;

  if (!hasAlerts || dismissed) return null;

  return (
    <div className="mb-6">
      {blocked.length > 0 && (
        <Alert className="mb-3 border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            🚨 Immediate Help Needed: {blocked.length} student{blocked.length > 1 ? 's' : ''} blocked on assignments
            <div className="mt-1 text-sm">
              {blocked.map(assignment => (
                <div key={assignment.id}>
                  {assignment.student_name} - {assignment.title} ({assignment.subject})
                </div>
              ))}
            </div>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}
      
      {atRisk.length > 0 && (
        <Alert className="border-orange-500 bg-orange-50">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 font-medium">
            ⚠️ Students At Risk: {atRisk.length} assignment{atRisk.length > 1 ? 's' : ''} due today with high complexity
            <div className="mt-1 text-sm">
              {atRisk.map(assignment => (
                <div key={assignment.id}>
                  {assignment.student_name} - {assignment.title} ({assignment.subject})
                </div>
              ))}
            </div>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}
    </div>
  );
};