import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { stagingUtils, type StagingMode } from '@/utils/stagingUtils';

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
  actual_estimated_minutes?: number;
  canvas_id?: string;
  canvas_url?: string;
  category?: 'academic' | 'administrative';
  created_at: string;
  updated_at: string;
  // Completion tracking fields
  completed?: boolean;
  completed_at?: string;
  actual_time_minutes?: number;
  difficulty_rating?: 'easy' | 'medium' | 'hard';
  completion_notes?: string;
  // Manual assignment fields
  assignment_type?: 'academic' | 'life_skills' | 'tutoring' | 'recurring';
  source?: 'canvas' | 'manual';
  recurrence_pattern?: any;
  notes?: string;
  priority?: 'high' | 'medium' | 'low';
  is_template?: boolean;
  parent_assignment_id?: string;
  // Scheduling fields
  scheduled_block?: number;
  scheduled_date?: string;
  scheduled_day?: string;
  // Multi-day scheduling fields
  original_assignment_id?: string;
  estimated_blocks_needed?: number;
  scheduling_priority?: number;
  is_split_assignment?: boolean;
  split_part_number?: number;
  total_split_parts?: number;
}

export const useAssignments = (studentName: string, mode?: StagingMode) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentMode = mode || stagingUtils.getCurrentMode();

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data, error;
      if (currentMode === 'staging') {
        const result = await supabase
          .from('assignments_staging')
          .select('*')
          .eq('student_name', studentName)
          .order('due_date', { ascending: true, nullsFirst: false });
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from('assignments')
          .select('*')
          .eq('student_name', studentName)
          .order('due_date', { ascending: true, nullsFirst: false });
        data = result.data;
        error = result.error;
      }

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

  const getScheduledAssignment = async (block: number, date: string) => {
    try {
      let data, error;
      if (currentMode === 'staging') {
        const result = await supabase
          .from('assignments_staging')
          .select('*')
          .eq('student_name', studentName)
          .eq('scheduled_block', block)
          .eq('scheduled_date', date)
          .maybeSingle();
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from('assignments')
          .select('*')
          .eq('student_name', studentName)
          .eq('scheduled_block', block)
          .eq('scheduled_date', date)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching scheduled assignment:', error);
        return null;
      }

      return data as Assignment | null;
    } catch (err) {
      console.error('Error in getScheduledAssignment:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [studentName, currentMode]);

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments,
    getScheduledAssignment
  };
};