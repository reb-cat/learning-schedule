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

  const getDynamicPriorityColor = (priority: string, dueDate?: Date) => {
    const today = new Date();
    const due = dueDate || null;
    
    if (due) {
      const daysDiff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Overdue - always red
      if (daysDiff < 0) {
        return 'bg-red-600 text-white';
      }
      
      // Due within 3 days - escalate to orange
      if (daysDiff <= 3) {
        return 'bg-orange-600 text-white';
      }
      
      // Due within 7 days - escalate to amber  
      if (daysDiff <= 7) {
        return 'bg-amber-600 text-white';
      }
    }
    
    // Default priority colors with white text
    switch (priority) {
      case 'high':
        return 'bg-orange-600 text-white';
      case 'medium':
        return 'bg-amber-600 text-white';
      case 'low':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-blue-600 text-white';
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
                  <Badge className={`text-xs ${getDynamicPriorityColor(task.priority, task.dueDate)}`}>
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