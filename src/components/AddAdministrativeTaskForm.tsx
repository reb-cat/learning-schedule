import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface AddAdministrativeTaskFormProps {
  onAdd: (task: {
    student_name: string;
    title: string;
    description?: string;
    notification_type: string;
    priority: string;
    due_date?: string;
    amount?: number;
  }) => Promise<void>;
}

export function AddAdministrativeTaskForm({ onAdd }: AddAdministrativeTaskFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    student_name: "",
    title: "",
    description: "",
    notification_type: "general",
    priority: "medium",
    due_date: "",
    amount: ""
  });

  const resetForm = () => {
    setFormData({
      student_name: "",
      title: "",
      description: "",
      notification_type: "general",
      priority: "medium",
      due_date: "",
      amount: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_name.trim() || !formData.title.trim()) {
      toast({
        title: "Error",
        description: "Student name and title are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const taskData = {
        student_name: formData.student_name.trim(),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        notification_type: formData.notification_type,
        priority: formData.priority,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
      };

      await onAdd(taskData);
      
      toast({
        title: "Success",
        description: "Administrative task added successfully",
      });
      
      resetForm();
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add administrative task",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add New Administrative Task
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Add Administrative Task</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Student Name *</label>
                  <Select
                    value={formData.student_name}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, student_name: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Abigail">Abigail</SelectItem>
                      <SelectItem value="Khalil">Khalil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
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
              </div>

              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter task description (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={formData.notification_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, notification_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="fees">Fees</SelectItem>
                      <SelectItem value="forms">Forms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Amount ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Task"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setIsOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}