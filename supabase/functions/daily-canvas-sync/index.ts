
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

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
    // Fetch courses first - only active enrollment
    const coursesResponse = await fetch(`${CANVAS_BASE_URL}/courses?enrollment_state=active&per_page=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!coursesResponse.ok) {
      throw new Error(`Canvas API error: ${coursesResponse.status}`);
    }
    
    const courses = await coursesResponse.json();
    console.log(`Found ${courses.length} courses for ${studentName}`);
    console.log(`Courses: ${courses.map(c => c.name).join(', ')}`);
    
    const allAssignments: any[] = [];
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    
    // Fetch assignments for each course
    for (const course of courses) {
      console.log(`\nFetching assignments for course: ${course.name} (ID: ${course.id})`);
      
      // Updated query - remove problematic bucket parameters and add date filtering
      const assignmentsUrl = `${CANVAS_BASE_URL}/courses/${course.id}/assignments?per_page=100&order_by=due_at&include[]=submission`;
      
      console.log(`Assignment API URL: ${assignmentsUrl}`);
      
      const assignmentsResponse = await fetch(assignmentsUrl, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      
      if (assignmentsResponse.ok) {
        const assignments = await assignmentsResponse.json();
        console.log(`Raw assignments count for ${course.name}: ${assignments.length}`);
        
        // Log first assignment for debugging
        if (assignments.length > 0) {
          console.log(`Sample raw assignment:`, JSON.stringify(assignments[0], null, 2));
        }
        
        for (const assignment of assignments) {
          // Skip non-academic assignments
          if (isNonAcademicAssignment(assignment)) {
            console.log(`Skipping non-academic assignment: ${assignment.name}`);
            continue;
          }
          
          // Skip assignments without due dates that are likely administrative
          if (!assignment.due_at && isLikelyAdministrative(assignment)) {
            console.log(`Skipping likely administrative assignment without due date: ${assignment.name}`);
            continue;
          }
          
          // If there's a due date, check if it's too old or too far in future
          if (assignment.due_at) {
            const dueDate = new Date(assignment.due_at);
            const sixMonthsFromNow = new Date(now.getTime() + (6 * 30 * 24 * 60 * 60 * 1000));
            
            // Skip assignments due more than 2 weeks ago or more than 6 months in future
            if (dueDate < twoWeeksAgo) {
              console.log(`Skipping old assignment: ${assignment.name} (due: ${assignment.due_at})`);
              continue;
            }
            
            if (dueDate > sixMonthsFromNow) {
              console.log(`Skipping far future assignment: ${assignment.name} (due: ${assignment.due_at})`);
              continue;
            }
          }
          
          // Determine subject from course name
          const subject = determineSubject(course.name);
          const cognitiveLoad = determineCognitiveLoad(subject, assignment.name);
          const estimatedMinutes = estimateTimeRequired(assignment, cognitiveLoad);
          
          const processedAssignment = {
            canvas_id: assignment.id.toString(),
            student_name: studentName,
            title: assignment.name,
            course_name: course.name,
            subject,
            due_date: assignment.due_at,
            urgency: calculateUrgency(assignment.due_at),
            cognitive_load: cognitiveLoad,
            estimated_time_minutes: estimatedMinutes,
            canvas_url: assignment.html_url
          };
          
          console.log(`Including assignment: ${assignment.name} (due: ${assignment.due_at || 'no due date'})`);
          allAssignments.push(processedAssignment);
        }
      } else {
        console.error(`Failed to fetch assignments for course ${course.name}: ${assignmentsResponse.status}`);
      }
    }
    
    console.log(`Final processed assignment count for ${studentName}: ${allAssignments.length}`);
    return allAssignments;
    
  } catch (error) {
    console.error(`Error fetching Canvas assignments for ${studentName}:`, error);
    throw error;
  }
}

function isNonAcademicAssignment(assignment: any): boolean {
  const name = assignment.name.toLowerCase();
  const nonAcademicKeywords = [
    'roll call',
    'attendance',
    'copy fee',
    'textbook fee',
    'material fee',
    'lab fee',
    'technology fee',
    'enrollment',
    'registration',
    'orientation',
    'welcome',
    'introduction to canvas',
    'course introduction',
    'syllabus quiz',
    'getting started'
  ];
  
  return nonAcademicKeywords.some(keyword => name.includes(keyword));
}

function isLikelyAdministrative(assignment: any): boolean {
  const name = assignment.name.toLowerCase();
  const description = (assignment.description || '').toLowerCase();
  
  // Check for administrative patterns
  const adminPatterns = [
    'fee',
    'payment',
    'bill',
    'invoice',
    'registration',
    'enrollment',
    'attendance',
    'roll call',
    'check-in',
    'orientation'
  ];
  
  return adminPatterns.some(pattern => 
    name.includes(pattern) || description.includes(pattern)
  );
}

function determineSubject(courseName: string): string {
  const name = courseName.toLowerCase();
  if (name.includes('math') || name.includes('algebra') || name.includes('geometry') || name.includes('calculus')) return 'Math';
  if (name.includes('english') || name.includes('language arts') || name.includes('writing') || name.includes('literature')) return 'Language Arts';
  if (name.includes('science') || name.includes('biology') || name.includes('chemistry') || name.includes('physics')) return 'Science';
  if (name.includes('history') || name.includes('social studies') || name.includes('government') || name.includes('civics')) return 'History';
  if (name.includes('art') || name.includes('music') || name.includes('drama') || name.includes('theater')) return 'Art';
  if (name.includes('pe') || name.includes('physical education') || name.includes('health') || name.includes('fitness')) return 'PE';
  if (name.includes('bible') || name.includes('theology') || name.includes('religion')) return 'Bible';
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
  if (titleLower.includes('quiz') || titleLower.includes('project') || titleLower.includes('paper')) return 'medium';
  
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
  if (title.includes('test') || title.includes('exam')) return Math.round(baseMinutes * 1.5);
  if (title.includes('project')) return Math.round(baseMinutes * 2);
  if (title.includes('reading')) return Math.round(baseMinutes * 0.8);
  
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
  console.log(`Updating sync status for ${studentName}: ${status} - ${message}`);
  
  const { data, error } = await supabase
    .from('sync_status')
    .upsert({
      student_name: studentName,
      status: status,
      message: message,
      assignments_count: fetched,
      sync_type: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'student_name'
    })
    .select();
    
  if (error) {
    console.error(`Error updating sync status for ${studentName}:`, error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log(`✓ Sync status updated for ${studentName}:`, data);
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
        console.log(`\n=== Processing ${studentName} ===`);
        
        // Fetch assignments from Canvas
        const assignments = await fetchCanvasAssignments(token, studentName);
        results[studentName.toLowerCase()].fetched = assignments.length;
        
        console.log(`\nFinal assignments for ${studentName}:`);
        assignments.forEach((a, i) => {
          console.log(`${i + 1}. ${a.title} (${a.course_name}) - Due: ${a.due_date || 'No due date'}`);
        });
        
        // Clear existing assignments for this student
        console.log(`\nClearing existing assignments for ${studentName}...`);
        const { error: deleteError } = await supabase
          .from('assignments')
          .delete()
          .eq('student_name', studentName);
          
        if (deleteError) {
          console.error(`Error deleting assignments for ${studentName}:`, deleteError);
          throw new Error(`Database delete error: ${deleteError.message}`);
        }
        
        // Insert new assignments
        if (assignments.length > 0) {
          console.log(`Inserting ${assignments.length} assignments for ${studentName}...`);
          
          const { data: insertData, error: insertError } = await supabase
            .from('assignments')
            .insert(assignments)
            .select();
            
          if (insertError) {
            console.error(`Database insert error for ${studentName}:`, insertError);
            console.error('Insert error details:', JSON.stringify(insertError, null, 2));
            throw new Error(`Database insert error: ${insertError.message}`);
          }
          
          console.log(`✓ Successfully inserted ${insertData?.length || 0} assignments for ${studentName}`);
        } else {
          console.log(`No assignments to insert for ${studentName}`);
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

    console.log('\n=== Daily Canvas sync completed ===');
    
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
