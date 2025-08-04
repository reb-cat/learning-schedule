import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TimeEstimationSection } from '@/components/forms/TimeEstimationSection';
import { Calendar as CalendarIcon, User, Clock, Plus, ChevronDown, Repeat, Settings, MapPin } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ManualAssignmentFormProps {
  onSuccess?: () => void;
}

export function ManualAssignmentForm({ onSuccess }: ManualAssignmentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
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
    specific_scheduled_block: 1,
    appointment_time: ''
  });

  const quickAddSuggestions = [
    { title: 'Driving Lesson', type: 'driving_lesson', subject: 'Driving Instruction', time: 60 },
    { title: 'Tutoring Session', type: 'tutoring_session', subject: 'Math Tutoring', time: 60 },
    { title: 'Volunteer Event', type: 'volunteer_event', subject: 'Community Service', time: 480 },
    { title: 'Math Homework', type: 'academic', subject: 'Math', time: 45 },
  ];

  const assignmentTypes = {
    // Appointments (fixed time/place)
    tutoring_session: { label: 'Tutoring Session', group: 'appointment', icon: '👨‍🏫' },
    driving_lesson: { label: 'Driving Lesson', group: 'appointment', icon: '🚗' },
    volunteer_event: { label: 'Volunteer Event', group: 'appointment', icon: '🤝' },
    job_interview: { label: 'Job Interview', group: 'appointment', icon: '💼' },
    
    // Assignments (flexible completion)
    academic: { label: 'Academic Work', group: 'assignment', icon: '📚' },
    tutoring_homework: { label: 'Tutoring Homework', group: 'assignment', icon: '📝' },
    driving_practice: { label: 'Driving Practice', group: 'assignment', icon: '🎯' },
    volunteer_prep: { label: 'Volunteer Prep', group: 'assignment', icon: '📋' },
    job_applications: { label: 'Job Applications', group: 'assignment', icon: '📄' },
    life_skills: { label: 'Life Skills', group: 'assignment', icon: '🏠' }
  };

  const subjectOptions = {
    // Appointments
    tutoring_session: ['Spanish Tutoring', 'Math Tutoring', 'Reading Support', 'Foreign Language', 'Test Prep'],
    driving_lesson: ['Driving Instruction', 'Parallel Parking', 'Highway Driving', 'City Driving'],
    volunteer_event: ['Community Service', 'Environmental Cleanup', 'Senior Center', 'Animal Shelter', 'Youth Mentoring', 'Special Events'],
    job_interview: ['Interview Prep', 'Mock Interview', 'Follow-up Meeting'],
    
    // Assignments
    academic: ['Math', 'Language Arts', 'Science', 'History', 'Reading'],
    tutoring_homework: ['Spanish Homework', 'Math Practice', 'Reading Assignments', 'Language Practice'],
    driving_practice: ['Practice Driving', 'Manual Study', 'Traffic Rules', 'Road Signs'],
    volunteer_prep: ['Application Forms', 'Training Materials', 'Background Check', 'Orientation'],
    job_applications: ['Resume Writing', 'Cover Letters', 'Application Forms', 'Portfolio'],
    life_skills: ['Cooking', 'Banking', 'Household Management', 'Personal Finance', 'Organization']
  };

  const isAppointment = assignmentTypes[formData.assignment_type as keyof typeof assignmentTypes]?.group === 'appointment';

  const handleQuickAdd = (suggestion: typeof quickAddSuggestions[0]) => {
    setFormData(prev => ({
      ...prev,
      title: suggestion.title,
      assignment_type: suggestion.type,
      subject: suggestion.subject,
      estimated_time_minutes: suggestion.time
    }));
  };

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
        const startDate = parseISO(formData.due_date);
        const endDate = parseISO(formData.end_date);
        const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const hoursPerDay = formData.volunteer_hours / dayCount;
        
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
            category: formData.assignment_type === 'volunteer_events' ? 'volunteer' : 
                     formData.assignment_type === 'life_skills' ? 'life_skills' :
                     formData.assignment_type === 'tutoring' ? 'tutoring' :
                     formData.assignment_type === 'recurring' ? 'recurring' : 'academic',
            urgency: 'upcoming',
            cognitive_load: getCognitiveLoad(formData.subject, formData.assignment_type),
            is_template: false,
            recurrence_pattern: null,
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
          category: formData.assignment_type === 'volunteer_events' ? 'volunteer' : 
                   formData.assignment_type === 'life_skills' ? 'life_skills' :
                   formData.assignment_type === 'tutoring' ? 'tutoring' :
                   formData.assignment_type === 'recurring' ? 'recurring' : 'academic',
          urgency: 'upcoming',
          cognitive_load: getCognitiveLoad(formData.subject, formData.assignment_type),
          is_template: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? {
            days: formData.recurrence_days,
            frequency: 'weekly'
          } : null,
          is_full_day_block: formData.is_full_day_block,
          blocks_scheduling: formData.blocks_scheduling,
          event_group_id: null,
          display_as_single_event: false,
          volunteer_hours: formData.volunteer_hours || null,
          volunteer_organization: formData.volunteer_organization || null,
          scheduled_date: formData.schedule_specific_datetime ? formData.specific_scheduled_date : null,
          scheduled_block: formData.schedule_specific_datetime ? formData.specific_scheduled_block : null
        };
        assignments.push(assignmentData);
      }

      const { data, error } = await supabase.functions.invoke('create-manual-assignment', {
        body: assignments
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create assignment');
      }

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
        specific_scheduled_block: 1,
        appointment_time: ''
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">Add Assignment</CardTitle>
        <CardDescription>Create homework, appointments, and activities</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Add Suggestions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">Quick Add</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickAddSuggestions.map((suggestion) => (
                <Button
                  key={suggestion.title}
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickAdd(suggestion)}
                  className="justify-start text-left h-auto py-2 px-3 hover:bg-accent"
                >
                  <div>
                    <div className="font-medium text-sm">{suggestion.title}</div>
                    <div className="text-xs text-muted-foreground">{suggestion.subject}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Main Form Fields */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Add title"
                className="text-lg font-medium border-0 border-b border-border rounded-none px-0 py-2 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
              />
            </div>

            {/* Student & Type Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Student
                </Label>
                <Select value={formData.student_name} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, student_name: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Abigail">Abigail</SelectItem>
                    <SelectItem value="Khalil">Khalil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Type</Label>
                <Select value={formData.assignment_type} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, assignment_type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">⏰ Appointments</div>
                    {Object.entries(assignmentTypes)
                      .filter(([_, config]) => config.group === 'appointment')
                      .map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span>{config.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground mt-1">📚 Assignments</div>
                    {Object.entries(assignmentTypes)
                      .filter(([_, config]) => config.group === 'assignment')
                      .map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span>{config.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject & Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Subject</Label>
                <Select value={formData.subject} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, subject: value }))
                }>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions[formData.assignment_type as keyof typeof subjectOptions]?.map((subject) => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-primary" />
                  Time Needed
                </Label>
                <div className="p-4 border rounded-lg bg-muted/30">
                  <TimeEstimationSection
                    value={formData.estimated_time_minutes}
                    onChange={(value) => setFormData(prev => ({ ...prev, estimated_time_minutes: value }))}
                  />
                </div>
              </div>
            </div>

            {/* Date Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="all-day"
                    checked={formData.is_full_day_block}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      is_full_day_block: checked,
                      estimated_time_minutes: checked ? 1440 : 60
                    }))}
                  />
                  <Label htmlFor="all-day" className="text-sm font-medium">All day</Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Switch
                    id="multi-day"
                    checked={formData.is_multi_day_event}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_multi_day_event: checked }))}
                  />
                  <Label htmlFor="multi-day" className="text-sm font-medium">Multi-day</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {isAppointment ? 'Date' : 'Due Date'}
                  </Label>
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11",
                          !formData.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? format(parseISO(formData.due_date), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.due_date ? parseISO(formData.due_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({ ...prev, due_date: format(date, 'yyyy-MM-dd') }));
                            setShowDatePicker(false);
                          }
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {formData.is_multi_day_event && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">End Date</Label>
                    <Popover open={showEndDatePicker} onOpenChange={setShowEndDatePicker}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11",
                            !formData.end_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.end_date ? format(parseISO(formData.end_date), "PPP") : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.end_date ? parseISO(formData.end_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormData(prev => ({ ...prev, end_date: format(date, 'yyyy-MM-dd') }));
                              setShowEndDatePicker(false);
                            }
                          }}
                          disabled={(date) => {
                            if (!formData.due_date) return date < new Date();
                            return date < parseISO(formData.due_date);
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="h-4 w-4" />
                More options
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
              {/* Notes */}
              <div className="space-y-3">
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Volunteer Organization (if volunteer event) */}
              {formData.assignment_type === 'volunteer_event' && (
                <div className="space-y-3">
                  <Label htmlFor="org" className="text-sm font-medium">Organization</Label>
                  <Input
                    id="org"
                    value={formData.volunteer_organization}
                    onChange={(e) => setFormData(prev => ({ ...prev, volunteer_organization: e.target.value }))}
                    placeholder="Organization name"
                    className="h-11"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recurring */}
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Switch
                    id="recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_recurring: checked }))}
                  />
                  <Label htmlFor="recurring" className="flex items-center gap-2 text-sm font-medium">
                    <Repeat className="h-4 w-4" />
                    Recurring
                  </Label>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, priority: value }))
                  }>
                    <SelectTrigger className="h-11">
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
            </CollapsibleContent>
          </Collapsible>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
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
                  specific_scheduled_block: 1,
                  appointment_time: ''
                });
              }}
              className="px-6"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="px-8 bg-primary hover:bg-primary/90">
              {loading ? 'Creating...' : 'Save Assignment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
