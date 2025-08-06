import { supabase } from '@/integrations/supabase/client';

export interface AllDayEvent {
  id: string;
  student_name: string;
  event_date: string;
  event_title: string;
  event_type: string;
  description?: string;
  created_at: string;
  updated_at: string;
  start_date?: string;
  end_date?: string;
  event_group_id?: string;
}

/**
 * Get all-day events for a specific student on a specific date
 */
export async function getAllDayEventsForDate(studentName: string, date: string): Promise<AllDayEvent[]> {
  const { data, error } = await supabase
    .from('all_day_events')
    .select('*')
    .eq('student_name', studentName)
    .eq('event_date', date);

  if (error) {
    console.error('Error fetching all-day events:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if a specific date has any all-day events for a student
 */
export async function hasAllDayEvent(studentName: string, date: string): Promise<boolean> {
  const events = await getAllDayEventsForDate(studentName, date);
  return events.length > 0;
}

/**
 * Create a new all-day event (supports multi-day events)
 */
export async function createAllDayEvent(eventData: {
  student_name: string;
  event_title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  description?: string;
}): Promise<AllDayEvent[] | null> {
  try {
    const startDate = new Date(eventData.start_date);
    const endDate = new Date(eventData.end_date);
    const events: any[] = [];
    const eventGroupId = crypto.randomUUID();

    // Create an event for each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      events.push({
        student_name: eventData.student_name,
        event_title: eventData.event_title,
        event_type: eventData.event_type,
        event_date: dateString,
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        event_group_id: eventGroupId,
        description: eventData.description
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const { data, error } = await supabase
      .from('all_day_events')
      .insert(events)
      .select();

    if (error) {
      console.error('Error creating all-day event:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createAllDayEvent:', error);
    return null;
  }
}

/**
 * Get events grouped by event_group_id for display
 */
export async function getGroupedAllDayEvents(studentName: string, date: string): Promise<AllDayEvent[][]> {
  const { data, error } = await supabase
    .from('all_day_events')
    .select('*')
    .eq('student_name', studentName)
    .lte('start_date', date)
    .gte('end_date', date);

  if (error) {
    console.error('Error fetching grouped all-day events:', error);
    return [];
  }

  // Group events by event_group_id
  const grouped = data?.reduce((acc, event) => {
    const groupId = event.event_group_id || event.id;
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(event);
    return acc;
  }, {} as Record<string, AllDayEvent[]>) || {};

  return Object.values(grouped);
}

/**
 * Delete an entire event group (for multi-day events)
 */
export async function deleteEventGroup(eventGroupId: string): Promise<boolean> {
  const { error } = await supabase
    .from('all_day_events')
    .delete()
    .eq('event_group_id', eventGroupId);

  if (error) {
    console.error('Error deleting event group:', error);
    return false;
  }

  return true;
}

/**
 * Get the effective schedule for a student and day, considering all-day events
 * Returns null if there's an all-day event (meaning no assignment blocks available)
 */
export async function getEffectiveScheduleForDay(
  studentName: string, 
  dayName: string, 
  date: string,
  getScheduleForStudentAndDay: (student: string, day: string) => any[]
): Promise<any[] | null> {
  // Check if there's an all-day event on this date
  const hasEvent = await hasAllDayEvent(studentName, date);
  
  if (hasEvent) {
    console.log(`⚠️ All-day event detected for ${studentName} on ${date} - skipping assignment scheduling`);
    return null; // No assignment blocks available
  }

  // Return normal schedule
  return getScheduleForStudentAndDay(studentName, dayName);
}