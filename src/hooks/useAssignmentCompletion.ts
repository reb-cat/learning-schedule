import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { updateLearningPattern } from '@/services/intelligentInference';
import { Assignment } from './useAssignments';

export interface CompletionData {
  actualMinutes: number;
  difficultyRating: 'easy' | 'medium' | 'hard';
  notes?: string;
}

export function useAssignmentCompletion() {
  const [isLoading, setIsLoading] = useState(false);

  const markAsCompleted = async (
    assignment: Assignment, 
    completionData: CompletionData
  ): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Update assignment as completed
      const { error: updateError } = await supabase
        .from('assignments')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          actual_time_minutes: completionData.actualMinutes,
          difficulty_rating: completionData.difficultyRating,
          completion_notes: completionData.notes
        } as any)
        .eq('id', assignment.id);

      if (updateError) throw updateError;

      // Update learning patterns for future inference
      const estimatedMinutes = assignment.estimated_time_minutes || 
                               assignment.actual_estimated_minutes || 
                               30; // fallback

      await updateLearningPattern(
        assignment.student_name,
        assignment,
        estimatedMinutes,
        completionData.actualMinutes
      );

      // Log success for analytics
      console.log(`Assignment "${assignment.title}" completed successfully`, {
        estimated: estimatedMinutes,
        actual: completionData.actualMinutes,
        efficiency: completionData.actualMinutes / estimatedMinutes
      });

    } catch (error) {
      console.error('Error marking assignment as completed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getCompletionStats = async (studentName: string): Promise<{
    totalCompleted: number;
    averageAccuracy: number;
    recentTrends: Array<{ subject: string; averageEfficiency: number }>;
  }> => {
    try {
      // Get learning patterns for stats
      const { data: patterns } = await supabase
        .from('learning_patterns')
        .select('*')
        .eq('student_name', studentName);

      const totalCompleted = patterns?.reduce((sum, p) => sum + p.completion_count, 0) || 0;
      
      const accuracySum = patterns?.reduce((sum, p) => {
        const accuracy = Math.abs(1 - Math.abs(p.average_duration_factor - 1));
        return sum + accuracy;
      }, 0) || 0;
      
      const averageAccuracy = patterns?.length ? accuracySum / patterns.length : 0;

      const recentTrends = patterns?.map(p => ({
        subject: p.subject,
        averageEfficiency: p.average_duration_factor
      })) || [];

      return {
        totalCompleted,
        averageAccuracy,
        recentTrends
      };
    } catch (error) {
      console.error('Error fetching completion stats:', error);
      return {
        totalCompleted: 0,
        averageAccuracy: 0,
        recentTrends: []
      };
    }
  };

  return {
    markAsCompleted,
    getCompletionStats,
    isLoading
  };
}