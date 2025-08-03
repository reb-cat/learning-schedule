import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { useAdministrativeNotifications } from '@/hooks/useAdministrativeNotifications';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, DollarSign, FileText, AlertCircle, ExternalLink, ClipboardList } from 'lucide-react';

const ParentTaskDashboard = () => {
  const { notifications, loading, error, markAsCompleted } = useAdministrativeNotifications();
  const { toast } = useToast();

  const handleMarkCompleted = async (id: string, title: string) => {
    try {
      await markAsCompleted(id);
      toast({
        title: "Marked as completed",
        description: `"${title}" has been marked as completed`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark as completed",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fee': return <DollarSign className="h-4 w-4" />;
      case 'form': return <FileText className="h-4 w-4" />;
      case 'permission': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  // Calculate time-aware urgency indicators
  const getUrgencyLevel = (notification: any) => {
    if (!notification.due_date) return 'none';
    
    const dueDate = new Date(notification.due_date);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'overdue';        // Past due
    if (daysUntilDue <= 7) return 'urgent';        // Due within a week
    if (daysUntilDue <= 30) return 'upcoming';     // Due within a month
    return 'future';                               // Due later
  };

  const getDaysAgoText = (completedAt: string) => {
    const completedDate = new Date(completedAt);
    const daysSince = Math.ceil((new Date().getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return 'Yesterday';
    return `${daysSince} days ago`;
  };

  const activeNotifications = notifications.filter(n => !n.completed);
  
  // Filter recently completed items (last 3 days)
  const recentlyCompleted = notifications.filter(n => {
    if (!n.completed || !n.completed_at) return false;
    const completedDate = new Date(n.completed_at);
    const daysSinceCompleted = Math.ceil((new Date().getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCompleted <= 3;
  });

  const hasUrgentItems = activeNotifications.some(n => {
    const urgency = getUrgencyLevel(n);
    return urgency === 'overdue' || urgency === 'urgent';
  });
  
  const getPendingBadgeVariant = () => {
    if (hasUrgentItems) return 'destructive';
    if (activeNotifications.some(n => {
      const urgency = getUrgencyLevel(n);
      return urgency === 'upcoming' || (n.priority === 'medium' && urgency !== 'future');
    })) return 'default';
    return 'secondary';
  };

  // Combine and sort: pending first, then recently completed
  const combinedNotifications = [
    ...activeNotifications.sort((a, b) => {
      const urgencyA = getUrgencyLevel(a);
      const urgencyB = getUrgencyLevel(b);
      const urgencyOrder = { overdue: 0, urgent: 1, upcoming: 2, future: 3, none: 4 };
      return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
    }),
    ...recentlyCompleted.sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
  ];


  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          Loading administrative items...
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-600 p-4">Error: {error}</div>
      );
    }

    return (
      <div className="space-y-4">
        {combinedNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No administrative items
          </div>
        ) : (
          combinedNotifications.map((notification) => {
            const isCompleted = notification.completed;
            return (
              <Card 
                key={notification.id} 
                className={`border-l-4 ${
                  isCompleted 
                    ? 'border-l-gray-300 opacity-60' 
                    : isOverdue(notification.due_date) 
                      ? 'border-l-red-500' 
                      : 'border-l-blue-500'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          getTypeIcon(notification.notification_type)
                        )}
                        <h3 className={`font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                          {notification.title}
                        </h3>
                        {!isCompleted && (
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                        )}
                        <Badge variant="outline" className={isCompleted ? 'text-muted-foreground' : ''}>
                          {notification.student_name}
                        </Badge>
                      </div>
                      
                      {notification.description && !isCompleted && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.description}
                        </p>
                      )}
                      
                      <div className={`flex items-center gap-4 text-sm ${isCompleted ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                        {isCompleted ? (
                          <span>Completed {getDaysAgoText(notification.completed_at!)}</span>
                        ) : (
                          <>
                            <span>Due: {formatDate(notification.due_date)}</span>
                            {notification.amount && (
                              <span className="font-semibold text-green-600">
                                ${notification.amount.toFixed(2)}
                              </span>
                            )}
                            {notification.course_name && (
                              <span>{notification.course_name}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {!isCompleted && (
                      <div className="flex items-center gap-2">
                        {notification.canvas_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(notification.canvas_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkCompleted(notification.id, notification.title)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="parent-tasks">
        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
          <div className="flex items-center justify-between w-full mr-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <span>Parent Task Dashboard</span>
              {hasUrgentItems && <AlertCircle className="h-4 w-4 text-red-500" />}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getPendingBadgeVariant()} className="text-xs">
                {activeNotifications.length} Pending
              </Badge>
              {recentlyCompleted.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {recentlyCompleted.length} Done
                </Badge>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {renderContent()}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ParentTaskDashboard;