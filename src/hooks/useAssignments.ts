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
      
      const tableName = currentMode === 'staging' ? 'assignments_staging' : 'assignments';
      console.log(`🔍 Fetching assignments from ${tableName} for ${studentName}`);
      
      // Add retry logic for network issues
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const query = supabase
            .from(tableName)
            .select('*')
            .eq('student_name', studentName)
            .order('due_date', { ascending: true, nullsFirst: false });

          const { data, error } = await query;

          if (error) {
            throw new Error(error.message);
          }

          console.log(`📚 Found ${data?.length || 0} assignments for ${studentName}`);
          setAssignments((data || []) as Assignment[]);
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Unknown error');
          console.warn(`Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
          
          if (attempt < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
      
      // All retries failed
      throw lastError || new Error('Failed to fetch assignments after retries');
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const getScheduledAssignment = async (block: number, date: string) => {
    const tableName = currentMode === 'staging' ? 'assignments_staging' : 'assignments';
    
    // Add retry logic for scheduled assignments too
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('student_name', studentName)
          .eq('scheduled_block', block)
          .eq('scheduled_date', date)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        return data as Assignment | null;
      } catch (err) {
        console.error(`Error fetching scheduled assignment (attempt ${attempt}):`, err);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          return null;
        }
      }
    }
    
    return null;
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