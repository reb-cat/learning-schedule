import { Assignment } from './canvasService';
import { ScheduleBlock } from '@/data/scheduleData';

export interface ScheduledAssignment extends Assignment {
  blockIndex: number;
  isScheduled: boolean;
}

interface AssignmentMapping {
  [key: string]: { // student-day-blockIndex
    assignment: Assignment;
    isCompleted: boolean;
    completedAt?: Date;
  };
}

class AssignmentScheduler {
  private getStorageKey(student: string): string {
    return `assignmentMapping_${student}`;
  }

  private getAssignmentMapping(student: string): AssignmentMapping {
    const stored = localStorage.getItem(this.getStorageKey(student));
    return stored ? JSON.parse(stored) : {};
  }

  private saveAssignmentMapping(student: string, mapping: AssignmentMapping): void {
    localStorage.setItem(this.getStorageKey(student), JSON.stringify(mapping));
  }

  private getBlockKey(student: string, day: string, blockIndex: number): string {
    return `${student}-${day}-${blockIndex}`;
  }

  private findBestBlockForAssignment(
    assignment: Assignment,
    availableBlocks: ScheduleBlock[],
    usedBlocks: Set<number>
  ): number | null {
    // First, try to match subject
    for (let i = 0; i < availableBlocks.length; i++) {
      if (usedBlocks.has(i)) continue;
      
      const block = availableBlocks[i];
      if (block.subject && assignment.subject) {
        const blockSubject = block.subject.toLowerCase();
        const assignmentSubject = assignment.subject.toLowerCase();
        
        if (blockSubject.includes(assignmentSubject) || assignmentSubject.includes(blockSubject)) {
          return i;
        }
      }
    }

    // If no subject match, use first available assignment block
    for (let i = 0; i < availableBlocks.length; i++) {
      if (usedBlocks.has(i)) continue;
      
      const block = availableBlocks[i];
      if (block.isAssignmentBlock) {
        return i;
      }
    }

    return null;
  }

  scheduleAssignments(
    student: string,
    day: string,
    assignments: Assignment[],
    scheduleBlocks: ScheduleBlock[]
  ): ScheduleBlock[] {
    const mapping = this.getAssignmentMapping(student);
    const usedBlocks = new Set<number>();
    const result = [...scheduleBlocks];

    // First pass: fill blocks that already have assignments
    scheduleBlocks.forEach((block, index) => {
      const blockKey = this.getBlockKey(student, day, index);
      const mappedAssignment = mapping[blockKey];
      
      if (mappedAssignment && block.isAssignmentBlock) {
        result[index] = {
          ...block,
          subject: mappedAssignment.assignment.name,
          assignment: mappedAssignment.assignment,
          isCompleted: mappedAssignment.isCompleted
        };
        usedBlocks.add(index);
      }
    });

    // Second pass: schedule new assignments
    const unscheduledAssignments = assignments.filter(assignment => {
      // Check if this assignment is already scheduled
      const isAlreadyScheduled = Object.values(mapping).some(
        mapped => mapped.assignment.id === assignment.id
      );
      return !isAlreadyScheduled;
    });

    for (const assignment of unscheduledAssignments) {
      const bestBlockIndex = this.findBestBlockForAssignment(
        assignment,
        scheduleBlocks,
        usedBlocks
      );

      if (bestBlockIndex !== null) {
        const blockKey = this.getBlockKey(student, day, bestBlockIndex);
        mapping[blockKey] = {
          assignment,
          isCompleted: false
        };

        result[bestBlockIndex] = {
          ...scheduleBlocks[bestBlockIndex],
          subject: assignment.name,
          assignment,
          isCompleted: false
        };

        usedBlocks.add(bestBlockIndex);
      }
    }

    // Third pass: mark empty assignment blocks as "Free Period"
    result.forEach((block, index) => {
      if (block.isAssignmentBlock && !usedBlocks.has(index)) {
        result[index] = {
          ...block,
          subject: 'Free Period'
        };
      }
    });

    this.saveAssignmentMapping(student, mapping);
    return result;
  }

  markAssignmentCompleted(
    student: string,
    day: string,
    blockIndex: number,
    completed: boolean
  ): void {
    const mapping = this.getAssignmentMapping(student);
    const blockKey = this.getBlockKey(student, day, blockIndex);
    
    if (mapping[blockKey]) {
      mapping[blockKey].isCompleted = completed;
      mapping[blockKey].completedAt = completed ? new Date() : undefined;
      this.saveAssignmentMapping(student, mapping);
    }
  }

  getAssignmentForBlock(
    student: string,
    day: string,
    blockIndex: number
  ): { assignment: Assignment; isCompleted: boolean } | null {
    const mapping = this.getAssignmentMapping(student);
    const blockKey = this.getBlockKey(student, day, blockIndex);
    return mapping[blockKey] || null;
  }

  clearScheduleForStudent(student: string): void {
    localStorage.removeItem(this.getStorageKey(student));
  }
}

export const assignmentScheduler = new AssignmentScheduler();