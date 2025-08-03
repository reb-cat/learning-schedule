import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen } from "lucide-react";

interface TodaysTasksProps {
  assignments: any[];
  scheduledAssignments: {[key: string]: any};
  currentDay: string;
  currentDate: Date;
  isLoading: boolean;
  error: string | null;
}

export function TodaysTasks({ assignments, scheduledAssignments, currentDay, currentDate, isLoading, error }: TodaysTasksProps) {
  // Get assignments due today or tomorrow (within 48 hours)
  const today = currentDate;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const relevantAssignments = assignments.filter(assignment => {
    if (!assignment.due_date) return false;
    const dueDate = new Date(assignment.due_date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    
    // Show assignments due within next 48 hours or overdue
    return diffHours <= 48 || diffHours < 0;
  });

  // Get scheduled work for today
  const todaysScheduledWork = Object.values(scheduledAssignments).filter(Boolean);

  if (isLoading) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading today's tasks...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-6 text-center">
          <p className="text-destructive">Error loading tasks: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const hasTasksToday = relevantAssignments.length > 0 || todaysScheduledWork.length > 0;

  if (!hasTasksToday) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-6 text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No urgent tasks today!</p>
          <p className="text-sm text-muted-foreground mt-1">Check your schedule for any planned work.</p>
        </CardContent>
      </Card>
    );
  }

  const getDueDateBadge = (assignment: any) => {
    if (!assignment.due_date) return null;
    
    const dueDate = new Date(assignment.due_date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return <Badge variant="destructive">Overdue</Badge>;
    if (diffDays === 0) return <Badge variant="destructive">Due Today</Badge>;
    if (diffDays === 1) return <Badge variant="default">Due Tomorrow</Badge>;
    return <Badge variant="outline">Due Soon</Badge>;
  };

  return (
    <div className="space-y-3">
      {/* Scheduled work for today */}
      {todaysScheduledWork.map((assignment) => (
        <Card key={`scheduled-${assignment.id}`} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-semibold text-foreground">📅 {assignment.title}</div>
                <div className="text-sm text-muted-foreground">
                  {assignment.course_name} • Scheduled for today
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {assignment.cognitive_load || 'medium'}
                  </Badge>
                  {assignment.estimated_time_minutes && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {assignment.estimated_time_minutes}m
                    </Badge>
                  )}
                </div>
              </div>
              <Badge variant="default">Scheduled</Badge>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Urgent assignments */}
      {relevantAssignments.map((assignment) => (
        <Card key={assignment.id} className="bg-card border border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-semibold text-foreground">{assignment.title}</div>
                <div className="text-sm text-muted-foreground">
                  {assignment.course_name} • {assignment.subject}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {assignment.cognitive_load || 'medium'}
                  </Badge>
                  {assignment.estimated_time_minutes && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {assignment.estimated_time_minutes}m
                    </Badge>
                  )}
                </div>
              </div>
              {getDueDateBadge(assignment)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}