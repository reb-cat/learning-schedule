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
  if (!assignment.due_date) return false;
  
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
  const adminKeywords = ['fee', 'form', 'permission', 'bring', 'deliver', 'submit form', 'turn in', 'payment'];
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

// Generate scheduling reasoning
function generateReasoning(assignment: any, urgency: string, targetDate: string, targetBlock: number): string {
  const reasons = [];
  
  if (urgency === 'critical') {
    reasons.push("Critical urgency - scheduled immediately");
  } else if (urgency === 'high') {
    reasons.push("High urgency - scheduled early");
  } else if (urgency === 'medium') {
    reasons.push("Scheduled 1-2 days before due date");
  }
  
  if (assignment.subject === 'Math' && targetBlock === 2) {
    reasons.push("Math optimally placed in Block 2 for cognitive performance");
  }
  
  if (assignment.cognitive_load === 'heavy' && targetBlock <= 3) {
    reasons.push("Heavy cognitive load scheduled during peak mental energy (morning)");
  }
  
  if (assignment.cognitive_load === 'light' && targetBlock >= 4) {
    reasons.push("Light cognitive load scheduled for later in day");
  }
  
  const dayOfWeek = new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long' });
  reasons.push(`Optimal availability found on ${dayOfWeek}`);
  
  return reasons.join(". ") + ".";
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

// Preview scheduling decisions without executing
async function previewScheduling(studentName: string) {
  console.log(`🔍 Analyzing scheduling for ${studentName}...`);
  
  const today = new Date();
  const scheduleWindow = await getAvailableBlocksForDays(5, studentName);
  
  // Get unscheduled assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from('assignments')
    .select('*')
    .eq('student_name', studentName)
    .eq('eligible_for_scheduling', true)
    .is('scheduled_block', null)
    .order('due_date', { ascending: true });
    
  if (assignmentsError || !assignments) {
    throw new Error(`Error fetching assignments: ${assignmentsError?.message}`);
  }
  
  console.log(`📝 Found ${assignments.length} unscheduled assignments`);
  
  const decisions = [];
  const scheduledBlocks = new Map(); // Track hypothetical schedule
  
  // Process assignments and create decisions
  for (const assignment of assignments) {
    // Check if assignment should be scheduled
    if (!shouldScheduleAssignment(assignment, today)) {
      console.log(`⏭️ Skipping "${assignment.title}" - not ready for scheduling or should be checklist item`);
      continue;
    }
    
    const urgency = calculateUrgency(assignment, today);
    const estimatedMinutes = getIntelligentTimeEstimate(assignment);
    
    let targetDay = null;
    let targetBlock = null;
    
// Determine OPTIMAL scheduling window based on due date proximity
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    const dueDays = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 5;
    
    if (urgency === 'critical') {
      // Schedule ASAP (today if possible)
      targetDay = scheduleWindow[0];
    } else if (urgency === 'high') {
      // Due tomorrow - schedule today if possible, otherwise early tomorrow
      targetDay = scheduleWindow[0];
      if (!findAvailableBlock(targetDay, scheduledBlocks)) {
        targetDay = scheduleWindow[1];
      }
    } else if (urgency === 'medium') {
      // Due in 2-3 days - schedule AT LEAST 1 day before, preferably 2 days before
      const optimalScheduleDay = Math.max(0, Math.min(dueDays - 2, scheduleWindow.length - 1));
      const latestScheduleDay = Math.max(0, Math.min(dueDays - 1, scheduleWindow.length - 1));
      
      // Try optimal scheduling first (2 days early), then fall back
      for (let i = optimalScheduleDay; i <= latestScheduleDay; i++) {
        if (scheduleWindow[i] && findAvailableBlock(scheduleWindow[i], scheduledBlocks)) {
          targetDay = scheduleWindow[i];
          break;
        }
      }
    } else {
      // Low urgency - schedule closer to due date, but not too early
      const optimalStart = Math.max(0, Math.min(dueDays - 3, scheduleWindow.length - 2));
      for (let i = optimalStart; i < scheduleWindow.length; i++) {
        if (scheduleWindow[i] && findAvailableBlock(scheduleWindow[i], scheduledBlocks)) {
          targetDay = scheduleWindow[i];
          break;
        }
      }
    }
    
    if (targetDay) {
      targetBlock = findAvailableBlock(targetDay, scheduledBlocks);
      
      if (targetBlock) {
        // Mark as scheduled in our hypothetical schedule
        const key = `${targetDay.date}-${targetBlock}`;
        scheduledBlocks.set(key, assignment);
        
        decisions.push({
          assignment,
          targetDate: targetDay.date,
          targetDay: targetDay.day,
          targetBlock,
          urgency,
          reasoning: generateReasoning(assignment, urgency, targetDay.date, targetBlock),
          estimatedMinutes
        });
        
        console.log(`📋 Would schedule "${assignment.title}" in Block ${targetBlock} on ${targetDay.day} (${urgency})`);
      }
    }
  }
  
  console.log(`🎯 Analysis complete: ${decisions.length} scheduling decisions generated`);
  return decisions;
}

// Find available block (simplified version for preview)
function findAvailableBlock(day: any, scheduledBlocks: Map<string, any>): number | null {
  for (const block of day.blocks) {
    const key = `${day.date}-${block}`;
    if (!scheduledBlocks.has(key)) {
      return block;
    }
  }
  return null;
}

serve(async (req) => {
  console.log(`🔍 Scheduling preview started - ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const unauthorized = verifyRequest(req);
  if (unauthorized) return unauthorized;

  try {
    const { studentName, previewOnly } = await req.json();
    
    if (!studentName) {
      throw new Error('Student name is required');
    }
    
    const decisions = await previewScheduling(studentName);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        decisions,
        summary: {
          totalAssignments: decisions.length,
          totalMinutes: decisions.reduce((sum, d) => sum + d.estimatedMinutes, 0),
          urgencyBreakdown: decisions.reduce((counts, d) => {
            counts[d.urgency] = (counts[d.urgency] || 0) + 1;
            return counts;
          }, {})
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('💥 Scheduling preview error:', error);
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
