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
  day: string
): Promise<boolean> {
  console.log(`📅 Scheduling "${assignment.title}" in block ${block} on ${date}`);
  
  const { error } = await supabase
    .from('assignments')
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

// Main scheduling function
async function scheduleAssignments(studentName: string): Promise<number> {
  console.log(`🚀 Starting auto-scheduling for ${studentName}...`);
  
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  
  if (isWeekend) {
    console.log(`⏰ Skipping scheduling - it's the weekend`);
    return 0;
  }
  
  // Clear any existing schedules for today
  const todayStr = today.toISOString().split('T')[0];
  await supabase
    .from('assignments')
    .update({ 
      scheduled_block: null, 
      scheduled_date: null, 
      scheduled_day: null 
    })
    .eq('student_name', studentName)
    .eq('scheduled_date', todayStr);
  
  // Get unscheduled academic assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from('assignments')
    .select('*')
    .eq('student_name', studentName)
    .eq('eligible_for_scheduling', true)
    .is('scheduled_block', null)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true });
    
  if (assignmentsError || !assignments) {
    console.error(`❌ Error fetching assignments:`, assignmentsError);
    return 0;
  }
  
  console.log(`📝 Found ${assignments.length} unscheduled academic assignments`);
  
  if (assignments.length === 0) {
    console.log(`✅ No assignments to schedule for ${studentName}`);
    return 0;
  }
  
  const accommodations = getStudentAccommodations(studentName);
  const availableBlocks = [1, 2, 3, 4, 5, 6]; // Available assignment blocks
  const scheduledSubjects: {[key: number]: string} = {};
  let scheduledCount = 0;
  
  // Prioritize assignments: overdue first, then by due date
  const prioritizedAssignments = assignments.sort((a, b) => {
    const aDate = new Date(a.due_date);
    const bDate = new Date(b.due_date);
    const now = new Date();
    
    const aOverdue = aDate < now;
    const bOverdue = bDate < now;
    
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    return aDate.getTime() - bDate.getTime();
  });
  
  // Special handling: try to place Math assignments in Block 2 first
  const mathAssignments = prioritizedAssignments.filter(a => a.subject === 'Math');
  for (const mathAssignment of mathAssignments) {
    if (availableBlocks.includes(2) && !scheduledSubjects[2]) {
      const success = await scheduleAssignment(
        mathAssignment,
        2,
        todayStr,
        today.toLocaleDateString('en-US', { weekday: 'long' })
      );
      
      if (success) {
        availableBlocks.splice(availableBlocks.indexOf(2), 1);
        scheduledSubjects[2] = mathAssignment.subject;
        scheduledCount++;
      }
    }
  }
  
  // Schedule remaining assignments
  for (const assignment of prioritizedAssignments) {
    if (assignment.scheduled_block) continue; // Skip if already scheduled
    
    const bestBlock = findBestBlock(assignment, availableBlocks, scheduledSubjects, accommodations);
    
    if (bestBlock) {
      const success = await scheduleAssignment(
        assignment,
        bestBlock,
        todayStr,
        today.toLocaleDateString('en-US', { weekday: 'long' })
      );
      
      if (success) {
        availableBlocks.splice(availableBlocks.indexOf(bestBlock), 1);
        scheduledSubjects[bestBlock] = assignment.subject;
        scheduledCount++;
      }
    } else {
      console.log(`⚠️ No available blocks for "${assignment.title}"`);
    }
  }
  
  console.log(`✅ Auto-scheduling complete for ${studentName}: ${scheduledCount} assignments scheduled`);
  return scheduledCount;
}

serve(async (req) => {
  console.log(`🤖 Auto-scheduler started - ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Handle request body to determine which students to schedule
    let studentName = null;
    try {
      const body = await req.text();
      if (body.trim()) {
        const parsed = JSON.parse(body);
        studentName = parsed.studentName;
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
        const scheduledCount = await scheduleAssignments(student);
        results[student] = { success: true, scheduledCount };
        
        // Update sync status
        await supabase
          .from('sync_status')
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
        
        await supabase
          .from('sync_status')
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