import { supabase } from "@/integrations/supabase/client";

export interface SubjectPattern {
  defaultLoad: 'light' | 'medium' | 'heavy';
  defaultDuration: number;
  keywords: string[];
}

export interface EnergyPattern {
  peakBlocks: number[];
  lowBlocks: number[];
  patternType: 'time_based';
}

export interface StudentAccommodation {
  name: string;
  subjectAdjustments: Record<string, Partial<SubjectPattern>>;
  globalMultipliers: {
    duration: number;
    cognitiveLoad: number;
  };
}

// Essential subject patterns for inference
export const subjectPatterns: Record<string, SubjectPattern> = {
  'Math': {
    defaultLoad: 'heavy',
    defaultDuration: 30,
    keywords: ['algebra', 'geometry', 'calculate', 'solve', 'equation', 'problem', 'worksheet']
  },
  'Reading': {
    defaultLoad: 'light',
    defaultDuration: 30,
    keywords: ['read', 'chapter', 'pages', 'story', 'book', 'novel', 'article']
  },
  'Writing': {
    defaultLoad: 'heavy',
    defaultDuration: 35,
    keywords: ['essay', 'write', 'paragraph', 'composition', 'paper', 'report']
  },
  'Science': {
    defaultLoad: 'medium',
    defaultDuration: 40,
    keywords: ['experiment', 'lab', 'hypothesis', 'research', 'observe']
  },
  'Art': {
    defaultLoad: 'light',
    defaultDuration: 50,
    keywords: ['draw', 'paint', 'sketch', 'create', 'design']
  }
};

// Student-specific accommodations
export const studentAccommodations: Record<string, StudentAccommodation> = {
  'Khalil': {
    name: 'Khalil',
    subjectAdjustments: {
      'Reading': { 
        defaultLoad: 'heavy',
        defaultDuration: 40
      }
    },
    globalMultipliers: {
      duration: 1.1,
      cognitiveLoad: 1.0
    }
  },
  'Abigail': {
    name: 'Abigail',
    subjectAdjustments: {
      'Reading': {
        defaultLoad: 'heavy'
      }
    },
    globalMultipliers: {
      duration: 1.0,
      cognitiveLoad: 1.1
    }
  }
};

/**
 * Load energy pattern from database for a student
 */
export async function getStudentEnergyPattern(studentName: string): Promise<EnergyPattern | null> {
  try {
    const { data, error } = await supabase
      .from('student_energy_patterns')
      .select('pattern_type, energy_data')
      .eq('student_name', studentName)
      .single();

    if (error || !data) {
      console.warn(`No energy pattern found for student: ${studentName}`);
      return null;
    }

    const { energy_data } = data;
    const energyData = energy_data as any;

    return {
      peakBlocks: energyData.high_energy_blocks || [],
      lowBlocks: energyData.low_energy_blocks || [],
      patternType: 'time_based'
    };
  } catch (error) {
    console.error('Failed to load energy pattern:', error);
    return null;
  }
}

/**
 * Infer cognitive load based on subject, student, task type, and context
 */
export function inferCognitiveLoad(
  assignment: {
    title: string;
    subject?: string;
    course_name?: string;
    urgency?: string;
    task_type?: string;
  },
  studentName: string
): 'light' | 'medium' | 'heavy' {
  // Get base load from subject
  const subject = assignment.subject || inferSubjectFromTitle(assignment.title, assignment.course_name);
  let baseLoad = subjectPatterns[subject]?.defaultLoad || 'medium';

  // Apply student-specific adjustments
  const student = studentAccommodations[studentName];
  if (student?.subjectAdjustments[subject]?.defaultLoad) {
    baseLoad = student.subjectAdjustments[subject].defaultLoad!;
  }

  // Task type adjustments
  const title = assignment.title.toLowerCase();
  
  // Tests and essays are always heavy
  if (title.includes('test') || title.includes('exam') || title.includes('essay') || title.includes('project')) {
    return 'heavy';
  }
  
  // Review and practice are lighter
  if (title.includes('review') || title.includes('practice') || title.includes('quick')) {
    baseLoad = decreaseCognitiveLoad(baseLoad);
  }
  
  // Administrative tasks are light
  if (assignment.task_type === 'administrative') {
    return 'light';
  }
  
  // Urgency stress factor
  if (assignment.urgency === 'overdue') {
    baseLoad = increaseCognitiveLoad(baseLoad);
  }

  // Apply global multiplier for executive function/attention challenges
  if (student?.globalMultipliers.cognitiveLoad > 1.0 && baseLoad !== 'heavy') {
    baseLoad = increaseCognitiveLoad(baseLoad);
  }

  return baseLoad;
}

/**
 * Infer duration based on title patterns, subject defaults, and learning patterns
 */
export async function inferDuration(
  assignment: {
    title: string;
    subject?: string;
    course_name?: string;
    estimated_time_minutes?: number;
  },
  studentName: string
): Promise<number> {
  // If already provided and reasonable, use it but cap at 45 minutes
  if (assignment.estimated_time_minutes && assignment.estimated_time_minutes > 0) {
    return Math.min(assignment.estimated_time_minutes, 45);
  }

  const subject = assignment.subject || inferSubjectFromTitle(assignment.title, assignment.course_name);
  const pattern = subjectPatterns[subject];
  let estimatedDuration = pattern?.defaultDuration || 30;

  // Basic pattern matching for common cases
  const title = assignment.title.toLowerCase();
  if (title.includes('worksheet')) estimatedDuration = 30;
  if (title.includes('test') || title.includes('exam')) estimatedDuration = 60;
  if (title.includes('practice')) estimatedDuration = 20;

  // Apply learning patterns adjustment
  const learningFactor = await getLearningPatternAdjustment(studentName, subject, assignment.title);
  estimatedDuration *= learningFactor;

  // Apply student-specific duration multiplier
  const student = studentAccommodations[studentName];
  if (student?.globalMultipliers.duration !== 1.0) {
    estimatedDuration *= student.globalMultipliers.duration;
  }

  // Subject-specific adjustments
  if (student?.subjectAdjustments[subject]?.defaultDuration) {
    const adjustmentRatio = student.subjectAdjustments[subject].defaultDuration! / (pattern?.defaultDuration || 30);
    estimatedDuration *= adjustmentRatio;
  }

  // Cap the final result at reasonable maximums for block scheduling
  return Math.round(Math.min(estimatedDuration, 45));
}

/**
 * Infer subject from assignment title and course name
 */
export function inferSubjectFromTitle(title: string, courseName?: string): string {
  const titleLower = title.toLowerCase();
  const courseNameLower = courseName?.toLowerCase() || '';

  // Check course name first for more accurate subject mapping
  for (const [subject, pattern] of Object.entries(subjectPatterns)) {
    if (courseNameLower.includes(subject.toLowerCase())) {
      return subject;
    }
  }

  // Check title keywords
  for (const [subject, pattern] of Object.entries(subjectPatterns)) {
    if (pattern.keywords.some(keyword => titleLower.includes(keyword))) {
      return subject;
    }
  }

  // Fallback based on common course patterns
  if (courseNameLower.includes('english') || courseNameLower.includes('language arts')) {
    return titleLower.includes('write') || titleLower.includes('essay') ? 'Writing' : 'Reading';
  }
  
  if (courseNameLower.includes('algebra') || courseNameLower.includes('geometry') || courseNameLower.includes('math')) {
    return 'Math';
  }
  
  if (courseNameLower.includes('science') || courseNameLower.includes('biology') || courseNameLower.includes('chemistry')) {
    return 'Science';
  }
  
  if (courseNameLower.includes('history') || courseNameLower.includes('social')) {
    return 'Social Studies';
  }

  return 'General'; // Default fallback
}

/**
 * Get learning pattern adjustment factor from database
 */
async function getLearningPatternAdjustment(
  studentName: string, 
  subject: string, 
  title: string
): Promise<number> {
  try {
    const assignmentType = inferAssignmentType(title);
    
    const { data } = await supabase
      .from('learning_patterns')
      .select('average_duration_factor')
      .eq('student_name', studentName)
      .eq('subject', subject)
      .eq('assignment_type', assignmentType)
      .single();

    return data?.average_duration_factor || 1.0;
  } catch (error) {
    // If no pattern exists yet, return default
    return 1.0;
  }
}

/**
 * Infer assignment type for learning pattern tracking
 */
function inferAssignmentType(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('test') || titleLower.includes('exam') || titleLower.includes('quiz')) {
    return 'assessment';
  }
  if (titleLower.includes('essay') || titleLower.includes('paper') || titleLower.includes('report')) {
    return 'writing';
  }
  if (titleLower.includes('worksheet') || titleLower.includes('practice')) {
    return 'practice';
  }
  if (titleLower.includes('project')) {
    return 'project';
  }
  if (titleLower.includes('read') || titleLower.includes('chapter')) {
    return 'reading';
  }
  if (titleLower.includes('research')) {
    return 'research';
  }
  
  return 'general';
}

/**
 * Increase cognitive load by one level
 */
function increaseCognitiveLoad(load: 'light' | 'medium' | 'heavy'): 'light' | 'medium' | 'heavy' {
  switch (load) {
    case 'light': return 'medium';
    case 'medium': return 'heavy';
    case 'heavy': return 'heavy';
  }
}

/**
 * Decrease cognitive load by one level
 */
function decreaseCognitiveLoad(load: 'light' | 'medium' | 'heavy'): 'light' | 'medium' | 'heavy' {
  switch (load) {
    case 'light': return 'light';
    case 'medium': return 'light';
    case 'heavy': return 'medium';
  }
}

/**
 * Get optimal scheduling time based on student energy patterns
 */
export async function getOptimalSchedulingTime(
  studentName: string,
  cognitiveLoad: 'light' | 'medium' | 'heavy',
  urgency: string = 'upcoming'
): Promise<{ preferredBlocks: number[]; avoidBlocks: number[] }> {
  const energyPattern = await getStudentEnergyPattern(studentName);
  
  if (!energyPattern) {
    return { 
      preferredBlocks: [1, 2, 3, 4, 5, 6, 7, 8], 
      avoidBlocks: [] 
    };
  }

  const { peakBlocks, lowBlocks } = energyPattern;

  if (cognitiveLoad === 'heavy') {
    return {
      preferredBlocks: peakBlocks.length > 0 ? peakBlocks : [1, 2, 3],
      avoidBlocks: lowBlocks
    };
  } else if (cognitiveLoad === 'medium') {
    return {
      preferredBlocks: [...peakBlocks, 3, 4, 5, 6],
      avoidBlocks: lowBlocks
    };
  } else {
    return {
      preferredBlocks: [1, 2, 3, 4, 5, 6, 7, 8],
      avoidBlocks: []
    };
  }
}

/**
 * Update learning patterns when assignment is completed
 */
export async function updateLearningPattern(
  studentName: string,
  assignment: {
    subject?: string;
    title: string;
    course_name?: string;
    cognitive_load?: string;
  },
  estimatedMinutes: number,
  actualMinutes: number
): Promise<void> {
  const subject = assignment.subject || inferSubjectFromTitle(assignment.title, assignment.course_name);
  const assignmentType = inferAssignmentType(assignment.title);
  const cognitiveLoad = assignment.cognitive_load || inferCognitiveLoad(assignment, studentName);

  try {
    await supabase.rpc('update_learning_patterns', {
      p_student_name: studentName,
      p_subject: subject,
      p_assignment_type: assignmentType,
      p_estimated_minutes: estimatedMinutes,
      p_actual_minutes: actualMinutes,
      p_cognitive_load: cognitiveLoad
    });
  } catch (error) {
    console.error('Failed to update learning patterns:', error);
  }
}

export class IntelligentInference {
  static inferCognitiveLoad(assignment: { 
    title: string; 
    subject?: string; 
    course_name?: string; 
    urgency?: string; 
    task_type?: string; 
    estimated_time_minutes?: number;
    actual_estimated_minutes?: number;
  }): 'light' | 'medium' | 'heavy' {
    const title = assignment.title?.toLowerCase() || '';
    const estimatedMinutes = assignment.estimated_time_minutes || assignment.actual_estimated_minutes || 30;
    const subject = assignment.subject?.toLowerCase() || '';
    
    // Light cognitive load patterns
    if (title.includes('syllabus') || title.includes('recipe') || 
        title.includes('check') || title.includes('review') ||
        title.includes('attendance') || title.includes('bring') ||
        subject.includes('lunch') || subject.includes('break') ||
        estimatedMinutes <= 15) {
      return 'light';
    }
    
    // Heavy cognitive load patterns
    if (title.includes('project') || title.includes('essay') || 
        title.includes('research') || title.includes('analysis') ||
        title.includes('exam') || title.includes('test') ||
        title.includes('paper') || title.includes('presentation') ||
        subject.includes('math') || subject.includes('science') ||
        estimatedMinutes >= 60) {
      return 'heavy';
    }
    
    return 'medium';
  }

  static inferUrgency(assignment: { due_date?: string }): 'overdue' | 'due_today' | 'due_soon' | 'upcoming' {
    if (!assignment.due_date) return 'upcoming';
    
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day
    dueDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (daysDiff < 0) return 'overdue';
    if (daysDiff === 0) return 'due_today';
    if (daysDiff <= 3) return 'due_soon';
    
    return 'upcoming';
  }

  static applyInferenceToAssignment(assignment: any): any {
    const updatedAssignment = { ...assignment };
    
    // Apply inferences only if data is missing
    if (!updatedAssignment.cognitive_load) {
      updatedAssignment.cognitive_load = this.inferCognitiveLoad(assignment);
    }
    
    if (!updatedAssignment.urgency) {
      updatedAssignment.urgency = this.inferUrgency(assignment);
    }
    
    if (!updatedAssignment.task_type) {
      updatedAssignment.task_type = 'academic';
    }
    
    return updatedAssignment;
  }
}