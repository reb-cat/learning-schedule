import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduleTemplateBlock {
  id: string;
  student_name: string;
  weekday: string;
  block_number: number | null;
  start_time: string;
  end_time: string;
  subject: string | null;
  block_type: string;
}

export interface ScheduleBlock {
  student: string;
  day: string;
  block?: number;
  start: string;
  end: string;
  subject: string;
  type: string;
  isAssignmentBlock: boolean;
}

export const useScheduleTemplate = (studentName?: string) => {
  const [templateData, setTemplateData] = useState<ScheduleTemplateBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScheduleTemplate = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase.from('schedule_template').select('*');
        
        if (studentName) {
          query = query.eq('student_name', studentName);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        setTemplateData(data || []);
      } catch (err: any) {
        console.error('Error fetching schedule template:', err);
        setError(err.message || 'Failed to fetch schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchScheduleTemplate();
  }, [studentName]);

  // Transform database format to legacy format for compatibility
  const legacyScheduleData = useMemo((): ScheduleBlock[] => {
    return templateData.map(template => ({
      student: template.student_name,
      day: template.weekday,
      block: template.block_number || undefined,
      start: formatTime(template.start_time),
      end: formatTime(template.end_time),
      subject: template.subject || '',
      type: template.block_type,
      isAssignmentBlock: template.block_type === 'Assignment' || template.block_number !== null
    }));
  }, [templateData]);

  const getScheduleForStudentAndDay = (student: string, day: string): ScheduleBlock[] => {
    return legacyScheduleData.filter(block => block.student === student && block.day === day);
  };

  return {
    templateData,
    legacyScheduleData,
    getScheduleForStudentAndDay,
    loading,
    error
  };
};

// Helper function to format time from HH:MM:SS to "H:MM AM/PM"
function formatTime(timeString: string): string {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timeString; // Return original if parsing fails
  }
}

export const getCurrentDayName = (): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};