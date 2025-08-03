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
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, BookOpen, Target, AlertCircle, CalendarDays } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';

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
    end_date: '',
    notes: '',
    is_recurring: false,
    recurrence_days: [] as string[],
    is_multi_day_event: false,
    is_full_day_block: false,
    blocks_scheduling: false,
    display_as_single_event: true,
    volunteer_hours: 0,
    volunteer_organization: '',
    schedule_specific_datetime: false,
    specific_scheduled_date: '',
    specific_scheduled_block: 1
  });

  const assignmentTypes = [
    { value: 'academic', label: 'Academic', description: 'Traditional schoolwork' },
    { value: 'life_skills', label: 'Life Skills', description: 'Driving, job applications, cooking' },
    { value: 'tutoring', label: 'Tutoring', description: 'Preply Spanish, other 1-on-1 sessions' },
    { value: 'recurring', label: 'Recurring', description: 'Same time each week' },
    { value: 'volunteer_events', label: 'Volunteer Events', description: 'Community service and volunteer work' }
  ];

  const subjectOptions = {
    academic: ['Math', 'Language Arts', 'Science', 'History', 'Reading'],
    life_skills: ['Driving', 'Job Applications', 'Cooking', 'Banking', 'Interview Prep', 'Resume Writing', 'Work/Volunteer', 'Household Management'],
    tutoring: ['Spanish (Preply)', 'Foreign Language Tutoring', 'Math Tutoring', 'Reading Support'],
    recurring: ['Weekly Review', 'Weekly Planning', 'Skill Practice'],
    volunteer_events: ['Community Service', 'Food Bank', 'Environmental Cleanup', 'Tutoring Others', 'Animal Shelter', 'Senior Center', 'Hospital Volunteer', 'Special Events']
  };

  const timePresets = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 240, label: 'Half Day (4 hrs)' },
    { value: 480, label: 'Full Day (8 hrs)' },
    { value: 960, label: 'Weekend (16 hrs)' },
    { value: 1440, label: 'Multi-Day (24+ hrs)' }
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

    if (formData.is_multi_day_event && (!formData.due_date || !formData.end_date)) {
      toast({
        title: "Missing Date Range",
        description: "Please specify both start and end dates for multi-day events",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const assignments = [];
      
      if (formData.is_multi_day_event && formData.due_date && formData.end_date) {
        // Create assignments for each day of the multi-day event
        const startDate = parseISO(formData.due_date);
        const endDate = parseISO(formData.end_date);
        const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const hoursPerDay = formData.volunteer_hours / dayCount;
        
        // Generate unique event group ID for multi-day events
        const eventGroupId = crypto.randomUUID();
        
        for (let i = 0; i < dayCount; i++) {
          const currentDate = addDays(startDate, i);
          const assignmentData = {
            student_name: formData.student_name,
            title: formData.display_as_single_event ? formData.title : `${formData.title} - Day ${i + 1}`,
            subject: formData.subject,
            assignment_type: formData.assignment_type,
            source: 'manual',
            estimated_time_minutes: Math.round(hoursPerDay * 60),
            priority: formData.priority,
            due_date: format(currentDate, 'yyyy-MM-dd'),
            notes: `${formData.notes || ''}\nVolunteer Organization: ${formData.volunteer_organization}\nTotal Event Hours: ${formData.volunteer_hours}\nDay ${i + 1} of ${dayCount}`,
            category: formData.assignment_type === 'volunteer_events' ? 'volunteer' : 'academic',
            urgency: 'upcoming',
            cognitive_load: getCognitiveLoad(formData.subject, formData.assignment_type),
            is_template: false,
            recurrence_pattern: null,
            // Enhanced multi-day event fields
            is_full_day_block: formData.is_full_day_block,
            blocks_scheduling: formData.blocks_scheduling,
            event_group_id: eventGroupId,
            display_as_single_event: formData.display_as_single_event,
            volunteer_hours: Math.round(hoursPerDay),
            volunteer_organization: formData.volunteer_organization
          };
          assignments.push(assignmentData);
        }
      } else {
        // Single assignment
        const assignmentData = {
          student_name: formData.student_name,
          title: formData.title,
          subject: formData.subject,
          assignment_type: formData.assignment_type,
          source: 'manual',
          estimated_time_minutes: formData.estimated_time_minutes,
          priority: formData.priority,
          due_date: formData.due_date || null,
          notes: formData.assignment_type === 'volunteer_events' && formData.volunteer_organization
            ? `${formData.notes || ''}\nVolunteer Organization: ${formData.volunteer_organization}\nVolunteer Hours: ${formData.volunteer_hours || formData.estimated_time_minutes / 60}`
            : formData.notes || null,
          category: formData.assignment_type === 'volunteer_events' ? 'volunteer' : 'academic',
          urgency: 'upcoming',
          cognitive_load: getCognitiveLoad(formData.subject, formData.assignment_type),
          is_template: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? {
            days: formData.recurrence_days,
            frequency: 'weekly'
          } : null,
          // Enhanced event fields
          is_full_day_block: formData.is_full_day_block,
          blocks_scheduling: formData.blocks_scheduling,
          event_group_id: null,
          display_as_single_event: false,
          volunteer_hours: formData.volunteer_hours || null,
          volunteer_organization: formData.volunteer_organization || null,
          // Specific scheduling
          scheduled_date: formData.schedule_specific_datetime ? formData.specific_scheduled_date : null,
          scheduled_block: formData.schedule_specific_datetime ? formData.specific_scheduled_block : null
        };
        assignments.push(assignmentData);
      }

      const { error } = await supabase
        .from('assignments')
        .insert(assignments);

      if (error) throw error;

      toast({
        title: "Assignment Created",
        description: `${formData.title} has been added successfully${assignments.length > 1 ? ` (${assignments.length} days)` : ''}`,
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
        end_date: '',
        notes: '',
        is_recurring: false,
        recurrence_days: [],
        is_multi_day_event: false,
        is_full_day_block: false,
        blocks_scheduling: false,
        display_as_single_event: true,
        volunteer_hours: 0,
        volunteer_organization: '',
        schedule_specific_datetime: false,
        specific_scheduled_date: '',
        specific_scheduled_block: 1
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
              max={formData.is_multi_day_event ? 2880 : 480}
              min={15}
              step={15}
              className="w-full"
            />
          </div>

          {/* Multi-Day Event Toggle */}
          {formData.assignment_type === 'volunteer_events' && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multi_day"
                  checked={formData.is_multi_day_event}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    is_multi_day_event: checked as boolean
                  }))}
                />
                <Label htmlFor="multi_day" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Multi-Day Event (e.g., weekend volunteer trip)
                </Label>
              </div>
            </div>
          )}

          {/* Date Range for Multi-Day Events or Single Date */}
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
                {formData.is_multi_day_event ? 'Start Date *' : 'Due Date'}
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>

          {/* End Date for Multi-Day Events */}
          {formData.is_multi_day_event && (
            <div className="space-y-2">
              <Label htmlFor="end_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                End Date *
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                min={formData.due_date}
              />
            </div>
          )}

          {/* Volunteer-Specific Fields */}
          {formData.assignment_type === 'volunteer_events' && (
            <div className="space-y-4 p-4 border rounded-lg bg-green-50">
              <h3 className="font-medium text-green-800">Volunteer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="volunteer_org">Organization</Label>
                  <Input
                    id="volunteer_org"
                    value={formData.volunteer_organization}
                    onChange={(e) => setFormData(prev => ({ ...prev, volunteer_organization: e.target.value }))}
                    placeholder="e.g., Local Food Bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volunteer_hours">
                    {formData.is_multi_day_event ? 'Total Hours' : 'Hours'}
                  </Label>
                  <Input
                    id="volunteer_hours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.volunteer_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, volunteer_hours: parseFloat(e.target.value) || 0 }))}
                    placeholder={formData.is_multi_day_event ? "Total hours for entire event" : "Hours for this session"}
                  />
                </div>
              </div>

              {/* Event Display and Blocking Options */}
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="full_day_block">Full Day Event</Label>
                  <Switch
                    id="full_day_block"
                    checked={formData.is_full_day_block}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      is_full_day_block: checked,
                      estimated_time_minutes: checked ? 480 : prev.estimated_time_minutes 
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="blocks_scheduling">Block Other Scheduling</Label>
                    <p className="text-xs text-muted-foreground">Prevent other assignments on these dates</p>
                  </div>
                  <Switch
                    id="blocks_scheduling"
                    checked={formData.blocks_scheduling}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      blocks_scheduling: checked 
                    }))}
                  />
                </div>

                {formData.is_multi_day_event && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="display_single">Display as Single Event</Label>
                      <p className="text-xs text-muted-foreground">Show as one card instead of separate days</p>
                    </div>
                    <Switch
                      id="display_single"
                      checked={formData.display_as_single_event}
                      onCheckedChange={(checked) => setFormData(prev => ({ 
                        ...prev, 
                        display_as_single_event: checked 
                      }))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Specific Date/Time Scheduling */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="specific_schedule"
                checked={formData.schedule_specific_datetime}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  schedule_specific_datetime: checked as boolean
                }))}
              />
              <Label htmlFor="specific_schedule">Schedule for specific date and time</Label>
            </div>
            
            {formData.schedule_specific_datetime && (
              <div className="space-y-2 p-4 border rounded-lg bg-blue-50">
                <Label className="text-blue-800">Fixed Appointment Details</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specific_date">Date</Label>
                    <Input
                      id="specific_date"
                      type="date"
                      value={formData.specific_scheduled_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, specific_scheduled_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specific_block">Block (1-8)</Label>
                    <Select 
                      value={formData.specific_scheduled_block.toString()} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, specific_scheduled_block: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8].map((block) => (
                          <SelectItem key={block} value={block.toString()}>Block {block}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
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