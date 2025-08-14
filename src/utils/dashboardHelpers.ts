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
      const base = b.isAssignmentBlock
        ? (scheduledAssignments[`${b.block}`] ?? null)
        : {
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