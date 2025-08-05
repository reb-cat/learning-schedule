import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { createAllDayEvent } from '@/data/allDayEvents';
import { useToast } from '@/hooks/use-toast';

interface AllDayEventFormProps {
  onSuccess?: () => void;
}

export function AllDayEventForm({ onSuccess }: AllDayEventFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    student_name: '',
    event_title: '',
    event_type: 'field_trip',
    event_date: undefined as Date | undefined,
    description: ''
  });

  const eventTypes = [
    { value: 'field_trip', label: 'Field Trip', icon: '🚌' },
    { value: 'holiday', label: 'Holiday', icon: '🎉' },
    { value: 'sick_day', label: 'Sick Day', icon: '🤒' },
    { value: 'family_event', label: 'Family Event', icon: '👨‍👩‍👧‍👦' },
    { value: 'travel', label: 'Travel Day', icon: '✈️' },
    { value: 'appointment', label: 'All-Day Appointment', icon: '🏥' },
    { value: 'other', label: 'Other', icon: '📅' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_name || !formData.event_title || !formData.event_date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        student_name: formData.student_name,
        event_title: formData.event_title,
        event_type: formData.event_type,
        event_date: format(formData.event_date, 'yyyy-MM-dd'),
        description: formData.description || undefined
      };

      const result = await createAllDayEvent(eventData);
      
      if (!result) {
        throw new Error('Failed to create all-day event');
      }

      toast({
        title: "Event Created",
        description: `${formData.event_title} has been added successfully`,
      });

      // Reset form
      setFormData({
        student_name: '',
        event_title: '',
        event_type: 'field_trip',
        event_date: undefined,
        description: ''
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error creating all-day event:', error);
      toast({
        title: "Error",
        description: "Failed to create all-day event",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedEventType = eventTypes.find(type => type.value === formData.event_type);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">Add All-Day Event</CardTitle>
        <CardDescription>Create events that block the entire day's schedule</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Title */}
          <div>
            <Input
              value={formData.event_title}
              onChange={(e) => setFormData(prev => ({ ...prev, event_title: e.target.value }))}
              placeholder="Event title (e.g., Science Museum Field Trip)"
              className="text-lg font-medium border-0 border-b border-border rounded-none px-0 py-2 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
            />
          </div>

          {/* Student & Event Type Row */}
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
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Event Type
              </Label>
              <Select value={formData.event_type} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, event_type: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="h-4 w-4" />
              Event Date
            </Label>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.event_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.event_date ? format(formData.event_date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.event_date}
                  onSelect={(date) => {
                    setFormData(prev => ({ ...prev, event_date: date }));
                    setShowDatePicker(false);
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about the event..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Preview */}
          {formData.event_title && formData.event_date && (
            <div className="p-4 bg-muted rounded-lg border">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Preview</h4>
              <div className="flex items-center gap-2 text-sm">
                <span>{selectedEventType?.icon}</span>
                <span className="font-medium">{formData.event_title}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{format(formData.event_date, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This will block all assignment scheduling for {formData.student_name} on this date.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !formData.student_name || !formData.event_title || !formData.event_date}
          >
            {loading ? 'Creating Event...' : 'Create All-Day Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}