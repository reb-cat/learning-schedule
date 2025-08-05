import { supabase } from '@/integrations/supabase/client';

/**
 * Utility to clean up existing split assignment issues
 * This function finds split assignments where all parts are complete
 * and marks the parent assignment as complete
 */
export async function cleanupSplitAssignments(studentName: string): Promise<{
  cleaned: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let cleaned = 0;

  try {
    // Find all parent assignments that have split parts
    const { data: parentAssignments, error: parentError } = await supabase
      .from('assignments')
      .select('id, title, completion_status')
      .eq('student_name', studentName)
      .eq('is_template', true)
      .eq('eligible_for_scheduling', false)
      .neq('completion_status', 'completed');

    if (parentError) {
      errors.push(`Error fetching parent assignments: ${parentError.message}`);
      return { cleaned, errors };
    }

    if (!parentAssignments || parentAssignments.length === 0) {
      console.log('No parent assignments found that need cleanup');
      return { cleaned, errors };
    }

    console.log(`Found ${parentAssignments.length} parent assignments to check`);

    // Check each parent assignment
    for (const parent of parentAssignments) {
      try {
        // Get all split parts for this parent
        const { data: splitParts, error: splitError } = await supabase
          .from('assignments')
          .select('id, completion_status, split_part_number, total_split_parts')
          .eq('parent_assignment_id', parent.id)
          .eq('student_name', studentName);

        if (splitError) {
          errors.push(`Error fetching split parts for ${parent.title}: ${splitError.message}`);
          continue;
        }

        if (!splitParts || splitParts.length === 0) {
          console.log(`No split parts found for ${parent.title}`);
          continue;
        }

        // Check if all parts are completed
        const completedParts = splitParts.filter(part => part.completion_status === 'completed');
        const totalParts = splitParts[0]?.total_split_parts || splitParts.length;

        console.log(`${parent.title}: ${completedParts.length}/${totalParts} parts completed`);

        if (completedParts.length === totalParts && completedParts.length > 0) {
          // All parts are complete - mark parent as complete
          const { error: updateError } = await supabase
            .from('assignments')
            .update({
              completion_status: 'completed',
              progress_percentage: 100
            })
            .eq('id', parent.id);

          if (updateError) {
            errors.push(`Error updating parent assignment ${parent.title}: ${updateError.message}`);
          } else {
            console.log(`✅ Marked parent assignment "${parent.title}" as complete`);
            cleaned++;
          }
        }
      } catch (error) {
        errors.push(`Error processing parent assignment ${parent.title}: ${error}`);
      }
    }

  } catch (error) {
    errors.push(`General error in cleanup: ${error}`);
  }

  return { cleaned, errors };
}

/**
 * Get a summary of split assignment status for debugging
 */
export async function getSplitAssignmentSummary(studentName: string): Promise<{
  parentAssignments: any[];
  splitParts: any[];
  orphanedParts: any[];
}> {
  try {
    // Get parent assignments (marked as templates)
    const { data: parentAssignments } = await supabase
      .from('assignments')
      .select('id, title, completion_status, is_template, eligible_for_scheduling')
      .eq('student_name', studentName)
      .eq('is_template', true);

    // Get split assignment parts
    const { data: splitParts } = await supabase
      .from('assignments')
      .select('id, title, completion_status, parent_assignment_id, split_part_number, total_split_parts')
      .eq('student_name', studentName)
      .eq('is_split_assignment', true);

    // Find orphaned parts (parts without valid parents)
    const parentIds = new Set(parentAssignments?.map(p => p.id) || []);
    const orphanedParts = splitParts?.filter(part => 
      part.parent_assignment_id && !parentIds.has(part.parent_assignment_id)
    ) || [];

    return {
      parentAssignments: parentAssignments || [],
      splitParts: splitParts || [],
      orphanedParts
    };
  } catch (error) {
    console.error('Error getting split assignment summary:', error);
    return {
      parentAssignments: [],
      splitParts: [],
      orphanedParts: []
    };
  }
}