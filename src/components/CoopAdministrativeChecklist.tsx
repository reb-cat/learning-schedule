import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdministrativeNotifications } from '@/hooks/useAdministrativeNotifications';
import { CheckCircle, DollarSign, FileText, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CoopAdministrativeChecklistProps {
  studentName?: string;
}

export const CoopAdministrativeChecklist: React.FC<CoopAdministrativeChecklistProps> = ({ 
  studentName 
}) => {
  const { notifications, loading, error, markAsCompleted } = useAdministrativeNotifications();

  const handleToggleComplete = async (id: string, title: string) => {
    try {
      await markAsCompleted(id);
      toast.success(`Marked "${title}" as completed`);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fees':
        return <DollarSign className="h-4 w-4" />;
      case 'forms':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter notifications by student if specified
  const filteredNotifications = studentName 
    ? notifications.filter(n => n.student_name === studentName)
    : notifications;

  const activeNotifications = filteredNotifications.filter(n => !n.completed);
  const completedNotifications = filteredNotifications.filter(n => n.completed);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {studentName ? `${studentName}'s` : ''} Co-op Administrative Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Error Loading Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (filteredNotifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            {studentName ? `${studentName}'s` : ''} Co-op Administrative Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No administrative tasks found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {studentName ? `${studentName}'s` : ''} Co-op Administrative Tasks
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">
              {activeNotifications.length} pending
            </Badge>
            <Badge variant="secondary">
              {completedNotifications.length} completed
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Tasks */}
        {activeNotifications.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Pending Tasks
            </h4>
            {activeNotifications.map((notification) => (
              <div 
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  isOverdue(notification.due_date) 
                    ? 'border-destructive bg-destructive/5' 
                    : 'border-border bg-card'
                }`}
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => handleToggleComplete(notification.id, notification.title)}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(notification.notification_type)}
                        <span className="font-medium">{notification.title}</span>
                        {isOverdue(notification.due_date) && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      {notification.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={getPriorityColor(notification.priority)}>
                        {notification.priority}
                      </Badge>
                      {notification.amount && (
                        <Badge variant="outline">
                          ${notification.amount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Due: {formatDate(notification.due_date)}
                      {notification.course_name && ` • ${notification.course_name}`}
                    </div>
                    
                    {notification.canvas_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => window.open(notification.canvas_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed Tasks */}
        {completedNotifications.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Recently Completed
            </h4>
            {completedNotifications.slice(0, 3).map((notification) => (
              <div 
                key={notification.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30"
              >
                <CheckCircle className="h-5 w-5 text-primary mt-1" />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(notification.notification_type)}
                    <span className="font-medium line-through text-muted-foreground">
                      {notification.title}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Completed: {formatDate(notification.completed_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};