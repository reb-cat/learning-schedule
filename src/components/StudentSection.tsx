import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Assignment } from '@/hooks/useAssignments';

interface StudentSectionProps {
  studentName: string;
  assignments: Assignment[];
  loading: boolean;
  onAssignmentAdded?: () => void;
}

export const StudentSection = ({ studentName, assignments, loading }: StudentSectionProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{studentName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scheduledCount = assignments.filter(a => a.scheduled_date).length;
  const overdueCount = assignments.filter(a => 
    a.due_date && new Date(a.due_date) < new Date() && a.completion_status !== 'completed'
  ).length;
  const stuckCount = assignments.filter(a => a.stuck_reason).length;
  const urgentCount = assignments.filter(a => a.priority === 'high').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{studentName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-muted-foreground">
          {scheduledCount} assignments scheduled
        </p>
        
        {/* Status Alerts */}
        <div className="flex flex-wrap gap-2">
          {overdueCount > 0 && (
            <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded">
              {overdueCount} overdue
            </span>
          )}
          {stuckCount > 0 && (
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
              {stuckCount} stuck
            </span>
          )}
          {urgentCount > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
              {urgentCount} urgent
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};