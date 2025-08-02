import { getScheduleForStudentAndDay } from '@/data/scheduleData';

// Cognitive load patterns and rules
export const cognitiveLoadRules = {
  maxHeavyBeforeLunch: 2,
  maxConsecutiveHeavy: 1,
  morningPeakBlocks: [2, 3, 4], // Blocks 2-4 best for heavy cognitive work (after Bible)
  postLunchDip: [5, 6], // Lower cognitive demand
  afternoonRecovery: [7, 8] // Mixed load possible
};

// Subject cognitive loads (baseline - can be customized per student)
export const baseSubjectLoads: Record<string, 'light' | 'medium' | 'heavy'> = {
  'Math': 'heavy',
  'Language Arts': 'heavy',
  'Science': 'medium',
  'History': 'medium',
  'Reading': 'light',
  'Art': 'light',
  'PE': 'light',
  'Music': 'light',
  'Bible': 'light',
  'Lunch': 'light',
  'Co-op': 'medium'
};

// Student-specific accommodations
export const studentAccommodations = {
  'Abigail': {
    readingLoad: 'medium' as const, // dyslexia adjustment
    preferredReadingBlocks: [2, 3, 4], // morning when fresh
    maxReadingBlocksPerDay: 2,
    subjectLoadOverrides: {
      'Reading': 'medium' as const,
      'Language Arts': 'heavy' as const
    }
  },
  'Khalil': {
    maxBlockLength: 40, // shorter for executive function
    requiresTransitionBuffer: true, // 5-min between blocks
    preferredStructure: 'predictable' as const, // same subject same block each day when possible
    subjectLoadOverrides: {}
  }
};

// Attention cycle modalities for variation
export const modalityTypes = {
  'Math': 'analytical',
  'Language Arts': 'reading',
  'Science': 'visual',
  'History': 'reading',
  'Reading': 'reading',
  'Art': 'kinesthetic',
  'PE': 'kinesthetic',
  'Music': 'auditory'
};

export interface Assignment {
  id: string;
  canvas_id: string;
  student_name: string;
  subject: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string;
  urgency: 'overdue' | 'due_today' | 'upcoming';
  cognitive_load: 'light' | 'medium' | 'heavy';
  estimated_minutes: number;
  scheduled_block?: number;
  scheduled_date?: string;
  scheduled_day?: string;
}

export interface SchedulingResult {
  scheduledAssignments: Assignment[];
  unscheduledAssignments: Assignment[];
  blocksUsed: number;
  blocksAvailable: number;
  cognitiveLoadDistribution: Record<number, 'light' | 'medium' | 'heavy'>;
  warnings: string[];
}

// Get cognitive load for a subject, considering student accommodations
function getCognitiveLoad(subject: string, studentName: string): 'light' | 'medium' | 'heavy' {
  const accommodations = studentAccommodations[studentName as keyof typeof studentAccommodations];
  
  if (accommodations?.subjectLoadOverrides[subject]) {
    return accommodations.subjectLoadOverrides[subject];
  }
  
  return baseSubjectLoads[subject] || 'medium';
}

// Sort assignments by priority rules
function sortAssignmentsByPriority(assignments: Assignment[]): Assignment[] {
  return assignments.sort((a, b) => {
    // 1. Urgency (overdue > due_today > upcoming)
    const urgencyPriority = { overdue: 3, due_today: 2, upcoming: 1 };
    const urgencyDiff = urgencyPriority[b.urgency] - urgencyPriority[a.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    
    // 2. Due date (earlier first)
    if (a.due_date && b.due_date) {
      const dateDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (dateDiff !== 0) return dateDiff;
    }
    
    // 3. Math priority (Math goes first when possible)
    if (a.subject === 'Math' && b.subject !== 'Math') return -1;
    if (b.subject === 'Math' && a.subject !== 'Math') return 1;
    
    // 4. Cognitive load (schedule heavy tasks during peak hours)
    const loadPriority = { heavy: 3, medium: 2, light: 1 };
    return loadPriority[b.cognitive_load] - loadPriority[a.cognitive_load];
  });
}

// Check if a block can accommodate an assignment based on cognitive load rules
function canScheduleInBlock(
  assignment: Assignment,
  blockNumber: number,
  existingSchedule: Record<number, Assignment>,
  studentName: string
): boolean {
  const cognitiveLoad = getCognitiveLoad(assignment.subject, studentName);
  
  // Count heavy cognitive load assignments scheduled so far
  const heavyBeforeLunch = Object.entries(existingSchedule)
    .filter(([block, assignment]) => 
      parseInt(block) < 5 && // before lunch (assuming lunch is block 5)
      getCognitiveLoad(assignment.subject, studentName) === 'heavy'
    ).length;
  
  // Check max heavy before lunch
  if (cognitiveLoad === 'heavy' && blockNumber < 5 && heavyBeforeLunch >= cognitiveLoadRules.maxHeavyBeforeLunch) {
    return false;
  }
  
  // Check consecutive heavy rule
  if (cognitiveLoad === 'heavy') {
    const prevBlock = existingSchedule[blockNumber - 1];
    const nextBlock = existingSchedule[blockNumber + 1];
    
    if (prevBlock && getCognitiveLoad(prevBlock.subject, studentName) === 'heavy') {
      return false;
    }
    if (nextBlock && getCognitiveLoad(nextBlock.subject, studentName) === 'heavy') {
      return false;
    }
  }
  
  // Abigail-specific reading constraints
  if (studentName === 'Abigail' && assignment.subject === 'Reading') {
    const abigailAccommodations = studentAccommodations['Abigail'];
    // Prefer morning blocks for reading
    if (!abigailAccommodations.preferredReadingBlocks.includes(blockNumber)) {
      // Only allow if morning blocks are full
      const morningReadingCount = abigailAccommodations.preferredReadingBlocks
        .filter(block => existingSchedule[block]?.subject === 'Reading').length;
      
      if (morningReadingCount < abigailAccommodations.maxReadingBlocksPerDay) {
        return false; // Wait for morning slot
      }
    }
  }
  
  return true;
}

// Get available assignment blocks for a student on a given day
function getAvailableAssignmentBlocks(studentName: string, dayName: string): number[] {
  const daySchedule = getScheduleForStudentAndDay(studentName, dayName);
  
  return daySchedule
    .filter(block => block.type === 'Assignment' && block.block)
    .map(block => block.block!) // Extract block number
    .sort((a, b) => a - b);
}

// Main scheduling algorithm
export function scheduleAssignments(
  assignments: Assignment[],
  studentName: string,
  dayName: string
): SchedulingResult {
  const availableBlocks = getAvailableAssignmentBlocks(studentName, dayName);
  const sortedAssignments = sortAssignmentsByPriority(assignments);
  const scheduledAssignments: Assignment[] = [];
  const unscheduledAssignments: Assignment[] = [];
  const existingSchedule: Record<number, Assignment> = {};
  const cognitiveLoadDistribution: Record<number, 'light' | 'medium' | 'heavy'> = {};
  const warnings: string[] = [];
  
  // Prioritize Math for first assignment block (usually block 2)
  const firstAssignmentBlock = availableBlocks[0];
  const mathAssignment = sortedAssignments.find(a => a.subject === 'Math');
  
  // Schedule Math first if available
  if (mathAssignment && firstAssignmentBlock) {
    mathAssignment.scheduled_block = firstAssignmentBlock;
    mathAssignment.scheduled_day = dayName;
    mathAssignment.scheduled_date = new Date().toISOString().split('T')[0]; // Today for now
    
    existingSchedule[firstAssignmentBlock] = mathAssignment;
    cognitiveLoadDistribution[firstAssignmentBlock] = getCognitiveLoad(mathAssignment.subject, studentName);
    scheduledAssignments.push(mathAssignment);
    
    // Remove from list
    const mathIndex = sortedAssignments.indexOf(mathAssignment);
    sortedAssignments.splice(mathIndex, 1);
  }
  
  // Schedule remaining assignments
  for (const assignment of sortedAssignments) {
    let scheduled = false;
    
    for (const blockNumber of availableBlocks) {
      // Skip if block is already used
      if (existingSchedule[blockNumber]) continue;
      
      // Check if assignment can be scheduled in this block
      if (canScheduleInBlock(assignment, blockNumber, existingSchedule, studentName)) {
        assignment.scheduled_block = blockNumber;
        assignment.scheduled_day = dayName;
        assignment.scheduled_date = new Date().toISOString().split('T')[0];
        
        existingSchedule[blockNumber] = assignment;
        cognitiveLoadDistribution[blockNumber] = getCognitiveLoad(assignment.subject, studentName);
        scheduledAssignments.push(assignment);
        scheduled = true;
        break;
      }
    }
    
    if (!scheduled) {
      unscheduledAssignments.push(assignment);
      
      if (assignment.urgency === 'overdue') {
        warnings.push(`Overdue assignment "${assignment.title}" could not be scheduled today`);
      }
    }
  }
  
  // Fill remaining blocks with "Free Time" or "Review"
  const usedBlocks = Object.keys(existingSchedule).map(Number);
  const remainingBlocks = availableBlocks.filter(block => !usedBlocks.includes(block));
  
  for (const blockNumber of remainingBlocks) {
    const freeTimeAssignment: Assignment = {
      id: `free-time-${blockNumber}`,
      canvas_id: '',
      student_name: studentName,
      subject: 'Free Time',
      title: 'Free Time / Review',
      status: 'scheduled',
      urgency: 'upcoming',
      cognitive_load: 'light',
      estimated_minutes: 45,
      scheduled_block: blockNumber,
      scheduled_day: dayName,
      scheduled_date: new Date().toISOString().split('T')[0]
    };
    
    scheduledAssignments.push(freeTimeAssignment);
    cognitiveLoadDistribution[blockNumber] = 'light';
  }
  
  // Generate cognitive load warnings
  const heavyBlocks = Object.entries(cognitiveLoadDistribution)
    .filter(([_, load]) => load === 'heavy')
    .map(([block, _]) => parseInt(block));
  
  if (heavyBlocks.length > cognitiveLoadRules.maxHeavyBeforeLunch) {
    warnings.push('High cognitive load distribution may cause afternoon fatigue');
  }
  
  return {
    scheduledAssignments: scheduledAssignments.sort((a, b) => (a.scheduled_block || 0) - (b.scheduled_block || 0)),
    unscheduledAssignments,
    blocksUsed: usedBlocks.length,
    blocksAvailable: availableBlocks.length,
    cognitiveLoadDistribution,
    warnings
  };
}

// Utility function to get cognitive load color for UI
export function getCognitiveLoadColor(load: 'light' | 'medium' | 'heavy'): string {
  switch (load) {
    case 'heavy': return 'text-red-600 bg-red-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'light': return 'text-green-600 bg-green-50';
  }
}

// Utility function to get urgency color for UI
export function getUrgencyColor(urgency: 'overdue' | 'due_today' | 'upcoming'): string {
  switch (urgency) {
    case 'overdue': return 'border-red-500 bg-red-50';
    case 'due_today': return 'border-orange-500 bg-orange-50';
    case 'upcoming': return 'border-blue-500 bg-blue-50';
  }
}