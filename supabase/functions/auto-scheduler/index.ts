import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

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

// Find the best block for an assignment
function findBestBlock(
  assignment: any,
  availableBlocks: number[],
  scheduledSubjects: {[key: number]: string},
  accommodations: any
): number | null {
  if (availableBlocks.length === 0) return null;
  
  const scores = availableBlocks.map(block => {
    let score = 0;
    
    // Cognitive load optimization
    if (assignment.cognitive_load === 'high' && block <= 3) score += 10;
    if (assignment.cognitive_load === 'medium' && block >= 2 && block <= 4) score += 8;
    if (assignment.cognitive_load === 'low' && block >= 3) score += 6;
    
    // Math assignments prefer Block 2
    if (assignment.subject === 'Math' && block === 2) score += 15;
    
    // Student preferences
    if (assignment.subject === 'Reading' && accommodations.preferredReadingBlocks?.includes(block)) {
      score += 12;
    }
    
    // Avoid consecutive heavy loads
    const prevSubject = scheduledSubjects[block - 1];
    const nextSubject = scheduledSubjects[block + 1];
    if (assignment.cognitive_load === 'high' && 
        (prevSubject === 'high' || nextSubject === 'high')) {
      score -= 8;
    }
    
    // Avoid same subject in consecutive blocks
    if (prevSubject === assignment.subject || nextSubject === assignment.subject) {
      score -= 5;
    }
    
    return { block, score };
  });
  
  scores.sort((a, b) => b.score - a.score);
  return scores[0].block;
}

// Schedule assignment in database
async function scheduleAssignment(
  assignment: any,
  block: number,
  date: string,
  day: string,
  stagingMode: boolean = false
): Promise<boolean> {
  console.log(`📅 Scheduling "${assignment.title}" in block ${block} on ${date}`);
  
  const assignmentsTable = stagingMode ? 'assignments_staging' : 'assignments';
  
  const { error } = await supabase
    .from(assignmentsTable)
    .update({
      scheduled_block: block,
      scheduled_date: date,
      scheduled_day: day
    })
    .eq('id', assignment.id);
    
  if (error) {
    console.error(`❌ Error scheduling assignment:`, error);
    return false;
  }
  
  console.log(`✅ Successfully scheduled "${assignment.title}"`);
  return true;
}

// Get available blocks for next N days, checking for all-day events
async function getAvailableBlocksForDays(daysAhead: number = 5, studentName: string): Promise<Array<{date: string, day: string, blocks: number[]}>> {
  const scheduleWindow = [];
  const today = new Date();
  
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = date.toISOString().split('T')[0];
    
    // Check for all-day events that would override the normal schedule
    const { data: allDayEvents } = await supabase
      .from('all_day_events')
      .select('*')
      .eq('student_name', studentName)
      .eq('event_date', dateString);

    // If there's an all-day event, skip this day entirely
    if (allDayEvents && allDayEvents.length > 0) {
      console.log(`⚠️ All-day event detected for ${studentName} on ${dateString} - skipping assignment scheduling`);
      continue;
    }
    
    scheduleWindow.push({
      date: dateString,
      day: dayName,
      blocks: [1, 2, 3, 4, 5, 6] // All available blocks
    });
  }
  
  return scheduleWindow;
}

// Calculate urgency based on due date
function calculateUrgency(assignment: any, today: Date): 'critical' | 'high' | 'medium' | 'low' {
  if (!assignment.due_date) return 'low';
  
  const dueDate = new Date(assignment.due_date);
  const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) return 'critical'; // Overdue
  if (daysDiff === 0) return 'critical'; // Due today
  if (daysDiff === 1) return 'high'; // Due tomorrow
  if (daysDiff <= 3) return 'medium'; // Due this week
  return 'low'; // Due later
}

// Determine if assignment should be scheduled based on type and due date
function shouldScheduleAssignment(assignment: any, today: Date): boolean {
  // Handle assignments without due dates - treat as "due soon"
  if (!assignment.due_date) {
    console.log(`📋 Scheduling assignment without due date: "${assignment.title}"`);
    return true;
  }
  
  const dueDate = new Date(assignment.due_date);
  const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Don't schedule administrative tasks - they should be checklist items
  if (isAdministrativeTask(assignment)) {
    console.log(`⚠️ Skipping administrative task: "${assignment.title}" - should be a checklist item`);
    return false;
  }
  
  // Extended scheduling window to 14 days for better preparation
  if (daysDiff > 14) {
    console.log(`⚠️ Too early to schedule: "${assignment.title}" due in ${daysDiff} days`);
    return false;
  }
  
  return true;
}

// Detect administrative tasks that should be checklist items
function isAdministrativeTask(assignment: any): boolean {
  const title = assignment.title?.toLowerCase() || '';
  
  // Exclude complex administrative tasks that require substantial time
  if (title.includes('packet') || title.includes('application') || title.includes('notarization')) {
    return false;
  }
  
  const adminKeywords = ['fee', 'permission', 'bring', 'deliver', 'submit form', 'turn in', 'payment'];
  return adminKeywords.some(keyword => title.includes(keyword));
}

// Get intelligent time estimate based on task type
function getIntelligentTimeEstimate(assignment: any): number {
  const title = assignment.title?.toLowerCase() || '';
  
  // Administrative tasks (should be checklist items, but if scheduled)
  if (isAdministrativeTask(assignment)) {
    return 3; // 3 minutes max for fees, forms
  }
  
  // Review tasks
  if (title.includes('syllabus')) return 5;
  if (title.includes('recipe')) return 7;
  if (title.includes('review') && title.length < 40) return 10;
  
  // Use existing estimate or intelligent default
  return assignment.actual_estimated_minutes || assignment.estimated_time_minutes || 45;
}

// Split large assignments into multiple parts
async function createSplitAssignment(assignment: any, parts: number, stagingMode: boolean = false): Promise<string[]> {
  const assignmentsTable = stagingMode ? 'assignments_staging' : 'assignments';
  const splitIds = [];
  const estimatedMinutes = assignment.actual_estimated_minutes || assignment.estimated_time_minutes || 45;
  const minutesPerPart = Math.ceil(estimatedMinutes / parts);
  
  for (let i = 1; i <= parts; i++) {
    const { data, error } = await supabase
      .from(assignmentsTable)
      .insert({
        student_name: assignment.student_name,
        title: `${assignment.title} (Part ${i}/${parts})`,
        course_name: assignment.course_name,
        subject: assignment.subject,
        due_date: assignment.due_date,
        estimated_time_minutes: minutesPerPart,
        actual_estimated_minutes: minutesPerPart,
        cognitive_load: assignment.cognitive_load,
        category: assignment.category,
        task_type: assignment.task_type,
        is_split_assignment: true,
        split_part_number: i,
        total_split_parts: parts,
        parent_assignment_id: assignment.id,
        priority: assignment.priority,
        eligible_for_scheduling: true
      })
      .select('id')
      .single();
      
    if (error) {
      console.error(`❌ Error creating split assignment part ${i}:`, error);
      continue;
    }
    
    splitIds.push(data.id);
  }
  
  // Mark original as template/not eligible for scheduling
  await supabase
    .from(assignmentsTable)
    .update({ eligible_for_scheduling: false, is_template: true })
    .eq('id', assignment.id);
    
  console.log(`✂️ Split "${assignment.title}" into ${parts} parts`);
  return splitIds;
}

// Main scheduling function with forward-looking logic
async function scheduleAssignments(studentName: string, stagingMode: boolean = false): Promise<number> {
  console.log(`🚀 Starting smart auto-scheduling for ${studentName}...`);
  
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  
  if (isWeekend) {
    console.log(`⏰ Skipping scheduling - it's the weekend`);
    return 0;
  }
  
  // Get 5-day scheduling window
  const scheduleWindow = await getAvailableBlocksForDays(5, studentName);
  console.log(`📅 Looking ahead ${scheduleWindow.length} school days for scheduling`);
  
  // Determine table names based on staging mode
  const assignmentsTable = stagingMode ? 'assignments_staging' : 'assignments';
  const syncStatusTable = stagingMode ? 'sync_status_staging' : 'sync_status';
  
  // Clear existing schedules in the window
  for (const day of scheduleWindow) {
    await supabase
      .from(assignmentsTable)
      .update({ 
        scheduled_block: null, 
        scheduled_date: null, 
        scheduled_day: null 
      })
      .eq('student_name', studentName)
      .eq('scheduled_date', day.date);
  }
  
  // Get unscheduled academic assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from(assignmentsTable)
    .select('*')
    .eq('student_name', studentName)
    .eq('eligible_for_scheduling', true)
    .is('scheduled_block', null)
    .order('due_date', { ascending: true });
    
  if (assignmentsError || !assignments) {
    console.error(`❌ Error fetching assignments:`, assignmentsError);
    return 0;
  }
  
  console.log(`📝 Found ${assignments.length} unscheduled assignments`);
  
  if (assignments.length === 0) {
    console.log(`✅ No assignments to schedule for ${studentName}`);
    return 0;
  }
  
  const accommodations = getStudentAccommodations(studentName);
  const scheduledBlocks = new Map(); // Track what's scheduled where
  let scheduledCount = 0;
  
  // Filter assignments that should be scheduled
  const schedulableAssignments = assignments.filter(assignment => 
    shouldScheduleAssignment(assignment, today)
  );
  
  console.log(`📝 Filtered to ${schedulableAssignments.length} schedulable assignments (${assignments.length - schedulableAssignments.length} skipped)`);
  
  // Split large assignments first
  const processedAssignments = [];
  for (const assignment of schedulableAssignments) {
    const estimatedMinutes = getIntelligentTimeEstimate(assignment);
    
    if (estimatedMinutes > 60) {
      // Split into multiple parts
      const parts = Math.ceil(estimatedMinutes / 45);
      console.log(`📝 Assignment "${assignment.title}" needs ${parts} parts (${estimatedMinutes} min)`);
      
      const splitIds = await createSplitAssignment(assignment, parts, stagingMode);
      
      // Fetch the newly created split assignments
      if (splitIds.length > 0) {
        const { data: splitAssignments } = await supabase
          .from(assignmentsTable)
          .select('*')
          .in('id', splitIds);
          
        if (splitAssignments) {
          processedAssignments.push(...splitAssignments);
        }
      }
    } else {
      processedAssignments.push(assignment);
    }
  }
  
  // Prioritize assignments by urgency and due date
  const prioritizedAssignments = processedAssignments.sort((a, b) => {
    const aUrgency = calculateUrgency(a, today);
    const bUrgency = calculateUrgency(b, today);
    
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const urgencyDiff = urgencyOrder[aUrgency] - urgencyOrder[bUrgency];
    
    if (urgencyDiff !== 0) return urgencyDiff;
    
    // Same urgency, sort by due date
    const aDate = new Date(a.due_date || '2099-12-31');
    const bDate = new Date(b.due_date || '2099-12-31');
    return aDate.getTime() - bDate.getTime();
  });
  
  console.log(`🎯 Scheduling ${prioritizedAssignments.length} assignments by urgency...`);
  
  // Schedule assignments using smart distribution
  for (const assignment of prioritizedAssignments) {
    const urgency = calculateUrgency(assignment, today);
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    
    console.log(`📋 Processing "${assignment.title}" (${urgency} urgency, due: ${dueDate?.toDateString() || 'no due date'})`);
    
    let targetDay = null;
    
    // Determine OPTIMAL scheduling window based on due date proximity
    const dueDays = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 5;
    
    if (urgency === 'critical') {
      // Schedule ASAP (today if possible)
      targetDay = scheduleWindow[0];
    } else if (urgency === 'high') {
      // Due tomorrow - schedule today if possible, otherwise early tomorrow
      targetDay = scheduleWindow[0];
      if (!findAvailableBlock(targetDay, scheduledBlocks, assignment, accommodations)) {
        targetDay = scheduleWindow[1];
      }
    } else if (urgency === 'medium') {
      // Due in 2-3 days - schedule AT LEAST 1 day before, preferably 2 days before
      const optimalScheduleDay = Math.max(0, Math.min(dueDays - 2, scheduleWindow.length - 1));
      const latestScheduleDay = Math.max(0, Math.min(dueDays - 1, scheduleWindow.length - 1));
      
      // Try optimal scheduling first (2 days early), then fall back
      for (let i = optimalScheduleDay; i <= latestScheduleDay; i++) {
        if (scheduleWindow[i] && findAvailableBlock(scheduleWindow[i], scheduledBlocks, assignment, accommodations)) {
          targetDay = scheduleWindow[i];
          break;
        }
      }
    } else {
      // Low urgency - schedule closer to due date, but not too early
      const optimalStart = Math.max(0, Math.min(dueDays - 3, scheduleWindow.length - 2));
      for (let i = optimalStart; i < scheduleWindow.length; i++) {
        if (scheduleWindow[i] && findAvailableBlock(scheduleWindow[i], scheduledBlocks, assignment, accommodations)) {
          targetDay = scheduleWindow[i];
          break;
        }
      }
    }
    
    if (!targetDay) {
      console.log(`⚠️ No available slots for "${assignment.title}" in the ${scheduleWindow.length}-day window`);
      continue;
    }
    
    const bestBlock = findAvailableBlock(targetDay, scheduledBlocks, assignment, accommodations);
    
    if (bestBlock) {
      const success = await scheduleAssignment(assignment, bestBlock, targetDay.date, targetDay.day, stagingMode);
      
      if (success) {
        const key = `${targetDay.date}-${bestBlock}`;
        scheduledBlocks.set(key, assignment);
        scheduledCount++;
        
        console.log(`✅ Scheduled "${assignment.title}" in Block ${bestBlock} on ${targetDay.day} (${urgency} urgency)`);
      }
    }
  }
  
  console.log(`✅ Smart auto-scheduling complete for ${studentName}: ${scheduledCount} assignments scheduled across ${scheduleWindow.length} days`);
  return scheduledCount;
}

// Find available block considering current schedule
function findAvailableBlock(day: any, scheduledBlocks: Map<string, any>, assignment: any, accommodations: any): number | null {
  const availableBlocks = day.blocks.filter(block => {
    const key = `${day.date}-${block}`;
    return !scheduledBlocks.has(key);
  });
  
  return findBestBlock(assignment, availableBlocks, {}, accommodations);
}

serve(async (req) => {
  console.log(`🤖 Auto-scheduler started - ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

  } catch (error) {
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