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

  async analyzeAndSchedule(studentName: string, daysAhead: number = 7): Promise<SchedulingDecision> {
    // Get unscheduled assignments classified by type
    const tasks = await this.getClassifiedTasks(studentName);
    
    // Separate by task type
    const academicTasks = tasks.filter(t => t.task_type === 'academic');
    const quickReviewTasks = tasks.filter(t => t.task_type === 'quick_review');
    const administrativeTasks = tasks.filter(t => t.task_type === 'administrative');
    
    // Get available blocks for the time window
    const availableBlocks = await this.getAvailableBlocks(studentName, daysAhead);
    
    // Schedule academic tasks (full blocks first)
    const scheduledBlocks = await this.scheduleAcademicTasks(academicTasks, availableBlocks);
    
    // Fill remaining space with quick review tasks
    const updatedBlocks = await this.addQuickReviewTasks(quickReviewTasks, scheduledBlocks);
    
    // Identify unscheduled tasks and warnings
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
      priority: assignment.priority || 'medium'
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

  private async getAvailableBlocks(studentName: string, daysAhead: number): Promise<BlockComposition[]> {
    // This would typically fetch from your schedule system
    // For now, we'll create mock available blocks
    const blocks: BlockComposition[] = [];
    const today = new Date();
    
    for (let day = 0; day < daysAhead; day++) {
      const date = addDays(today, day);
      const dayName = format(date, 'EEEE');
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Skip weekends
      if (dayName === 'Saturday' || dayName === 'Sunday') continue;
      
      // Add typical assignment blocks (assuming blocks 2, 4, 6 are available for assignments)
      for (const blockNum of [2, 4, 6]) {
        blocks.push({
          block_number: blockNum,
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
    const hasSpace = remainingMinutes >= task.actual_estimated_minutes + BlockSharingScheduler.MIN_BUFFER_TIME;
    const canAddCognitiveLoad = this.canAddCognitiveLoad(task, block);
    
    return hasSpace && canAddCognitiveLoad;
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
    const currentMode = stagingUtils.getCurrentMode();
    
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