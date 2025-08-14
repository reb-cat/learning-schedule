import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

function verifyRequest(req: Request): Response | null {
  const enforce = Deno.env.get('ENFORCE_X_INTERNAL_FN_SECRET') === 'true';
  const secret = Deno.env.get('X_INTERNAL_FN_SECRET');
  if (!enforce) {
    console.log('Auth gating disabled (ENFORCE_X_INTERNAL_FN_SECRET not true) - allowing request');
    return null;
  }
  if (!secret) {
    console.warn('ENFORCE_X_INTERNAL_FN_SECRET is true but X_INTERNAL_FN_SECRET is not set - allowing request');
    return null;
  }
  const headerSecret = req.headers.get('x-internal-secret') || '';
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (headerSecret === secret || bearer === secret) return null;

  return new Response(JSON.stringify({ success: false, error: 'Unauthorized: invalid internal secret' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// UNIFIED SCHEDULER LOGIC - REPLICATED FROM src/services/unifiedScheduler.ts
// This ensures automated scheduling uses the SAME logic as manual scheduling
// ============================================================================

interface TaskClassification {
  id: string;
  title: string;
  student_name: string;
  subject?: string;
  due_date?: string;
  estimated_time: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  cognitive_load: 'light' | 'medium' | 'heavy';
  task_type: 'academic' | 'quick_review' | 'administrative';
  completion_status?: string;
}

interface BlockComposition {
  date: string;
  day: string;
  block: number;
  start: string;
  end: string;
  tasks: TaskClassification[];
  total_minutes: number;
  available_minutes: number;
  buffer_minutes: number;
}

interface SchedulingDecision {
  decisions: Array<{
    task: TaskClassification;
    target_date: string;
    target_block: number;
    reasoning: string;
  }>;
  unscheduled_tasks: TaskClassification[];
  split_assignments: any[];
  administrative_tasks: TaskClassification[];
  stats: {
    totalTasks: number;
    scheduledTasks: number;
    unscheduledTasks: number;
    totalBlocks: number;
    usedBlocks: number;
  };
  warnings: string[];
}

// Helper function to determine if a task is urgent (due today or overdue)
function isTaskUrgent(task: TaskClassification): boolean {
  if (!task.due_date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.due_date);
  dueDate.setHours(0, 0, 0, 0);
  
  // Urgent = due today or overdue
  return dueDate <= today;
}

// Calculate urgency based on due date (matches blockSharingScheduler logic)
function calculateUrgency(assignment: any): 'critical' | 'high' | 'medium' | 'low' {
  if (!assignment.due_date) return 'low';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(assignment.due_date);
  dueDate.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) return 'critical'; // Overdue
  if (daysDiff === 0) return 'critical'; // Due today
  if (daysDiff === 1) return 'high'; // Due tomorrow
  if (daysDiff <= 3) return 'medium'; // Due this week
  return 'low'; // Due later
}

// Classify task type (matches blockSharingScheduler logic)
function classifyTaskType(assignment: any): 'academic' | 'quick_review' | 'administrative' {
  const title = assignment.title?.toLowerCase() || '';
  
  // Administrative tasks
  if (title.includes('fee') || title.includes('payment') || title.includes('form') || 
      title.includes('permission') || title.includes('bring') || title.includes('deliver') ||
      title.includes('submit form') || title.includes('turn in')) {
    return 'administrative';
  }
  
  // Quick review tasks
  if (title.includes('syllabus') || title.includes('recipe') || 
      title.includes('check') || (title.includes('review') && title.length < 40)) {
    return 'quick_review';
  }
  
  // Default to academic
  return 'academic';
}

// Get cognitive load (matches blockSharingScheduler logic)
function getCognitiveLoad(subject: string, studentName: string): 'light' | 'medium' | 'heavy' {
  const baseLoads = {
    'Math': 'heavy',
    'Science': 'heavy', 
    'Physics': 'heavy',
    'Chemistry': 'heavy',
    'Biology': 'medium',
    'English': 'medium',
    'Reading': 'medium',
    'History': 'medium',
    'Art': 'light',
    'Music': 'light',
    'PE': 'light'
  };
  
  // Student-specific accommodations
  if (studentName === 'Khalil' && subject === 'Reading') {
    return 'heavy'; // Dyslexia accommodation
  }
  
  return baseLoads[subject] || 'medium';
}

// Get intelligent time estimate (matches blockSharingScheduler logic)
function getIntelligentTimeEstimate(assignment: any): number {
  if (assignment.actual_estimated_minutes && assignment.actual_estimated_minutes > 0) {
    return assignment.actual_estimated_minutes;
  }
  
  if (assignment.estimated_time_minutes && assignment.estimated_time_minutes > 0) {
    return assignment.estimated_time_minutes;
  }
  
  const title = assignment.title?.toLowerCase() || '';
  
  // Quick review tasks
  if (title.includes('syllabus')) return 10;
  if (title.includes('recipe')) return 8;
  if (title.includes('review') && title.length < 40) return 15;
  if (title.includes('check')) return 5;
  
  // Default based on title length
  if (title.length < 30) return 30;
  if (title.length < 60) return 45;
  return 60;
}

// Get available blocks for scheduling (simplified version)
async function getAvailableBlocks(studentName: string, daysAhead: number = 7): Promise<BlockComposition[]> {
  const blocks: BlockComposition[] = [];
  const today = new Date();
  
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = date.toISOString().split('T')[0];
    
    // Check for all-day events
    const { data: allDayEvents } = await supabase
      .from('all_day_events')
      .select('*')
      .eq('student_name', studentName)
      .eq('event_date', dateString);

    if (allDayEvents && allDayEvents.length > 0) {
      console.log(`⚠️ All-day event detected for ${studentName} on ${dateString} - skipping`);
      continue;
    }
    
    // Create blocks for the day
    for (let blockNum = 1; blockNum <= 6; blockNum++) {
      blocks.push({
        date: dateString,
        day: dayName,
        block: blockNum,
        start: `${7 + blockNum}:00`, // Simplified time
        end: `${7 + blockNum}:45`,
        tasks: [],
        total_minutes: 45,
        available_minutes: 45,
        buffer_minutes: 5
      });
    }
  }
  
  return blocks;
}

// Get classified tasks from database (replaces old assignment fetching)
async function getClassifiedTasks(studentName: string, stagingMode: boolean = false): Promise<TaskClassification[]> {
  const assignmentsTable = stagingMode ? 'assignments_staging' : 'assignments';
  
  const { data: assignments, error } = await supabase
    .from(assignmentsTable)
    .select('*')
    .eq('student_name', studentName)
    .eq('eligible_for_scheduling', true)
    .is('scheduled_block', null)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error || !assignments) {
    console.error('Error fetching assignments:', error);
    return [];
  }

  // Transform assignments into TaskClassification format with unified logic
  return assignments
    .filter(assignment => {
      // CRITICAL: Apply "Need More Time" logic - filter out non-urgent in_progress tasks
      if (assignment.completion_status === 'in_progress' && !isTaskUrgent({
        id: assignment.id,
        title: assignment.title,
        student_name: assignment.student_name,
        due_date: assignment.due_date,
        estimated_time: getIntelligentTimeEstimate(assignment),
        urgency: calculateUrgency(assignment),
        cognitive_load: getCognitiveLoad(assignment.subject || '', assignment.student_name),
        task_type: classifyTaskType(assignment)
      })) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`📅 "Need More Time" logic applied: Non-urgent in_progress task filtered out from today's blocks`);
        }
        return false;
      }
      
      // Don't schedule administrative tasks - they should be checklist items
      if (classifyTaskType(assignment) === 'administrative') {
        return false;
      }
      
      return true;
    })
    .map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      student_name: assignment.student_name,
      subject: assignment.subject,
      due_date: assignment.due_date,
      estimated_time: getIntelligentTimeEstimate(assignment),
      urgency: calculateUrgency(assignment),
      cognitive_load: getCognitiveLoad(assignment.subject || '', assignment.student_name),
      task_type: classifyTaskType(assignment),
      completion_status: assignment.completion_status
    }));
}

// Schedule assignment in database (improved version)
async function scheduleAssignment(
  task: TaskClassification,
  block: number,
  date: string,
  day: string,
  stagingMode: boolean = false
): Promise<boolean> {
  console.log(`📅 Scheduling "${task.title}" in block ${block} on ${date}`);
  
  const assignmentsTable = stagingMode ? 'assignments_staging' : 'assignments';
  
  const { error } = await supabase
    .from(assignmentsTable)
    .update({
      scheduled_block: block,
      scheduled_date: date,
      scheduled_day: day
    })
    .eq('id', task.id);
    
  if (error) {
    console.error(`❌ Error scheduling assignment:`, error);
    return false;
  }
  
  console.log(`✅ Successfully scheduled "${task.title}"`);
  return true;
}

// Student accommodations for smart scheduling
function getStudentAccommodations(studentName: string) {
  const accommodations = {
    'Abigail': {
      preferredReadingBlocks: [1, 2],
      maxBlockLength: 2,
      needsBreaks: true
    },
    'Khalil': {
      preferredReadingBlocks: [2, 3], 
      maxBlockLength: 1,
      needsBreaks: false
    }
  };
  return accommodations[studentName] || {};
}

// Find the best block for a task (simplified but improved version)
function findBestBlock(
  task: TaskClassification,
  availableBlocks: number[],
  scheduledSubjects: {[key: number]: string},
  accommodations: any
): number | null {
  if (availableBlocks.length === 0) return null;
  
  const scores = availableBlocks.map(block => {
    let score = 0;
    
    // Cognitive load optimization - improved logic
    if (task.cognitive_load === 'heavy' && block <= 3) score += 15;
    if (task.cognitive_load === 'medium' && block >= 2 && block <= 4) score += 10;
    if (task.cognitive_load === 'light' && block >= 3) score += 8;
    
    // Math assignments prefer Block 2 (when mind is sharpest)
    if (task.subject === 'Math' && block === 2) score += 20;
    
    // Student preferences for reading
    if (task.subject === 'Reading' && accommodations.preferredReadingBlocks?.includes(block)) {
      score += 15;
    }
    
    // Avoid consecutive heavy cognitive loads
    const prevSubject = scheduledSubjects[block - 1];
    const nextSubject = scheduledSubjects[block + 1];
    if (task.cognitive_load === 'heavy' && 
        (prevSubject === 'heavy' || nextSubject === 'heavy')) {
      score -= 10;
    }
    
    // Avoid same subject in consecutive blocks
    if (prevSubject === task.subject || nextSubject === task.subject) {
      score -= 8;
    }
    
    return { block, score };
  });
  
  scores.sort((a, b) => b.score - a.score);
  return scores[0].block;
}

// Function to ensure adequate Bible assignments exist
async function ensureBibleAssignments(studentName: string): Promise<void> {
  try {
    // Check how many unscheduled Bible assignments this student has
    const { data: bibleAssignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('student_name', studentName)
      .eq('subject', 'Bible')
      .eq('completion_status', 'not_started')
      .is('scheduled_date', null);

    const unscheduledCount = bibleAssignments?.length || 0;
    console.log(`📖 ${studentName} has ${unscheduledCount} unscheduled Bible assignments`);

    // If fewer than 3 unscheduled Bible assignments, create more
    if (unscheduledCount < 3) {
      console.log(`📝 Generating more Bible assignments for ${studentName}...`);
      
      const createResponse = await supabase.functions.invoke('create-weekly-bible-assignments', {
        body: { 
          studentName, 
          daysToCreate: 7 
        }
      });

      if (createResponse.error) {
        console.error('Error creating Bible assignments:', createResponse.error);
      } else {
        console.log(`✅ Created Bible assignments for ${studentName}:`, createResponse.data);
      }
    }
  } catch (error) {
    console.error('Error ensuring Bible assignments:', error);
  }
}

// Main unified scheduling function (replaces old auto-scheduler logic)
async function scheduleAssignments(studentName: string, stagingMode: boolean = false): Promise<number> {
  console.log(`🚀 Starting UNIFIED auto-scheduling for ${studentName} (same logic as manual)`);
  
  // Ensure adequate Bible assignments exist before scheduling
  await ensureBibleAssignments(studentName);
  
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  
  if (isWeekend) {
    console.log(`⏰ Skipping scheduling - it's the weekend`);
    return 0;
  }
  
  // Get classified tasks using the same logic as blockSharingScheduler
  const tasks = await getClassifiedTasks(studentName, stagingMode);
  console.log(`📝 Found ${tasks.length} tasks to schedule after filtering`);
  
  if (tasks.length === 0) {
    console.log(`✅ No tasks to schedule for ${studentName}`);
    return 0;
  }
  
  // Get available blocks (7-day window like UnifiedScheduler)
  const availableBlocks = await getAvailableBlocks(studentName, 7);
  console.log(`📅 Found ${availableBlocks.length} available blocks across 7 days`);
  
  if (availableBlocks.length === 0) {
    console.log(`⚠️ No available blocks found for ${studentName}`);
    return 0;
  }
  
  const accommodations = getStudentAccommodations(studentName);
  let scheduledCount = 0;
  
  // Sort tasks by urgency (most urgent first) - same logic as blockSharingScheduler
  const sortedTasks = tasks.sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    
    if (urgencyDiff !== 0) return urgencyDiff;
    
    // Same urgency, sort by due date
    const aDate = new Date(a.due_date || '2099-12-31');
    const bDate = new Date(b.due_date || '2099-12-31');
    return aDate.getTime() - bDate.getTime();
  });
  
  console.log(`🎯 Scheduling ${sortedTasks.length} tasks by urgency...`);
  
  // Track scheduled blocks to avoid conflicts
  const scheduledBlocks = new Set<string>();
  const scheduledSubjects: {[key: number]: string} = {};
  
  // Schedule tasks into available blocks
  for (const task of sortedTasks) {
    console.log(`📋 Processing "${task.title}" (${task.urgency} urgency)`);
    
    // Find suitable blocks for this task
    const suitableBlocks = availableBlocks.filter(block => {
      const blockKey = `${block.date}-${block.block}`;
      return !scheduledBlocks.has(blockKey);
    });
    
    if (suitableBlocks.length === 0) {
      console.log(`⚠️ No available blocks for "${task.title}"`);
      continue;
    }
    
    // Choose best block based on cognitive load and preferences
    const availableBlockNumbers = suitableBlocks.map(b => b.block);
    const bestBlockNumber = findBestBlock(task, availableBlockNumbers, scheduledSubjects, accommodations);
    
    if (bestBlockNumber) {
      const selectedBlock = suitableBlocks.find(b => b.block === bestBlockNumber);
      if (selectedBlock) {
        const success = await scheduleAssignment(
          task, 
          selectedBlock.block, 
          selectedBlock.date, 
          selectedBlock.day, 
          stagingMode
        );
        
        if (success) {
          const blockKey = `${selectedBlock.date}-${selectedBlock.block}`;
          scheduledBlocks.add(blockKey);
          scheduledSubjects[selectedBlock.block] = task.subject || '';
          scheduledCount++;
          
          console.log(`✅ Scheduled "${task.title}" in Block ${selectedBlock.block} on ${selectedBlock.day}`);
        }
      }
    }
  }
  
  console.log(`✅ UNIFIED auto-scheduling complete for ${studentName}: ${scheduledCount} assignments scheduled`);
  return scheduledCount;
}

// ============================================================================
// CLEAN AUTO-SCHEDULER ENDPOINT - USES UNIFIED LOGIC 
// ============================================================================

serve(async (req) => {
  console.log(`🤖 Auto-scheduler started - ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const unauthorized = verifyRequest(req);
  if (unauthorized) return unauthorized;

  try {
    // Handle request body to determine which students to schedule and staging mode
    let studentName = null;
    let stagingMode = false;
    try {
      const body = await req.text();
      if (body.trim()) {
        const parsed = JSON.parse(body);
        studentName = parsed.studentName;
        stagingMode = parsed.staging || false;
      }
    } catch (parseError) {
      console.log(`ℹ️ No specific student requested, scheduling for all students`);
    }
    
    const studentsToSchedule = studentName ? [studentName] : ['Abigail', 'Khalil'];
    const results = {};

    // Schedule assignments for each student
    for (const student of studentsToSchedule) {
      try {
        console.log(`🎯 Processing auto-scheduling for ${student}...`);
        const scheduledCount = await scheduleAssignments(student, stagingMode);
        results[student] = { success: true, scheduledCount };
        
        // Update sync status
        const syncStatusTable = stagingMode ? 'sync_status_staging' : 'sync_status';
        await supabase
          .from(syncStatusTable)
          .insert({
            student_name: student,
            status: 'success',
            message: `Auto-scheduled ${scheduledCount} assignments`,
            assignments_count: scheduledCount,
            sync_type: 'auto-scheduler'
          });
          
      } catch (error) {
        console.error(`❌ Auto-scheduling failed for ${student}:`, error);
        results[student] = { success: false, error: error.message };
        
        const syncStatusTable = stagingMode ? 'sync_status_staging' : 'sync_status';
        await supabase
          .from(syncStatusTable)
          .insert({
            student_name: student,
            status: 'error',
            message: `Auto-scheduling error: ${error.message}`,
            sync_type: 'auto-scheduler'
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Auto-scheduling completed',
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('💥 Critical auto-scheduler error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
