import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Edit3, Clock, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Assignment {
  id: string;
  title: string;
  course_name: string;
  subject: string;
  due_date: string;
  estimated_time_minutes: number;
  cognitive_load: string;
  urgency: string;
  task_type: string;
}

interface EditableAssignmentProps {
  assignment: Assignment;
  onUpdate: () => void;
}

export function EditableAssignment({ assignment, onUpdate }: EditableAssignmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(assignment.title);
  const [parentNotes, setParentNotes] = useState('');
  const [studentInstructions, setStudentInstructions] = useState('');
  const [isChecklistItem, setIsChecklistItem] = useState(assignment.task_type === 'quick_review');
  const [estimatedMinutes, setEstimatedMinutes] = useState(assignment.estimated_time_minutes || 30);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('assignments')
        .update({
          title: editedTitle,
          estimated_time_minutes: estimatedMinutes,
          task_type: isChecklistItem ? 'quick_review' : 'academic',
          notes: `Parent Notes: ${parentNotes}\nStudent Instructions: ${studentInstructions}`.trim()
        })
        .eq('id', assignment.id);

      if (error) throw error;

      toast({
        title: "Assignment Updated",
        description: "Changes saved successfully",
      });

      setIsOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Update Failed",
        description: "Could not save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getDueDateDisplay = () => {
    if (!assignment.due_date) return 'No due date';
    const dueDate = new Date(assignment.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    return dueDate.toLocaleDateString();
  };

  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1">
            <div className="font-medium text-foreground">{assignment.title}</div>
            <div className="text-sm text-muted-foreground">
              {assignment.course_name} • {assignment.subject}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {assignment.cognitive_load || 'medium'}
              </Badge>
              {assignment.estimated_time_minutes && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {assignment.estimated_time_minutes}m
                </Badge>
              )}
              <Badge variant={assignment.urgency === 'overdue' ? 'destructive' : 'default'} className="text-xs">
                {getDueDateDisplay()}
              </Badge>
              {assignment.task_type === 'quick_review' && (
                <Badge variant="outline" className="text-xs">
                  Checklist Item
                </Badge>
              )}
            </div>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-4">
                <Edit3 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Assignment Title</Label>
                  <Input
                    id="title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder="Clarify the assignment title..."
                  />
                </div>

                <div>
                  <Label htmlFor="parent-notes">Parent Notes (private)</Label>
                  <Textarea
                    id="parent-notes"
                    value={parentNotes}
                    onChange={(e) => setParentNotes(e.target.value)}
                    placeholder="Notes for parent reference..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="student-instructions">Student Instructions</Label>
                  <Textarea
                    id="student-instructions"
                    value={studentInstructions}
                    onChange={(e) => setStudentInstructions(e.target.value)}
                    placeholder="What the student actually needs to DO..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="estimated-time">Estimated Time (minutes)</Label>
                  <Input
                    id="estimated-time"
                    type="number"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 30)}
                    min="5"
                    max="180"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="checklist-item"
                    checked={isChecklistItem}
                    onCheckedChange={setIsChecklistItem}
                  />
                  <Label htmlFor="checklist-item">
                    This is a quick checklist item (not a study block)
                  </Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}