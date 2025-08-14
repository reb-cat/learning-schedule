/**
 * Transforms schedule and assignment data for guided day view
 * This shared function ensures consistent behavior across all student dashboards
 */
export function transformScheduleForGuidedView(
  todaySchedule: any[],
  scheduledAssignments: Record<string, any>,
  studentName: string,
  formattedDate: string
) {
  return todaySchedule
    .map((b: any, idx: number) => {
      let base;
      
      if (b.isAssignmentBlock) {
        // This is an assignment block - use the scheduled assignment
        base = scheduledAssignments[`${b.block}`] ?? null;
      } else {
        // This is a fixed block - check if there's a real assignment for this subject/time
        const fixedAssignment = Object.values(scheduledAssignments).find((assignment: any) => 
          assignment?.is_fixed && 
          assignment?.subject?.toLowerCase() === b.subject?.toLowerCase()
        );
        
        if (fixedAssignment) {
          // Use the real fixed assignment
          base = fixedAssignment;
        } else {
          // Create synthetic assignment for blocks like Movement, Lunch, Travel
          base = {
            id: `fixed-${formattedDate}-${b.block ?? idx}`,
            title: b.subject || b.type || 'Scheduled Block',
            subject: b.subject || b.type || 'Schedule',
            course_name: null,
            completion_status: 'not_started',
            actual_estimated_minutes: undefined,
            instructions: `${b.subject ? b.subject + ' • ' : ''}${b.start} - ${b.end}`,
            student_name: studentName, // Required field for Assignment interface
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }
      
      if (!base) return null;
      return {
        ...base,
        _blockStart: b.start,
        _blockEnd: b.end,
        _isAssignmentBlock: b.isAssignmentBlock,
        _blockIndex: b.block ?? idx,
      };
    })
    .filter(Boolean as any);
}