import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Calendar } from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface CoopChecklistProps {
  studentName: string;
  assignments: any[];
  currentDay: string;
}

export function CoopChecklist({ studentName, assignments, currentDay }: CoopChecklistProps) {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  // Extract checklist items from assignments
  React.useEffect(() => {
    const checklistKeywords = ['bring', 'pack', 'remember', 'take', 'wear', 'deliver', 'turn in'];
    
    const items: ChecklistItem[] = assignments
      .filter(assignment => {
        // Only include assignments that contain checklist keywords
        const title = assignment.title.toLowerCase();
        return checklistKeywords.some(keyword => title.includes(keyword));
      })
      .map(assignment => ({
        id: assignment.id,
        text: assignment.title,
        completed: false
      }));

    // Add default co-op items based on student
    if (studentName === 'Abigail' && (currentDay === 'Tuesday' || currentDay === 'Thursday')) {
      items.unshift(
        { id: 'apron', text: 'Bring apron', completed: false },
        { id: 'lunch', text: 'Pack lunch', completed: false },
        { id: 'notebook', text: 'Baking notebook', completed: false }
      );
    }

    if (studentName === 'Khalil' && (currentDay === 'Monday' || currentDay === 'Wednesday')) {
      items.unshift(
        { id: 'tools', text: 'Bring workshop tools', completed: false },
        { id: 'safety', text: 'Safety glasses', completed: false },
        { id: 'project', text: 'Current project materials', completed: false }
      );
    }

    setChecklistItems(items);
  }, [assignments, studentName, currentDay]);

  const toggleItem = (id: string) => {
    setChecklistItems(items => 
      items.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const isCoopDay = (studentName === 'Abigail' && (currentDay === 'Tuesday' || currentDay === 'Thursday')) ||
                   (studentName === 'Khalil' && (currentDay === 'Monday' || currentDay === 'Wednesday'));

  if (!isCoopDay || checklistItems.length === 0) {
    return null;
  }

  const completedCount = checklistItems.filter(item => item.completed).length;

  return (
    <Card className="bg-card border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckSquare className="h-5 w-5" />
          Before Co-op Checklist
          <Badge variant="outline" className="ml-2">
            {completedCount}/{checklistItems.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checklistItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-3">
              <Checkbox
                id={item.id}
                checked={item.completed}
                onCheckedChange={() => toggleItem(item.id)}
                className="data-[state=checked]:bg-primary"
              />
              <label
                htmlFor={item.id}
                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                  item.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                }`}
              >
                {item.text}
              </label>
            </div>
          ))}
        </div>
        {completedCount === checklistItems.length && checklistItems.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              ✅ All ready for co-op!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}