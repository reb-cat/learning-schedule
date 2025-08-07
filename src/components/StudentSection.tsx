import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AlertsMonitoring from './AlertsMonitoring';
import { TodaysProgress } from './TodaysProgress';
import { QuickAddForm } from './QuickAddForm';
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
      <div className="space-y-4">
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
      </div>
    );
  }

  const scheduledCount = assignments.filter(a => a.scheduled_date).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{studentName}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {scheduledCount} assignments scheduled
        </p>
      </CardContent>
    </Card>
  );
};