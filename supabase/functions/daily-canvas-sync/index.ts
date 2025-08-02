import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scheduleAssignments } from '../_shared/scheduling.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const abigailToken = Deno.env.get('ABIGAIL_CANVAS_TOKEN')!;
const khalilToken = Deno.env.get('KHALIL_CANVAS_TOKEN')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CanvasAssignment {
  id: number;
  name: string;
  description: string;
  due_at: string;
  html_url: string;
  course_id: number;
  points_possible: number;
  submission_types: string[];
}

const CANVAS_BASE_URL = 'https://canvas.instructure.com/api/v1';

async function fetchCanvasAssignments(token: string, studentName: string) {
  console.log(`Fetching Canvas assignments for ${studentName}`);
  
  try {
    // Fetch courses first
    const coursesResponse = await fetch(`${CANVAS_BASE_URL}/courses?enrollment_state=active&per_page=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!coursesResponse.ok) {
      throw new Error(`Canvas API error: ${coursesResponse.status}`);
    }
    
    const courses = await coursesResponse.json();
    console.log(`Found ${courses.length} courses for ${studentName}`);
    
    const allAssignments: any[] = [];
    
    // Fetch assignments for each course
    for (const course of courses) {
      const assignmentsResponse = await fetch(
        `${CANVAS_BASE_URL}/courses/${course.id}/assignments?per_page=100&bucket=future&bucket=overdue&bucket=undated`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (assignmentsResponse.ok) {
        const assignments = await assignmentsResponse.json();
        
        for (const assignment of assignments) {
          // Determine subject from course name
          const subject = determineSubject(course.name);
          const cognitiveLoad = determineCognitiveLoad(subject, assignment.name);
          const estimatedMinutes = estimateTimeRequired(assignment, cognitiveLoad);
          
          allAssignments.push({
            canvas_id: assignment.id,
            student_name: studentName,
            subject,
            title: assignment.name,
            description: assignment.description || '',
            due_date: assignment.due_at,
            status: 'pending',
            urgency: calculateUrgency(assignment.due_at),
            cognitive_load: cognitiveLoad,
            estimated_minutes: estimatedMinutes,
            canvas_course_id: course.id,
            canvas_assignment_url: assignment.html_url
          });
        }
      }
    }
    
    console.log(`Processed ${allAssignments.length} assignments for ${studentName}`);
    return allAssignments;
    
  } catch (error) {
    console.error(`Error fetching Canvas assignments for ${studentName}:`, error);
    throw error;
  }
}

function determineSubject(courseName: string): string {
  const name = courseName.toLowerCase();
  if (name.includes('math') || name.includes('algebra') || name.includes('geometry')) return 'Math';
  if (name.includes('english') || name.includes('language arts') || name.includes('writing')) return 'Language Arts';
  if (name.includes('science') || name.includes('biology') || name.includes('chemistry') || name.includes('physics')) return 'Science';
  if (name.includes('history') || name.includes('social studies') || name.includes('government')) return 'History';
  if (name.includes('art') || name.includes('music') || name.includes('drama')) return 'Art';
  if (name.includes('pe') || name.includes('physical education') || name.includes('health')) return 'PE';
  if (name.includes('bible') || name.includes('theology')) return 'Bible';
  return 'Elective';
}

function determineCognitiveLoad(subject: string, title: string): 'light' | 'medium' | 'heavy' {
  const heavySubjects = ['Math', 'Language Arts'];
  const mediumSubjects = ['Science', 'History'];
  
  if (heavySubjects.includes(subject)) return 'heavy';
  if (mediumSubjects.includes(subject)) return 'medium';
  
  // Check assignment title for complexity indicators
  const titleLower = title.toLowerCase();
  if (titleLower.includes('test') || titleLower.includes('exam') || titleLower.includes('essay')) return 'heavy';
  if (titleLower.includes('quiz') || titleLower.includes('project')) return 'medium';
  
  return 'light';
}

function estimateTimeRequired(assignment: any, cognitiveLoad: string): number {
  // Base estimates by cognitive load
  const baseMinutes = {
    'light': 20,
    'medium': 35,
    'heavy': 50
  }[cognitiveLoad];
  
  // Adjust based on assignment type
  const title = assignment.name?.toLowerCase() || '';
  if (title.includes('test') || title.includes('exam')) return baseMinutes * 1.5;
  if (title.includes('project')) return baseMinutes * 2;
  if (title.includes('reading')) return baseMinutes * 0.8;
  
  return baseMinutes;
}

function calculateUrgency(dueDate: string | null): 'overdue' | 'due_today' | 'due_soon' | 'upcoming' {
  if (!dueDate) return 'upcoming';
  
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due_today';
  if (diffDays <= 3) return 'due_soon';
  return 'upcoming';
}

async function updateSyncStatus(studentName: string, status: string, message: string, fetched: number, scheduled: number) {
  const { error } = await supabase
    .from('sync_status')
    .update({
      last_sync: new Date().toISOString(),
      sync_status: status,
      sync_message: message,
      assignments_fetched: fetched,
      assignments_scheduled: scheduled
    })
    .eq('student_name', studentName);
    
  if (error) {
    console.error(`Error updating sync status for ${studentName}:`, error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily Canvas sync...');
    
    const results = {
      abigail: { fetched: 0, scheduled: 0, error: null },
      khalil: { fetched: 0, scheduled: 0, error: null }
    };

    // Process each student
    for (const [studentName, token] of [['Abigail', abigailToken], ['Khalil', khalilToken]]) {
      try {
        console.log(`Processing ${studentName}...`);
        
        // Fetch assignments from Canvas
        const assignments = await fetchCanvasAssignments(token, studentName);
        results[studentName.toLowerCase()].fetched = assignments.length;
        
        // Clear existing assignments for this student
        await supabase
          .from('assignments')
          .delete()
          .eq('student_name', studentName);
        
        // Insert new assignments
        if (assignments.length > 0) {
          const { error: insertError } = await supabase
            .from('assignments')
            .insert(assignments);
            
          if (insertError) {
            throw new Error(`Database insert error: ${insertError.message}`);
          }
        }
        
        // Run scheduling algorithm
        const scheduledCount = await scheduleAssignments(supabase, studentName);
        results[studentName.toLowerCase()].scheduled = scheduledCount;
        
        // Update sync status
        await updateSyncStatus(
          studentName,
          'success',
          `Successfully synced ${assignments.length} assignments, scheduled ${scheduledCount}`,
          assignments.length,
          scheduledCount
        );
        
        console.log(`✓ ${studentName}: ${assignments.length} fetched, ${scheduledCount} scheduled`);
        
      } catch (error) {
        console.error(`Error processing ${studentName}:`, error);
        results[studentName.toLowerCase()].error = error.message;
        
        await updateSyncStatus(
          studentName,
          'error',
          `Sync failed: ${error.message}`,
          0,
          0
        );
      }
    }

    console.log('Daily Canvas sync completed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Daily sync completed',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily sync error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});