import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const canvasBaseUrl = Deno.env.get('CANVAS_BASE_URL')!;
const abigailToken = Deno.env.get('ABIGAIL_CANVAS_TOKEN')!;
const khalilToken = Deno.env.get('KHALIL_CANVAS_TOKEN')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function syncStudentAssignments(studentName: string, token: string) {
  console.log(`🔄 Starting sync for ${studentName}...`);
  
  try {
    // 1) Fetch existing assignments from database
    const { data: existingAssignments } = await supabase
      .from('assignments')
      .select('student_name, course_name, title')
      .eq('student_name', studentName);
    
    const existing = new Set(
      (existingAssignments || []).map(a => `${a.student_name}|${a.course_name}|${a.title}`)
    );
    
    console.log(`📋 Found ${existing.size} existing assignments for ${studentName}`);

    // 2) Fetch courses from Canvas
    console.log(`📡 Fetching courses for ${studentName}...`);
    const coursesResponse = await fetch(
      `${canvasBaseUrl}/api/v1/courses?enrollment_state=active&enrollment_type=student&state[]=available`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!coursesResponse.ok) {
      throw new Error(`Failed to fetch courses: ${coursesResponse.status} ${coursesResponse.statusText}`);
    }

    const courses = await coursesResponse.json();
    console.log(`✅ Found ${courses.length} active courses`);

    let newAssignments = 0;

    // 3) Process each course
    for (const course of courses) {
      console.log(`📚 Processing course: ${course.name}`);
      
      // Fetch assignments for this course
      const assignmentsResponse = await fetch(
        `${canvasBaseUrl}/api/v1/courses/${course.id}/assignments?order_by=due_at&per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!assignmentsResponse.ok) {
        console.warn(`⚠️ Failed to fetch assignments for course ${course.name}: ${assignmentsResponse.status}`);
        continue;
      }

      const assignments = await assignmentsResponse.json();
      console.log(`   📝 Found ${assignments.length} assignments`);

      // 4) Process each assignment
      for (const assignment of assignments) {
        if (!assignment.due_at) continue; // Skip assignments without due dates
        
        const key = `${studentName}|${course.name}|${assignment.name}`;
        if (existing.has(key)) continue; // Skip existing assignments

        // Format due date
        const dueDate = new Date(assignment.due_at).toISOString();

        // Insert new assignment
        const { error } = await supabase
          .from('assignments')
          .insert({
            student_name: studentName,
            title: assignment.name,
            course_name: course.name,
            due_date: dueDate,
            canvas_id: assignment.id?.toString(),
            canvas_url: assignment.html_url,
            eligible_for_scheduling: true
          });

        if (error) {
          console.error(`❌ Error inserting assignment "${assignment.name}":`, error);
        } else {
          console.log(`  ✅ Added: ${studentName} | ${course.name} – ${assignment.name}`);
          newAssignments++;
        }
      }
    }

    console.log(`🎉 Sync complete for ${studentName}: ${newAssignments} new assignments added`);
    return { success: true, newAssignments };

  } catch (error) {
    console.error(`💥 Error syncing ${studentName}:`, error);
    throw error;
  }
}

async function updateSyncStatus(studentName: string, status: string, message: string, count: number = 0) {
  try {
    await supabase
      .from('sync_status')
      .insert({
        student_name: studentName,
        status,
        message,
        assignments_count: count,
        sync_type: 'manual'
      });
  } catch (error) {
    console.error(`Error updating sync status:`, error);
  }
}

serve(async (req) => {
  console.log(`🚀 Canvas sync started - ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentName } = await req.json();
    
    const studentsToSync = studentName ? [studentName] : ['Abigail', 'Khalil'];
    const results = {};

    for (const student of studentsToSync) {
      try {
        await updateSyncStatus(student, 'pending', `Starting sync for ${student}`);
        
        const token = student === 'Abigail' ? abigailToken : khalilToken;
        if (!token) {
          throw new Error(`No Canvas token found for ${student}`);
        }

        const result = await syncStudentAssignments(student, token);
        
        await updateSyncStatus(
          student, 
          'success', 
          `Sync completed successfully`, 
          result.newAssignments
        );
        
        results[student] = result;

      } catch (error) {
        console.error(`❌ Sync failed for ${student}:`, error);
        await updateSyncStatus(student, 'error', error.message);
        results[student] = { success: false, error: error.message };
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sync completed',
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('💥 Critical sync error:', error);
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