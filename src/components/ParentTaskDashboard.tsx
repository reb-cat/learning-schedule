import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const activeNotifications = notifications.filter(n => !n.completed);
  const completedNotifications = notifications.filter(n => n.completed);
  
  // Calculate urgency indicators
  const hasUrgentItems = activeNotifications.some(n => 
    n.priority === 'high' || isOverdue(n.due_date)
  );
  
  const getPendingBadgeVariant = () => {
    if (hasUrgentItems) return 'destructive';
    if (activeNotifications.some(n => n.priority === 'medium')) return 'default';
    return 'secondary';
  };

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
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Pending ({activeNotifications.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedNotifications.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <div className="space-y-4">
            {activeNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending administrative items
              </div>
            ) : (
              activeNotifications.map((notification) => (
                <Card key={notification.id} className={`border-l-4 ${isOverdue(notification.due_date) ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(notification.notification_type)}
                          <h3 className="font-semibold">{notification.title}</h3>
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <Badge variant="outline">
                            {notification.student_name}
                          </Badge>
                        </div>
                        
                        {notification.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Due: {formatDate(notification.due_date)}</span>
                          {notification.amount && (
                            <span className="font-semibold text-green-600">
                              ${notification.amount.toFixed(2)}
                            </span>
                          )}
                          {notification.course_name && (
                            <span>{notification.course_name}</span>
                          )}
                        </div>
                      </div>
                      
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
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="completed">
          <div className="space-y-4">
            {completedNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed items
              </div>
            ) : (
              completedNotifications.map((notification) => (
                <Card key={notification.id} className="border-l-4 border-l-gray-300 opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <h3 className="font-semibold line-through">{notification.title}</h3>
                          <Badge variant="outline">{notification.student_name}</Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Completed: {formatDate(notification.completed_at)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
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
              <Badge variant="secondary" className="text-xs">
                {completedNotifications.length} Done
              </Badge>
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