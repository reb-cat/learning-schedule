import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Edit3, DollarSign, FileText, AlertTriangle, ExternalLink, CalendarIcon, Trash2 } from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdministrativeNotification } from '@/hooks/useAdministrativeNotifications';

interface EditableAdministrativeNotificationProps {
  notification: AdministrativeNotification;
  onUpdate: () => void;
  onToggleComplete: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function EditableAdministrativeNotification({ 
  notification, 
  onUpdate, 
  onToggleComplete,
  onDelete 
}: EditableAdministrativeNotificationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(notification.title);
  const [editedDescription, setEditedDescription] = useState(notification.description || '');
  const [editedPriority, setEditedPriority] = useState(notification.priority);
  const [editedAmount, setEditedAmount] = useState(notification.amount?.toString() || '');
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    notification.due_date ? new Date(notification.due_date) : undefined
  );
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('administrative_notifications')
        .update({
          title: editedTitle,
          description: editedDescription || null,
          priority: editedPriority,
          amount: editedAmount ? parseFloat(editedAmount) : null,
          due_date: editedDueDate ? editedDueDate.toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      if (error) throw error;

      toast({
        title: "Task Updated",
        description: "Changes saved successfully",
      });

      setIsOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating notification:', error);
      toast({
        title: "Update Failed",
        description: "Could not save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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

  const getDynamicPriorityColor = (priority: string, dueDate?: string) => {
    const today = new Date();
    const due = dueDate ? new Date(dueDate) : null;
    
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

  return (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        isOverdue(notification.due_date) 
          ? 'border-destructive bg-destructive/5' 
          : 'border-border bg-card'
      }`}
    >
      <Checkbox
        checked={notification.completed}
        onCheckedChange={() => onToggleComplete(notification.id, notification.title)}
        className="mt-1"
      />
      
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {getTypeIcon(notification.notification_type)}
              <span className="font-medium">{notification.title}</span>
              {isOverdue(notification.due_date) && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </div>
            {notification.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {notification.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-end gap-1">
              <Badge className={`${getDynamicPriorityColor(notification.priority, notification.due_date)}`}>
                {notification.priority}
              </Badge>
              {notification.amount && (
                <Badge variant="outline">
                  ${notification.amount}
                </Badge>
              )}
            </div>
            
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">
                  <Edit3 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Administrative Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Task Title</Label>
                    <Input
                      id="title"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      placeholder="Task title..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Additional details..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={editedPriority} onValueChange={setEditedPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount (if applicable)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={editedAmount}
                      onChange={(e) => setEditedAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !editedDueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editedDueDate ? format(editedDueDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editedDueDate}
                          onSelect={setEditedDueDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
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
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Due: {formatDate(notification.due_date)}
            {notification.course_name && ` • ${notification.course_name}`}
          </div>
          
          <div className="flex items-center gap-2">
            {notification.canvas_url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => window.open(notification.canvas_url, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Task</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{notification.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(notification.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}