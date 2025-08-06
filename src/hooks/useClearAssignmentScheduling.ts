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
          .not('scheduled_date', 'is', null);

        if (fetchError) throw fetchError;

        const { data: scheduledAssignments2, error: fetchError2 } = await supabase
          .from('assignments') 
          .select('id')
          .eq('student_name', studentNameOrIds)
          .not('scheduled_block', 'is', null);

        if (fetchError2) throw fetchError2;

        const { data: scheduledAssignments3, error: fetchError3 } = await supabase
          .from('assignments')
          .select('id')
          .eq('student_name', studentNameOrIds)
          .not('scheduled_day', 'is', null);

        if (fetchError3) throw fetchError3;

        // Combine and deduplicate the results
        const allScheduledIds = [...new Set([
          ...(scheduledAssignments || []).map(a => a.id),
          ...(scheduledAssignments2 || []).map(a => a.id), 
          ...(scheduledAssignments3 || []).map(a => a.id)
        ])];
        
        if (allScheduledIds.length === 0) {
          return { 
            success: true, 
            data: [], 
            message: `No scheduled assignments found for ${studentNameOrIds}` 
          };
        }

        assignmentIdsToUpdate = allScheduledIds;
      } else {
        // No parameter - find all scheduled assignments
        const { data: scheduledAssignments, error: fetchError } = await supabase
          .from('assignments')
          .select('id')
          .not('scheduled_date', 'is', null);

        if (fetchError) throw fetchError;

        const { data: scheduledAssignments2, error: fetchError2 } = await supabase
          .from('assignments') 
          .select('id')
          .not('scheduled_block', 'is', null);

        if (fetchError2) throw fetchError2;

        const { data: scheduledAssignments3, error: fetchError3 } = await supabase
          .from('assignments')
          .select('id') 
          .not('scheduled_day', 'is', null);

        if (fetchError3) throw fetchError3;

        // Combine and deduplicate the results
        const allScheduledIds = [...new Set([
          ...(scheduledAssignments || []).map(a => a.id),
          ...(scheduledAssignments2 || []).map(a => a.id), 
          ...(scheduledAssignments3 || []).map(a => a.id)
        ])];

        if (allScheduledIds.length === 0) {
          return { success: true, data: [], message: 'No assignments with scheduling data found' };
        }

        assignmentIdsToUpdate = allScheduledIds;
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