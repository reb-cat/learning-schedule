import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataValidator } from './useDataValidator';
import { DataCleanupService } from '@/services/dataCleanupService';
import { IntelligentInference } from '@/services/intelligentInference';

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
  completion_status?: 'not_started' | 'completed' | 'in_progress' | 'stuck';
  progress_percentage?: number;
  time_spent_minutes?: number;
  stuck_reason?: string;
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
  shared_block_id?: string;
  is_fixed?: boolean;
  total_split_parts?: number;
  // Instructions field
  instructions?: string;
}

export const useAssignments = (studentName: string) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataValidator = useDataValidator();

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 Fetching fresh assignments from database for ${studentName}`);
      
      // Add retry logic for network issues
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const query = supabase
            .from('assignments')
            .select('*')
            .eq('student_name', studentName)
            .order('due_date', { ascending: true, nullsFirst: false });

          const { data, error } = await query;

          if (error) {
            throw new Error(error.message);
          }

          let assignmentData = (data || []) as Assignment[];
          console.log(`📚 Found ${assignmentData.length} assignments for ${studentName}`);
          
          // Apply intelligent inference to fill missing data
          assignmentData = assignmentData.map(assignment => 
            IntelligentInference.applyInferenceToAssignment(assignment)
          );
          
          setAssignments(assignmentData);
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
      
      throw lastError || new Error('Failed to fetch assignments after retries');
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [studentName]);

  const getScheduledAssignment = useCallback(async (block: number, date: string) => {
    // Add retry logic for scheduled assignments too
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .eq('student_name', studentName)
          .eq('scheduled_block', block)
          .eq('scheduled_date', date)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        // If no assignment found for today, check if there are assignments scheduled for past dates
        if (!data) {
          console.log('🔍 No assignment found for today, checking past dates for block:', block);
          
          const { data: pastAssignments, error: pastError } = await supabase
            .from('assignments')
            .select('*')
            .eq('student_name', studentName)
            .eq('scheduled_block', block)
            .lt('scheduled_date', date)
            .eq('completion_status', 'not_started')
            .order('scheduled_date', { ascending: false })
            .limit(1);

          if (pastError) {
            console.error('Error fetching past scheduled assignments:', pastError);
            return null;
          }

          if (pastAssignments && pastAssignments.length > 0) {
            const pastAssignment = pastAssignments[0];
            console.log('🔄 Found past assignment to show:', {
              title: pastAssignment.title,
              originalDate: pastAssignment.scheduled_date,
              requestedDate: date,
              block: block
            });
            
            return pastAssignment as Assignment;
          }
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
  }, [studentName]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Data cleanup utilities
  const cleanupData = useCallback(async () => {
    try {
      await DataCleanupService.cleanupAssignmentData(studentName);
      // Refresh data after cleanup
      await fetchAssignments();
    } catch (error) {
      console.error('Data cleanup failed:', error);
    }
  }, [studentName, fetchAssignments]);

  const validateData = useCallback(async () => {
    return await dataValidator.validateAssignmentData(studentName);
  }, [studentName, dataValidator]);

  const repairData = useCallback(async () => {
    const result = await dataValidator.validateAndRepairData(studentName);
    if (result.repaired > 0) {
      // Refresh data after repair
      await fetchAssignments();
    }
    return result;
  }, [studentName, dataValidator, fetchAssignments]);

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments,
    getScheduledAssignment,
    cleanupData,
    validateData,
    repairData
  };
};