import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addDays, format } from 'date-fns';

interface ManualAssignmentFormProps {
  onSuccess?: () => void;
}

export function ManualAssignmentForm({ onSuccess }: ManualAssignmentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const getDefaultDueDate = () => {
    const tomorrow = addDays(new Date(), 1);
    return format(tomorrow, 'yyyy-MM-dd');
  };

  const [formData, setFormData] = useState({
    student_name: '',
    title: '',
    assignment_type: 'homework',
    due_date: getDefaultDueDate(),
    estimated_time_minutes: 45
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_name || !formData.title || !formData.due_date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const assignmentData = {
        student_name: formData.student_name,
        title: formData.title,
        subject: formData.assignment_type === 'homework' ? 'Academic' : formData.assignment_type === 'appointment' ? 'Appointment' : 'Life Skills',
        assignment_type: formData.assignment_type,
        source: 'manual',
        estimated_time_minutes: formData.estimated_time_minutes,
        priority: 'medium',
        due_date: formData.due_date,
        category: 'academic',
        urgency: 'upcoming',
        cognitive_load: 'medium',
        is_template: false,
        recurrence_pattern: null
      };

      const { data, error } = await supabase.functions.invoke('create-manual-assignment', {
        body: [assignmentData]
      });

      if (error) {
        throw new Error(`Error: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create assignment');
      }

      toast({
        title: "Assignment Created",
        description: `${formData.title} has been added successfully`
      });

      // Reset form
      setFormData({
        student_name: '',
        title: '',
        assignment_type: 'homework',
        due_date: getDefaultDueDate(),
        estimated_time_minutes: 45
      });
      
      onSuccess?.();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardDescription className="text-lg font-bold">Create homework, appointments, and activities</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Student *</Label>
            <Select value={formData.student_name} onValueChange={value => setFormData(prev => ({ ...prev, student_name: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Abigail">Abigail</SelectItem>
                <SelectItem value="Khalil">Khalil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Title *</Label>
            <Input 
              value={formData.title} 
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} 
              placeholder="Enter assignment title" 
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Type *</Label>
            <Select value={formData.assignment_type} onValueChange={value => setFormData(prev => ({ ...prev, assignment_type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homework">Homework</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="life_skills">Life Skill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Due Date *</Label>
            <Input 
              type="date" 
              value={formData.due_date} 
              onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))} 
            />
          </div>

          {/* Time Estimate */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Time Estimate (minutes)</Label>
            <Input 
              type="number" 
              value={formData.estimated_time_minutes} 
              onChange={e => setFormData(prev => ({ ...prev, estimated_time_minutes: parseInt(e.target.value) || 45 }))} 
              min="1"
              max="480"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Assignment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}