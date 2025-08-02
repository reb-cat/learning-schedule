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
  description?: string;
  due_at?: string;
  points_possible?: number;
  html_url?: string;
  course_id?: number;
  workflow_state?: string;
  published?: boolean;
  submission_types?: string[];
}

interface AdministrativeNotification {
  student_name: string;
  title: string;
  description?: string;
  notification_type: string;
  priority: string;
  due_date?: string;
  amount?: number;
  canvas_id?: string;
  canvas_url?: string;
  course_name?: string;
}

function isAdministrativeItem(name: string, courseName: string, description?: string): boolean {
  const administrativeKeywords = [
    'yearbook', 'fees', 'fee', 'permission', 'form', 'waiver', 'consent',
    'athletic', 'sports', 'fundraiser', 'volunteer', 'parent', 'guardian',
    'medical', 'emergency', 'contact', 'information', 'survey', 'evaluation',
    'attendance', 'tardy', 'discipline', 'behavior', 'policy', 'handbook',
    'registration', 'enrollment', 'transcript', 'graduation', 'ceremony',
    'copy fee', 'field trip', 'payment', 'donation', 'club', 'activity fee'
  ];
  
  const lowerName = name.toLowerCase();
  const lowerCourse = courseName.toLowerCase();
  const lowerDesc = description?.toLowerCase() || '';
  
  return administrativeKeywords.some(keyword => 
    lowerName.includes(keyword) || 
    lowerCourse.includes(keyword) || 
    lowerDesc.includes(keyword)
  );
}

function isLikelyAdministrative(assignment: CanvasAssignment, courseName: string): boolean {
  // Check for 0-point assignments (often administrative)
  if (assignment.points_possible === 0) {
    return true;
  }
  
  // Check for certain submission types that indicate administrative tasks
  const adminSubmissionTypes = ['not_graded', 'none'];
  if (assignment.submission_types && 
      assignment.submission_types.some(type => adminSubmissionTypes.includes(type))) {
    return true;
  }
  
  return false;
}

function getAdministrativeNotificationType(name: string, description?: string): string {
  const text = (name + ' ' + (description || '')).toLowerCase();
  
  if (text.includes('fee') || text.includes('payment') || text.includes('cost') || text.includes('money')) {
    return 'fee';
  }
  if (text.includes('permission') || text.includes('form') || text.includes('waiver') || text.includes('consent')) {
    return 'form';
  }
  if (text.includes('field trip') || text.includes('activity') || text.includes('event')) {
    return 'permission';
  }
  
  return 'general';
}

function getAdministrativePriority(name: string, dueDate?: string): string {
  const text = name.toLowerCase();
  
  if (text.includes('urgent') || text.includes('asap') || text.includes('immediate')) {
    return 'high';
  }
  
  if (dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    const daysDiff = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);
    
    if (daysDiff <= 3) return 'high';
    if (daysDiff <= 7) return 'medium';
  }
  
  return 'medium';
}

function extractFeeAmount(name: string, description?: string): number | undefined {
  const text = (name + ' ' + (description || '')).toLowerCase();
  const feeRegex = /\$(\d+(?:\.\d{2})?)/;
  const match = text.match(feeRegex);
  return match ? parseFloat(match[1]) : undefined;
}

function getCurrentAcademicYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  // Assume academic year starts in August (month 7)
  if (currentMonth >= 7) {
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
}

function isEligibleForScheduling(assignment: CanvasAssignment): boolean {
  if (!assignment.due_at) return false;
  
  const dueDate = new Date(assignment.due_at);
  const now = new Date();
  const daysDiff = (dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
  
  // Only schedule assignments due within the next 3 months
  return daysDiff >= -7 && daysDiff <= 90;
}

function determineSubject(courseName: string): string {
  const name = courseName.toLowerCase();
  
  if (name.includes('math') || name.includes('algebra') || name.includes('geometry') || name.includes('calculus')) {
    return 'mathematics';
  }
  if (name.includes('english') || name.includes('literature') || name.includes('writing') || name.includes('language arts')) {
    return 'english';
  }
  if (name.includes('science') || name.includes('biology') || name.includes('chemistry') || name.includes('physics')) {
    return 'science';
  }
  if (name.includes('history') || name.includes('social') || name.includes('government') || name.includes('civics')) {
    return 'social studies';
  }
  if (name.includes('spanish') || name.includes('french') || name.includes('german') || name.includes('language')) {
    return 'world language';
  }
  if (name.includes('art') || name.includes('music') || name.includes('drama') || name.includes('theater') || name.includes('photography')) {
    return 'arts';
  }
  if (name.includes('pe') || name.includes('physical') || name.includes('health') || name.includes('fitness')) {
    return 'physical education';
  }
  
  return 'other';
}

function determineCognitiveLoad(subject: string, title: string): 'light' | 'medium' | 'heavy' {
  const titleLower = title.toLowerCase();
  
  // Heavy cognitive load indicators
  if (titleLower.includes('test') || titleLower.includes('exam') || titleLower.includes('quiz') || 
      titleLower.includes('project') || titleLower.includes('essay') || titleLower.includes('research')) {
    return 'heavy';
  }
  
  // Light cognitive load indicators
  if (titleLower.includes('worksheet') || titleLower.includes('practice') || titleLower.includes('review') ||
      titleLower.includes('reading') || titleLower.includes('notes')) {
    return 'light';
  }
  
  // Subject-specific defaults
  if (subject === 'mathematics' || subject === 'science') {
    return 'medium';
  }
  
  return 'medium';
}

function estimateTimeRequired(title: string, description?: string): number {
  const text = (title + ' ' + (description || '')).toLowerCase();
  
  // Look for time indicators in the text
  const timeMatch = text.match(/(\d+)\s*(minute|hour)/);
  if (timeMatch) {
    const value = parseInt(timeMatch[1]);
    const unit = timeMatch[2];
    return unit.startsWith('hour') ? value * 60 : value;
  }
  
  // Estimate based on assignment type
  if (text.includes('test') || text.includes('exam')) {
    return 90; // 1.5 hours for tests
  }
  if (text.includes('quiz')) {
    return 30; // 30 minutes for quizzes
  }
  if (text.includes('essay') || text.includes('project')) {
    return 180; // 3 hours for essays/projects
  }
  if (text.includes('worksheet') || text.includes('practice')) {
    return 45; // 45 minutes for worksheets
  }
  if (text.includes('reading')) {
    return 60; // 1 hour for reading assignments
  }
  
  return 60; // Default to 1 hour
}

function calculateUrgency(dueDate: string | null): 'overdue' | 'due_today' | 'due_soon' | 'upcoming' {
  if (!dueDate) return 'upcoming';
  
  const due = new Date(dueDate);
  const now = new Date();
  const timeDiff = due.getTime() - now.getTime();
  const daysDiff = timeDiff / (1000 * 3600 * 24);
  
  if (daysDiff < 0) return 'overdue';
  if (daysDiff < 1) return 'due_today';
  if (daysDiff <= 3) return 'due_soon';
  return 'upcoming';
}

async function fetchCanvasAssignments(token: string, studentName: string) {
  console.log(`\n🔄 Starting simple Canvas sync for ${studentName}`);
  
  try {
    console.log(`📡 Fetching courses for ${studentName}...`);
    
    // Fetch active courses
    const coursesResponse = await fetch(
      'https://canvas.instructure.com/api/v1/courses?enrollment_state=active&enrollment_type=student&include[]=term&state[]=available',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!coursesResponse.ok) {
      console.error(`❌ Failed to fetch courses for ${studentName}: ${coursesResponse.status}`);
      throw new Error(`Failed to fetch courses: ${coursesResponse.status}`);
    }

    const courses = await coursesResponse.json();
    console.log(`✅ Found ${courses.length} courses for ${studentName}`);

    const allAssignments = [];
    const allAdministrativeItems = [];
    const currentAcademicYear = getCurrentAcademicYear();

    for (const course of courses) {
      try {
        console.log(`\n📚 Processing course: ${course.name} (ID: ${course.id})`);
        
        // Fetch assignments for this course
        console.log(`   📋 Fetching assignments...`);
        const assignmentsResponse = await fetch(
          `https://canvas.instructure.com/api/v1/courses/${course.id}/assignments?` + 
          `order_by=due_at&include[]=submission&per_page=100`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!assignmentsResponse.ok) {
          console.warn(`   ⚠️ Failed to fetch assignments for course ${course.id}: ${assignmentsResponse.status}`);
          continue;
        }

        const courseAssignments = await assignmentsResponse.json();
        console.log(`   ✅ Found ${courseAssignments.length} assignments in ${course.name}`);

        // Process each assignment
        for (const assignment of courseAssignments) {
          try {
            console.log(`   🔍 Processing: "${assignment.name}"`);
            
            // Check if this is an administrative item
            if (isAdministrativeItem(assignment.name, course.name, assignment.description) || 
                isLikelyAdministrative(assignment, course.name)) {
              
              console.log(`     📄 → Administrative item: ${assignment.name}`);
              
              const adminItem: AdministrativeNotification = {
                student_name: studentName,
                title: assignment.name,
                description: assignment.description,
                notification_type: getAdministrativeNotificationType(assignment.name, assignment.description),
                priority: getAdministrativePriority(assignment.name, assignment.due_at),
                due_date: assignment.due_at,
                amount: extractFeeAmount(assignment.name, assignment.description),
                canvas_id: assignment.id?.toString(),
                canvas_url: assignment.html_url,
                course_name: course.name
              };
              
              allAdministrativeItems.push(adminItem);
              continue;
            }

            // Process as academic assignment
            console.log(`     📝 → Academic assignment: ${assignment.name}`);
            
            const processedAssignment = {
              id: assignment.id?.toString() || `generated-${Math.random().toString(36).substr(2, 9)}`,
              student_name: studentName,
              title: assignment.name,
              course_name: course.name,
              subject: determineSubject(course.name),
              due_date: assignment.due_at,
              urgency: calculateUrgency(assignment.due_at),
              cognitive_load: determineCognitiveLoad(determineSubject(course.name), assignment.name),
              estimated_time_minutes: estimateTimeRequired(assignment.name, assignment.description),
              canvas_id: assignment.id?.toString(),
              canvas_url: assignment.html_url,
              eligible_for_scheduling: isEligibleForScheduling(assignment),
              academic_year: currentAcademicYear
            };

            allAssignments.push(processedAssignment);
            
          } catch (assignmentError) {
            console.error(`   ❌ Error processing assignment "${assignment.name}":`, assignmentError);
          }
        }
        
      } catch (courseError) {
        console.error(`❌ Error processing course ${course.id}:`, courseError);
      }
    }

    console.log(`\n📊 Final results for ${studentName}:`);
    console.log(`   📝 Academic assignments: ${allAssignments.length}`);
    console.log(`   📄 Administrative items: ${allAdministrativeItems.length}`);
    
    return { assignments: allAssignments, administrativeItems: allAdministrativeItems };
    
  } catch (error) {
    console.error(`💥 Critical error in fetchCanvasAssignments for ${studentName}:`, error);
    throw error;
  }
}

async function updateSyncStatus(studentName: string, status: string, message: string, fetched: number, scheduled: number) {
  console.log(`📊 Updating sync status for ${studentName}: ${status}`);
  
  try {
    const { error } = await supabase
      .from('sync_status')
      .insert({
        student_name: studentName,
        status: status,
        message: message,
        assignments_count: fetched,
        sync_type: 'manual'
      });

    if (error) {
      console.error(`❌ Failed to update sync status for ${studentName}:`, error);
    } else {
      console.log(`✅ Sync status updated for ${studentName}`);
    }
  } catch (error) {
    console.error(`💥 Critical error updating sync status for ${studentName}:`, error);
  }
}

serve(async (req) => {
  console.log(`\n🚀 Canvas sync function called - ${new Date().toISOString()}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentName } = await req.json();
    console.log(`👤 Requested sync for student: ${studentName || 'ALL'}`);

    let studentsToSync = [];
    if (studentName) {
      studentsToSync = [studentName];
    } else {
      studentsToSync = ['Abigail', 'Khalil'];
    }

    const results = {};

    for (const student of studentsToSync) {
      try {
        console.log(`\n=== Starting sync for ${student} ===`);
        await updateSyncStatus(student, 'pending', `Starting sync for ${student}`, 0, 0);

        const token = student === 'Abigail' ? abigailToken : khalilToken;
        if (!token) {
          throw new Error(`No Canvas token found for ${student}`);
        }

        // Fetch assignments from Canvas
        const { assignments, administrativeItems } = await fetchCanvasAssignments(token, student);
        
        console.log(`\n🗑️ Cleaning existing data for ${student}...`);
        
        // Delete existing assignments and administrative notifications
        const { error: deleteAssignmentsError } = await supabase
          .from('assignments')
          .delete()
          .eq('student_name', student);

        if (deleteAssignmentsError) {
          console.error(`❌ Error deleting assignments for ${student}:`, deleteAssignmentsError);
        } else {
          console.log(`✅ Deleted existing assignments for ${student}`);
        }

        const { error: deleteAdminError } = await supabase
          .from('administrative_notifications')
          .delete()
          .eq('student_name', student);

        if (deleteAdminError) {
          console.error(`❌ Error deleting admin notifications for ${student}:`, deleteAdminError);
        } else {
          console.log(`✅ Deleted existing admin notifications for ${student}`);
        }

        console.log(`\n💾 Inserting new data for ${student}...`);
        
        // Insert new assignments
        if (assignments.length > 0) {
          const { error: insertError } = await supabase
            .from('assignments')
            .insert(assignments);

          if (insertError) {
            console.error(`❌ Error inserting assignments for ${student}:`, insertError);
            throw insertError;
          } else {
            console.log(`✅ Inserted ${assignments.length} assignments for ${student}`);
          }
        }

        // Insert new administrative notifications
        if (administrativeItems.length > 0) {
          const { error: insertAdminError } = await supabase
            .from('administrative_notifications')
            .insert(administrativeItems);

          if (insertAdminError) {
            console.error(`❌ Error inserting admin notifications for ${student}:`, insertAdminError);
            throw insertAdminError;
          } else {
            console.log(`✅ Inserted ${administrativeItems.length} admin notifications for ${student}`);
          }
        }

        // Schedule eligible assignments
        console.log(`\n📅 Scheduling assignments for ${student}...`);
        const eligibleAssignments = assignments.filter(a => a.eligible_for_scheduling);
        console.log(`📊 ${eligibleAssignments.length} assignments eligible for scheduling`);
        
        let scheduledCount = 0;
        if (eligibleAssignments.length > 0) {
          try {
            const schedulingResult = await scheduleAssignments(student, eligibleAssignments);
            scheduledCount = schedulingResult.scheduled_count || 0;
            console.log(`✅ Successfully scheduled ${scheduledCount} assignments for ${student}`);
          } catch (schedulingError) {
            console.error(`❌ Error scheduling assignments for ${student}:`, schedulingError);
          }
        }

        await updateSyncStatus(
          student, 
          'completed', 
          `Successfully synced ${assignments.length} assignments and ${administrativeItems.length} admin items`, 
          assignments.length,
          scheduledCount
        );

        results[student] = {
          success: true,
          assignments: assignments.length,
          administrativeItems: administrativeItems.length,
          scheduled: scheduledCount
        };

        console.log(`✅ Completed sync for ${student}`);
        
      } catch (studentError) {
        console.error(`💥 Error syncing ${student}:`, studentError);
        
        await updateSyncStatus(
          student, 
          'error', 
          `Sync failed: ${studentError.message}`, 
          0,
          0
        );

        results[student] = {
          success: false,
          error: studentError.message
        };
      }
    }

    console.log(`\n🎉 Canvas sync completed for all requested students`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Canvas sync completed',
        results: results
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('💥 Critical error in Canvas sync function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});