import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { updateLearningPattern } from '@/services/intelligentInference';
import { Assignment } from './useAssignments';
import { useEnergyPatternLearning } from './useEnergyPatternLearning';

export interface CompletionData {
  timeSpent: number;
  difficulty: 'easy' | 'medium' | 'hard';
  notes?: string;
  status: 'not_started' | 'completed' | 'in_progress' | 'stuck' | 'need_more_time';
  progress?: number;
}

export function useAssignmentCompletion() {
  const [isLoading, setIsLoading] = useState(false);
  const { recordPerformanceData } = useEnergyPatternLearning();

  const updateAssignmentStatus = async (assignment: Assignment, completionData: CompletionData) => {
    // Skip database updates for synthetic assignments
    if ((assignment as any).is_synthetic || (assignment.id && assignment.id.toString().startsWith('fixed-'))) {
      console.log('Skipping database update for synthetic assignment:', assignment.title);
      return;
    }

    setIsLoading(true);
    try {
      // If marking "need_more_time" or "in_progress", create a continuation assignment
      if (completionData.status === 'need_more_time' || completionData.status === 'in_progress') {
        const continuationTime = Math.max(15, (assignment.estimated_time_minutes || 30) - completionData.timeSpent);
        
        const { error: continuationError } = await supabase
          .from('assignments')
          .insert({
            student_name: assignment.student_name,
            title: `${assignment.title} [CONTINUED]`,
            course_name: assignment.course_name,
            subject: assignment.subject,
            assignment_type: assignment.assignment_type,
            category: assignment.category,
            task_type: assignment.assignment_type || 'academic', // Use assignment_type as fallback
            source: 'continuation',
            estimated_time_minutes: continuationTime,
            due_date: assignment.due_date,
            completion_status: 'not_started',
            notes: `Continuation of: ${assignment.title}. Original time spent: ${completionData.timeSpent} minutes.`,
            parent_assignment_id: assignment.id,
            eligible_for_scheduling: true,
            instructions: assignment.instructions
          });

        if (continuationError) {
          console.error('Error creating continuation assignment:', continuationError);
        }
      }

      const { error } = await supabase
        .from('assignments')
        .update({
          completion_status: completionData.status === 'in_progress' ? 'need_more_time' : completionData.status,
          time_spent_minutes: completionData.timeSpent,
          completion_notes: completionData.notes,
          progress_percentage: completionData.progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignment.id);

      // If this assignment has a shared_block_id, update all other assignments with the same shared_block_id
      if (!error && assignment.shared_block_id && completionData.status === 'completed') {
        console.log('Updating shared assignments with shared_block_id:', assignment.shared_block_id);
        
        const { error: sharedUpdateError } = await supabase
          .from('assignments')
          .update({
            completion_status: completionData.status,
            time_spent_minutes: completionData.timeSpent,
            completion_notes: completionData.notes,
            progress_percentage: completionData.progress,
            updated_at: new Date().toISOString()
          })
          .eq('shared_block_id', assignment.shared_block_id)
          .neq('id', assignment.id);

        if (sharedUpdateError) {
          console.error('Error updating shared assignments:', sharedUpdateError);
        }
      }

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      // Update learning patterns only for completed assignments (non-blocking)
      if (completionData.status === 'completed') {
        try {
          const estimatedMinutes = assignment.estimated_time_minutes || 
                                   assignment.actual_estimated_minutes || 
                                   30; // fallback

          await updateLearningPattern(
            assignment.student_name,
            assignment,
            estimatedMinutes,
            completionData.timeSpent
          );
        } catch (learningError) {
          console.warn('Learning pattern update failed (non-critical):', learningError);
        }
      }

      // Record performance data for energy pattern learning (non-blocking)
      if (assignment.scheduled_block && assignment.scheduled_date && completionData.status === 'completed') {
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
            actualMinutes: completionData.timeSpent,
            estimatedMinutes,
            difficultyRating: completionData.difficulty,
            completedAt: new Date().toISOString()
          });
        } catch (energyError) {
          console.warn('Energy pattern update failed (non-critical):', energyError);
        }
      }

      // For continuation assignments, just mark this assignment as complete
      // No need for split assignment logic since we use the same assignment record

      // Log success for analytics
      console.log(`Assignment "${assignment.title}" status updated to ${completionData.status}`, {
        status: completionData.status,
        timeSpent: completionData.timeSpent,
        progress: completionData.progress || 0
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