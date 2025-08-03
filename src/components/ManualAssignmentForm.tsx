import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TimeEstimationSection } from '@/components/forms/TimeEstimationSection';
import { Calendar, User, BookOpen, Target, AlertCircle, CalendarDays, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';

interface ManualAssignmentFormProps {
  onSuccess?: () => void;
}

export function ManualAssignmentForm({ onSuccess }: ManualAssignmentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const assignmentTypes = [
    // Appointments (fixed time/place)
    { value: 'tutoring_session', label: 'Tutoring Session', description: 'Scheduled 1-on-1 lessons', type: 'appointment', icon: Calendar },
    { value: 'driving_lesson', label: 'Driving Lesson', description: 'With instructor', type: 'appointment', icon: Calendar },
    { value: 'volunteer_event', label: 'Volunteer Event', description: 'Scheduled community service', type: 'appointment', icon: Calendar },
    { value: 'job_interview', label: 'Job Interview', description: 'Scheduled meeting', type: 'appointment', icon: Calendar },
    
    // Assignments (flexible completion)
    { value: 'academic', label: 'Academic Work', description: 'Homework and schoolwork', type: 'assignment', icon: BookOpen },
    { value: 'tutoring_homework', label: 'Tutoring Homework', description: 'Work assigned by tutor', type: 'assignment', icon: BookOpen },
    { value: 'driving_practice', label: 'Driving Practice', description: 'Flexible practice time', type: 'assignment', icon: BookOpen },
    { value: 'volunteer_prep', label: 'Volunteer Prep', description: 'Applications, training materials', type: 'assignment', icon: BookOpen },
    { value: 'job_applications', label: 'Job Applications', description: 'Resume, forms, paperwork', type: 'assignment', icon: BookOpen },
    { value: 'life_skills', label: 'Life Skills', description: 'Banking, cooking, household tasks', type: 'assignment', icon: BookOpen }
  ];

  const subjectOptions = {
    // Appointments
    tutoring_session: ['Spanish (Preply)', 'Math Tutoring', 'Reading Support', 'Foreign Language'],
    driving_lesson: ['Driving Instruction', 'Parallel Parking', 'Highway Driving', 'City Driving'],
    volunteer_event: ['Food Bank', 'Environmental Cleanup', 'Senior Center', 'Animal Shelter', 'Special Events'],
    job_interview: ['Interview Prep', 'Mock Interview', 'Follow-up Meeting'],
    
    // Assignments
    academic: ['Math', 'Language Arts', 'Science', 'History', 'Reading'],
    tutoring_homework: ['Spanish Homework', 'Math Practice', 'Reading Assignments', 'Language Practice'],
    driving_practice: ['Practice Driving', 'Manual Study', 'Traffic Rules', 'Road Signs'],
    volunteer_prep: ['Application Forms', 'Training Materials', 'Background Check', 'Orientation'],
    job_applications: ['Resume Writing', 'Cover Letters', 'Application Forms', 'Portfolio'],
    life_skills: ['Cooking', 'Banking', 'Household Management', 'Personal Finance', 'Organization']
  };


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
              category: formData.assignment_type === 'volunteer_events' ? 'volunteer' : 
                       formData.assignment_type === 'life_skills' ? 'life_skills' :
                       formData.assignment_type === 'tutoring' ? 'tutoring' :
                       formData.assignment_type === 'recurring' ? 'recurring' : 'academic',
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

      // Use edge function to create assignment(s) with proper permissions
      console.log('Sending assignments to edge function:', assignments);
      
      const { data, error } = await supabase.functions.invoke('create-manual-assignment', {
        body: assignments
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data?.success) {
        console.error('Assignment creation failed:', data);
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
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="h-5 w-5" />
          Create Manual Assignment
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
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
              <Target className="h-4 w-4" />
              Type *
            </Label>
            
            {/* Appointments Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <Calendar className="h-4 w-4" />
                Appointments (fixed time & place)
              </div>
              <RadioGroup 
                value={formData.assignment_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignment_type: value, subject: '' }))}
                className="grid grid-cols-2 gap-3"
              >
                {assignmentTypes.filter(type => type.type === 'appointment').map((type) => (
                  <div key={type.value} className="flex items-center space-x-2 p-3 border border-blue-200 bg-blue-50/50 rounded-lg hover:bg-blue-50">
                    <RadioGroupItem value={type.value} id={type.value} />
                    <div className="flex-1">
                      <Label htmlFor={type.value} className="font-medium flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-blue-600" />
                        {type.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Assignments Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <BookOpen className="h-4 w-4" />
                Assignments (flexible completion)
              </div>
              <RadioGroup 
                value={formData.assignment_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignment_type: value, subject: '' }))}
                className="grid grid-cols-2 gap-3"
              >
                {assignmentTypes.filter(type => type.type === 'assignment').map((type) => (
                  <div key={type.value} className="flex items-center space-x-2 p-3 border border-green-200 bg-green-50/50 rounded-lg hover:bg-green-50">
                    <RadioGroupItem value={type.value} id={type.value} />
                    <div className="flex-1">
                      <Label htmlFor={type.value} className="font-medium flex items-center gap-2">
                        <BookOpen className="h-3 w-3 text-green-600" />
                        {type.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
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

          {/* Date and Time Section */}
          <div className="space-y-4">
            {/* Conditional date/time picker based on type */}
            {assignmentTypes.find(t => t.value === formData.assignment_type)?.type === 'appointment' ? (
              <div className="space-y-3 p-4 border border-blue-200 bg-blue-50/30 rounded-lg">
                <Label className="flex items-center gap-2 text-blue-700 font-medium">
                  <Calendar className="h-4 w-4" />
                  When? (Required for appointments)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="appointment_date" className="text-sm">Date *</Label>
                    <Input
                      id="appointment_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appointment_time" className="text-sm">Time *</Label>
                    <Input
                      id="appointment_time"
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointment_time: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="due_date" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Due by? (Optional for assignments)
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            )}
          </div>

          {/* Time Estimation */}
          <TimeEstimationSection
            value={formData.estimated_time_minutes}
            onChange={(value) => setFormData(prev => ({ ...prev, estimated_time_minutes: value }))}
          />

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full" type="button">
                {showAdvanced ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Hide Advanced Options
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Show Advanced Options
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 pt-4">

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

          </CollapsibleContent>
          </Collapsible>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Assignment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}