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

// Get available blocks for next N days
function getAvailableBlocksForDays(daysAhead: number = 5): Array<{date: string, day: string, blocks: number[]}> {
  const scheduleWindow = [];
  const today = new Date();
  
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    scheduleWindow.push({
      date: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('en-US', { weekday: 'long' }),
      blocks: [1, 2, 3, 4, 5, 6] // All available blocks
    });
  }
  
  return scheduleWindow;
}

// Preview scheduling decisions without executing
async function previewScheduling(studentName: string) {
  console.log(`🔍 Analyzing scheduling for ${studentName}...`);
  
  const today = new Date();
  const scheduleWindow = getAvailableBlocksForDays(5);
  
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
    const urgency = calculateUrgency(assignment, today);
    const estimatedMinutes = assignment.actual_estimated_minutes || assignment.estimated_time_minutes || 45;
    
    let targetDay = null;
    let targetBlock = null;
    
    // Determine target scheduling window based on urgency
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
      // Due this week - schedule at least 1 day before due date
      const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
      const dueDays = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 5;
      const latestScheduleDay = Math.max(0, Math.min(dueDays - 1, scheduleWindow.length - 1));
      
      // Try to schedule 2-3 days early if possible
      for (let i = Math.max(0, latestScheduleDay - 2); i <= latestScheduleDay; i++) {
        if (scheduleWindow[i] && findAvailableBlock(scheduleWindow[i], scheduledBlocks)) {
          targetDay = scheduleWindow[i];
          break;
        }
      }
    } else {
      // Low urgency - fill any available slots
      for (const day of scheduleWindow) {
        if (findAvailableBlock(day, scheduledBlocks)) {
          targetDay = day;
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

  } catch (error) {
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