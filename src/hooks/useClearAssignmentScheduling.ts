import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useClearAssignmentScheduling = () => {
  const [isClearing, setIsClearing] = useState(false);

  const clearScheduling = async (studentNameOrIds?: string | string[]) => {
    setIsClearing(true);
    try {
      let assignmentIdsToUpdate: string[] = [];
      
      if (Array.isArray(studentNameOrIds)) {
        // Direct assignment IDs provided
        assignmentIdsToUpdate = studentNameOrIds;
      } else if (typeof studentNameOrIds === 'string') {
        // Student name provided - find their scheduled assignments
        const { data: scheduledAssignments, error: fetchError } = await supabase
          .from('assignments')
          .select('id')
          .eq('student_name', studentNameOrIds)
          .or('scheduled_date.not.is.null,scheduled_block.not.is.null,scheduled_day.not.is.null');

        if (fetchError) throw fetchError;
        
        if (!scheduledAssignments || scheduledAssignments.length === 0) {
          return { 
            success: true, 
            data: [], 
            message: `No scheduled assignments found for ${studentNameOrIds}` 
          };
        }

        assignmentIdsToUpdate = scheduledAssignments.map(a => a.id);
      } else {
        // No parameter - find all scheduled assignments
        const { data: scheduledAssignments, error: fetchError } = await supabase
          .from('assignments')
          .select('id')
          .or('scheduled_date.not.is.null,scheduled_block.not.is.null,scheduled_day.not.is.null');

        if (fetchError) throw fetchError;
        
        if (!scheduledAssignments || scheduledAssignments.length === 0) {
          return { success: true, data: [], message: 'No assignments with scheduling data found' };
        }

        assignmentIdsToUpdate = scheduledAssignments.map(a => a.id);
      }

      const { data, error } = await supabase
        .from('assignments')
        .update({ 
          scheduled_date: null, 
          scheduled_block: null, 
          scheduled_day: null 
        })
        .in('id', assignmentIdsToUpdate)
        .select('id, title');

      if (error) throw error;

      return { 
        success: true, 
        data, 
        message: `Cleared scheduling for ${assignmentIdsToUpdate.length} assignments`
      };
    } catch (error) {
      console.error('Error clearing assignments:', error);
      throw error;
    } finally {
      setIsClearing(false);
    }
  };

  return { clearScheduling, isClearing };
};