import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useClearAssignmentScheduling = () => {
  const [isClearing, setIsClearing] = useState(false);

  const getScheduledAssignments = async (studentName: string) => {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, title, scheduled_date, scheduled_block, scheduled_day')
      .eq('student_name', studentName)
      .or('scheduled_date.is.not.null,scheduled_block.is.not.null,scheduled_day.is.not.null');

    if (error) {
      throw error;
    }

    return data || [];
  };

  const clearScheduling = async (studentName: string) => {
    setIsClearing(true);
    try {
      // First, get all scheduled assignments for the student
      const scheduledAssignments = await getScheduledAssignments(studentName);
      
      if (scheduledAssignments.length === 0) {
        return { 
          success: true, 
          data: [], 
          message: `No scheduled assignments found for ${studentName}` 
        };
      }

      const assignmentIds = scheduledAssignments.map(a => a.id);

      const { data, error } = await supabase
        .from('assignments')
        .update({ 
          scheduled_date: null, 
          scheduled_block: null, 
          scheduled_day: null 
        })
        .in('id', assignmentIds)
        .select('id, title');

      if (error) {
        throw error;
      }

      return { 
        success: true, 
        data, 
        message: `Cleared scheduling for ${scheduledAssignments.length} assignments`
      };
    } catch (error) {
      console.error('Error clearing assignment scheduling:', error);
      throw error;
    } finally {
      setIsClearing(false);
    }
  };

  return { clearScheduling, getScheduledAssignments, isClearing };
};