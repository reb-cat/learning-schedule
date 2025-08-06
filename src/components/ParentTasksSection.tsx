import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Clock, AlertTriangle } from "lucide-react";

interface ParentTask {
  id: string;
  title: string;
  amount?: number;
  dueDate?: Date;
  priority: 'high' | 'medium' | 'low';
  courseName?: string;
}

interface ParentTasksSectionProps {
  tasks: ParentTask[];
  onTaskComplete?: (taskId: string) => void;
}

export function ParentTasksSection({ tasks, onTaskComplete }: ParentTasksSectionProps) {
  if (tasks.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'secondary'; // Changed from destructive to secondary for admin tasks
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '';
    return `$${amount.toFixed(2)}`;
  };

  const formatDueDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-card border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5" />
          Parent Tasks
          <Badge variant="outline" className="ml-2">
            {tasks.length} items
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tasks that require parent/guardian action
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{task.title}</span>
                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
                
                {task.courseName && (
                  <p className="text-sm text-muted-foreground mb-1">{task.courseName}</p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {task.amount && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatAmount(task.amount)}
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {formatDueDate(task.dueDate)}
                    </div>
                  )}
                </div>
              </div>
              
              {onTaskComplete && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onTaskComplete(task.id)}
                >
                  Mark Complete
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}