import { supabase } from "@/integrations/supabase/client";

export interface SubjectPattern {
  defaultLoad: 'light' | 'medium' | 'heavy';
  defaultDuration: number;
  keywords: string[];
  durationPatterns: { pattern: RegExp; multiplier: number }[];
}

export interface EnergyPattern {
  peakBlocks: number[];
  lowBlocks: number[];
  secondWind: number[];
  patternType: 'subject_based' | 'time_based';
  subjectEnergy?: {
    high: string[];
    medium: string[];
    low: string[];
  };
}

export interface StudentAccommodation {
  name: string;
  subjectAdjustments: Record<string, Partial<SubjectPattern>>;
  energyPattern: EnergyPattern;
  globalMultipliers: {
    duration: number;
    cognitiveLoad: number;
  };
}

// Enhanced subject knowledge base
export const subjectPatterns: Record<string, SubjectPattern> = {
  'Math': {
    defaultLoad: 'heavy',
    defaultDuration: 45,
    keywords: ['algebra', 'geometry', 'calculate', 'solve', 'equation', 'problem', 'worksheet'],
    durationPatterns: [
      { pattern: /(\d+)\s*problems?/i, multiplier: 3 }, // 3 min per problem
      { pattern: /worksheet/i, multiplier: 30 },
      { pattern: /test|exam/i, multiplier: 60 },
      { pattern: /practice/i, multiplier: 20 }
    ]
  },
  'Reading': {
    defaultLoad: 'light',
    defaultDuration: 30,
    keywords: ['read', 'chapter', 'pages', 'story', 'book', 'novel', 'article'],
    durationPatterns: [
      { pattern: /pages?\s*(\d+)-(\d+)/i, multiplier: 2 }, // 2 min per page
      { pattern: /chapter\s*(\d+)/i, multiplier: 20 }, // 20 min per chapter
      { pattern: /(\d+)\s*pages?/i, multiplier: 2 }
    ]
  },
  'Writing': {
    defaultLoad: 'heavy',
    defaultDuration: 45,
    keywords: ['essay', 'write', 'paragraph', 'composition', 'paper', 'report'],
    durationPatterns: [
      { pattern: /(\d+)[-\s]*paragraph/i, multiplier: 15 }, // 15 min per paragraph
      { pattern: /(\d+)[-\s]*page/i, multiplier: 30 }, // 30 min per page
      { pattern: /essay/i, multiplier: 60 },
      { pattern: /outline/i, multiplier: 20 }
    ]
  },
  'Science': {
    defaultLoad: 'medium',
    defaultDuration: 40,
    keywords: ['experiment', 'lab', 'hypothesis', 'research', 'observe'],
    durationPatterns: [
      { pattern: /lab|experiment/i, multiplier: 60 },
      { pattern: /worksheet/i, multiplier: 25 },
      { pattern: /research/i, multiplier: 45 }
    ]
  },
  'Social Studies': {
    defaultLoad: 'medium',
    defaultDuration: 35,
    keywords: ['history', 'geography', 'government', 'civics', 'culture'],
    durationPatterns: [
      { pattern: /research/i, multiplier: 45 },
      { pattern: /map/i, multiplier: 20 },
      { pattern: /timeline/i, multiplier: 30 }
    ]
  },
  'Life Skills': {
    defaultLoad: 'medium',
    defaultDuration: 60,
    keywords: ['driving', 'cooking', 'job', 'application', 'budget', 'finance'],
    durationPatterns: [
      { pattern: /driving/i, multiplier: 90 },
      { pattern: /cooking|recipe/i, multiplier: 45 },
      { pattern: /application/i, multiplier: 30 },
      { pattern: /practice/i, multiplier: 60 }
    ]
  },
  'Art': {
    defaultLoad: 'light',
    defaultDuration: 50,
    keywords: ['draw', 'paint', 'sketch', 'create', 'design'],
    durationPatterns: [
      { pattern: /project/i, multiplier: 90 },
      { pattern: /sketch/i, multiplier: 20 },
      { pattern: /painting/i, multiplier: 60 }
    ]
  }
};

// Student-specific accommodations (static data)
export const studentAccommodations: Record<string, Omit<StudentAccommodation, 'energyPattern'>> = {
  'Khalil': {
    name: 'Khalil',
    subjectAdjustments: {
      'Reading': { 
        defaultLoad: 'heavy', // Dyslexia makes reading harder
        defaultDuration: 40 // Takes longer due to dyslexia
      }
    },
    globalMultipliers: {
      duration: 1.1, // Generally takes 10% longer
      cognitiveLoad: 1.0
    }
  },
  'Abigail': {
    name: 'Abigail',
    subjectAdjustments: {
      'Reading': {
        defaultLoad: 'heavy' // Executive function challenges with reading comprehension
      }
    },
    globalMultipliers: {
      duration: 1.0,
      cognitiveLoad: 1.1 // Slightly higher cognitive load due to executive function
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

    const { pattern_type, energy_data } = data;

    const energyData = energy_data as any; // Type assertion for JSONB data

    if (pattern_type === 'subject_based') {
      return {
        peakBlocks: [],
        lowBlocks: [],
        secondWind: [],
        patternType: 'subject_based',
        subjectEnergy: {
          high: energyData.high_energy_subjects || [],
          medium: energyData.medium_energy_subjects || [],
          low: energyData.low_energy_subjects || []
        }
      };
    } else {
      return {
        peakBlocks: energyData.high_energy_blocks || [],
        lowBlocks: energyData.low_energy_blocks || [],
        secondWind: energyData.medium_energy_blocks || [],
        patternType: 'time_based'
      };
    }
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
  // If already provided and reasonable, use it
  if (assignment.estimated_time_minutes && assignment.estimated_time_minutes > 0) {
    return assignment.estimated_time_minutes;
  }

  const subject = assignment.subject || inferSubjectFromTitle(assignment.title, assignment.course_name);
  const pattern = subjectPatterns[subject];
  let estimatedDuration = pattern?.defaultDuration || 30;

  // Apply pattern-based duration detection
  if (pattern?.durationPatterns) {
    for (const durationPattern of pattern.durationPatterns) {
      const match = assignment.title.match(durationPattern.pattern);
      if (match) {
        if (match[1] && match[2]) {
          // Range pattern (e.g., "pages 1-5")
          const range = parseInt(match[2]) - parseInt(match[1]) + 1;
          estimatedDuration = range * durationPattern.multiplier;
        } else if (match[1]) {
          // Single number pattern (e.g., "5 problems")
          estimatedDuration = parseInt(match[1]) * durationPattern.multiplier;
        } else {
          // Fixed pattern (e.g., "worksheet")
          estimatedDuration = durationPattern.multiplier;
        }
        break;
      }
    }
  }

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

  return Math.round(estimatedDuration);
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
  urgency: string = 'upcoming',
  subject?: string
): Promise<{ preferredBlocks: number[]; avoidBlocks: number[] }> {
  const energyPattern = await getStudentEnergyPattern(studentName);
  
  if (!energyPattern) {
    // Fallback to reasonable defaults
    return { 
      preferredBlocks: [1, 2, 3, 4, 5, 6, 7, 8], 
      avoidBlocks: [] 
    };
  }

  let preferredBlocks: number[] = [];
  let avoidBlocks: number[] = [];

  if (energyPattern.patternType === 'subject_based' && subject && energyPattern.subjectEnergy) {
    // For subject-based patterns, determine energy level for this subject
    const { high, medium, low } = energyPattern.subjectEnergy;
    
    let subjectEnergyLevel: 'high' | 'medium' | 'low' = 'medium';
    
    if (high.some(s => subject.toLowerCase().includes(s.toLowerCase()))) {
      subjectEnergyLevel = 'high';
    } else if (low.some(s => subject.toLowerCase().includes(s.toLowerCase()))) {
      subjectEnergyLevel = 'low';
    }
    
    // Match cognitive load requirements with subject energy
    if (cognitiveLoad === 'heavy') {
      if (subjectEnergyLevel === 'high') {
        preferredBlocks = [1, 2, 3, 4, 5, 6, 7, 8]; // Can schedule anytime
      } else if (subjectEnergyLevel === 'medium') {
        preferredBlocks = [1, 2, 3, 4, 5]; // Earlier blocks preferred
        avoidBlocks = [7, 8]; // Avoid late blocks
      } else {
        preferredBlocks = [1, 2]; // Only early morning
        avoidBlocks = [5, 6, 7, 8]; // Avoid afternoon
      }
    } else if (cognitiveLoad === 'medium') {
      if (subjectEnergyLevel === 'high') {
        preferredBlocks = [1, 2, 3, 4, 5, 6, 7, 8];
      } else if (subjectEnergyLevel === 'medium') {
        preferredBlocks = [1, 2, 3, 4, 5, 6];
        avoidBlocks = [8];
      } else {
        preferredBlocks = [1, 2, 3, 4];
        avoidBlocks = [6, 7, 8];
      }
    } else {
      // Light tasks - less restrictive
      preferredBlocks = [1, 2, 3, 4, 5, 6, 7, 8];
    }
  } else {
    // Time-based energy patterns
    const { peakBlocks, lowBlocks, secondWind } = energyPattern;

    if (cognitiveLoad === 'heavy') {
      // Heavy tasks need peak energy
      preferredBlocks = urgency === 'overdue' ? peakBlocks : [...peakBlocks, ...secondWind];
      avoidBlocks = lowBlocks;
    } else if (cognitiveLoad === 'medium') {
      // Medium tasks avoid low energy but don't require peak
      preferredBlocks = [...peakBlocks, ...secondWind];
      avoidBlocks = lowBlocks;
    } else {
      // Light tasks can fill low energy slots
      preferredBlocks = [...peakBlocks, ...secondWind, ...lowBlocks];
      avoidBlocks = [];
    }
  }

  // Ensure blocks are within valid range (1-8)
  return { 
    preferredBlocks: preferredBlocks.filter(block => block >= 1 && block <= 8),
    avoidBlocks: avoidBlocks.filter(block => block >= 1 && block <= 8)
  };
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