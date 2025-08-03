import { Assignment } from '@/hooks/useAssignments';
import { supabase } from '@/integrations/supabase/client';
import { getScheduleForStudentAndDay } from '@/data/scheduleData';

export interface SchedulingDecision {
  assignment: Assignment;
  targetDate: string;
  targetBlock: number;
  reasoning: string;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface SchedulingResult {
  decisions: SchedulingDecision[];
  splitAssignments: Assignment[];
  unscheduledAssignments: Assignment[];
  warnings: string[];
}

export interface DayBlockAvailability {
  date: string;
  dayName: string;
  availableBlocks: number[];
  cognitiveLoadUsed: { light: number; medium: number; heavy: number };
}

class SmartScheduler {
  private readonly COGNITIVE_LOAD_LIMITS = {
    heavy: 2,    // Max 2 heavy tasks per day
    medium: 4,   // Max 4 medium tasks per day
    light: 6     // Max 6 light tasks per day
  };

  private readonly BLOCK_DURATION_MINUTES = 45;

  async analyzeSchedulingNeeds(studentName: string): Promise<SchedulingResult> {
    // Get all unscheduled assignments
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('student_name', studentName)
      .is('scheduled_block', null)
      .eq('eligible_for_scheduling', true)
      .order('due_date', { ascending: true });

    if (error) throw error;

    const decisions: SchedulingDecision[] = [];
    const splitAssignments: Assignment[] = [];
    const unscheduledAssignments: Assignment[] = [];
    const warnings: string[] = [];

    // Filter out administrative tasks that should be checklist items
    const academicAssignments = (assignments || []).filter(assignment => {
      const title = assignment.title.toLowerCase();
      const isAdmin = this.isAdministrativeTask(title);
      
      if (isAdmin) {
        warnings.push(`"${assignment.title}" should be a checklist item, not a scheduled block`);
      }
      
      return !isAdmin;
    });

    // Get appropriate scheduling window based on assignment urgency
    const availabilityWindow = this.getAvailabilityWindow(studentName, 14); // Extended to 2 weeks

    for (const assignment of academicAssignments) {
      try {
        // Cast the database assignment to our Assignment type
        const typedAssignment = assignment as Assignment;
        
        // Skip assignments that are due too far in the future
        if (!this.shouldScheduleNow(typedAssignment)) {
          continue;
        }
        
        const result = await this.scheduleAssignment(typedAssignment, availabilityWindow);
        
        if (result.success) {
          decisions.push(result.decision!);
          
          // If assignment was split, add split parts
          if (result.splitParts) {
            splitAssignments.push(...result.splitParts);
          }
        } else {
          unscheduledAssignments.push(typedAssignment);
          if (result.reason) {
            warnings.push(`${typedAssignment.title}: ${result.reason}`);
          }
        }
      } catch (error) {
        const typedAssignment = assignment as Assignment;
        warnings.push(`Error scheduling ${typedAssignment.title}: ${error}`);
        unscheduledAssignments.push(typedAssignment);
      }
    }

    return {
      decisions,
      splitAssignments,
      unscheduledAssignments,
      warnings
    };
  }

  private shouldScheduleNow(assignment: Assignment): boolean {
    if (!assignment.due_date) return true; // No due date, schedule when convenient
    
    const dueDate = new Date(assignment.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Don't schedule items more than 2 weeks before due date unless urgent
    if (daysUntilDue > 14) return false;
    
    const title = assignment.title.toLowerCase();
    
    // Administrative tasks: schedule 2-3 days before due date
    if (this.isAdministrativeTask(title)) {
      return daysUntilDue <= 3;
    }
    
    // Review tasks: schedule 3-5 days before due date
    if (this.isReviewTask(title)) {
      return daysUntilDue <= 5;
    }
    
    // Academic assignments: schedule when needed based on urgency
    if (daysUntilDue <= 0) return true; // Overdue
    if (daysUntilDue <= 2) return true; // Due soon
    if (daysUntilDue <= 7) return true; // Due this week
    
    return daysUntilDue <= 10; // Give some buffer for larger assignments
  }

  private async scheduleAssignment(
    assignment: Assignment, 
    availabilityWindow: DayBlockAvailability[]
  ): Promise<{
    success: boolean;
    decision?: SchedulingDecision;
    splitParts?: Assignment[];
    reason?: string;
  }> {
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    const today = new Date();
    const urgencyLevel = this.calculateUrgency(assignment, dueDate, today);
    
    // Calculate how many blocks needed
    const blocksNeeded = assignment.estimated_blocks_needed || 1;
    
    // If assignment needs multiple blocks, handle splitting
    if (blocksNeeded > 1) {
      return this.scheduleMultiBlockAssignment(assignment, availabilityWindow, urgencyLevel);
    }

    // Find best single block
    const bestSlot = this.findBestBlock(assignment, availabilityWindow, urgencyLevel);
    
    if (!bestSlot) {
      return {
        success: false,
        reason: 'No suitable blocks available in the next 5 days'
      };
    }

    // Mark block as used
    this.markBlockAsUsed(availabilityWindow, bestSlot.date, bestSlot.block, assignment);

    return {
      success: true,
      decision: {
        assignment,
        targetDate: bestSlot.date,
        targetBlock: bestSlot.block,
        reasoning: bestSlot.reasoning,
        urgencyLevel
      }
    };
  }

  private scheduleMultiBlockAssignment(
    assignment: Assignment, 
    availabilityWindow: DayBlockAvailability[],
    urgencyLevel: 'critical' | 'high' | 'medium' | 'low'
  ): Promise<{
    success: boolean;
    decision?: SchedulingDecision;
    splitParts?: Assignment[];
    reason?: string;
  }> {
    const blocksNeeded = assignment.estimated_blocks_needed || 1;
    const availableSlots: { date: string; block: number; reasoning: string }[] = [];

    // Find enough blocks
    for (let i = 0; i < blocksNeeded && availableSlots.length < blocksNeeded; i++) {
      const slot = this.findBestBlock(assignment, availabilityWindow, urgencyLevel, availableSlots.map(s => ({ date: s.date, block: s.block })));
      
      if (slot) {
        availableSlots.push(slot);
        this.markBlockAsUsed(availabilityWindow, slot.date, slot.block, assignment);
      }
    }

    if (availableSlots.length < blocksNeeded) {
      return Promise.resolve({
        success: false,
        reason: `Only found ${availableSlots.length} blocks, but need ${blocksNeeded}`
      });
    }

    // Create split assignments (will be created in database later)
    const splitParts: Assignment[] = availableSlots.map((slot, index) => ({
      ...assignment,
      id: `${assignment.id}_split_${index + 1}`, // Temporary ID
      title: `${assignment.title} (Part ${index + 1}/${blocksNeeded})`,
      original_assignment_id: assignment.id,
      is_split_assignment: true,
      split_part_number: index + 1,
      total_split_parts: blocksNeeded,
      estimated_blocks_needed: 1,
      scheduled_block: slot.block,
      scheduled_date: slot.date
    }));

    return Promise.resolve({
      success: true,
      decision: {
        assignment,
        targetDate: availableSlots[0].date,
        targetBlock: availableSlots[0].block,
        reasoning: `Split into ${blocksNeeded} parts across multiple days`,
        urgencyLevel
      },
      splitParts
    });
  }

  private findBestBlock(
    assignment: Assignment,
    availabilityWindow: DayBlockAvailability[],
    urgencyLevel: 'critical' | 'high' | 'medium' | 'low',
    excludeSlots: { date: string; block: number }[] = []
  ): { date: string; block: number; reasoning: string } | null {
    const cognitiveLoad = this.getCognitiveLoad(assignment);
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    const today = new Date();

    // Find optimal scheduling window
    for (const day of availabilityWindow) {
      const dayDate = new Date(day.date);
      
      // Skip if due date passed
      if (dueDate && dayDate >= dueDate) continue;
      
      // For non-urgent items, don't schedule too early
      if (urgencyLevel === 'low' || urgencyLevel === 'medium') {
        const daysToDue = dueDate ? Math.ceil((dueDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const daysFromToday = Math.ceil((dayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Don't schedule more than 5 days before due date for medium urgency
        if (urgencyLevel === 'medium' && daysToDue > 5) continue;
        
        // Don't schedule more than 3 days before due date for low urgency
        if (urgencyLevel === 'low' && daysToDue > 3) continue;
        
        // Don't schedule more than 1 week ahead unless urgent
        if (daysFromToday > 7 && (urgencyLevel === 'low' || urgencyLevel === 'medium')) continue;
      }

      for (const block of day.availableBlocks) {
        // Skip excluded slots
        if (excludeSlots.some(slot => slot.date === day.date && slot.block === block)) {
          continue;
        }

        // Check cognitive load limits
        if (!this.canAddCognitiveLoad(day, cognitiveLoad)) continue;

        // Apply scheduling preferences
        const reasoning = this.generateReasoning(assignment, day, block, urgencyLevel);
        
        return {
          date: day.date,
          block,
          reasoning
        };
      }
    }

    return null;
  }

  private calculateUrgency(
    assignment: Assignment, 
    dueDate: Date | null, 
    today: Date
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (!dueDate) return 'low';

    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 0) return 'critical';      // Overdue
    if (daysUntilDue === 1) return 'critical';     // Due tomorrow
    if (daysUntilDue === 2) return 'high';         // Due day after tomorrow
    if (daysUntilDue <= 4) return 'medium';        // Due this week
    return 'low';                                  // Due later
  }

  private getCognitiveLoad(assignment: Assignment): 'light' | 'medium' | 'heavy' {
    if (assignment.cognitive_load) {
      return assignment.cognitive_load as 'light' | 'medium' | 'heavy';
    }

    // Intelligent categorization based on title and type
    const title = assignment.title.toLowerCase();
    
    // Administrative tasks should be checklist items, not scheduled blocks
    if (this.isAdministrativeTask(title)) {
      return 'light'; // These shouldn't be scheduled anyway
    }
    
    // Review tasks are light cognitive load
    if (this.isReviewTask(title)) {
      return 'light';
    }

    // Default mapping based on subject
    const subjectLoads: Record<string, 'light' | 'medium' | 'heavy'> = {
      'Math': 'heavy',
      'Science': 'heavy',
      'English': 'medium',
      'History': 'medium',
      'Reading': 'light',
      'Art': 'light'
    };

    return subjectLoads[assignment.subject || ''] || 'medium';
  }

  private isAdministrativeTask(title: string): boolean {
    const adminKeywords = ['fee', 'form', 'permission', 'bring', 'pack', 'payment', 'sign', 'deliver', 'turn in'];
    return adminKeywords.some(keyword => title.includes(keyword));
  }

  private isReviewTask(title: string): boolean {
    const reviewKeywords = ['syllabus', 'recipe', 'review', 'check', 'read'];
    return reviewKeywords.some(keyword => title.includes(keyword));
  }

  private getIntelligentTimeEstimate(assignment: Assignment): number {
    const title = assignment.title.toLowerCase();
    
    // Use existing estimate if reasonable
    if (assignment.estimated_time_minutes && assignment.estimated_time_minutes > 0 && assignment.estimated_time_minutes <= 45) {
      return assignment.estimated_time_minutes;
    }

    // Administrative tasks - should be checklist items (2-3 min)
    if (this.isAdministrativeTask(title)) {
      return 3;
    }

    // Quick review tasks (5-7 min)
    if (title.includes('syllabus')) return 5;
    if (title.includes('recipe')) return 7;
    if (title.includes('check') || title.includes('verify')) return 5;

    // Reading tasks based on complexity
    if (title.includes('read')) {
      if (title.length < 50) return 15;
      return 25;
    }

    // Worksheets and assignments
    if (title.includes('worksheet') || title.includes('assignment')) return 30;
    
    // Projects and essays
    if (title.includes('project') || title.includes('essay')) return 45;

    // Default based on title length and subject
    if (assignment.subject === 'Math') return 35;
    if (assignment.subject === 'Science') return 30;
    
    return title.length < 30 ? 20 : 30;
  }

  private canAddCognitiveLoad(day: DayBlockAvailability, load: 'light' | 'medium' | 'heavy'): boolean {
    const limits = this.COGNITIVE_LOAD_LIMITS;
    const used = day.cognitiveLoadUsed;

    switch (load) {
      case 'heavy':
        return used.heavy < limits.heavy;
      case 'medium':
        return used.medium < limits.medium;
      case 'light':
        return used.light < limits.light;
      default:
        return true;
    }
  }

  private markBlockAsUsed(
    availabilityWindow: DayBlockAvailability[], 
    date: string, 
    block: number, 
    assignment: Assignment
  ): void {
    const day = availabilityWindow.find(d => d.date === date);
    if (!day) return;

    // Remove block from available
    day.availableBlocks = day.availableBlocks.filter(b => b !== block);
    
    // Update cognitive load usage
    const load = this.getCognitiveLoad(assignment);
    day.cognitiveLoadUsed[load]++;
  }

  private generateReasoning(
    assignment: Assignment,
    day: DayBlockAvailability,
    block: number,
    urgencyLevel: string
  ): string {
    const parts = [];
    
    if (urgencyLevel === 'critical') {
      parts.push('Critical urgency - scheduling immediately');
    } else if (urgencyLevel === 'high') {
      parts.push('High priority due to approaching deadline');
    }

    if (assignment.subject === 'Math' && block === 2) {
      parts.push('Math scheduled in preferred Block 2');
    }

    if (day.dayName === 'Monday' || day.dayName === 'Tuesday') {
      parts.push('Early week scheduling for better focus');
    }

    return parts.join('; ') || `Scheduled in available Block ${block} on ${day.dayName}`;
  }

  private getAvailabilityWindow(studentName: string, daysAhead: number): DayBlockAvailability[] {
    const window: DayBlockAvailability[] = [];
    const today = new Date();

    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateString = date.toISOString().split('T')[0];

      // Skip weekends
      if (dayName === 'Saturday' || dayName === 'Sunday') continue;

      const schedule = getScheduleForStudentAndDay(studentName, dayName);
      const availableBlocks = schedule
        .filter(block => block.isAssignmentBlock && block.block)
        .map(block => block.block!);

      window.push({
        date: dateString,
        dayName,
        availableBlocks,
        cognitiveLoadUsed: { light: 0, medium: 0, heavy: 0 }
      });
    }

    return window;
  }

  async executeScheduling(decisions: SchedulingDecision[], splitAssignments: Assignment[]): Promise<void> {
    // Update main assignments
    for (const decision of decisions) {
      const { error } = await supabase
        .from('assignments')
        .update({
          scheduled_block: decision.targetBlock,
          scheduled_date: decision.targetDate,
          scheduled_day: new Date(decision.targetDate).toLocaleDateString('en-US', { weekday: 'long' })
        })
        .eq('id', decision.assignment.id);

      if (error) throw error;
    }

    // Create split assignments if any
    for (const splitAssignment of splitAssignments) {
      const { id, ...assignmentData } = splitAssignment;
      
      const { error } = await supabase
        .from('assignments')
        .insert({
          ...assignmentData,
          scheduled_day: new Date(splitAssignment.scheduled_date!).toLocaleDateString('en-US', { weekday: 'long' })
        });

      if (error) throw error;
    }
  }
}

export const smartScheduler = new SmartScheduler();