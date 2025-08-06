import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useClearAssignmentScheduling = () => {
  const [isClearing, setIsClearing] = useState(false);

  const clearScheduling = async (assignmentIds: string[]) => {
    setIsClearing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clear-assignment-scheduling', {
        body: { assignmentIds }
      });

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error clearing assignment scheduling:', error);
      throw error;
    } finally {
      setIsClearing(false);
    }
  };

  return { clearScheduling, isClearing };
};