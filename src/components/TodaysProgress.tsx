import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Assignment } from '@/hooks/useAssignments';

interface TodaysProgressProps {
  assignments: Assignment[];
  studentName: string;
}

export const TodaysProgress = ({ assignments, studentName }: TodaysProgressProps) => {
  const today = new Date().toISOString().split('T')[0];
  
  const todaysAssignments = assignments.filter(assignment => {
    if (!assignment.due_date) return false;
    const dueDate = new Date(assignment.due_date).toISOString().split('T')[0];
    return dueDate === today;
  });

  const completedToday = todaysAssignments.filter(a => a.urgency === 'upcoming').length;
  const dueToday = todaysAssignments.length;
  const overdue = assignments.filter(a => a.urgency === 'overdue').length;

  const totalTimeToday = todaysAssignments.reduce((total, assignment) => {
    return total + (assignment.estimated_time_minutes || 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Today's Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{completedToday}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{dueToday}</div>
            <div className="text-xs text-muted-foreground">Due Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-destructive">{overdue}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
        </div>

        {totalTimeToday > 0 && (
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-sm text-muted-foreground">
              Estimated time today: {Math.round(totalTimeToday / 60)}h {totalTimeToday % 60}m
            </div>
          </div>
        )}

        {todaysAssignments.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Today's Tasks:</h4>
            {todaysAssignments.slice(0, 3).map(assignment => (
              <div key={assignment.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{assignment.title}</span>
                <div className="flex items-center gap-1">
                  {assignment.canvas_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(assignment.canvas_url, '_blank')}
                      className="h-6 w-6 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  {assignment.urgency === 'overdue' ? (
                    <AlertCircle className="h-3 w-3 text-destructive" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-muted-foreground" />
                  )}
                  <Badge variant={assignment.cognitive_load === 'heavy' ? 'destructive' : 'secondary'} className="text-xs">
                    {assignment.subject}
                  </Badge>
                </div>
              </div>
            ))}
            {todaysAssignments.length > 3 && (
              <div className="text-xs text-muted-foreground text-center">
                +{todaysAssignments.length - 3} more tasks
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};