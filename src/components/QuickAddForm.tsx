import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
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
    assignment_type: 'academic' as 'academic' | 'life_skills' | 'tutoring',
    due_date: '',
    notes: ''
  });

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

      setFormData({ title: '', subject: '', assignment_type: 'academic', due_date: '', notes: '' });
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="type" className="text-sm">Type</Label>
              <Select value={formData.assignment_type} onValueChange={(value: any) => setFormData({ ...formData, assignment_type: value })}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="life_skills">Life Skills</SelectItem>
                  <SelectItem value="tutoring">Tutoring</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject" className="text-sm">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Subject"
                className="h-8"
              />
            </div>
          </div>

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