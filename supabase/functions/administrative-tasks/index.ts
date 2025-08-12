import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { findPotentialDuplicates, DuplicateCheckParams } from '../_shared/duplicateDetection.ts';

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

// Route administrative tasks to checklist
async function routeAdministrativeTasksToChecklist(studentName: string): Promise<number> {
  console.log(`📋 Routing administrative tasks to checklist for ${studentName}...`);
  
  // Get administrative assignments that should be checklist items
  const { data: adminAssignments, error: adminError } = await supabase
    .from('assignments')
    .select('*')
    .eq('student_name', studentName)
    .eq('eligible_for_scheduling', true)
    .is('scheduled_block', null);
    
  if (adminError || !adminAssignments) {
    console.error(`❌ Error fetching assignments:`, adminError);
    return 0;
  }
  
  // Filter administrative tasks
  const adminTasks = adminAssignments.filter(assignment => {
    const title = assignment.title?.toLowerCase() || '';
    const adminKeywords = ['fee', 'form', 'permission', 'bring', 'deliver', 'submit form', 'turn in', 'payment'];
    return adminKeywords.some(keyword => title.includes(keyword));
  });
  
  console.log(`📝 Found ${adminTasks.length} administrative tasks to route to checklist`);
  
  let routedCount = 0;
  
  // Route each administrative task to the checklist
  for (const task of adminTasks) {
    try {
      // Check for intelligent duplicates before inserting
      const newNotificationParams: DuplicateCheckParams = {
        title: task.title,
        notificationType: 'checklist_item',
        courseName: task.course_name,
        studentName: task.student_name
      };
      
      const duplicates = await findPotentialDuplicates(supabase, newNotificationParams, 80);
      
      if (duplicates.length > 0) {
        console.log(`🔄 Skipping duplicate administrative task: "${task.title}" (found ${duplicates.length} similar)`);
        continue;
      }
      
      // Insert into administrative_notifications (checklist)
      const { error: insertError } = await supabase
        .from('administrative_notifications')
        .insert({
          title: task.title,
          student_name: task.student_name,
          course_name: task.course_name,
          due_date: task.due_date,
          canvas_url: task.canvas_url,
          canvas_id: task.canvas_id,
          priority: 'high',
          notification_type: 'checklist_item',
          description: `Administrative task: ${task.title}`,
          completed: false
        });
        
      if (insertError) {
        console.error(`❌ Error adding to checklist:`, insertError);
        continue;
      }
      
      // Mark original assignment as not eligible for scheduling
      const { error: updateError } = await supabase
        .from('assignments')
        .update({ 
          eligible_for_scheduling: false,
          notes: 'Routed to administrative checklist'
        })
        .eq('id', task.id);
        
      if (updateError) {
        console.error(`❌ Error updating assignment:`, updateError);
        continue;
      }
      
      routedCount++;
      console.log(`✅ Routed "${task.title}" to checklist`);
      
    } catch (error) {
      console.error(`❌ Error processing task "${task.title}":`, error);
    }
  }
  
  console.log(`✅ Administrative routing complete: ${routedCount} tasks moved to checklist`);
  return routedCount;
}

serve(async (req) => {
  console.log(`📋 Administrative task router started - ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const unauthorized = verifyRequest(req);
  if (unauthorized) return unauthorized;

  try {
    // Handle request body to determine which students to process
    let studentName = null;
    try {
      const body = await req.text();
      if (body.trim()) {
        const parsed = JSON.parse(body);
        studentName = parsed.studentName;
      }
    } catch (parseError) {
      console.log(`ℹ️ No specific student requested, processing for all students`);
    }
    
    const studentsToProcess = studentName ? [studentName] : ['Abigail', 'Khalil'];
    const results = {};

    // Route administrative tasks for each student
    for (const student of studentsToProcess) {
      try {
        console.log(`🎯 Processing administrative tasks for ${student}...`);
        const routedCount = await routeAdministrativeTasksToChecklist(student);
        results[student] = { success: true, routedCount };
        
      } catch (error) {
        console.error(`❌ Administrative routing failed for ${student}:`, error);
        results[student] = { success: false, error: error.message };
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Administrative task routing completed',
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('💥 Critical administrative router error:', error);
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
