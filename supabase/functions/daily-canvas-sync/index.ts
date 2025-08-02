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
  unlock_at?: string;
  lock_at?: string;
  content_source?: 'assignments' | 'syllabus' | 'pages' | 'modules';
}

interface CanvasSyllabus {
  syllabus_body?: string;
}

interface CanvasPage {
  page_id: number;
  title: string;
  body?: string;
  html_url: string;
}

interface CanvasModule {
  id: number;
  name: string;
  items?: CanvasModuleItem[];
}

interface CanvasModuleItem {
  id: number;
  title: string;
  type: string;
  content_id?: number;
  html_url?: string;
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
  content_source?: 'assignments' | 'syllabus' | 'pages' | 'modules';
}

const CANVAS_BASE_URL = 'https://canvas.instructure.com/api/v1';

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

function isNonAcademicAssignment(name: string, courseName: string): boolean {
  // Legacy function - kept for backward compatibility
  return isAdministrativeItem(name, courseName);
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
  // but keep older assignments in database in case they weren't turned in
  return daysDiff >= -7 && daysDiff <= 90;
}

function parseAssignmentFromText(text: string, courseName: string, sourceUrl?: string): CanvasAssignment[] {
  const assignments: CanvasAssignment[] = [];
  
  // Enhanced regex patterns for assignment detection
  const patterns = [
    // Pattern: "Assignment Name - Due: Date"
    /([^-\n]+)\s*-\s*Due:\s*([A-Za-z]+ \d{1,2}(?:, \d{4})?)/gi,
    // Pattern: "Assignment Name	Due Date" (tab-separated)
    /^([^\t\n]+)\t+([A-Za-z]+ \d{1,2}(?:, \d{4})?)/gm,
    // Pattern: Assignment Name on one line, date on next
    /^([^\n]+)\n\s*([A-Za-z]+ \d{1,2}(?:, \d{4})?)/gm,
    // Pattern: "Assignment Name (Due: Date)"
    /([^(]+)\s*\(Due:\s*([A-Za-z]+ \d{1,2}(?:, \d{4})?)\)/gi,
    // Pattern: Date followed by assignment name
    /([A-Za-z]+ \d{1,2}(?:, \d{4})?)\s*[-:]\s*([^\n]+)/gi
  ];

  patterns.forEach((pattern, index) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let title, dateStr;
      
      if (index === 4) { // Last pattern has date first
        dateStr = match[1].trim();
        title = match[2].trim();
      } else {
        title = match[1].trim();
        dateStr = match[2].trim();
      }

      // Skip if title is too short or contains unwanted content
      if (title.length < 3 || title.toLowerCase().includes('subject') || 
          title.toLowerCase().includes('instructions')) {
        continue;
      }

      // Parse date
      const dueDate = parseDateString(dateStr);
      
      if (dueDate) {
        assignments.push({
          id: Math.random() * 1000000, // Generate pseudo-ID
          name: title,
          due_at: dueDate.toISOString(),
          html_url: sourceUrl,
          course_id: 0,
          content_source: 'syllabus'
        });
      }
    }
  });

  return assignments;
}

function parseDateString(dateStr: string): Date | null {
  try {
    // Handle various date formats
    const cleanDate = dateStr.trim();
    const currentYear = new Date().getFullYear();
    
    // Add current year if not present
    let fullDateStr = cleanDate;
    if (!/\d{4}/.test(cleanDate)) {
      fullDateStr = `${cleanDate}, ${currentYear}`;
    }
    
    const parsed = new Date(fullDateStr);
    
    // If the parsed date is in the past by more than 6 months, try next year
    const now = new Date();
    const monthsDiff = (now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsDiff > 6) {
      const nextYearDate = new Date(fullDateStr.replace(/\d{4}/, (currentYear + 1).toString()));
      return nextYearDate;
    }
    
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (error) {
    console.warn('Failed to parse date:', dateStr, error);
    return null;
  }
}

async function fetchCourseSyllabus(courseId: number, token: string): Promise<CanvasAssignment[]> {
  try {
    const response = await fetch(
      `https://canvas.instructure.com/api/v1/courses/${courseId}?include[]=syllabus_body`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch syllabus for course ${courseId}: ${response.status}`);
      return [];
    }

    const course = await response.json();
    const syllabusBody = course.syllabus_body;
    
    if (!syllabusBody) {
      return [];
    }

    // Strip HTML tags and parse assignments
    const textContent = syllabusBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    return parseAssignmentFromText(textContent, course.name, course.html_url);
    
  } catch (error) {
    console.error(`Error fetching syllabus for course ${courseId}:`, error);
    return [];
  }
}

async function fetchCoursePages(courseId: number, token: string, courseName: string): Promise<CanvasAssignment[]> {
  try {
    const response = await fetch(
      `https://canvas.instructure.com/api/v1/courses/${courseId}/pages?per_page=50`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch pages for course ${courseId}: ${response.status}`);
      return [];
    }

    const pages = await response.json();
    const assignments: CanvasAssignment[] = [];
    
    // Look for pages that might contain assignment schedules
    const relevantPages = pages.filter((page: CanvasPage) => {
      const title = page.title.toLowerCase();
      return title.includes('assignment') || title.includes('schedule') || 
             title.includes('syllabus') || title.includes('calendar') ||
             title.includes('due dates');
    });

    for (const page of relevantPages) {
      try {
        // Fetch full page content
        const pageResponse = await fetch(
          `https://canvas.instructure.com/api/v1/courses/${courseId}/pages/${page.page_id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (pageResponse.ok) {
          const fullPage = await pageResponse.json();
          const textContent = (fullPage.body || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
          const pageAssignments = parseAssignmentFromText(textContent, courseName, page.html_url);
          
          pageAssignments.forEach(assignment => {
            assignment.content_source = 'pages';
          });
          
          assignments.push(...pageAssignments);
        }
      } catch (error) {
        console.warn(`Error fetching page ${page.page_id}:`, error);
      }
    }

    return assignments;
    
  } catch (error) {
    console.error(`Error fetching pages for course ${courseId}:`, error);
    return [];
  }
}

async function fetchCourseModules(courseId: number, token: string, courseName: string): Promise<CanvasAssignment[]> {
  try {
    const response = await fetch(
      `https://canvas.instructure.com/api/v1/courses/${courseId}/modules?include[]=items&per_page=50`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch modules for course ${courseId}: ${response.status}`);
      return [];
    }

    const modules = await response.json();
    const assignments: CanvasAssignment[] = [];

    for (const module of modules) {
      if (module.items) {
        for (const item of module.items) {
          // Look for assignment-type items that might not be in main assignments list
          if (item.type === 'Assignment' && item.title) {
            // Check if this is a different assignment not caught elsewhere
            const assignment: CanvasAssignment = {
              id: item.content_id || Math.random() * 1000000,
              name: item.title,
              html_url: item.html_url,
              course_id: courseId,
              content_source: 'modules'
            };
            
            assignments.push(assignment);
          }
        }
      }
    }

    return assignments;
    
  } catch (error) {
    console.error(`Error fetching modules for course ${courseId}:`, error);
    return [];
  }
}

async function fetchCanvasAssignments(token: string, studentName: string) {
  console.log(`Starting comprehensive Canvas fetch for ${studentName}`);
  
  try {
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
      console.error(`Failed to fetch courses for ${studentName}: ${coursesResponse.status}`);
      return { assignments: [], administrativeItems: [] };
    }

    const courses = await coursesResponse.json();
    console.log(`Found ${courses.length} courses for ${studentName}`);

    const allAssignments = [];
    const allAdministrativeItems = [];
    const currentAcademicYear = getCurrentAcademicYear();
    const seenAssignments = new Set(); // To avoid duplicates

    for (const course of courses) {
      try {
        console.log(`\n=== Processing course: ${course.name} (${course.id}) ===`);
        
        // 1. Fetch regular assignments
        console.log(`1. Fetching regular assignments...`);
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

        let regularAssignments = [];
        if (assignmentsResponse.ok) {
          regularAssignments = await assignmentsResponse.json();
          console.log(`   Found ${regularAssignments.length} regular assignments`);
        } else {
          console.warn(`   Failed to fetch regular assignments: ${assignmentsResponse.status}`);
        }

        // 2. Fetch syllabus content
        console.log(`2. Fetching syllabus content...`);
        const syllabusAssignments = await fetchCourseSyllabus(course.id, token);
        console.log(`   Found ${syllabusAssignments.length} assignments from syllabus`);

        // 3. Fetch course pages
        console.log(`3. Fetching course pages...`);
        const pageAssignments = await fetchCoursePages(course.id, token, course.name);
        console.log(`   Found ${pageAssignments.length} assignments from pages`);

        // 4. Fetch module content
        console.log(`4. Fetching module content...`);
        const moduleAssignments = await fetchCourseModules(course.id, token, course.name);
        console.log(`   Found ${moduleAssignments.length} assignments from modules`);

        // Combine all assignments from different sources
        const allCourseAssignments = [
          ...regularAssignments.map(a => ({ ...a, content_source: 'assignments' })),
          ...syllabusAssignments,
          ...pageAssignments,
          ...moduleAssignments
        ];

        console.log(`   Total combined assignments: ${allCourseAssignments.length}`);

        // Process each assignment
        for (const assignment of allCourseAssignments) {
          // Create a unique key to avoid duplicates
          const assignmentKey = `${course.id}-${assignment.name}-${assignment.due_at}`;
          if (seenAssignments.has(assignmentKey)) {
            console.log(`   Skipping duplicate: ${assignment.name}`);
            continue;
          }
          seenAssignments.add(assignmentKey);

          // Route to administrative notifications if it's an administrative item
          if (isAdministrativeItem(assignment.name, course.name, assignment.description)) {
            console.log(`   → Administrative: ${assignment.name} (from ${assignment.content_source})`);
            
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
              course_name: course.name,
              content_source: assignment.content_source
            };
            
            allAdministrativeItems.push(adminItem);
            continue;
          }

          // Skip if it's likely administrative but didn't get caught above
          if (isLikelyAdministrative(assignment, course.name)) {
            console.log(`   → Skipping likely administrative: ${assignment.name}`);
            continue;
          }

          // Process as academic assignment
          console.log(`   → Academic: ${assignment.name} (from ${assignment.content_source})`);
          const processedAssignment = {
            id: assignment.id?.toString() || `generated-${Math.random().toString(36).substr(2, 9)}`,
            student_name: studentName,
            title: assignment.name,
            course_name: course.name,
            subject: determineSubject(course.name),
            due_date: assignment.due_at,
            urgency: calculateUrgency(assignment.due_at),
            cognitive_load: determineCognitiveLoad(assignment.name, course.name),
            estimated_time_minutes: estimateTimeRequired(assignment.name, assignment.description),
            canvas_id: assignment.id?.toString(),
            canvas_url: assignment.html_url,
            eligible_for_scheduling: isEligibleForScheduling(assignment),
            academic_year: currentAcademicYear
          };

          allAssignments.push(processedAssignment);
        }
      } catch (error) {
        console.error(`Error processing course ${course.id}:`, error);
      }
    }

    console.log(`\n=== Final Summary for ${studentName} ===`);
    console.log(`Total academic assignments: ${allAssignments.length}`);
    console.log(`Total administrative items: ${allAdministrativeItems.length}`);
    
    // Log content source breakdown
    const sourceBreakdown = allAssignments.reduce((acc, assignment) => {
      const source = assignment.canvas_id?.startsWith('generated-') ? 'parsed' : 'regular';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`Source breakdown:`, sourceBreakdown);
    
    return { assignments: allAssignments, administrativeItems: allAdministrativeItems };
    
  } catch (error) {
    console.error(`Error in fetchCanvasAssignments for ${studentName}:`, error);
    return { assignments: [], administrativeItems: [] };
  }
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

function estimateTimeRequired(title: string, description?: string): number {
  // Base estimates by cognitive load
  const baseMinutes = {
    'light': 20,
    'medium': 35,
    'heavy': 50
  };
  
  // Adjust based on assignment type
  const titleLower = title.toLowerCase();
  if (titleLower.includes('test') || titleLower.includes('exam')) return 60;
  if (titleLower.includes('project')) return 90;
  if (titleLower.includes('reading')) return 25;
  if (titleLower.includes('quiz')) return 30;
  
  return 35; // Default
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
    
    let totalFetched = 0;
    let totalScheduled = 0;

    for (const studentName of ['Abigail', 'Khalil']) {
      try {
        await updateSyncStatus(studentName, 'running', `Starting sync for ${studentName}`, 0, 0);
        
        console.log(`\n--- Processing ${studentName} ---`);
        const token = studentName === 'Abigail' ? abigailToken : khalilToken;
        
        // Fetch assignments and administrative items from Canvas
        const { assignments: canvasAssignments, administrativeItems } = await fetchCanvasAssignments(token, studentName);
        console.log(`Fetched ${canvasAssignments.length} assignments and ${administrativeItems.length} administrative items for ${studentName}`);

        // Delete existing assignments for this student
        const { error: deleteError } = await supabase
          .from('assignments')
          .delete()
          .eq('student_name', studentName);

        if (deleteError) {
          console.error(`Error deleting existing assignments for ${studentName}:`, deleteError);
          await updateSyncStatus(studentName, 'error', `Failed to delete existing assignments: ${deleteError.message}`, 0, 0);
          continue;
        }

        // Delete existing administrative notifications for this student
        const { error: deleteAdminError } = await supabase
          .from('administrative_notifications')
          .delete()
          .eq('student_name', studentName);

        if (deleteAdminError) {
          console.error(`Error deleting existing administrative notifications for ${studentName}:`, deleteAdminError);
        }

        // Insert new assignments
        if (canvasAssignments.length > 0) {
          const { data: insertData, error: insertError } = await supabase
            .from('assignments')
            .insert(canvasAssignments);

          if (insertError) {
            console.error(`Error inserting assignments for ${studentName}:`, insertError);
            await updateSyncStatus(studentName, 'error', `Failed to insert assignments: ${insertError.message}`, canvasAssignments.length, 0);
            continue;
          }

          console.log(`Successfully inserted ${canvasAssignments.length} assignments for ${studentName}`);
        }

        // Insert new administrative notifications
        if (administrativeItems.length > 0) {
          const { data: insertAdminData, error: insertAdminError } = await supabase
            .from('administrative_notifications')
            .insert(administrativeItems);

          if (insertAdminError) {
            console.error(`Error inserting administrative notifications for ${studentName}:`, insertAdminError);
          } else {
            console.log(`Successfully inserted ${administrativeItems.length} administrative notifications for ${studentName}`);
          }
        }

        // Schedule only eligible assignments using the shared scheduling logic
        const eligibleAssignments = canvasAssignments.filter(a => a.eligible_for_scheduling);
        const { scheduleAssignments } = await import('../_shared/scheduling.ts');
        const schedulingResult = scheduleAssignments(eligibleAssignments, studentName, 'Monday'); // Default to Monday for sync
        
        console.log(`Scheduling result for ${studentName}:`, {
          total: canvasAssignments.length,
          eligible: eligibleAssignments.length,
          scheduled: schedulingResult.scheduledAssignments.length,
          unscheduled: schedulingResult.unscheduledAssignments.length,
          administrative: administrativeItems.length,
          warnings: schedulingResult.warnings.length
        });

        await updateSyncStatus(
          studentName, 
          'success', 
          `Successfully synced ${canvasAssignments.length} assignments and ${administrativeItems.length} administrative items`, 
          canvasAssignments.length,
          schedulingResult.scheduledAssignments.length
        );
        
        totalFetched += canvasAssignments.length;
        totalScheduled += schedulingResult.scheduledAssignments.length;
        
      } catch (error) {
        console.error(`Error processing ${studentName}:`, error);
        await updateSyncStatus(studentName, 'error', `Sync failed: ${error.message}`, 0, 0);
      }
    }

    console.log('\n=== Daily Canvas sync completed ===');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Daily sync completed',
      totalFetched,
      totalScheduled
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
