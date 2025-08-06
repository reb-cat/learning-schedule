import { Assignment } from '@/hooks/useAssignments';
import { supabase } from '@/integrations/supabase/client';
import { blockSharingScheduler, SchedulingDecision, TaskClassification } from './blockSharingScheduler';
import { format, isValid } from 'date-fns';

export interface UnifiedSchedulingDecision {
  assignment: Assignment;
  targetDate: string;
  targetBlock: number;
  reasoning: string;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  cognitiveLoad: 'light' | 'medium' | 'heavy';
}

export interface UnifiedSchedulingResult {
  decisions: UnifiedSchedulingDecision[];
  splitAssignments: TaskClassification[];
  unscheduledAssignments: TaskClassification[];
  administrativeTasks: TaskClassification[];
  warnings: string[];
  stats: {
    totalBlocks: number;
    scheduledTasks: number;
    adminTasks: number;
    unscheduledTasks: number;
  };
}

export interface SchedulerOptions {
  daysAhead?: number;
  startDate?: Date;
  previewOnly?: boolean;
  includeAdminTasks?: boolean;
  autoExecute?: boolean;
  currentTime?: Date;
}

class UnifiedScheduler {
  /**
   * Main scheduling method - thin merge layer that combines existing schedules with new ones
   */
  async analyzeAndSchedule(
    studentName: string, 
    options: SchedulerOptions = {}
  ): Promise<UnifiedSchedulingResult> {
    const {
      daysAhead = 7,
      startDate = new Date(),
      previewOnly = false,
      includeAdminTasks = true,
      autoExecute = false
    } = options;

    console.log(`🚀 Unified Scheduler: Merging schedules for ${studentName}`, { options });

    try {
      // Step 1: Get existing scheduled assignments
      const existingScheduled = await this.getExistingScheduledAssignments(studentName, daysAhead, startDate);
      
      // Step 2: Get new schedule from blockSharingScheduler (handles unscheduled items)
      const blockSharingResult = await blockSharingScheduler.analyzeAndSchedule(
        studentName, 
        daysAhead, 
        startDate,
        options.currentTime
      );

      // Step 3: Merge existing + new schedules
      const mergedResult = this.mergeSchedulingResults(existingScheduled, blockSharingResult, studentName);

      // Step 4: Auto-execute if requested
      if (autoExecute && !this.hasCriticalWarnings(mergedResult)) {
        console.log('🔄 Unified Scheduler: Auto-executing schedule');
        await this.executeSchedule(mergedResult, studentName);
      }

      console.log('✅ Unified Scheduler: Merge complete', {
        scheduledTasks: mergedResult.stats.scheduledTasks,
        unscheduledTasks: mergedResult.stats.unscheduledTasks
      });

      return mergedResult;

    } catch (error) {
      console.error('❌ Unified Scheduler: Merge failed', error);
      throw error;
    }
  }

  /**
   * Get existing scheduled assignments to preserve them
   */
  private async getExistingScheduledAssignments(
    studentName: string, 
    daysAhead: number, 
    startDate: Date
  ): Promise<Assignment[]> {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('student_name', studentName)
      .not('scheduled_block', 'is', null)
      .gte('scheduled_date', startDate.toISOString().split('T')[0])
      .lte('scheduled_date', endDate.toISOString().split('T')[0]);

    if (error) {
      console.error('Failed to fetch existing scheduled assignments:', error);
      return [];
    }

    return (data || []) as Assignment[];
  }

  /**
   * Merge existing scheduled assignments with new scheduling decisions
   */
  private mergeSchedulingResults(
    existingScheduled: Assignment[], 
    newResult: SchedulingDecision,
    studentName: string
  ): UnifiedSchedulingResult {
    // Convert existing scheduled to unified format
    const existingDecisions: UnifiedSchedulingDecision[] = existingScheduled.map(assignment => ({
      assignment,
      targetDate: assignment.scheduled_date!,
      targetBlock: assignment.scheduled_block!,
      reasoning: 'Previously scheduled',
      urgencyLevel: this.calculateUrgency(assignment),
      estimatedMinutes: assignment.estimated_time_minutes || 30,
      cognitiveLoad: 'medium' as const
    }));

    // Convert new academic blocks to unified format  
    const newDecisions: UnifiedSchedulingDecision[] = [];
    for (const block of newResult.academic_blocks || []) {
      for (const task of block.tasks || []) {
        // Convert TaskClassification to Assignment format for unified interface
        const assignmentFromTask: Assignment = {
          ...task.assignment,
          student_name: studentName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          estimated_time_minutes: task.assignment.estimated_time,
          due_date: task.assignment.due_date ? task.assignment.due_date.toISOString() : null
        } as Assignment;

        newDecisions.push({
          assignment: assignmentFromTask,
          targetDate: block.date,
          targetBlock: block.block_number,
          reasoning: `Block ${block.block_number} on ${block.day}`,
          urgencyLevel: this.calculateUrgencyFromTask(task.assignment),
          estimatedMinutes: task.allocated_minutes || task.assignment.estimated_time || 30,
          cognitiveLoad: 'medium' as const
        });
      }
    }

    // Combine all decisions
    const allDecisions = [...existingDecisions, ...newDecisions];

    return {
      decisions: allDecisions,
      splitAssignments: [], // Not handling splits in simple merge
      unscheduledAssignments: newResult.unscheduled_tasks,
      administrativeTasks: newResult.administrative_tasks,
      warnings: newResult.warnings,
      stats: {
        totalBlocks: allDecisions.length,
        scheduledTasks: allDecisions.length,
        adminTasks: newResult.administrative_tasks.length,
        unscheduledTasks: newResult.unscheduled_tasks.length
      }
    };
  }

  /**
   * Execute the scheduling decisions
   */
  async executeSchedule(
    result: UnifiedSchedulingResult, 
    studentName: string
  ): Promise<{ success: boolean; errors: string[]; successCount: number; totalCount: number }> {
    console.log('🚀 Unified Scheduler: Executing schedule', {
      studentName,
      decisions: result.decisions.length
    });

    const executionErrors: string[] = [];
    let successCount = 0;

    try {
      // Only process new scheduling decisions (skip "Previously scheduled" ones)
      const newDecisions = result.decisions.filter(d => d.reasoning !== 'Previously scheduled');
      
      for (const decision of newDecisions) {
        try {
          const { error } = await supabase
            .from('assignments')
            .update({
              scheduled_block: decision.targetBlock,
              scheduled_date: decision.targetDate,
              scheduled_day: this.formatDayName(new Date(decision.targetDate))
            })
            .eq('id', decision.assignment.id);

          if (error) {
            executionErrors.push(`${decision.assignment.title}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (updateError: any) {
          executionErrors.push(`${decision.assignment.title}: ${updateError.message}`);
        }
      }

      return {
        success: successCount > 0,
        errors: executionErrors,
        successCount,
        totalCount: newDecisions.length
      };

    } catch (error: any) {
      console.error('❌ Unified Scheduler: Execution failed', error);
      return {
        success: false,
        errors: [`Critical execution error: ${error.message}`],
        successCount: 0,
        totalCount: 0
      };
    }
  }

  /**
   * Get scheduling preview for today only (simplified mode)
   */
  async getTodayPreview(studentName: string): Promise<UnifiedSchedulingResult> {
    return this.analyzeAndSchedule(studentName, {
      daysAhead: 1,
      startDate: new Date(),
      previewOnly: true
    });
  }

  /**
   * Calculate urgency level for an assignment
   */
  private calculateUrgency(assignment: Assignment): 'critical' | 'high' | 'medium' | 'low' {
    if (!assignment.due_date) return 'low';
    
    const dueDate = new Date(assignment.due_date);
    const today = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return 'critical';
    if (daysDiff <= 1) return 'high';
    if (daysDiff <= 3) return 'medium';
    return 'low';
  }

  /**
   * Calculate urgency level for a task classification
   */
  private calculateUrgencyFromTask(task: TaskClassification): 'critical' | 'high' | 'medium' | 'low' {
    if (!task.due_date) return 'low';
    
    const dueDate = new Date(task.due_date);
    const today = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return 'critical';
    if (daysDiff <= 1) return 'high';
    if (daysDiff <= 3) return 'medium';
    return 'low';
  }

  /**
   * Check if result has critical warnings
   */
  private hasCriticalWarnings(result: UnifiedSchedulingResult): boolean {
    return result.warnings.some(warning => 
      warning.toLowerCase().includes('critical') || 
      warning.toLowerCase().includes('overdue')
    );
  }

  /**
   * Format day name consistently using date-fns
   */
  private formatDayName(date: Date): string {
    if (!isValid(date)) {
      console.error('❌ Invalid date provided to formatDayName:', date);
      return format(new Date(), 'EEEE');
    }
    
    return format(date, 'EEEE');
  }
}

// Export singleton instance
export const unifiedScheduler = new UnifiedScheduler();