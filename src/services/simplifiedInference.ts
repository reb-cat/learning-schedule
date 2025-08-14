import { supabase } from '@/integrations/supabase/client';

// Essential subject patterns for task classification and estimation
export const subjectPatterns = {
  'Math': { defaultLoad: 'heavy', defaultDuration: 30, keywords: ['algebra', 'geometry', 'calculate', 'solve', 'equation', 'problem', 'worksheet'] },
  'Reading': { defaultLoad: 'light', defaultDuration: 30, keywords: ['read', 'chapter', 'pages', 'story', 'book', 'novel', 'article'] },
  'Writing': { defaultLoad: 'heavy', defaultDuration: 35, keywords: ['essay', 'write', 'paragraph', 'composition', 'paper', 'report'] },
  'Science': { defaultLoad: 'medium', defaultDuration: 40, keywords: ['experiment', 'lab', 'hypothesis', 'research', 'observe'] },
  'Art': { defaultLoad: 'light', defaultDuration: 50, keywords: ['draw', 'paint', 'sketch', 'create', 'design'] }
} as const;

// Student accommodations
export const studentAccommodations = {
  'Khalil': {
    subjectAdjustments: { 'Reading': { defaultLoad: 'heavy', defaultDuration: 40 } },
    globalMultipliers: { duration: 1.1, cognitiveLoad: 1.0 }
  },
  'Abigail': {
    subjectAdjustments: { 'Reading': { defaultLoad: 'heavy' } },
    globalMultipliers: { duration: 1.0, cognitiveLoad: 1.1 }
  }
} as const;

/**
 * Infer cognitive load based on subject, student, and task context
 */
export function inferCognitiveLoad(
  assignment: { title: string; subject?: string; course_name?: string; urgency?: string; task_type?: string },
  studentName: string
): 'light' | 'medium' | 'heavy' {
  const subject = assignment.subject || inferSubjectFromTitle(assignment.title, assignment.course_name);
  let baseLoad = subjectPatterns[subject]?.defaultLoad || 'medium';

  // Apply student-specific adjustments
  const student = studentAccommodations[studentName];
  if (student?.subjectAdjustments[subject]?.defaultLoad) {
    baseLoad = student.subjectAdjustments[subject].defaultLoad!;
  }

  // Task type adjustments
  const title = assignment.title.toLowerCase();
  if (title.includes('test') || title.includes('exam') || title.includes('essay') || title.includes('project')) {
    return 'heavy';
  }
  if (title.includes('review') || title.includes('practice') || title.includes('quick')) {
    baseLoad = decreaseCognitiveLoad(baseLoad);
  }
  if (assignment.task_type === 'administrative') {
    return 'light';
  }
  if (assignment.urgency === 'overdue') {
    baseLoad = increaseCognitiveLoad(baseLoad);
  }

  return baseLoad;
}

/**
 * Infer duration with basic pattern matching and learning adjustments
 */
export async function inferDuration(
  assignment: { title: string; subject?: string; course_name?: string; estimated_time_minutes?: number },
  studentName: string
): Promise<number> {
  if (assignment.estimated_time_minutes && assignment.estimated_time_minutes > 0) {
    return Math.min(assignment.estimated_time_minutes, 45);
  }

  const subject = assignment.subject || inferSubjectFromTitle(assignment.title, assignment.course_name);
  let estimatedDuration = subjectPatterns[subject]?.defaultDuration || 30;

  // Apply learning patterns from database
  const learningFactor = await getLearningPatternAdjustment(studentName, subject, assignment.title);
  estimatedDuration *= learningFactor;

  // Apply student multipliers
  const student = studentAccommodations[studentName];
  if (student?.globalMultipliers.duration !== 1.0) {
    estimatedDuration *= student.globalMultipliers.duration;
  }

  return Math.round(Math.min(estimatedDuration, 45));
}

/**
 * Infer subject from title and course name
 */
export function inferSubjectFromTitle(title: string, courseName?: string): string {
  const titleLower = title.toLowerCase();
  const courseNameLower = courseName?.toLowerCase() || '';

  // Check course name first
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

  // Course name fallbacks
  if (courseNameLower.includes('english') || courseNameLower.includes('language arts')) {
    return titleLower.includes('write') || titleLower.includes('essay') ? 'Writing' : 'Reading';
  }
  if (courseNameLower.includes('algebra') || courseNameLower.includes('geometry') || courseNameLower.includes('math')) {
    return 'Math';
  }
  if (courseNameLower.includes('science') || courseNameLower.includes('biology') || courseNameLower.includes('chemistry')) {
    return 'Science';
  }

  return 'General';
}

// Helper functions
function increaseCognitiveLoad(load: 'light' | 'medium' | 'heavy'): 'light' | 'medium' | 'heavy' {
  switch (load) {
    case 'light': return 'medium';
    case 'medium': return 'heavy';
    case 'heavy': return 'heavy';
  }
}

function decreaseCognitiveLoad(load: 'light' | 'medium' | 'heavy'): 'light' | 'medium' | 'heavy' {
  switch (load) {
    case 'light': return 'light';
    case 'medium': return 'light';
    case 'heavy': return 'medium';
  }
}

async function getLearningPatternAdjustment(studentName: string, subject: string, title: string): Promise<number> {
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
  } catch {
    return 1.0;
  }
}

function inferAssignmentType(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('test') || titleLower.includes('exam') || titleLower.includes('quiz')) return 'assessment';
  if (titleLower.includes('essay') || titleLower.includes('paper') || titleLower.includes('report')) return 'writing';
  if (titleLower.includes('worksheet') || titleLower.includes('practice')) return 'practice';
  if (titleLower.includes('project')) return 'project';
  if (titleLower.includes('read') || titleLower.includes('chapter')) return 'reading';
  if (titleLower.includes('research')) return 'research';
  
  return 'general';
}