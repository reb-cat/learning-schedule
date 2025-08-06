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
  hasAllDayEvent?: boolean;
}

export function CoopChecklist({ studentName, assignments, currentDay, hasAllDayEvent }: CoopChecklistProps) {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  // Extract and transform checklist items from assignments
  React.useEffect(() => {
    const actionKeywords = ['bring', 'pack', 'remember', 'take', 'wear', 'deliver', 'turn in', 'print', 'sign', 'complete', 'review'];
    
    const items: ChecklistItem[] = [];
    
    // Process assignments into actionable checklist items
    assignments.forEach(assignment => {
      const title = assignment.title.toLowerCase();
      let actionableText = assignment.title;
      let isActionable = false;
      
      // Check if it's marked as quick_review or administrative
      if (assignment.task_type === 'quick_review' || assignment.task_type === 'administrative') {
        isActionable = true;
        
        // Transform vague titles into clear actions
        if (title.includes('syllabus')) {
          actionableText = `□ Review and sign ${assignment.course_name} syllabus`;
        } else if (title.includes('recipe')) {
          actionableText = `□ Check recipe for ${assignment.course_name}`;
        } else if (title.includes('form')) {
          const courseName = assignment.course_name || 'course';
          actionableText = `□ Complete and submit ${courseName} form`;
        } else if (title.includes('fee') || title.includes('payment')) {
          // Skip fee items - these should go to parent tasks
        } else {
          actionableText = `□ ${assignment.title}`;
        }
      } else {
        // Check for action keywords in other assignments
        const hasKeyword = actionKeywords.some(keyword => title.includes(keyword));
        if (hasKeyword) {
          isActionable = true;
          actionableText = `□ ${assignment.title}`;
        }
      }
      
      // Only add non-fee items to student checklist
      if (isActionable && !title.includes('fee') && !title.includes('payment')) {
        items.push({
          id: assignment.id,
          text: actionableText,
          completed: false
        });
      }
    });

    // Add student-specific co-op reminders
    if (studentName === 'Abigail' && (currentDay === 'Monday' || currentDay === 'Thursday')) {
      items.unshift(
        { id: 'apron', text: '□ Bring clean apron for baking class', completed: false },
        { id: 'lunch', text: '□ Pack lunch and water bottle', completed: false },
        { id: 'notebook', text: '□ Bring baking notebook and pen', completed: false },
        { id: 'ingredients', text: '□ Check today\'s recipe ingredients list', completed: false }
      );
    }

    if (studentName === 'Khalil' && (currentDay === 'Monday' || currentDay === 'Thursday')) {
      items.unshift(
        { id: 'tools', text: '□ Bring workshop tools and materials', completed: false },
        { id: 'safety', text: '□ Safety glasses and protective gear', completed: false },
        { id: 'project', text: '□ Current project materials', completed: false },
        { id: 'uniform', text: '□ Wear proper workshop attire', completed: false }
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

  const isCoopDay = currentDay === 'Monday' || currentDay === 'Thursday';

  if (!isCoopDay || checklistItems.length === 0 || hasAllDayEvent) {
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