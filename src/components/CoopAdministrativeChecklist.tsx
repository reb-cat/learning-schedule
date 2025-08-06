import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdministrativeNotifications } from '@/hooks/useAdministrativeNotifications';
import { CheckCircle, FileText, AlertTriangle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { EditableAdministrativeNotification } from './EditableAdministrativeNotification';
import { AddAdministrativeTaskForm } from './AddAdministrativeTaskForm';

interface CoopAdministrativeChecklistProps {
  studentName?: string;
}

export const CoopAdministrativeChecklist: React.FC<CoopAdministrativeChecklistProps> = ({ 
  studentName 
}) => {
  const { notifications, loading, error, markAsCompleted, deleteNotification, addNotification, refetch } = useAdministrativeNotifications();

  const handleToggleComplete = async (id: string, title: string) => {
    try {
      await markAsCompleted(id);
      toast.success(`Marked "${title}" as completed`);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      toast.success('Task deleted successfully');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleAddTask = async (taskData: any) => {
    await addNotification(taskData);
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
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-blue-500 text-white';
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
          <AddAdministrativeTaskForm onAdd={handleAddTask} />
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
              <EditableAdministrativeNotification
                key={notification.id}
                notification={notification}
                onUpdate={refetch}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Completed Tasks - Show collapsed recent completions */}
        {completedNotifications.length > 0 && (
          <details className="space-y-3">
            <summary className="font-medium text-sm text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors">
              Recently Completed ({completedNotifications.length})
            </summary>
            <div className="space-y-2 mt-3">
              {completedNotifications.slice(0, 5).map((notification) => (
                <div 
                  key={notification.id}
                  className="flex items-start gap-3 p-2 rounded-lg border border-border bg-muted/20 text-sm"
                >
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(notification.notification_type)}
                      <span className="font-medium line-through text-muted-foreground text-sm">
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
          </details>
        )}
        
        <AddAdministrativeTaskForm onAdd={handleAddTask} />
      </CardContent>
    </Card>
  );
};