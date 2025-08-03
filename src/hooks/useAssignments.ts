import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Assignment {
  id: string;
  student_name: string;
  title: string;
  course_name?: string;
  subject?: string;
  due_date?: string;
  urgency?: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
  cognitive_load?: 'light' | 'medium' | 'heavy';
  estimated_time_minutes?: number;
  canvas_id?: string;
  canvas_url?: string;
  category?: 'academic' | 'administrative';
  created_at: string;
  updated_at: string;
  // Manual assignment fields
  assignment_type?: 'academic' | 'life_skills' | 'tutoring' | 'recurring';
  source?: 'canvas' | 'manual';
  recurrence_pattern?: any;
  notes?: string;
  priority?: 'high' | 'medium' | 'low';
  is_template?: boolean;
  parent_assignment_id?: string;
}

export const useAssignments = (studentName: string) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('student_name', studentName)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) {
        throw error;
      }

      setAssignments((data || []) as Assignment[]);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [studentName]);

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments
  };
};