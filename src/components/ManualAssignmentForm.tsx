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
    subject: '',
    assignment_type: 'homework',
    due_date: getDefaultDueDate(),
    estimated_time_minutes: 45,
    notes: ''
  });

  // Quick suggestions for faster input
  const quickSuggestions = [
    { title: 'Math Homework', subject: 'Math', type: 'homework', time: 45 },
    { title: 'Driving Lesson', subject: 'Driving', type: 'appointment', time: 60 },
    { title: 'Cooking Practice', subject: 'Life Skills', type: 'life_skills', time: 30 },
    { title: 'Volunteer Work', subject: 'Community Service', type: 'appointment', time: 120 }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_name || !formData.title || !formData.due_date) {
      toast({
        title: "Missing Information",
        description: "Please fill in Student, Title, and Due Date",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const assignmentData = {
        student_name: formData.student_name,
        title: formData.title,
        subject: formData.subject || (formData.assignment_type === 'homework' ? 'Academic' : formData.assignment_type === 'appointment' ? 'Appointment' : 'Life Skills'),
        assignment_type: formData.assignment_type,
        source: 'manual',
        estimated_time_minutes: formData.estimated_time_minutes,
        priority: 'medium',
        due_date: formData.due_date,
        notes: formData.notes || null,
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
        subject: '',
        assignment_type: 'homework',
        due_date: getDefaultDueDate(),
        estimated_time_minutes: 45,
        notes: ''
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Quick Templates */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {quickSuggestions.map(suggestion => (
          <button
            key={suggestion.title}
            type="button"
            onClick={() => setFormData(prev => ({
              ...prev,
              title: suggestion.title,
              subject: suggestion.subject,
              assignment_type: suggestion.type,
              estimated_time_minutes: suggestion.time
            }))}
            className="p-3 text-left text-sm border rounded-lg hover:bg-accent transition-colors"
          >
            <div className="font-medium">{suggestion.title}</div>
            <div className="text-muted-foreground text-xs">{suggestion.time}min • {suggestion.subject}</div>
          </button>
        ))}
      </div>

      {/* Essential Fields Only */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Student</Label>
          <Select value={formData.student_name} onValueChange={value => setFormData(prev => ({ ...prev, student_name: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Abigail">Abigail</SelectItem>
              <SelectItem value="Khalil">Khalil</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formData.assignment_type} onValueChange={value => setFormData(prev => ({ ...prev, assignment_type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="homework">Homework</SelectItem>
              <SelectItem value="appointment">Appointment</SelectItem>
              <SelectItem value="life_skills">Life Skill</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input 
          value={formData.title} 
          onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} 
          placeholder="What needs to be done?" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input 
            type="date" 
            value={formData.due_date} 
            onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))} 
          />
        </div>
        
        <div className="space-y-2">
          <Label>Time (min)</Label>
          <Input 
            type="number" 
            value={formData.estimated_time_minutes} 
            onChange={e => setFormData(prev => ({ ...prev, estimated_time_minutes: parseInt(e.target.value) || 45 }))} 
            min="5"
            max="480"
            step="5"
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Assignment"}
      </Button>
    </form>
  );
}