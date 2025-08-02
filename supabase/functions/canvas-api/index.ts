import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CanvasAssignment {
  id: number;
  name: string;
  description: string;
  due_at: string | null;
  course_id: number;
  submission: {
    submitted_at: string | null;
    workflow_state: string;
  } | null;
  points_possible: number;
}

interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
}

interface Assignment {
  id: number;
  name: string;
  description: string;
  dueDate: Date | null;
  courseId: number;
  isSubmitted: boolean;
  pointsPossible: number;
  subject?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { student, action } = await req.json();
    console.log(`Canvas API request: ${action} for student: ${student}`);

    if (!student || !action) {
      throw new Error('Missing required parameters: student, action');
    }

    // Get Canvas URL and API token from secrets
    const apiUrl = Deno.env.get('CANVAS_BASE_URL');
    const tokenKey = student === 'Abigail' ? 'ABIGAIL_CANVAS_TOKEN' : 'KHALIL_CANVAS_TOKEN';
    const apiToken = Deno.env.get(tokenKey);
    
    if (!apiUrl) {
      throw new Error('Canvas base URL not configured. Please add CANVAS_BASE_URL in Supabase secrets.');
    }
    
    if (!apiToken) {
      throw new Error(`API token not configured for ${student}. Please add ${tokenKey} in Supabase secrets.`);
    }

    if (action === 'getAssignments') {
      const assignments = await getAssignmentsForStudent(apiUrl, apiToken, student);
      
      return new Response(JSON.stringify({ assignments }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'submitAssignment') {
      const { courseId, assignmentId } = await req.json();
      const success = await submitAssignment(apiUrl, apiToken, courseId, assignmentId);
      
      return new Response(JSON.stringify({ success }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('Error in canvas-api function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function makeCanvasRequest(apiUrl: string, apiToken: string, endpoint: string): Promise<any> {
  const url = `${apiUrl}/api/v1${endpoint}`;
  console.log(`Making Canvas API request to: ${endpoint}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function guessSubjectFromAssignment(assignment: CanvasAssignment): string {
  const name = assignment.name.toLowerCase();
  const description = assignment.description?.toLowerCase() || "";
  
  if (name.includes('math') || name.includes('algebra') || name.includes('geometry') || name.includes('calculus')) {
    return 'Math';
  }
  if (name.includes('english') || name.includes('reading') || name.includes('writing') || name.includes('literature')) {
    return 'English';
  }
  if (name.includes('science') || name.includes('biology') || name.includes('chemistry') || name.includes('physics')) {
    return 'Science';
  }
  if (name.includes('history') || name.includes('social') || name.includes('government') || name.includes('civics')) {
    return 'History';
  }
  if (name.includes('spanish') || name.includes('french') || name.includes('language')) {
    return 'Spanish';
  }
  
  return 'General';
}

async function getAssignmentsForStudent(apiUrl: string, apiToken: string, student: string): Promise<Assignment[]> {
  try {
    // First, get all courses for the student
    const courses: CanvasCourse[] = await makeCanvasRequest(apiUrl, apiToken, '/courses?enrollment_state=active&per_page=100');
    console.log(`Found ${courses.length} courses for ${student}`);
    
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    let allAssignments: Assignment[] = [];

    // Fetch assignments from all courses
    for (const course of courses) {
      try {
        console.log(`Fetching assignments for course: ${course.name} (${course.id})`);
        const assignments: CanvasAssignment[] = await makeCanvasRequest(
          apiUrl, 
          apiToken, 
          `/courses/${course.id}/assignments?include[]=submission&per_page=100`
        );

        const courseAssignments = assignments
          .filter(assignment => {
            // Filter out submitted assignments
            if (assignment.submission?.workflow_state === 'submitted') {
              return false;
            }

            // Filter assignments due within 2 weeks
            if (assignment.due_at) {
              const dueDate = new Date(assignment.due_at);
              return dueDate <= twoWeeksFromNow && dueDate >= new Date();
            }

            return false;
          })
          .map(assignment => ({
            id: assignment.id,
            name: assignment.name,
            description: assignment.description || '',
            dueDate: assignment.due_at ? new Date(assignment.due_at) : null,
            courseId: assignment.course_id,
            isSubmitted: assignment.submission?.workflow_state === 'submitted',
            pointsPossible: assignment.points_possible || 0,
            subject: guessSubjectFromAssignment(assignment)
          }));

        console.log(`Found ${courseAssignments.length} pending assignments in ${course.name}`);
        allAssignments = [...allAssignments, ...courseAssignments];
      } catch (error) {
        console.error(`Error fetching assignments for course ${course.id}:`, error);
        // Continue with other courses even if one fails
      }
    }

    // Sort all assignments by due date
    const sortedAssignments = allAssignments.sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    console.log(`Total assignments found for ${student}: ${sortedAssignments.length}`);
    return sortedAssignments;
  } catch (error) {
    console.error(`Error fetching assignments for ${student}:`, error);
    return [];
  }
}

async function submitAssignment(apiUrl: string, apiToken: string, courseId: number, assignmentId: number): Promise<boolean> {
  try {
    await makeCanvasRequest(apiUrl, apiToken, `/courses/${courseId}/assignments/${assignmentId}/submissions`);
    console.log(`Successfully submitted assignment ${assignmentId} in course ${courseId}`);
    return true;
  } catch (error) {
    console.error(`Error submitting assignment ${assignmentId}:`, error);
    return false;
  }
}