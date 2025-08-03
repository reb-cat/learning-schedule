import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuickAddFormProps {
  studentName: string;
  onSuccess?: () => void;
}

export const QuickAddForm = ({ studentName, onSuccess }: QuickAddFormProps) => {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    assignment_type: 'academic' as string,
    due_date: '',
    notes: '',
    appointment_time: ''
  });

  const quickTypes = [
    { value: 'academic', label: 'Homework', type: 'assignment', icon: BookOpen },
    { value: 'life_skills', label: 'Life Skill', type: 'assignment', icon: BookOpen },
    { value: 'tutoring_session', label: 'Appointment', type: 'appointment', icon: Calendar }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('assignments').insert({
        student_name: studentName,
        title: formData.title,
        subject: formData.subject || formData.assignment_type,
        assignment_type: formData.assignment_type,
        due_date: formData.due_date || null,
        notes: formData.notes,
        source: 'manual',
        category: 'academic',
        cognitive_load: formData.assignment_type === 'life_skills' ? 'light' : 'medium',
        priority: 'medium'
      });

      if (error) throw error;

      toast({
        title: "Assignment Added",
        description: `Created "${formData.title}" for ${studentName}`,
      });

      setFormData({ title: '', subject: '', assignment_type: 'academic', due_date: '', notes: '', appointment_time: '' });
      setExpanded(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <Card>
        <CardContent className="p-4">
          <Button 
            onClick={() => setExpanded(true)} 
            variant="outline" 
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Quick Add Assignment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add Assignment for {studentName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="title" className="text-sm">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Assignment title"
              required
              className="h-8"
            />
          </div>

          <div>
            <Label htmlFor="type" className="text-sm">Type</Label>
            <Select value={formData.assignment_type} onValueChange={(value: any) => setFormData({ ...formData, assignment_type: value })}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quickTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      {type.type === 'appointment' ? (
                        <Calendar className="h-3 w-3 text-blue-600" />
                      ) : (
                        <BookOpen className="h-3 w-3 text-green-600" />
                      )}
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional date/time based on type */}
          {quickTypes.find(t => t.value === formData.assignment_type)?.type === 'appointment' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="appointment_date" className="text-sm">Date *</Label>
                <Input
                  id="appointment_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="h-8"
                  required
                />
              </div>
              <div>
                <Label htmlFor="appointment_time" className="text-sm">Time *</Label>
                <Input
                  id="appointment_time"
                  type="time"
                  value={formData.appointment_time}
                  onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                  className="h-8"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="due_date" className="text-sm">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="h-8"
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes" className="text-sm">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="min-h-[60px]"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !formData.title.trim()} size="sm">
              {loading ? "Adding..." : "Add Assignment"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setExpanded(false)} size="sm">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};