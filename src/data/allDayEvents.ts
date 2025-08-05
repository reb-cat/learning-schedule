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
 * Create a new all-day event
 */
export async function createAllDayEvent(event: Omit<AllDayEvent, 'id' | 'created_at' | 'updated_at'>): Promise<AllDayEvent | null> {
  const { data, error } = await supabase
    .from('all_day_events')
    .insert(event)
    .select()
    .single();

  if (error) {
    console.error('Error creating all-day event:', error);
    return null;
  }

  return data;
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