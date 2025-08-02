import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdministrativeNotifications } from '@/hooks/useAdministrativeNotifications';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, DollarSign, FileText, AlertCircle, ExternalLink } from 'lucide-react';

const AdministrativePanel = () => {
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

  const filterByType = (type: string) => {
    return notifications.filter(n => n.notification_type === type);
  };

  const activeNotifications = notifications.filter(n => !n.completed);
  const completedNotifications = notifications.filter(n => n.completed);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parent Administrative Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            Loading administrative items...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parent Administrative Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Parent Administrative Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({activeNotifications.length})</TabsTrigger>
            <TabsTrigger value="fees">Fees ({filterByType('fee').filter(n => !n.completed).length})</TabsTrigger>
            <TabsTrigger value="forms">Forms ({filterByType('form').filter(n => !n.completed).length})</TabsTrigger>
            <TabsTrigger value="permissions">Permissions ({filterByType('permission').filter(n => !n.completed).length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedNotifications.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
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
          
          <TabsContent value="fees">
            <div className="space-y-4">
              {filterByType('fee').filter(n => !n.completed).map((notification) => (
                <Card key={notification.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4" />
                          <h3 className="font-semibold">{notification.title}</h3>
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <Badge variant="outline">{notification.student_name}</Badge>
                        </div>
                        
                        {notification.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span>Due: {formatDate(notification.due_date)}</span>
                          {notification.amount && (
                            <span className="font-bold text-green-600 text-lg">
                              ${notification.amount.toFixed(2)}
                            </span>
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
                          Paid
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="forms">
            <div className="space-y-4">
              {filterByType('form').filter(n => !n.completed).map((notification) => (
                <Card key={notification.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4" />
                          <h3 className="font-semibold">{notification.title}</h3>
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <Badge variant="outline">{notification.student_name}</Badge>
                        </div>
                        
                        {notification.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.description}
                          </p>
                        )}
                        
                        <div className="text-sm text-muted-foreground">
                          Due: {formatDate(notification.due_date)}
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
                          Submitted
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="permissions">
            <div className="space-y-4">
              {filterByType('permission').filter(n => !n.completed).map((notification) => (
                <Card key={notification.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <h3 className="font-semibold">{notification.title}</h3>
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <Badge variant="outline">{notification.student_name}</Badge>
                        </div>
                        
                        {notification.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.description}
                          </p>
                        )}
                        
                        <div className="text-sm text-muted-foreground">
                          Due: {formatDate(notification.due_date)}
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
                          Approved
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
      </CardContent>
    </Card>
  );
};

export default AdministrativePanel;