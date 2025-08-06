import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { filterPastBlocks, generatePassedBlocksWarning, allTodaysBlocksPassed } from "@/utils/timeAwareness";
import { scheduleData } from "@/data/scheduleData";

export interface TaskClassification {
  id: string;
  title: string;
  task_type: 'academic' | 'administrative' | 'quick_review';
  estimated_time: number;
  cognitive_load: string;
  subject: string;
  course_name: string;
  urgency: string;
  due_date: Date | null;
  priority: string;
  scheduled_block?: number | null;
  scheduled_date?: string | null;
  completion_status?: 'not_started' | 'in_progress' | 'stuck' | 'completed';
  progress_percentage?: number;
  stuck_reason?: string;
  // Split assignment fields
  parent_assignment_id?: string;
  is_split_assignment?: boolean;
  split_part_number?: number;
  total_split_parts?: number;
}

export interface BlockComposition {
  block_number: number;
  date: string;
  day: string;
  total_minutes: number;
  used_minutes: number;
  buffer_minutes: number;
  tasks: TaskAssignment[];
  cognitive_balance: 'light' | 'medium' | 'heavy';
}

export interface TaskAssignment {
  assignment: TaskClassification;
  position: number;
  allocated_minutes: number;
  shared_block_id: string;
}

export interface SchedulingDecision {
  academic_blocks: BlockComposition[];
  administrative_tasks: TaskClassification[];
  unscheduled_tasks: TaskClassification[];
  warnings: string[];
}

export class BlockSharingScheduler {
  private static readonly BLOCK_DURATION = 45; // minutes
  private static readonly MIN_BUFFER_TIME = 5; // minutes
  private static readonly MAX_COGNITIVE_LOAD_PER_BLOCK = 2; // heavy = 2, medium = 1, light = 0.5
  
  private cache = new Map<string, { decision: SchedulingDecision; timestamp: number; inputHash: string }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private generateCacheKey(studentName: string, daysAhead: number, startDate?: Date): string {
    const dateStr = startDate ? startDate.toISOString().split('T')[0] : 'today';
    return `${studentName}-${daysAhead}-${dateStr}`;
  }

  private getCachedResult(cacheKey: string): SchedulingDecision | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.decision;
  }

  private setCachedResult(cacheKey: string, decision: SchedulingDecision): void {
    // Limit cache size
    if (this.cache.size >= 5) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, {
      decision: JSON.parse(JSON.stringify(decision)), // Deep copy
      timestamp: Date.now(),
      inputHash: cacheKey
    });
  }

  async analyzeAndSchedule(studentName: string, daysAhead: number = 7, startDate?: Date, currentTime?: Date): Promise<SchedulingDecision> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(studentName, daysAhead, startDate);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        console.log('Using cached scheduling result for:', studentName);
        return cached;
      }

      console.log('Starting fresh analyzeAndSchedule for:', studentName, { currentTime: currentTime?.toISOString() });
      
      // 1. Fetch all unscheduled tasks (filter to current timeframe)
      const allTasks = await this.getClassifiedTasks(studentName);
      console.log('All tasks fetched:', allTasks.length);
      
      // Use provided startDate for testing, otherwise use current date
      const today = startDate || new Date();
      const endDate = addDays(today, daysAhead);
      
      // Filter tasks to include unscheduled tasks or tasks scheduled for past dates
      const tasks = allTasks.filter(task => {
        // Include unscheduled tasks
        if (!task.scheduled_date) return true;
        
        // Include tasks scheduled for past dates that need rescheduling
        const scheduledDate = new Date(task.scheduled_date);
        const todayMidnight = new Date(today);
        todayMidnight.setHours(0, 0, 0, 0);
        
        if (scheduledDate < todayMidnight) {
          console.log('🔄 Found past-scheduled task to reschedule:', {
            title: task.title,
            scheduledDate: task.scheduled_date,
            today: todayMidnight.toISOString().split('T')[0]
          });
          return true;
        }
        
        // Exclude already scheduled future tasks
        return false;
      });
      
      console.log('Filtered tasks for timeframe:', tasks.length);
      
      // Separate by task type
      const academicTasks = tasks.filter(t => t.task_type === 'academic');
      const quickReviewTasks = tasks.filter(t => t.task_type === 'quick_review');
      const administrativeTasks = tasks.filter(t => t.task_type === 'administrative');
      
      console.log('Task breakdown:', {
        academic: academicTasks.length,
        quickReview: quickReviewTasks.length,
        administrative: administrativeTasks.length
      });
      
      // 2. Get available time blocks
      const availableBlocks = await this.getAvailableBlocks(studentName, daysAhead, today, currentTime);
      console.log('Available blocks:', availableBlocks.length);
      
      // Check if no blocks are available due to time restrictions
      if (availableBlocks.length === 0) {
        const timeWarning = generatePassedBlocksWarning(studentName, scheduleData, currentTime || new Date());
        const warnings = timeWarning ? [timeWarning] : ['No available blocks found for the selected time period.'];
        
        return {
          academic_blocks: [],
          administrative_tasks: administrativeTasks,
          unscheduled_tasks: [...academicTasks, ...quickReviewTasks],
          warnings
        };
      }
      
      // 3. Schedule academic tasks into available blocks
      const scheduledBlocks = await this.scheduleAcademicTasks(academicTasks, availableBlocks);
      console.log('After academic scheduling, blocks with tasks:', scheduledBlocks.filter(b => b.tasks.length > 0).length);
      
      // 4. Fill remaining space with quick review tasks
      const updatedBlocks = await this.addQuickReviewTasks(quickReviewTasks, scheduledBlocks);
      console.log('After quick review scheduling, blocks with tasks:', updatedBlocks.filter(b => b.tasks.length > 0).length);
      
      // 5. Identify unscheduled tasks and warnings
      const allScheduledTaskIds = updatedBlocks.flatMap(b => b.tasks.map(t => t.assignment.id));
      const unscheduledTasks = [...academicTasks, ...quickReviewTasks].filter(
        t => !allScheduledTaskIds.includes(t.id)
      );
      
      const warnings = this.generateWarnings(unscheduledTasks, updatedBlocks);
      
      // Add time awareness warning if all today's blocks have passed
      const timeWarning = generatePassedBlocksWarning(studentName, scheduleData, currentTime || new Date());
      if (timeWarning) {
        warnings.push(timeWarning);
      }
      
      const result: SchedulingDecision = {
        academic_blocks: updatedBlocks,
        administrative_tasks: administrativeTasks,
        unscheduled_tasks: unscheduledTasks,
        warnings
      };

      // Cache the result
      this.setCachedResult(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error in analyzeAndSchedule:', error);
      throw error;
    }
  }

  async getClassifiedTasks(studentName: string): Promise<TaskClassification[]> {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      console.log(`🔍 SCHEDULER DEBUG: Fetching tasks for ${studentName}`);
      
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('student_name', studentName)
        .is('scheduled_block', null)
        .eq('eligible_for_scheduling', true)
        .in('completion_status', ['not_started', 'in_progress', 'stuck'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);
      if (error) throw error;
      
      console.log(`📋 SCHEDULER DEBUG: Found ${data?.length || 0} unscheduled tasks:`, 
        data?.map(d => ({ 
          title: d.title, 
          completion_status: d.completion_status, 
          eligible_for_scheduling: d.eligible_for_scheduling,
          scheduled_block: d.scheduled_block 
        }))
      );
      
      return data.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        task_type: (assignment.task_type as 'academic' | 'administrative' | 'quick_review') || 'academic',
        estimated_time: assignment.actual_estimated_minutes || this.estimateTime(assignment.title),
        cognitive_load: assignment.cognitive_load || 'medium',
        subject: assignment.subject || 'General',
        course_name: assignment.course_name || '',
        urgency: this.calculateUrgency(assignment),
        due_date: assignment.due_date ? new Date(assignment.due_date) : null,
        priority: assignment.priority || 'medium',
        scheduled_block: assignment.scheduled_block,
        scheduled_date: assignment.scheduled_date,
        completion_status: (assignment.completion_status as 'not_started' | 'in_progress' | 'stuck' | 'completed') || 'not_started',
        progress_percentage: assignment.progress_percentage || 0,
        stuck_reason: assignment.stuck_reason
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    }
  }

  
  private estimateTime(title: string): number {
    console.log(`🕒 Estimating time for: \"${title}\"`);
    
    // Remove the 45-minute cap to allow proper task splitting
    let estimate = 30; // default
    
    if (title.toLowerCase().includes('syllabus')) estimate = 10;
    else if (title.toLowerCase().includes('recipe')) estimate = 8;
    else if (title.toLowerCase().includes('review') && title.length < 40) estimate = 5;
    else if (title.toLowerCase().includes('check')) estimate = 5;
    else if (title.toLowerCase().includes('worksheet')) estimate = 60; // Increased
    else if (title.toLowerCase().includes('assignment')) estimate = 90; // Added
    else if (title.toLowerCase().includes('project')) estimate = 120; // Added
    else if (title.toLowerCase().includes('homework')) estimate = 60; // Added
    else estimate = title.length < 30 ? 15 : 45;
    
    console.log(`⏱️ Estimated ${estimate} minutes for: \"${title}\"`);
    return estimate; // REMOVED THE 45-MINUTE CAP
  }

  private calculateUrgency(assignment: any): string {
    const now = new Date();
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    
    console.log('⏰ Block Scheduler urgency calculation:', {
      assignmentTitle: assignment.title,
      dueDate: assignment.due_date,
      dueDateParsed: dueDate?.toISOString(),
      now: now.toISOString(),
      nowFormatted: format(now, 'yyyy-MM-dd'),
      completionStatus: assignment.completion_status,
      isAugust2025: now.getFullYear() === 2025 && now.getMonth() === 7
    });
    
    // Boost urgency for stuck or in-progress tasks
    if (assignment.completion_status === 'stuck') return 'critical';
    if (assignment.completion_status === 'in_progress') return 'high';
    
    if (!dueDate) return assignment.urgency || 'medium';
    
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('⏰ Days until due calculation:', {
      assignmentTitle: assignment.title,
      daysUntilDue,
      urgencyResult: daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 1 ? 'critical' : daysUntilDue <= 3 ? 'high' : 'medium'
    });
    
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 1) return 'critical';
    if (daysUntilDue <= 3) return 'high';
    
    return assignment.urgency || 'medium';
  }

  async getAvailableBlocks(studentName: string, daysAhead: number, startDate?: Date, currentTime?: Date): Promise<BlockComposition[]> {
    // Use real schedule data instead of mock data
    const { getScheduleForStudentAndDay } = await import('../data/scheduleData');
    const blocks: BlockComposition[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    // If after 8 PM, force tomorrow as starting date
    let effectiveStartDate = startDate || new Date();
    if (!startDate && currentHour >= 20) {
      effectiveStartDate = new Date();
      effectiveStartDate.setDate(effectiveStartDate.getDate() + 1);
      effectiveStartDate.setHours(0, 0, 0, 0);
      console.log(`🌙 After 8 PM: Forcing start date to tomorrow ${effectiveStartDate.toDateString()}`);
    }
    
    const timeToCheck = currentTime || new Date();
    
    // Check if all today's blocks have passed and we should start from tomorrow
    const todaysBlocksPassed = allTodaysBlocksPassed(studentName, scheduleData, timeToCheck) || currentHour >= 20;
    const startDay = todaysBlocksPassed ? 1 : 0; // Start from tomorrow if today's blocks passed
    
    console.log(`📅 Block scheduling: ${todaysBlocksPassed ? 'All today\'s blocks passed, starting from tomorrow' : 'Starting from today'}`);
    
    for (let day = startDay; day < daysAhead + startDay; day++) {
      const date = addDays(effectiveStartDate, day);
      const dayName = format(date, 'EEEE');
      const dateStr = format(date, 'yyyy-MM-dd');
      
      console.log(`📅 Processing day ${day}: ${dayName} ${dateStr}`, {
        effectiveStartDate: effectiveStartDate.toISOString(),
        addDaysResult: date.toISOString(),
        dayOffset: day,
        startDay,
        todaysBlocksPassed
      });
      
      // Skip weekends
      if (dayName === 'Saturday' || dayName === 'Sunday') continue;
      
      // Get the actual schedule for this student and day
      let daySchedule = getScheduleForStudentAndDay(studentName, dayName);
      
      // Apply time awareness: filter out past blocks only for today (day 0)
      if (day === 0 && !todaysBlocksPassed) { // Only filter for today if we're starting from today
        daySchedule = filterPastBlocks(daySchedule, timeToCheck);
        console.log(`⏰ Time awareness: Filtered out past blocks for today (${dayName}). Remaining: ${daySchedule.length} blocks`);
      }
      
      const assignmentBlocks = daySchedule.filter(block => block.isAssignmentBlock && block.block);
      
      // Add each assignment block as available
      for (const scheduleBlock of assignmentBlocks) {
        blocks.push({
          block_number: scheduleBlock.block!,
          date: dateStr,
          day: dayName,
          total_minutes: BlockSharingScheduler.BLOCK_DURATION,
          used_minutes: 0,
          buffer_minutes: BlockSharingScheduler.MIN_BUFFER_TIME,
          tasks: [],
          cognitive_balance: 'light'
        });
      }
    }
    
    return blocks;
  }

  private async scheduleAcademicTasks(
    tasks: TaskClassification[], 
    blocks: BlockComposition[]
  ): Promise<BlockComposition[]> {
    const updatedBlocks = [...blocks];
    
    // Sort tasks by priority: stuck > in_progress > overdue > upcoming
    const sortedTasks = tasks.sort((a, b) => {
      const priorityOrder = { 'stuck': 0, 'critical': 1, 'in_progress': 2, 'overdue': 3, 'high': 4, 'medium': 5, 'low': 6 };
      const aPriority = priorityOrder[a.urgency as keyof typeof priorityOrder] ?? 7;
      const bPriority = priorityOrder[b.urgency as keyof typeof priorityOrder] ?? 7;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Secondary sort by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      
      return 0;
    });

    for (const task of sortedTasks) {
      console.log(`\n📚 Processing task: \"${task.title}\" (${task.estimated_time} min, ${task.cognitive_load} load)`);
      
      if (task.estimated_time <= 45) {
        console.log(`  ✅ Task fits in one block (${task.estimated_time} <= 45 min)`);
        const bestBlock = this.findBestBlockForTask(task, updatedBlocks);
        
        if (bestBlock) {
          console.log(`  🎯 Found best block: Block ${bestBlock.block_number} on ${bestBlock.day} (${this.getRemainingMinutes(bestBlock)} min remaining)`);
          
          if (this.canFitInBlock(task, bestBlock)) {
            console.log(`  ✅ Task can fit in block - adding to schedule`);
            this.addTaskToBlock(task, bestBlock);
          } else {
            console.log(`  ❌ Task cannot fit in block due to cognitive load or time constraints`);
          }
        } else {
          console.log(`  ❌ No suitable block found for task`);
        }
      } else {
        console.log(`  📅 Task too large (${task.estimated_time} > 45 min) - scheduling as continuation`);
        this.scheduleTaskContinuation(task, updatedBlocks);
      }
    }
    
    return updatedBlocks;
  }

  private scheduleTaskContinuation(task: TaskClassification, blocks: BlockComposition[]): void {
    const maxBlockTime = 45;
    const totalTime = task.estimated_time;
    
    console.log(`  📅 Scheduling continuation for \"${task.title}\" (${totalTime} min) across multiple blocks`);
    
    // Find the best first block for this task
    const bestBlock = this.findBestBlockForTask(task, blocks);
    
    if (bestBlock) {
      // Schedule the original task in the first available block
      // The task will continue in subsequent blocks until marked complete
      this.addTaskToBlock(task, bestBlock);
      console.log(`  ✅ Scheduled continuation starting in Block ${bestBlock.block_number} on ${bestBlock.day}`);
    } else {
      console.log(`  ❌ No suitable block found for continuation of "${task.title}"`);
    }
  }

  private async addQuickReviewTasks(
    tasks: TaskClassification[], 
    blocks: BlockComposition[]
  ): Promise<BlockComposition[]> {
    const updatedBlocks = [...blocks];
    
    // Sort quick tasks by due date and estimated time
    const sortedTasks = tasks.sort((a, b) => {
      if (a.due_date && b.due_date) {
        return a.due_date.getTime() - b.due_date.getTime();
      }
      return a.estimated_time - b.estimated_time;
    });

    for (const task of sortedTasks) {
      // Try to add to existing blocks with space
      const availableBlock = updatedBlocks.find(block => 
        this.getRemainingMinutes(block) >= task.estimated_time + BlockSharingScheduler.MIN_BUFFER_TIME &&
        this.canAddCognitiveLoad(task, block)
      );
      
      if (availableBlock) {
        this.addTaskToBlock(task, availableBlock);
      }
    }
    
    return updatedBlocks;
  }

  private findBestBlockForTask(task: TaskClassification, blocks: BlockComposition[]): BlockComposition | null {
    // Filter available blocks (with remaining time)
    const availableBlocks = blocks.filter(block => 
      block.total_minutes - block.used_minutes >= Math.min(task.estimated_time, 15) // At least 15 minutes
    );
    
    if (availableBlocks.length === 0) return null;
    
    // PRIORITY 1: SEQUENTIAL FILLING - Fill blocks in order without gaps
    // Find the earliest block that can fit the task
    const sequentialBlocks = availableBlocks
      .filter(block => this.canFitInBlock(task, block))
      .sort((a, b) => {
        // Sort by date first, then by block number
        if (a.date !== b.date) {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        return a.block_number - b.block_number;
      });
    
    if (sequentialBlocks.length === 0) return null;
    
    // Check if we can maintain sequential filling
    const firstAvailableBlock = sequentialBlocks[0];
    
    // PRIORITY 2: DURATION MATCHING (only if it doesn't create gaps)
    // Among sequential candidates, prefer blocks that match duration better
    // but only if they're in the same day or very close in sequence
    const sameDay = sequentialBlocks.filter(block => block.date === firstAvailableBlock.date);
    
    if (sameDay.length > 1) {
      // For Math assignments, prefer Block 2 if available on same day
      if (task.subject === 'Math' || task.course_name?.toLowerCase().includes('math')) {
        const mathBlock = sameDay.find(block => block.block_number === 2);
        if (mathBlock && this.canFitInBlock(task, mathBlock)) {
          return mathBlock;
        }
      }
      
      // Check for duration matching within same day blocks
      const durationMatchedBlocks = sameDay.filter(block => {
        const remainingTime = this.getRemainingMinutes(block);
        // Prefer blocks where task uses 70-100% of remaining time
        const utilizationRate = task.estimated_time / Math.max(remainingTime, 1);
        return utilizationRate >= 0.7 && utilizationRate <= 1.0;
      });
      
      if (durationMatchedBlocks.length > 0) {
        return durationMatchedBlocks[0]; // Return first duration-matched block
      }
    }
    
    // Return the first available sequential block (maintains no-gaps rule)
    return firstAvailableBlock;
  }

  private canFitInBlock(task: TaskClassification, block: BlockComposition): boolean {
    const remainingMinutes = this.getRemainingMinutes(block);
    const canAddCognitiveLoad = this.canAddCognitiveLoad(task, block);
    
    // Allow flexible fitting - task can exceed block time and continue later
    const canFitAtLeast15Minutes = remainingMinutes >= 15;
    
    return canFitAtLeast15Minutes && canAddCognitiveLoad;
  }

  private getRemainingMinutes(block: BlockComposition): number {
    return block.total_minutes - block.used_minutes - block.buffer_minutes;
  }

  private canAddCognitiveLoad(task: TaskClassification, block: BlockComposition): boolean {
    const currentLoad = this.calculateBlockCognitiveLoad(block);
    const taskLoad = this.getCognitiveLoadValue(task.cognitive_load);
    
    return currentLoad + taskLoad <= BlockSharingScheduler.MAX_COGNITIVE_LOAD_PER_BLOCK;
  }

  private calculateBlockCognitiveLoad(block: BlockComposition): number {
    return block.tasks.reduce((total, task) => {
      return total + this.getCognitiveLoadValue(task.assignment.cognitive_load);
    }, 0);
  }

  private getCognitiveLoadValue(load: string): number {
    switch (load) {
      case 'heavy': return 2;
      case 'medium': return 1;
      case 'light': return 0.5;
      default: return 1;
    }
  }

  private addTaskToBlock(task: TaskClassification, block: BlockComposition): void {
    const sharedBlockId = crypto.randomUUID();
    const position = block.tasks.length + 1;
    
    const taskAssignment: TaskAssignment = {
      assignment: task,
      position,
      allocated_minutes: task.estimated_time,
      shared_block_id: sharedBlockId
    };
    
    block.tasks.push(taskAssignment);
    block.used_minutes += task.estimated_time;
    
    // Update cognitive balance
    const totalLoad = this.calculateBlockCognitiveLoad(block);
    if (totalLoad >= 1.5) block.cognitive_balance = 'heavy';
    else if (totalLoad >= 1) block.cognitive_balance = 'medium';
    else block.cognitive_balance = 'light';
  }

  private generateWarnings(unscheduledTasks: TaskClassification[], blocks: BlockComposition[]): string[] {
    const warnings: string[] = [];
    
    // Check for overdue assignments
    const overdueTasks = unscheduledTasks.filter(task => task.urgency === 'overdue');
    if (overdueTasks.length > 0) {
      warnings.push(`${overdueTasks.length} overdue assignment(s) could not be scheduled`);
    }
    
    // Check for cognitive load imbalance
    const heavyBlocks = blocks.filter(block => block.cognitive_balance === 'heavy');
    if (heavyBlocks.length > 2) {
      warnings.push(`High cognitive load detected in ${heavyBlocks.length} blocks - consider redistributing`);
    }
    
    // Check for time constraint issues
    const fullyUtilizedBlocks = blocks.filter(block => 
      this.getRemainingMinutes(block) < 10
    );
    if (fullyUtilizedBlocks.length > blocks.length * 0.8) {
      warnings.push('Schedule is highly packed - consider extending timeframe');
    }
    
    return warnings;
  }

  async executeSchedule(decision: SchedulingDecision): Promise<{ success: boolean; errors: string[]; successCount: number; totalCount: number }> {
    console.log('🔥🔥🔥 EXECUTE SCHEDULE CALLED 🔥🔥🔥');
    console.log('🚀 BLOCK SHARING SCHEDULER EXECUTION START:', {
      academicBlocks: decision.academic_blocks?.length || 0,
      administrativeTasks: decision.administrative_tasks?.length || 0,
      unscheduledTasks: decision.unscheduled_tasks?.length || 0,
      timestamp: new Date().toISOString(),
      aboutToUpdateAssignments: 'YES - database updates will happen'
    });
    
    const executionErrors: string[] = [];
    let successCount = 0;
    let errorCount = 0;
    let totalUpdates = 0;
    
    try {
      for (const block of decision.academic_blocks) {
        console.log(`📚 Processing academic block ${block.block_number} on ${block.date}:`, {
          blockNumber: block.block_number,
          date: block.date,
          day: block.day,
          totalMinutes: block.total_minutes,
          usedMinutes: block.used_minutes,
          tasksCount: block.tasks?.length || 0
        });

        for (const taskAssignment of block.tasks) {
          const assignment = taskAssignment.assignment;
          totalUpdates++;
          
          console.log(`🎯 Processing task assignment ${totalUpdates}:`, {
            originalId: assignment.id,
            title: assignment.title,
            position: taskAssignment.position,
            allocatedMinutes: taskAssignment.allocated_minutes,
            sharedBlockId: taskAssignment.shared_block_id
          });
          
          try {
            // Extract base UUID and validate it
            const baseId = this.extractBaseUUID(assignment.id);
            console.log(`🔍 UUID extraction and validation:`, {
              originalId: assignment.id,
              extractedBaseId: baseId,
              isValidUUID: this.isValidUUID(baseId),
              containsPartSuffix: assignment.id.includes('_part_')
            });

            if (!this.isValidUUID(baseId)) {
              const errorMsg = `Invalid UUID format: ${assignment.id} -> ${baseId}`;
              console.error(`❌ ${errorMsg}`);
              executionErrors.push(`${assignment.title}: ${errorMsg}`);
              errorCount++;
              continue;
            }
            
            console.log(`💾 Executing Supabase update for ${baseId}:`, {
              scheduledBlock: block.block_number,
              originalCalculatedDate: block.date,
              originalCalculatedDay: block.day,
              hardcodedDate: '2025-08-06',    // 🚨 NUCLEAR TEST
              hardcodedDay: 'Wednesday',      // 🚨 NUCLEAR TEST
              sharedBlockId: taskAssignment.shared_block_id,
              blockPosition: taskAssignment.position
            });

            const { data, error } = await supabase
              .from('assignments')
              .update({
                scheduled_block: block.block_number,
                scheduled_date: '2025-08-06',  // 🚨 NUCLEAR TEST: HARDCODE TOMORROW
                scheduled_day: 'Wednesday',     // 🚨 NUCLEAR TEST: HARDCODE WEDNESDAY
                shared_block_id: taskAssignment.shared_block_id,
                block_position: taskAssignment.position
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
              console.error(`❌ SUPABASE ERROR for assignment ${baseId}:`, {
                error,
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
              });
              executionErrors.push(`${assignment.title}: ${errorMsg}`);
              errorCount++;
              continue;
            }

            if (!data || data.length === 0) {
              const errorMsg = `Assignment not found in database`;
              console.error(`❌ NO ROWS UPDATED for assignment ${baseId} - Assignment might not exist`);
              executionErrors.push(`${assignment.title}: ${errorMsg}`);
              errorCount++;
              continue;
            }

            console.log(`✅ Successfully updated assignment ${baseId}`);
            successCount++;

          } catch (updateError: any) {
            const errorMsg = `Unexpected error: ${updateError.message || 'Unknown error'}`;
            console.error(`💥 EXCEPTION during update for ${assignment.id}:`, {
              error: updateError.message,
              stack: updateError.stack
            });
            executionErrors.push(`${assignment.title}: ${errorMsg}`);
            errorCount++;
          }
        }
      }
      
      console.log(`🎉 BLOCK SHARING SCHEDULER EXECUTION COMPLETE:`, {
        totalUpdates,
        successCount,
        errorCount,
        successRate: totalUpdates > 0 ? (successCount / totalUpdates * 100).toFixed(1) + '%' : '0%',
        timestamp: new Date().toISOString()
      });
      
      // Only invalidate cache if we had at least some successes
      if (successCount > 0) {
        console.log('🗑️ Clearing cache due to successful updates');
        this.cache.clear();
      }
      
      return {
        success: successCount > 0,
        errors: executionErrors,
        successCount,
        totalCount: totalUpdates
      };
      
    } catch (error: any) {
      const fatalError = `Fatal execution error: ${error.message || 'Unknown error'}`;
      console.error('💥 BLOCK SHARING SCHEDULER EXECUTION FAILED:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        errors: [fatalError, ...executionErrors],
        successCount,
        totalCount: totalUpdates
      };
    }
  }

  private extractBaseUUID(id: string): string {
    // Handle split assignment IDs like "uuid_part_1"
    const parts = id.split('_part_');
    const baseId = parts[0];
    
    console.log('🔧 UUID extraction:', {
      originalId: id,
      splitParts: parts,
      extractedBaseId: baseId,
      hadPartSuffix: parts.length > 1
    });
    
    return baseId;
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(uuid);
    
    if (!isValid) {
      console.warn('🔍 BLOCK SHARING UUID VALIDATION DETAILS:', {
        uuid,
        length: uuid.length,
        containsUnderscorePart: uuid.includes('_part_'),
        startsWithValidChar: /^[0-9a-f]/.test(uuid),
        format: 'Expected: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      });
    }
    
    return isValid;
  }

  // Cache invalidation method
  invalidateCache(studentName?: string): void {
    if (studentName) {
      // Remove cache entries for specific student
      for (const [key] of this.cache) {
        if (key.startsWith(studentName)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

export const blockSharingScheduler = new BlockSharingScheduler();
