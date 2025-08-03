import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Assignment } from './useAssignments';

interface PerformanceData {
  assignmentId: string;
  studentName: string;
  subject?: string;
  scheduledBlock: number;
  scheduledDate: string;
  actualMinutes: number;
  estimatedMinutes: number;
  difficultyRating: 'easy' | 'medium' | 'hard';
  completedAt: string;
}

interface EnergyPatternUpdate {
  studentName: string;
  patternType: 'subject_based' | 'time_based';
  energyData: any;
  confidenceAdjustment?: number;
}

export function useEnergyPatternLearning() {
  const [isLearning, setIsLearning] = useState(false);

  /**
   * Record performance data for energy pattern learning
   */
  const recordPerformanceData = async (data: PerformanceData): Promise<void> => {
    try {
      // Store performance data for later analysis
      const { error } = await supabase
        .from('learning_patterns')
        .upsert({
          student_name: data.studentName,
          subject: data.subject || 'General',
          assignment_type: 'performance_tracking',
          completion_count: 1,
          total_estimated_minutes: data.estimatedMinutes,
          total_actual_minutes: data.actualMinutes,
          typical_cognitive_load: data.difficultyRating === 'easy' ? 'light' : 
                                  data.difficultyRating === 'medium' ? 'medium' : 'heavy'
        }, {
          onConflict: 'student_name,subject,assignment_type',
          ignoreDuplicates: false
        });

      if (error) throw error;

      // Additional performance metadata could be stored in a separate table
      // for more detailed analysis
      
    } catch (error) {
      console.error('Failed to record performance data:', error);
      throw error;
    }
  };

  /**
   * Analyze performance patterns and suggest energy pattern updates
   */
  const analyzeAndUpdateEnergyPattern = async (studentName: string): Promise<void> => {
    setIsLearning(true);
    
    try {
      // Get recent performance data
      const { data: performanceData, error } = await supabase
        .from('learning_patterns')
        .select('*')
        .eq('student_name', studentName)
        .eq('assignment_type', 'performance_tracking')
        .gte('last_updated', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('last_updated', { ascending: false });

      if (error) throw error;

      if (!performanceData || performanceData.length < 5) {
        console.log('Not enough performance data for pattern analysis');
        return;
      }

      // Get current energy pattern
      const { data: currentPattern, error: patternError } = await supabase
        .from('student_energy_patterns')
        .select('*')
        .eq('student_name', studentName)
        .single();

      if (patternError) throw patternError;

      // Simple analysis: identify patterns in efficiency
      const efficiencyBySubject = performanceData.reduce((acc, record) => {
        const efficiency = record.total_estimated_minutes / Math.max(record.total_actual_minutes, 1);
        if (!acc[record.subject]) {
          acc[record.subject] = [];
        }
        acc[record.subject].push(efficiency);
        return acc;
      }, {} as Record<string, number[]>);

      // Calculate average efficiency by subject
      const avgEfficiencyBySubject = Object.entries(efficiencyBySubject).reduce((acc, [subject, efficiencies]) => {
        acc[subject] = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
        return acc;
      }, {} as Record<string, number>);

      // Update energy patterns based on efficiency
      if (currentPattern.pattern_type === 'subject_based') {
        const energyData = currentPattern.energy_data as any;
        const updatedEnergyData = { ...energyData };

        // Move subjects between energy categories based on efficiency
        Object.entries(avgEfficiencyBySubject).forEach(([subject, efficiency]) => {
          // Remove subject from all categories first
          updatedEnergyData.high_energy_subjects = updatedEnergyData.high_energy_subjects?.filter((s: string) => s !== subject) || [];
          updatedEnergyData.medium_energy_subjects = updatedEnergyData.medium_energy_subjects?.filter((s: string) => s !== subject) || [];
          updatedEnergyData.low_energy_subjects = updatedEnergyData.low_energy_subjects?.filter((s: string) => s !== subject) || [];

          // Add to appropriate category based on efficiency
          if (efficiency >= 1.2) {
            updatedEnergyData.high_energy_subjects.push(subject);
          } else if (efficiency >= 0.8) {
            updatedEnergyData.medium_energy_subjects.push(subject);
          } else {
            updatedEnergyData.low_energy_subjects.push(subject);
          }
        });

        // Update the pattern in database
        await updateEnergyPattern({
          studentName,
          patternType: 'subject_based',
          energyData: updatedEnergyData,
          confidenceAdjustment: 0.1
        });
      }

      console.log(`Energy pattern updated for ${studentName} based on performance analysis`);
      
    } catch (error) {
      console.error('Failed to analyze and update energy pattern:', error);
      throw error;
    } finally {
      setIsLearning(false);
    }
  };

  /**
   * Update energy pattern in database
   */
  const updateEnergyPattern = async (update: EnergyPatternUpdate): Promise<void> => {
    try {
      const { error } = await supabase
        .rpc('update_energy_pattern', {
          p_student_name: update.studentName,
          p_energy_data: update.energyData,
          p_confidence_adjustment: update.confidenceAdjustment || 0.1
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update energy pattern:', error);
      throw error;
    }
  };

  /**
   * Get current energy pattern confidence scores
   */
  const getPatternConfidence = async (studentName: string): Promise<{ confidence: number; dataPoints: number } | null> => {
    try {
      const { data, error } = await supabase
        .from('student_energy_patterns')
        .select('confidence_score, data_points_count')
        .eq('student_name', studentName)
        .single();

      if (error) throw error;

      return {
        confidence: data.confidence_score,
        dataPoints: data.data_points_count
      };
    } catch (error) {
      console.error('Failed to get pattern confidence:', error);
      return null;
    }
  };

  return {
    recordPerformanceData,
    analyzeAndUpdateEnergyPattern,
    updateEnergyPattern,
    getPatternConfidence,
    isLearning
  };
}