import { supabase } from '@/integrations/supabase/client';
import { Assignment } from '@/hooks/useAssignments';
import { IntelligentInference } from './intelligentInference';

export class DataCleanupService {
  static async cleanupAssignmentData(studentName: string): Promise<void> {
    console.log(`🧹 Starting data cleanup for ${studentName}`);
    
    try {
      // Fetch assignments that need cleanup
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('student_name', studentName)
        .or('cognitive_load.is.null,urgency.is.null');

      if (error) {
        throw error;
      }

      if (!assignments || assignments.length === 0) {
        console.log(`✅ No assignments need cleanup for ${studentName}`);
        return;
      }

      console.log(`🔧 Cleaning up ${assignments.length} assignments for ${studentName}`);

      // Apply intelligent inference to each assignment
      const cleanedAssignments = assignments.map(assignment => 
        IntelligentInference.applyInferenceToAssignment(assignment as Assignment)
      );

      // Update assignments in batches
      const batchSize = 10;
      for (let i = 0; i < cleanedAssignments.length; i += batchSize) {
        const batch = cleanedAssignments.slice(i, i + batchSize);
        
        for (const assignment of batch) {
          const { error: updateError } = await supabase
            .from('assignments')
            .update({
              cognitive_load: assignment.cognitive_load,
              urgency: assignment.urgency,
              task_type: assignment.task_type || 'academic'
            })
            .eq('id', assignment.id);

          if (updateError) {
            console.error(`❌ Failed to update assignment ${assignment.id}:`, updateError);
          }
        }
        
        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < cleanedAssignments.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Completed data cleanup for ${studentName}`);
    } catch (error) {
      console.error(`❌ Data cleanup failed for ${studentName}:`, error);
      throw error;
    }
  }

  static async validateAssignmentData(studentName: string): Promise<{
    total: number;
    missing_cognitive_load: number;
    missing_urgency: number;
    missing_task_type: number;
  }> {
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('cognitive_load, urgency, task_type')
      .eq('student_name', studentName);

    if (error) {
      throw error;
    }

    const stats = {
      total: assignments?.length || 0,
      missing_cognitive_load: assignments?.filter(a => !a.cognitive_load).length || 0,
      missing_urgency: assignments?.filter(a => !a.urgency).length || 0,
      missing_task_type: assignments?.filter(a => !a.task_type).length || 0,
    };

    return stats;
  }
}