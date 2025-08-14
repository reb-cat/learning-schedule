import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { updateLearningPattern } from '@/services/intelligentInference';
import { Assignment } from './useAssignments';
import { useEnergyPatternLearning } from './useEnergyPatternLearning';

export interface CompletionData {
  actualMinutes: number;
  difficultyRating: 'easy' | 'medium' | 'hard';
  notes?: string;
  completionStatus: 'not_started' | 'completed' | 'in_progress' | 'stuck';
  progressPercentage?: number;
  stuckReason?: string;
}

export function useAssignmentCompletion() {
  const [isLoading, setIsLoading] = useState(false);
  const { recordPerformanceData } = useEnergyPatternLearning();

  const updateAssignmentStatus = async (
    assignment: Assignment, 
    completionData: CompletionData
  ): Promise<void> => {
    setIsLoading(true);
    
    try {
      console.log('Updating assignment status:', {
        assignmentId: assignment.id,
        completionStatus: completionData.completionStatus,
        progressPercentage: completionData.progressPercentage
      });

      // Skip database updates for synthetic fixed schedule blocks
      if (assignment.id.startsWith('fixed-')) {
        console.log('Skipping database update for synthetic schedule block:', assignment.id);
        setIsLoading(false);
        return;
      }

      // Update assignment with completion data
      const { error: updateError } = await supabase
        .from('assignments')
        .update({
          completion_status: completionData.completionStatus,
          time_spent_minutes: completionData.actualMinutes,
          completion_notes: completionData.notes,
          progress_percentage: completionData.progressPercentage || 0,
          stuck_reason: completionData.stuckReason,
          // Clear scheduling if in progress or stuck to allow rescheduling
          scheduled_block: completionData.completionStatus !== 'completed' ? null : assignment.scheduled_block,
          scheduled_date: completionData.completionStatus !== 'completed' ? null : assignment.scheduled_date
        })
        .eq('id', assignment.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }

      // Update learning patterns only for completed assignments (non-blocking)
      if (completionData.completionStatus === 'completed') {
        try {
          const estimatedMinutes = assignment.estimated_time_minutes || 
                                   assignment.actual_estimated_minutes || 
                                   30; // fallback

          await updateLearningPattern(
            assignment.student_name,
            assignment,
            estimatedMinutes,
            completionData.actualMinutes
          );
        } catch (learningError) {
          console.warn('Learning pattern update failed (non-critical):', learningError);
        }
      }

      // Record performance data for energy pattern learning (non-blocking)
      if (assignment.scheduled_block && assignment.scheduled_date && completionData.completionStatus === 'completed') {
        try {
          const estimatedMinutes = assignment.estimated_time_minutes || 
                                   assignment.actual_estimated_minutes || 
                                   30; // fallback
          
          await recordPerformanceData({
            assignmentId: assignment.id,
            studentName: assignment.student_name,
            subject: assignment.subject || assignment.course_name,
            scheduledBlock: assignment.scheduled_block,
            scheduledDate: assignment.scheduled_date,
            actualMinutes: completionData.actualMinutes,
            estimatedMinutes,
            difficultyRating: completionData.difficultyRating,
            completedAt: new Date().toISOString()
          });
        } catch (energyError) {
          console.warn('Energy pattern update failed (non-critical):', energyError);
        }
      }

      // For continuation assignments, just mark this assignment as complete
      // No need for split assignment logic since we use the same assignment record

      // Log success for analytics
      console.log(`Assignment "${assignment.title}" status updated to ${completionData.completionStatus}`, {
        status: completionData.completionStatus,
        timeSpent: completionData.actualMinutes,
        progress: completionData.progressPercentage || 0,
        stuckReason: completionData.stuckReason
      });

    } catch (error) {
      console.error('Error updating assignment status:', error);
      console.error('Assignment data:', assignment);
      console.error('Completion data:', completionData);
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

  // Note: Split assignment logic removed - we now use assignment continuation
  // where the same assignment appears across multiple blocks until marked complete

  return {
    updateAssignmentStatus,
    getCompletionStats,
    isLoading
  };
}