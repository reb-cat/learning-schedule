import { Assignment } from '@/hooks/useAssignments';
import { supabase } from '@/integrations/supabase/client';
import { getScheduleForStudentAndDay } from '@/data/scheduleData';
import { 
  inferCognitiveLoad, 
  inferDuration, 
  getOptimalSchedulingTime,
  updateLearningPattern,
  inferSubjectFromTitle 
} from './intelligentInference';
import { blockSharingScheduler } from './blockSharingScheduler';

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
  splitAssignments: Assignment[];
  unscheduledAssignments: Assignment[];
  administrativeTasks: Assignment[];
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
}

class UnifiedScheduler {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cache = new Map<string, { result: UnifiedSchedulingResult; timestamp: number }>();

  /**
   * Main scheduling method that combines the best of all existing schedulers
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

    console.log(`🚀 Unified Scheduler: Starting analysis for ${studentName}`, { options });

    // Check cache first
    const cacheKey = this.generateCacheKey(studentName, options);
    const cached = this.getCachedResult(cacheKey);
    if (cached && !autoExecute) {
      console.log('📋 Unified Scheduler: Using cached result');
      return cached;
    }

    try {
      // Use the robust block sharing scheduler as the foundation
      const blockSharingResult = await blockSharingScheduler.analyzeAndSchedule(
        studentName, 
        daysAhead, 
        startDate
      );

      // Transform the result to our unified format
      const unifiedResult = this.transformToUnifiedFormat(blockSharingResult);

      // Cache the result
      this.setCachedResult(cacheKey, unifiedResult);

      // Auto-execute if requested and no critical warnings
      if (autoExecute && !this.hasCriticalWarnings(unifiedResult)) {
        console.log('🔄 Unified Scheduler: Auto-executing schedule');
        await this.executeSchedule(unifiedResult, studentName);
      }

      console.log('✅ Unified Scheduler: Analysis complete', {
        scheduledTasks: unifiedResult.stats.scheduledTasks,
        unscheduledTasks: unifiedResult.stats.unscheduledTasks,
        warnings: unifiedResult.warnings.length
      });

      return unifiedResult;

    } catch (error) {
      console.error('❌ Unified Scheduler: Analysis failed', error);
      throw error;
    }
  }

  /**
   * Execute the scheduling decisions
   */
  async executeSchedule(
    result: UnifiedSchedulingResult, 
    studentName: string
  ): Promise<void> {
    console.log('💾 Unified Scheduler: Executing schedule', {
      decisions: result.decisions.length,
      splitAssignments: result.splitAssignments.length
    });

    try {
      const today = new Date();
      const updates: Array<{
        id: string;
        scheduled_block: number;
        scheduled_date: string;
        scheduled_day: string;
      }> = [];

      // Process main scheduling decisions
      for (const decision of result.decisions) {
        const targetDate = new Date(decision.targetDate);
        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        updates.push({
          id: decision.assignment.id,
          scheduled_block: decision.targetBlock,
          scheduled_date: decision.targetDate,
          scheduled_day: dayName
        });
      }

      // Process split assignments
      for (const assignment of result.splitAssignments) {
        if (assignment.scheduled_date && assignment.scheduled_block) {
          const targetDate = new Date(assignment.scheduled_date);
          const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
          
          updates.push({
            id: assignment.id,
            scheduled_block: assignment.scheduled_block,
            scheduled_date: assignment.scheduled_date,
            scheduled_day: dayName
          });
        }
      }

      // Execute all updates
      for (const update of updates) {
        const { error } = await supabase
          .from('assignments')
          .update({
            scheduled_block: update.scheduled_block,
            scheduled_date: update.scheduled_date,
            scheduled_day: update.scheduled_day
          })
          .eq('id', update.id);

        if (error) {
          throw new Error(`Failed to update assignment ${update.id}: ${error.message}`);
        }
      }

      console.log(`✅ Unified Scheduler: Successfully updated ${updates.length} assignments`);

    } catch (error) {
      console.error('❌ Unified Scheduler: Execution failed', error);
      throw error;
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
   * Clear cache for a specific student or all students
   */
  invalidateCache(studentName?: string): void {
    if (studentName) {
      for (const [key] of this.cache) {
        if (key.includes(studentName)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    console.log(`🗑️ Unified Scheduler: Cache invalidated for ${studentName || 'all students'}`);
  }

  private generateCacheKey(studentName: string, options: SchedulerOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${studentName}-${optionsStr}`;
  }

  private getCachedResult(cacheKey: string): UnifiedSchedulingResult | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    if (cached) {
      this.cache.delete(cacheKey);
    }
    return null;
  }

  private setCachedResult(cacheKey: string, result: UnifiedSchedulingResult): void {
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  private transformToUnifiedFormat(blockSharingResult: any): UnifiedSchedulingResult {
    const decisions: UnifiedSchedulingDecision[] = [];
    const splitAssignments: Assignment[] = [];
    const unscheduledAssignments: Assignment[] = [];
    const administrativeTasks: Assignment[] = [];

    // Transform academic blocks to decisions
    for (const block of blockSharingResult.academic_blocks || []) {
      for (const task of block.tasks || []) {
        decisions.push({
          assignment: task.assignment,
          targetDate: block.date,
          targetBlock: block.block_number,
          reasoning: `Block ${block.block_number} on ${block.day}`,
          urgencyLevel: this.calculateUrgency(task.assignment),
          estimatedMinutes: task.allocated_minutes || task.assignment.estimated_time_minutes || 30,
          cognitiveLoad: task.assignment.cognitive_load || 'medium'
        });
      }
    }

    // Add administrative tasks
    for (const task of blockSharingResult.administrative_tasks || []) {
      administrativeTasks.push(task);
    }

    // Add unscheduled tasks
    for (const task of blockSharingResult.unscheduled_tasks || []) {
      unscheduledAssignments.push(task);
    }

    const stats = {
      totalBlocks: blockSharingResult.academic_blocks?.length || 0,
      scheduledTasks: decisions.length,
      adminTasks: administrativeTasks.length,
      unscheduledTasks: unscheduledAssignments.length
    };

    return {
      decisions,
      splitAssignments,
      unscheduledAssignments,
      administrativeTasks,
      warnings: blockSharingResult.warnings || [],
      stats
    };
  }

  private calculateUrgency(assignment: Assignment): 'critical' | 'high' | 'medium' | 'low' {
    if (!assignment.due_date) return 'low';

    const dueDate = new Date(assignment.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 0) return 'critical';      // Overdue
    if (daysUntilDue === 1) return 'critical';     // Due tomorrow
    if (daysUntilDue === 2) return 'high';         // Due day after tomorrow
    if (daysUntilDue <= 4) return 'medium';        // Due this week
    return 'low';                                  // Due later
  }

  private hasCriticalWarnings(result: UnifiedSchedulingResult): boolean {
    return result.warnings.some(warning => 
      warning.includes('overdue') || 
      warning.includes('critical') ||
      warning.includes('heavy cognitive load')
    );
  }
}

// Export singleton instance
export const unifiedScheduler = new UnifiedScheduler();