import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, ExternalLink, CheckCircle } from 'lucide-react';
import { Assignment } from '@/hooks/useAssignments';

interface AlertsMonitoringProps {
  assignments: Assignment[];
  studentName: string;
  onMarkResolved?: (assignmentId: string) => void;
  onViewAssignment?: (assignment: Assignment) => void;
}

interface AlertAssignment extends Assignment {
  status?: 'blocked' | 'at_risk';
  help_requested_at?: string;
}

const AlertsMonitoring: React.FC<AlertsMonitoringProps> = ({
  assignments,
  studentName,
  onMarkResolved,
  onViewAssignment
}) => {
  // For now, simulate blocked/at-risk status based on urgency and timing
  const getAlertsFromAssignments = (assignments: Assignment[]): AlertAssignment[] => {
    const now = new Date();
    return assignments.map(assignment => {
      const alert: AlertAssignment = { ...assignment };
      
      // Simulate blocked status for overdue assignments
      if (assignment.urgency === 'overdue') {
        alert.status = 'blocked';
        alert.help_requested_at = new Date(now.getTime() - Math.random() * 60 * 60 * 1000).toISOString();
      }
      
      // Simulate at-risk status for due today/soon with heavy cognitive load
      if ((assignment.urgency === 'due_today' || assignment.urgency === 'due_soon') && 
          assignment.cognitive_load === 'heavy') {
        alert.status = 'at_risk';
      }
      
      return alert;
    }).filter(a => a.status === 'blocked' || a.status === 'at_risk');
  };

  const alerts = getAlertsFromAssignments(assignments);
  const blockedAlerts = alerts.filter(a => a.status === 'blocked');
  const atRiskAlerts = alerts.filter(a => a.status === 'at_risk');

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - then.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  if (alerts.length === 0) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            All Clear
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {studentName} has no assignments requiring immediate attention.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Blocked Assignments - Critical */}
      {blockedAlerts.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Help Needed - Blocked Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {blockedAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-destructive/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="destructive" className="text-xs">BLOCKED</Badge>
                    <span className="font-medium text-sm">
                      ⚠️ {studentName} needs help with {alert.subject || 'Assignment'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.title}</p>
                  {alert.help_requested_at && (
                    <p className="text-xs text-destructive mt-1">
                      Blocked {getTimeAgo(alert.help_requested_at)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewAssignment?.(alert)}
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onMarkResolved?.(alert.id)}
                    className="text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolved
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* At-Risk Assignments - Warning */}
      {atRiskAlerts.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Clock className="h-5 w-5" />
              At Risk - Needs Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRiskAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                      AT RISK
                    </Badge>
                    <span className="font-medium text-sm">
                      ⏰ {studentName} at risk of missing {alert.subject || 'assignment'} deadline
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.title}</p>
                  {alert.due_date && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Due: {new Date(alert.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewAssignment?.(alert)}
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onMarkResolved?.(alert.id)}
                    className="text-xs"
                  >
                    Monitor
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AlertsMonitoring;