import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, BookOpen, Target, AlertCircle } from 'lucide-react';

interface ManualAssignmentFormProps {
  onSuccess?: () => void;
}

export function ManualAssignmentForm({ onSuccess }: ManualAssignmentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    student_name: '',
    title: '',
    subject: '',
    assignment_type: 'life_skills',
    estimated_time_minutes: 45,
    priority: 'medium',
    due_date: '',
    notes: '',
    is_recurring: false,
    recurrence_days: [] as string[]
  });

  const assignmentTypes = [
    { value: 'academic', label: 'Academic', description: 'Traditional schoolwork' },
    { value: 'life_skills', label: 'Life Skills', description: 'Driving, job applications, cooking' },
    { value: 'tutoring', label: 'Tutoring', description: 'Preply Spanish, other 1-on-1 sessions' },
    { value: 'recurring', label: 'Recurring', description: 'Same time each week' }
  ];

  const subjectOptions = {
    academic: ['Math', 'Language Arts', 'Science', 'History', 'Reading'],
    life_skills: ['Driving', 'Job Applications', 'Cooking', 'Banking', 'Interview Prep', 'Resume Writing'],
    tutoring: ['Spanish (Preply)', 'Foreign Language Tutoring', 'Math Tutoring', 'Reading Support'],
    recurring: ['Weekly Review', 'Weekly Planning', 'Skill Practice']
  };

  const timePresets = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_name || !formData.title || !formData.subject) {
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
        subject: formData.subject,
        assignment_type: formData.assignment_type,
        source: 'manual',
        estimated_time_minutes: formData.estimated_time_minutes,
        priority: formData.priority,
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        category: 'academic',
        urgency: 'upcoming',
        cognitive_load: getCognitiveLoad(formData.subject, formData.assignment_type),
        is_template: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? {
          days: formData.recurrence_days,
          frequency: 'weekly'
        } : null
      };

      const { error } = await supabase
        .from('assignments')
        .insert(assignmentData);

      if (error) throw error;

      toast({
        title: "Assignment Created",
        description: `${formData.title} has been added successfully`,
      });

      // Reset form
      setFormData({
        student_name: '',
        title: '',
        subject: '',
        assignment_type: 'life_skills',
        estimated_time_minutes: 45,
        priority: 'medium',
        due_date: '',
        notes: '',
        is_recurring: false,
        recurrence_days: []
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

  const getCognitiveLoad = (subject: string, type: string): 'light' | 'medium' | 'heavy' => {
    if (type === 'tutoring' || subject.includes('Tutoring')) return 'heavy';
    if (subject === 'Driving') return 'heavy';
    if (type === 'life_skills') return 'medium';
    return 'medium';
  };

  const getStudentSpecificNotes = (studentName: string, assignmentType: string) => {
    if (studentName === 'Abigail' && assignmentType === 'recurring') {
      return 'Consistent weekly structure supports executive function needs';
    }
    if (studentName === 'Khalil' && assignmentType === 'tutoring') {
      return 'Schedule in morning blocks (2-4) for optimal focus with dyslexia';
    }
    return '';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Create Manual Assignment
        </CardTitle>
        <CardDescription>
          Add non-Canvas assignments like driving lessons, tutoring, and life skills
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="student" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Student *
            </Label>
            <Select value={formData.student_name} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, student_name: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Abigail">Abigail</SelectItem>
                <SelectItem value="Khalil">Khalil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Type */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Assignment Type *
            </Label>
            <RadioGroup 
              value={formData.assignment_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, assignment_type: value, subject: '' }))}
              className="grid grid-cols-2 gap-4"
            >
              {assignmentTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <div className="flex-1">
                    <Label htmlFor={type.value} className="font-medium">{type.label}</Label>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Title and Subject */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Driving Practice"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select value={formData.subject} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, subject: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions[formData.assignment_type as keyof typeof subjectOptions]?.map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Estimation */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Estimated Time: {formData.estimated_time_minutes} minutes
            </Label>
            <div className="flex gap-2 mb-2">
              {timePresets.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant={formData.estimated_time_minutes === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, estimated_time_minutes: preset.value }))}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Slider
              value={[formData.estimated_time_minutes]}
              onValueChange={([value]) => setFormData(prev => ({ ...prev, estimated_time_minutes: value }))}
              max={180}
              min={15}
              step={15}
              className="w-full"
            />
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Recurring Pattern */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  is_recurring: checked as boolean,
                  recurrence_days: checked ? [] : []
                }))}
              />
              <Label htmlFor="recurring">Make this a recurring assignment</Label>
            </div>
            
            {formData.is_recurring && (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <Label>Recurring Days</Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={formData.recurrence_days.includes(day)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              recurrence_days: [...prev.recurrence_days, day]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              recurrence_days: prev.recurrence_days.filter(d => d !== day)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={day} className="text-sm">{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Special Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g., Bring permit and insurance card"
              rows={3}
            />
            {formData.student_name && formData.assignment_type && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">
                  {getStudentSpecificNotes(formData.student_name, formData.assignment_type)}
                </p>
              </div>
            )}
          </div>

          {/* Cognitive Load Preview */}
          {formData.subject && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cognitive Load Preview:</span>
                <Badge variant={getCognitiveLoad(formData.subject, formData.assignment_type) === 'heavy' ? 'destructive' : 
                              getCognitiveLoad(formData.subject, formData.assignment_type) === 'medium' ? 'default' : 'secondary'}>
                  {getCognitiveLoad(formData.subject, formData.assignment_type)}
                </Badge>
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Assignment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}