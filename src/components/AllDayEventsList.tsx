import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trash2, Edit3 } from 'lucide-react';
import { format, parseISO, isToday, isFuture, parse } from 'date-fns';
import { getAllDayEventsForDate, AllDayEvent } from '@/data/allDayEvents';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AllDayEventsListProps {
  studentName: string;
  selectedDate?: string;
  onEventUpdate?: () => void;
}

export function AllDayEventsList({ studentName, selectedDate, onEventUpdate }: AllDayEventsListProps) {
  const { toast } = useToast();
  const [events, setEvents] = useState<AllDayEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const eventTypeConfig = {
    field_trip: { label: 'Field Trip', icon: '🚌', color: 'bg-blue-100 text-blue-800' },
    holiday: { label: 'Holiday', icon: '🎉', color: 'bg-green-100 text-green-800' },
    sick_day: { label: 'Sick Day', icon: '🤒', color: 'bg-red-100 text-red-800' },
    family_event: { label: 'Family Event', icon: '👨‍👩‍👧‍👦', color: 'bg-purple-100 text-purple-800' },
    travel: { label: 'Travel Day', icon: '✈️', color: 'bg-indigo-100 text-indigo-800' },
    appointment: { label: 'All-Day Appointment', icon: '🏥', color: 'bg-orange-100 text-orange-800' },
    other: { label: 'Other', icon: '📅', color: 'bg-gray-100 text-gray-800' }
  };

  const loadEvents = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      const eventsData = await getAllDayEventsForDate(studentName, selectedDate);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading all-day events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [studentName, selectedDate]);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('all_day_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Event Deleted",
        description: "All-day event has been removed successfully",
      });

      setEvents(prev => prev.filter(event => event.id !== eventId));
      onEventUpdate?.();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive"
      });
    }
  };

  if (!selectedDate) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading events...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return null;
  }

  const dateObj = parse(selectedDate, 'yyyy-MM-dd', new Date());
  const isDateToday = isToday(dateObj);
  const isDateFuture = isFuture(dateObj);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          All-Day Events
          {isDateToday && <Badge variant="secondary" className="text-xs">Today</Badge>}
          {isDateFuture && <Badge variant="outline" className="text-xs">Upcoming</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {events.map((event) => {
            const typeConfig = eventTypeConfig[event.event_type as keyof typeof eventTypeConfig] || eventTypeConfig.other;
            
            return (
              <div
                key={event.id}
                className="flex items-start justify-between p-3 bg-muted/50 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{typeConfig.icon}</span>
                    <h4 className="font-medium text-sm">{event.event_title}</h4>
                    <Badge variant="secondary" className={`text-xs ${typeConfig.color}`}>
                      {typeConfig.label}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-1">
                    {format(parse(event.event_date, 'yyyy-MM-dd', new Date()), "EEEE, MMMM d, yyyy")}
                  </div>
                  
                  {event.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <strong>⚠️ Schedule Override:</strong> No assignment blocks will be scheduled on this date
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEvent(event.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}