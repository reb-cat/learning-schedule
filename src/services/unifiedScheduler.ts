import { Assignment } from '@/hooks/useAssignments';
import { supabase } from '@/integrations/supabase/client';
import { getScheduleForStudentAndDay } from '@/data/scheduleData';
import { format, isValid, parseISO } from 'date-fns';
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

    // Verify current date for August 2025 debugging
    this.verifyCurrentDate();

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
  ): Promise<{ success: boolean; errors: string[]; successCount: number; totalCount: number }> {
    console.log('🚀 UNIFIED SCHEDULER EXECUTION START', {
      studentName,
      decisions: result.decisions.length,
      splitAssignments: result.splitAssignments.length,
      timestamp: new Date().toISOString()
    });

    const executionErrors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      const today = new Date();
      const updates: Array<{
        id: string;
        scheduled_block: number;
        scheduled_date: string;
        scheduled_day: string;
        originalTitle?: string;
      }> = [];

      console.log('📊 Processing scheduling decisions:', result.decisions.length);
      
      // Process main scheduling decisions
      for (const decision of result.decisions) {
        console.log('🎯 Processing decision:', {
          assignmentId: decision.assignment.id,
          title: decision.assignment.title,
          targetDate: decision.targetDate,
          targetBlock: decision.targetBlock,
          isValidUUID: this.isValidUUID(decision.assignment.id)
        });

        const targetDate = new Date(decision.targetDate);
        const dayName = this.formatDayName(targetDate);
        const formattedDate = this.formatDateString(targetDate);
        
        updates.push({
          id: decision.assignment.id,
          scheduled_block: decision.targetBlock,
          scheduled_date: formattedDate,
          scheduled_day: dayName,
          originalTitle: decision.assignment.title
        });
      }

      console.log('📊 Processing split assignments:', result.splitAssignments.length);
      
      // Process split assignments
      for (const assignment of result.splitAssignments) {
        console.log('✂️ Processing split assignment:', {
          assignmentId: assignment.id,
          title: assignment.title,
          scheduledDate: assignment.scheduled_date,
          scheduledBlock: assignment.scheduled_block,
          isValidUUID: this.isValidUUID(assignment.id)
        });

        if (assignment.scheduled_date && assignment.scheduled_block) {
          const targetDate = new Date(assignment.scheduled_date);
          const dayName = this.formatDayName(targetDate);
          const formattedDate = this.formatDateString(targetDate);
          
          updates.push({
            id: assignment.id,
            scheduled_block: assignment.scheduled_block,
            scheduled_date: formattedDate,
            scheduled_day: dayName,
            originalTitle: assignment.title
          });
        }
      }

      console.log('💾 Total updates to execute:', updates.length);
      console.log('📋 Full update list:', updates);

      // Execute all updates with detailed error collection
      for (const update of updates) {
        console.log(`🔄 Executing update ${successCount + errorCount + 1}/${updates.length}:`, {
          id: update.id,
          title: update.originalTitle,
          scheduled_block: update.scheduled_block,
          scheduled_date: update.scheduled_date,
          scheduled_day: update.scheduled_day
        });

        try {
          // Extract base UUID for split assignments and validate
          const baseId = this.extractBaseUUID(update.id);
          console.log(`🔍 UUID extraction and validation:`, {
            originalId: update.id,
            extractedBaseId: baseId,
            isValidUUID: this.isValidUUID(baseId),
            containsPartSuffix: update.id.includes('_part_')
          });

          if (!this.isValidUUID(baseId)) {
            const errorMsg = `Invalid UUID format: ${update.id} -> ${baseId}`;
            console.warn(`⚠️ ${errorMsg}`);
            executionErrors.push(`${update.originalTitle || update.id}: ${errorMsg}`);
            errorCount++;
            continue;
          }

          console.log(`✅ UUID validation passed for: ${baseId}`);

          const { data, error } = await supabase
            .from('assignments')
            .update({
              scheduled_block: update.scheduled_block,
              scheduled_date: update.scheduled_date,
              scheduled_day: update.scheduled_day
            })
            .eq('id', baseId)
            .select();

          console.log(`📝 Supabase update result for ${baseId}:`, {
            error: error?.message || null,
            rowsAffected: data?.length || 0,
            data: data?.[0] || null
          });

          if (error) {
            const errorMsg = `Database error: ${error.message} (Code: ${error.code || 'unknown'})`;
            console.error(`❌ SUPABASE ERROR for assignment ${update.id}:`, {
              error,
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            });
            executionErrors.push(`${update.originalTitle || update.id}: ${errorMsg}`);
            errorCount++;
            continue;
          }

          if (!data || data.length === 0) {
            const errorMsg = `Assignment not found in database`;
            console.error(`❌ NO ROWS UPDATED for assignment ${update.id} - Assignment might not exist`);
            executionErrors.push(`${update.originalTitle || update.id}: ${errorMsg}`);
            errorCount++;
            continue;
          }

          console.log(`✅ Successfully updated assignment ${update.id}`);
          successCount++;

        } catch (updateError: any) {
          const errorMsg = `Unexpected error: ${updateError.message || 'Unknown error'}`;
          console.error(`💥 EXCEPTION during update for ${update.id}:`, {
            error: updateError.message,
            stack: updateError.stack
          });
          executionErrors.push(`${update.originalTitle || update.id}: ${errorMsg}`);
          errorCount++;
        }
      }

      console.log(`🎉 UNIFIED SCHEDULER EXECUTION COMPLETE:`, {
        totalUpdates: updates.length,
        successCount,
        errorCount,
        successRate: updates.length > 0 ? (successCount / updates.length * 100).toFixed(1) + '%' : '0%',
        timestamp: new Date().toISOString()
      });

      return {
        success: successCount > 0,
        errors: executionErrors,
        successCount,
        totalCount: updates.length
      };

    } catch (error: any) {
      const fatalError = `Fatal execution error: ${error.message || 'Unknown error'}`;
      console.error('💥 UNIFIED SCHEDULER EXECUTION FAILED:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        errors: [fatalError, ...executionErrors],
        successCount,
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
   * Extract base UUID from potentially split assignment IDs
   */
  private extractBaseUUID(id: string): string {
    // Handle split assignment IDs like "uuid_part_1"
    const parts = id.split('_part_');
    const baseId = parts[0];
    
    console.log('🔧 UNIFIED UUID extraction:', {
      originalId: id,
      splitParts: parts,
      extractedBaseId: baseId,
      hadPartSuffix: parts.length > 1
    });
    
    return baseId;
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(uuid);
    
    if (!isValid) {
      console.warn('🔍 UNIFIED UUID VALIDATION DETAILS:', {
        uuid,
        length: uuid.length,
        containsUnderscorePart: uuid.includes('_part_'),
        startsWithValidChar: /^[0-9a-f]/.test(uuid),
        format: 'Expected: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      });
    }
    
    return isValid;
  }

  /**
   * Format date as YYYY-MM-DD string consistently using date-fns
   */
  private formatDateString(date: Date): string {
    // Validate the date first
    if (!isValid(date)) {
      console.error('❌ Invalid date provided to formatDateString:', date);
      return format(new Date(), 'yyyy-MM-dd');
    }
    
    const formatted = format(date, 'yyyy-MM-dd');
    
    console.log('📅 Date formatting:', {
      inputDate: date.toISOString(),
      formatted,
      isAugust2025: date.getFullYear() === 2025 && date.getMonth() === 7,
      currentYear: date.getFullYear(),
      currentMonth: date.getMonth() + 1 // 0-indexed, so +1 for human readable
    });
    
    return formatted;
  }

  /**
   * Format day name consistently using date-fns
   */
  private formatDayName(date: Date): string {
    if (!isValid(date)) {
      console.error('❌ Invalid date provided to formatDayName:', date);
      return format(new Date(), 'EEEE');
    }
    
    const dayName = format(date, 'EEEE');
    
    console.log('📅 Day name formatting:', {
      inputDate: date.toISOString(),
      dayName,
      dayOfWeek: date.getDay(),
      isValidDate: isValid(date)
    });
    
    return dayName;
  }

  /**
   * Verify current system date for debugging August 2025 scenarios
   */
  private verifyCurrentDate(): void {
    const now = new Date();
    const isAugust2025 = now.getFullYear() === 2025 && now.getMonth() === 7; // August is month 7 (0-indexed)
    
    console.log('📅 Current System Date Verification:', {
      currentDate: now.toISOString(),
      formattedDate: this.formatDateString(now),
      dayName: this.formatDayName(now),
      year: now.getFullYear(),
      month: now.getMonth() + 1, // 1-indexed for human readable
      monthName: format(now, 'MMMM'),
      date: now.getDate(),
      isAugust2025,
      expectedScenario: 'Should be August 2025 for testing'
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

    console.log('⏰ Urgency calculation:', {
      assignmentTitle: assignment.title,
      dueDate: assignment.due_date,
      dueDateParsed: dueDate.toISOString(),
      today: today.toISOString(),
      todayFormatted: this.formatDateString(today),
      daysUntilDue,
      isAugust2025: today.getFullYear() === 2025 && today.getMonth() === 7
    });

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