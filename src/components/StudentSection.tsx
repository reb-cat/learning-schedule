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

export const StudentSection = ({ studentName, assignments, loading, onAssignmentAdded }: StudentSectionProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{studentName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{studentName}</h2>
      
      <AlertsMonitoring 
        assignments={assignments}
        studentName={studentName}
      />
      
      <TodaysProgress 
        assignments={assignments}
        studentName={studentName}
      />
      
      <QuickAddForm 
        studentName={studentName}
        onSuccess={onAssignmentAdded}
      />
    </div>
  );
};