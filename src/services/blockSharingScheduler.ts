import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { stagingUtils } from "@/utils/stagingUtils";

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

  async analyzeAndSchedule(studentName: string, daysAhead: number = 7, startDate?: Date): Promise<SchedulingDecision> {
    try {
      console.log('Starting analyzeAndSchedule for:', studentName);
      
      // 1. Fetch all unscheduled tasks (filter to current timeframe)
      const allTasks = await this.getClassifiedTasks(studentName);
      console.log('All tasks fetched:', allTasks.length);
      
      // Use provided startDate for testing, otherwise use current date
      const today = startDate || new Date();
      const endDate = addDays(today, daysAhead);
      
      // Filter tasks to current scheduling window
      const tasks = allTasks.filter(task => {
        if (!task.due_date) return true; // Include tasks without due dates
        
        const taskDueDate = new Date(task.due_date);
        const windowStart = addDays(today, -3); // Include tasks due 3 days before
        const windowEnd = addDays(today, daysAhead + 7); // Extend window for better flexibility
        
        return taskDueDate >= windowStart && taskDueDate <= windowEnd;
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
      const availableBlocks = await this.getAvailableBlocks(studentName, daysAhead, today);
      console.log('Available blocks:', availableBlocks.length);
      
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
      
      return {
        academic_blocks: updatedBlocks,
        administrative_tasks: administrativeTasks,
        unscheduled_tasks: unscheduledTasks,
        warnings
      };
    } catch (error) {
      console.error('Error in analyzeAndSchedule:', error);
      throw error;
    }
  }

  async getClassifiedTasks(studentName: string): Promise<TaskClassification[]> {
    const currentMode = stagingUtils.getCurrentMode();
    
    const { data, error } = currentMode === 'staging' 
      ? await supabase
          .from('assignments_staging')
          .select('*')
          .eq('student_name', studentName)
          .is('scheduled_block', null)
          .eq('eligible_for_scheduling', true)
          .in('completion_status', ['not_started', 'in_progress', 'stuck'])
          .order('due_date', { ascending: true, nullsFirst: false })
      : await supabase
          .from('assignments')
          .select('*')
          .eq('student_name', studentName)
          .is('scheduled_block', null)
          .eq('eligible_for_scheduling', true)
          .in('completion_status', ['not_started', 'in_progress', 'stuck'])
          .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;
    
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
  }

  private estimateTime(title: string): number {
    console.log(`🕒 Estimating time for: "${title}"`);
    
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
    
    console.log(`⏱️ Estimated ${estimate} minutes for: "${title}"`);
    return estimate; // REMOVED THE 45-MINUTE CAP
  }

  private calculateUrgency(assignment: any): string {
    const now = new Date();
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    
    // Boost urgency for stuck or in-progress tasks
    if (assignment.completion_status === 'stuck') return 'critical';
    if (assignment.completion_status === 'in_progress') return 'high';
    
    if (!dueDate) return assignment.urgency || 'medium';
    
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 1) return 'critical';
    if (daysUntilDue <= 3) return 'high';
    
    return assignment.urgency || 'medium';
  }

  async getAvailableBlocks(studentName: string, daysAhead: number, startDate?: Date): Promise<BlockComposition[]> {
    // Use real schedule data instead of mock data
    const { getScheduleForStudentAndDay } = await import('../data/scheduleData');
    const blocks: BlockComposition[] = [];
    const today = startDate || new Date();
    
    for (let day = 0; day < daysAhead; day++) {
      const date = addDays(today, day);
      const dayName = format(date, 'EEEE');
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Skip weekends
      if (dayName === 'Saturday' || dayName === 'Sunday') continue;
      
      // Get the actual schedule for this student and day
      const daySchedule = getScheduleForStudentAndDay(studentName, dayName);
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
      console.log(`\n📚 Processing task: "${task.title}" (${task.estimated_time} min, ${task.cognitive_load} load)`);
      
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
        console.log(`  🔄 Task too large (${task.estimated_time} > 45 min) - splitting across multiple blocks`);
        this.splitAndScheduleTask(task, updatedBlocks);
      }
    }
    
    return updatedBlocks;
  }

  private splitAndScheduleTask(task: TaskClassification, blocks: BlockComposition[]): void {
    const maxBlockTime = 45;
    const totalTime = task.estimated_time;
    const numberOfParts = Math.ceil(totalTime / maxBlockTime);
    
    console.log(`  🔄 Splitting task "${task.title}" (${totalTime} min) into ${numberOfParts} parts`);
    
    let remainingTime = totalTime;
    let partNumber = 1;
    let scheduledParts = 0;
    
    for (let i = 0; i < numberOfParts && remainingTime > 0; i++) {
      const timeForThisPart = Math.min(remainingTime, maxBlockTime);
      
      const taskPart: TaskClassification = {
        ...task,
        id: `${task.id}_part_${partNumber}`,
        title: `${task.title} (Part ${partNumber}/${numberOfParts})`,
        estimated_time: timeForThisPart
      };
      
      console.log(`    📝 Creating part ${partNumber}: ${timeForThisPart} min`);
      
      const bestBlock = this.findBestBlockForTask(taskPart, blocks);
      if (bestBlock && this.canFitInBlock(taskPart, bestBlock)) {
        console.log(`    ✅ Scheduled part ${partNumber} in Block ${bestBlock.block_number} on ${bestBlock.day}`);
        this.addTaskToBlock(taskPart, bestBlock);
        remainingTime -= timeForThisPart;
        partNumber++;
        scheduledParts++;
      } else {
        console.log(`    ❌ Could not schedule part ${partNumber} - no suitable block found`);
        break;
      }
    }
    
    console.log(`  📊 Split task result: ${scheduledParts}/${numberOfParts} parts scheduled, ${remainingTime} min remaining`);
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
    
    // For Math assignments, prefer Block 2
    if (task.subject === 'Math' || task.course_name?.toLowerCase().includes('math')) {
      const mathBlock = availableBlocks.find(block => block.block_number === 2);
      if (mathBlock && this.canFitInBlock(task, mathBlock)) {
        return mathBlock;
      }
    }
    
    // Avoid consecutive heavy cognitive loads and same subjects
    const preferredBlocks = availableBlocks.filter(block => {
      const lastTask = block.tasks[block.tasks.length - 1];
      if (!lastTask) return true;
      
      // If last task was high cognitive load, prefer medium/low for this task
      if (lastTask.assignment.cognitive_load === 'high' && task.cognitive_load === 'high') {
        return false;
      }
      
      // Avoid same subject in consecutive tasks
      if (lastTask.assignment.subject === task.subject) {
        return false;
      }
      
      return true;
    });
    
    const targetBlocks = preferredBlocks.length > 0 ? preferredBlocks : availableBlocks;
    
    // Find block with best cognitive load balance
    return targetBlocks.find(block => this.canAddCognitiveLoad(task, block)) || targetBlocks[0];
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

  private generateWarnings(unscheduled: TaskClassification[], blocks: BlockComposition[]): string[] {
    const warnings: string[] = [];
    
    // Check for overdue unscheduled tasks
    const overdueUnscheduled = unscheduled.filter(t => t.urgency === 'overdue');
    if (overdueUnscheduled.length > 0) {
      warnings.push(`${overdueUnscheduled.length} overdue tasks could not be scheduled`);
    }
    
    // Check for heavy cognitive load days
    const heavyDays = blocks.filter(b => b.cognitive_balance === 'heavy').length;
    if (heavyDays > 2) {
      warnings.push(`${heavyDays} days with heavy cognitive load - consider redistributing`);
    }
    
    // Check for insufficient buffer time
    const lowBufferBlocks = blocks.filter(b => this.getRemainingMinutes(b) < 10).length;
    if (lowBufferBlocks > 0) {
      warnings.push(`${lowBufferBlocks} blocks have less than 10 minutes buffer time`);
    }
    
    return warnings;
  }

  async executeSchedule(decision: SchedulingDecision): Promise<void> {
    console.log('Executing schedule decision:', decision);
    const currentMode = stagingUtils.getCurrentMode();
    console.log('Current mode:', currentMode);
    
    // Update database with scheduled blocks
    for (const block of decision.academic_blocks) {
      for (const task of block.tasks) {
        const updateData = {
          scheduled_block: block.block_number,
          scheduled_date: block.date,
          scheduled_day: block.day,
          shared_block_id: task.shared_block_id,
          block_position: task.position,
          buffer_time_minutes: Math.floor(this.getRemainingMinutes(block) / block.tasks.length)
        };

        if (currentMode === 'staging') {
          await supabase
            .from('assignments_staging')
            .update(updateData)
            .eq('id', task.assignment.id);
        } else {
          await supabase
            .from('assignments')
            .update(updateData)
            .eq('id', task.assignment.id);
        }
      }
    }
  }
}

export const blockSharingScheduler = new BlockSharingScheduler();