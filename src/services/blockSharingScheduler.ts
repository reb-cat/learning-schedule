import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { stagingUtils } from "@/utils/stagingUtils";

export interface TaskClassification {
  id: string;
  title: string;
  task_type: 'academic' | 'administrative' | 'quick_review';
  actual_estimated_minutes: number;
  cognitive_load: string;
  subject: string;
  course_name: string;
  urgency: string;
  due_date: Date | null;
  priority: string;
  scheduled_block?: number | null;
  scheduled_date?: string | null;
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

  private async getClassifiedTasks(studentName: string): Promise<TaskClassification[]> {
    const currentMode = stagingUtils.getCurrentMode();
    
    const { data, error } = currentMode === 'staging' 
      ? await supabase
          .from('assignments_staging')
          .select('*')
          .eq('student_name', studentName)
          .is('scheduled_block', null)
          .eq('eligible_for_scheduling', true)
          .order('due_date', { ascending: true, nullsFirst: false })
      : await supabase
          .from('assignments')
          .select('*')
          .eq('student_name', studentName)
          .is('scheduled_block', null)
          .eq('eligible_for_scheduling', true)
          .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;
    
    return data.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      task_type: (assignment.task_type as 'academic' | 'administrative' | 'quick_review') || 'academic',
      actual_estimated_minutes: assignment.actual_estimated_minutes || this.estimateTime(assignment.title),
      cognitive_load: assignment.cognitive_load || 'medium',
      subject: assignment.subject || 'General',
      course_name: assignment.course_name || '',
      urgency: assignment.urgency || 'medium',
      due_date: assignment.due_date ? new Date(assignment.due_date) : null,
      priority: assignment.priority || 'medium',
      scheduled_block: assignment.scheduled_block,
      scheduled_date: assignment.scheduled_date
    }));
  }

  private estimateTime(title: string): number {
    // Fallback time estimation if database function doesn't work
    if (title.toLowerCase().includes('syllabus')) return 10;
    if (title.toLowerCase().includes('recipe')) return 8;
    if (title.toLowerCase().includes('review') && title.length < 40) return 5;
    if (title.toLowerCase().includes('check')) return 5;
    if (title.toLowerCase().includes('worksheet')) return 30;
    return title.length < 30 ? 15 : 30;
  }

  private async getAvailableBlocks(studentName: string, daysAhead: number, startDate?: Date): Promise<BlockComposition[]> {
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
    
    // Sort tasks by priority (overdue first, then by due date)
    const sortedTasks = tasks.sort((a, b) => {
      if (a.urgency === 'overdue' && b.urgency !== 'overdue') return -1;
      if (b.urgency === 'overdue' && a.urgency !== 'overdue') return 1;
      
      if (a.due_date && b.due_date) {
        return a.due_date.getTime() - b.due_date.getTime();
      }
      
      return 0;
    });

    for (const task of sortedTasks) {
      const availableBlock = this.findBestBlockForTask(task, updatedBlocks);
      
      if (availableBlock && this.canFitInBlock(task, availableBlock)) {
        this.addTaskToBlock(task, availableBlock);
      }
    }
    
    return updatedBlocks;
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
      return a.actual_estimated_minutes - b.actual_estimated_minutes;
    });

    for (const task of sortedTasks) {
      // Try to add to existing blocks with space
      const availableBlock = updatedBlocks.find(block => 
        this.getRemainingMinutes(block) >= task.actual_estimated_minutes + BlockSharingScheduler.MIN_BUFFER_TIME &&
        this.canAddCognitiveLoad(task, block)
      );
      
      if (availableBlock) {
        this.addTaskToBlock(task, availableBlock);
      }
    }
    
    return updatedBlocks;
  }

  private findBestBlockForTask(task: TaskClassification, blocks: BlockComposition[]): BlockComposition | null {
    // Find blocks that can fit this task
    const suitableBlocks = blocks.filter(block => this.canFitInBlock(task, block));
    
    if (suitableBlocks.length === 0) return null;
    
    // Prefer blocks with similar subjects or empty blocks
    return suitableBlocks.sort((a, b) => {
      // Prefer blocks with same subject
      const aHasSameSubject = a.tasks.some(t => t.assignment.subject === task.subject);
      const bHasSameSubject = b.tasks.some(t => t.assignment.subject === task.subject);
      
      if (aHasSameSubject && !bHasSameSubject) return -1;
      if (!aHasSameSubject && bHasSameSubject) return 1;
      
      // Prefer earlier blocks
      return a.block_number - b.block_number;
    })[0];
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
      allocated_minutes: task.actual_estimated_minutes,
      shared_block_id: sharedBlockId
    };
    
    block.tasks.push(taskAssignment);
    block.used_minutes += task.actual_estimated_minutes;
    
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