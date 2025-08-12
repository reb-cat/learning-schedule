import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { findPotentialDuplicates, DuplicateCheckParams } from '../_shared/duplicateDetection.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

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
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const canvasBaseUrl = Deno.env.get('CANVAS_BASE_URL')!;
const canvasBaseUrl2 = Deno.env.get('CANVAS_BASE_URL_2')!;
const abigailToken = Deno.env.get('ABIGAIL_CANVAS_TOKEN')!;
const abigailToken2 = Deno.env.get('ABIGAIL_CANVAS_TOKEN_2')!;
const khalilToken = Deno.env.get('KHALIL_CANVAS_TOKEN')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

// Academic year cutoff date - only sync assignments due on or after this date
const ACADEMIC_YEAR_CUTOFF = '2025-06-01T00:00:00Z';

// Function to categorize assignments based on title keywords
function categorizeAssignment(title: string): 'academic' | 'administrative' {
  const administrativeKeywords = [
    'fee', 'permission', 'form', 'payment', 'consent', 'waiver',
    'registration', 'enrollment', 'medical', 'emergency contact',
    'field trip', 'photo release', 'media consent'
  ];
  
  const titleLower = title.toLowerCase();
  const isAdministrative = administrativeKeywords.some(keyword => 
    titleLower.includes(keyword)
  );
  
  return isAdministrative ? 'administrative' : 'academic';
}

// Function to extract fees from text content  
function extractAdministrativeRequirements(content: string, courseName: string): Array<{
  title: string;
  description: string;
  type: string;
  priority: string;
  amount?: number;
}> {
  if (!content) return [];
  
  const requirements: Array<any> = [];
  
  // Clean content
  const cleanContent = content
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Extract fees only
  const feePattern = /(?:copy\s*fee|lab\s*fee|class\s*fee|fee)[:\s-]*\$(\d+(?:\.\d{2})?)/gi;
  let feeMatch;
  while ((feeMatch = feePattern.exec(cleanContent)) !== null) {
    const amount = parseFloat(feeMatch[1]);
    if (amount > 0 && amount < 1000) {
      requirements.push({
        title: `Course Fee - $${amount}`,
        description: `${courseName} fee: $${amount}`,
        type: 'fee',
        priority: 'high',
        amount: amount
      });
    }
  }
  
  return requirements;
}

// Function to fetch and parse course syllabi
async function fetchCourseSyllabus(courseId: string, token: string, baseUrl: string = canvasBaseUrl): Promise<string> {
  try {
    const response = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}?include[]=syllabus_body`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.warn(`Failed to fetch syllabus for course ${courseId}: ${response.status}`);
      return '';
    }
    
    const course = await response.json();
    return course.syllabus_body || '';
  } catch (error) {
    console.error(`Error fetching syllabus for course ${courseId}:`, error);
    return '';
  }
}

// Function to fetch course announcements
async function fetchCourseAnnouncements(courseId: string, token: string, baseUrl: string = canvasBaseUrl): Promise<string> {
  try {
    const response = await fetch(
      `${baseUrl}/api/v1/announcements?context_codes[]=course_${courseId}&per_page=10&active_only=true`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.warn(`Failed to fetch announcements for course ${courseId}: ${response.status}`);
      return '';
    }
    
    const announcements = await response.json();
    return announcements.map((ann: any) => `${ann.title}\n${ann.message || ''}`).join('\n\n');
  } catch (error) {
    console.error(`Error fetching announcements for course ${courseId}:`, error);
    return '';
  }
}

// Function to fetch course pages
async function fetchCoursePages(courseId: string, token: string, baseUrl: string = canvasBaseUrl): Promise<string> {
  try {
    const response = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/pages?per_page=20&published=true`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.warn(`Failed to fetch pages for course ${courseId}: ${response.status}`);
      return '';
    }
    
    const pages = await response.json();
    let allContent = '';
    
    // Fetch content for each page that might contain requirements
    for (const page of pages.slice(0, 5)) { // Limit to first 5 pages to avoid too much data
      if (page.title.toLowerCase().includes('supply') || 
          page.title.toLowerCase().includes('requirement') ||
          page.title.toLowerCase().includes('material') ||
          page.title.toLowerCase().includes('fee')) {
        
        const pageResponse = await fetch(
          `${baseUrl}/api/v1/courses/${courseId}/pages/${page.url}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (pageResponse.ok) {
          const pageData = await pageResponse.json();
          allContent += `${pageData.title}\n${pageData.body || ''}\n\n`;
        }
      }
    }
    
    return allContent;
  } catch (error) {
    console.error(`Error fetching pages for course ${courseId}:`, error);
    return '';
  }
}

// Function to fetch course modules
async function fetchCourseModules(courseId: string, token: string, baseUrl: string = canvasBaseUrl): Promise<any[]> {
  try {
    const response = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/modules?include[]=items&per_page=50`,
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
    console.log(`   📚 Found ${modules.length} modules`);
    return modules;
  } catch (error) {
    console.error(`Error fetching modules for course ${courseId}:`, error);
    return [];
  }
}

// Function to fetch course quizzes
async function fetchCourseQuizzes(courseId: string, token: string, baseUrl: string = canvasBaseUrl): Promise<any[]> {
  try {
    const response = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/quizzes?per_page=50`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.warn(`Failed to fetch quizzes for course ${courseId}: ${response.status}`);
      return [];
    }
    
    const quizzes = await response.json();
    console.log(`   🧩 Found ${quizzes.length} quizzes`);
    return quizzes;
  } catch (error) {
    console.error(`Error fetching quizzes for course ${courseId}:`, error);
    return [];
  }
}

// Function to process module items and convert to assignments
function processModuleItems(modules: any[], courseName: string, courseId: string, baseUrl: string): any[] {
  const moduleAssignments: any[] = [];
  
  for (const module of modules) {
    if (!module.items) continue;
    
    for (const item of module.items) {
      // Skip if already an assignment (will be fetched separately)
      if (item.type === 'Assignment') continue;
      
      // Process actionable items
      const isActionable = item.type === 'Quiz' || 
                          item.type === 'Discussion' ||
                          item.type === 'ExternalTool' ||
                          (item.type === 'Page' && item.title && isActionableTitle(item.title));
      
      if (isActionable && item.title) {
        const assignment = {
          id: `module_${module.id}_${item.id}`,
          name: item.title,
          type: item.type,
          module_id: module.id.toString(),
          module_name: module.name,
          module_position: item.position || 1,
          html_url: item.html_url || `${baseUrl}/courses/${courseId}/modules/${module.id}/items/${item.id}`,
          due_at: item.due_at || null,
          // Set a reasonable due date for orientation items
          calculated_due_date: item.due_at || calculateModuleDueDate(module, item)
        };
        
        moduleAssignments.push(assignment);
      }
    }
  }
  
  return moduleAssignments;
}

// Helper function to determine if a module item title is actionable
function isActionableTitle(title: string): boolean {
  const actionableKeywords = [
    'complete', 'submit', 'read', 'review', 'watch', 'attend', 'post', 'quiz',
    'assignment', 'discussion', 'orientation', 'introduce', 'syllabus', 'rules',
    'class rules', 'welcome', 'getting started', 'first week', 'requirements',
    'survey', 'checklist', 'safety', 'lab safety', 'sign up', 'registration',
    'permission', 'consent', 'waiver', 'form', 'contract', 'agreement'
  ];
  
  const titleLower = title.toLowerCase();
  return actionableKeywords.some(keyword => titleLower.includes(keyword));
}

// Helper function to calculate due dates for module items without explicit due dates
function calculateModuleDueDate(module: any, item: any): string | null {
  // For orientation modules, set due date to first week of class
  if (module.name && module.name.toLowerCase().includes('orientation')) {
    return '2025-08-19T23:59:59Z'; // Week of August 12th
  }
  
  // For welcome/first week modules
  if (module.name && (module.name.toLowerCase().includes('welcome') || module.name.toLowerCase().includes('week 1'))) {
    return '2025-08-26T23:59:59Z'; // End of first week
  }
  
  return null;
}

async function syncStudentAssignments(studentName: string, token: string, baseUrl: string = canvasBaseUrl, accountLabel: string = '') {
  console.log(`🔄 Starting sync for ${studentName}${accountLabel ? ` (${accountLabel})` : ''}...`);
  
  try {
    // 1) Fetch existing assignments from database
    const { data: existingAssignments } = await supabase
      .from('assignments')
      .select('id, student_name, course_name, title, canvas_id, category')
      .eq('student_name', studentName);
    
    const existing = new Set(
      (existingAssignments || []).map(a => `${a.student_name}|${a.course_name}|${a.title}`)
    );
    
    console.log(`📋 Found ${existing.size} existing assignments for ${studentName}`);

    // 2) Fetch courses from Canvas
    console.log(`📡 Fetching courses for ${studentName}${accountLabel ? ` (${accountLabel})` : ''}...`);
    const coursesResponse = await fetch(
      `${baseUrl}/api/v1/courses?enrollment_state=active&enrollment_type=student&state[]=available`,
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
    console.log(`✅ Found ${courses.length} active courses${accountLabel ? ` in ${accountLabel}` : ''}`);

    let newAssignments = 0;

    // 3) Process each course
    for (const course of courses) {
      console.log(`📚 Processing course: ${course.name}${accountLabel ? ` (${accountLabel})` : ''}`);
      
      // Fetch additional course content for administrative requirements and modules/quizzes
      console.log(`   🔍 Fetching syllabi, announcements, pages, modules, and quizzes for ${course.name}...`);
      const [syllabusContent, announcementsContent, pagesContent, modules, quizzes] = await Promise.all([
        fetchCourseSyllabus(course.id, token, baseUrl),
        fetchCourseAnnouncements(course.id, token, baseUrl),
        fetchCoursePages(course.id, token, baseUrl),
        fetchCourseModules(course.id, token, baseUrl),
        fetchCourseQuizzes(course.id, token, baseUrl)
      ]);
      
      // Extract fees from all content sources
      const allContent = `${syllabusContent}\n\n${announcementsContent}\n\n${pagesContent}`;
      const adminRequirements = extractAdministrativeRequirements(allContent, course.name);
      
      // Insert fees as notifications (with intelligent duplicate prevention)
      for (const req of adminRequirements) {
        console.log(`   💰 Found ${req.type}: ${req.title}`);
        
        // Use intelligent duplicate detection
        const newNotificationParams: DuplicateCheckParams = {
          title: req.title,
          notificationType: req.type,
          courseName: course.name,
          studentName: studentName,
          amount: req.amount
        };
        
        const duplicates = await findPotentialDuplicates(supabase, newNotificationParams, 80);
        
        // Only insert if no intelligent duplicates found
        if (duplicates.length === 0) {
          const { error: adminError } = await supabase
            .from('administrative_notifications')
            .insert({
              student_name: studentName,
              title: req.title,
              description: req.description,
              notification_type: req.type,
              priority: req.priority,
              course_name: course.name,
              canvas_url: `${baseUrl}/courses/${course.id}/assignments/syllabus`,
              amount: req.amount || null
            });
            
          if (adminError) {
            console.error(`❌ Error inserting fee "${req.title}":`, adminError);
          } else {
            console.log(`   ✅ Added fee: ${req.title}`);
          }
        } else {
          console.log(`   🔄 Intelligent duplicate detected for: ${req.title} (found ${duplicates.length} similar)`);
        }
      }
      
      // Fetch assignments for this course
      const assignmentsResponse = await fetch(
        `${baseUrl}/api/v1/courses/${course.id}/assignments?order_by=due_at&per_page=100`,
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

      // 4) Process regular assignments
      let assignmentsProcessed = 0;
      let assignmentsSkippedNoDueDate = 0;
      let assignmentsSkippedOldDate = 0;
      
      for (const assignment of assignments) {
        assignmentsProcessed++;
        
        // Determine due date status and skip logic
        let dueDateToUse = null;
        let dueDateStatus = 'none';
        
        if (assignment.due_at) {
          const dueDate = new Date(assignment.due_at);
          const cutoffDate = new Date(ACADEMIC_YEAR_CUTOFF);
          
          if (dueDate < cutoffDate) {
            console.log(`  📅 Skipping old assignment: ${assignment.name} (due: ${dueDate.toDateString()})`);
            assignmentsSkippedOldDate++;
            continue;
          }
          
          dueDateToUse = dueDate.toISOString();
          dueDateStatus = 'confirmed';
        } else {
          console.log(`  📝 Processing assignment without due date: ${assignment.name} (may unlock later)`);
          assignmentsSkippedNoDueDate++;
          dueDateStatus = 'pending';
        }
        
        // Check if assignment already exists (by canvas_id to handle duplicates across accounts)
        const existingAssignment = existingAssignments?.find(existing => 
          existing.canvas_id === assignment.id?.toString()
        );
        
        if (existingAssignment) {
          // Check if category needs to be updated
          const correctCategory = categorizeAssignment(assignment.name);
          if (existingAssignment.category !== correctCategory) {
            console.log(`  🔄 Updating category for "${assignment.name}" from ${existingAssignment.category} to ${correctCategory}`);
            
            const { error: updateError } = await supabase
              .from('assignments')
              .update({ 
                category: correctCategory,
                eligible_for_scheduling: correctCategory === 'academic'
              })
              .eq('id', existingAssignment.id);
              
            if (updateError) {
              console.error(`❌ Error updating category for ${assignment.name}:`, updateError);
            } else {
              console.log(`  ✅ Category updated successfully for ${assignment.name}`);
            }
          } else {
            console.log(`  ✅ Assignment already exists with correct category: ${assignment.name}`);
          }
          continue;
        }

        // Categorize assignment
        const category = categorizeAssignment(assignment.name);
        console.log(`  📂 Categorized "${assignment.name}" as: ${category} (due_date_status: ${dueDateStatus})`);

        // Insert new assignment
        const { error } = await supabase
          .from('assignments')
          .insert({
            student_name: studentName,
            title: assignment.name,
            course_name: course.name,
            due_date: dueDateToUse,
            canvas_id: assignment.id?.toString(),
            canvas_url: assignment.html_url,
            eligible_for_scheduling: category === 'academic' && dueDateStatus === 'confirmed',
            category: category,
            item_type: 'assignment',
            notes: dueDateStatus === 'pending' ? 'Due date pending - may unlock later' : null
          });

        if (error) {
          console.error(`❌ Error inserting assignment "${assignment.name}":`, error);
        } else {
          console.log(`  ✅ Added: ${studentName} | ${course.name} – ${assignment.name}${accountLabel ? ` (${accountLabel})` : ''}`);
          newAssignments++;
        }
      }
      
      // 5) Process module items
      const moduleAssignments = processModuleItems(modules, course.name, course.id, baseUrl);
      console.log(`   📚 Processing ${moduleAssignments.length} module items`);
      
      for (const moduleItem of moduleAssignments) {
        // Check if module item already exists
        const existingModuleItem = existingAssignments?.find(existing => 
          existing.canvas_id === moduleItem.id
        );
        
        if (existingModuleItem) {
          console.log(`  ✅ Module item already exists: ${moduleItem.name}`);
          continue;
        }
        
        // Use calculated due date if available
        const dueDate = moduleItem.calculated_due_date;
        if (!dueDate) continue;
        
        // Skip if due date is before cutoff
        const dueDateObj = new Date(dueDate);
        const cutoffDate = new Date(ACADEMIC_YEAR_CUTOFF);
        if (dueDateObj < cutoffDate) continue;
        
        // Categorize module item
        const category = categorizeAssignment(moduleItem.name);
        console.log(`  📂 Categorized module item "${moduleItem.name}" as: ${category}`);
        
        // Insert module item as assignment
        const { error } = await supabase
          .from('assignments')
          .insert({
            student_name: studentName,
            title: moduleItem.name,
            course_name: course.name,
            due_date: dueDate,
            canvas_id: moduleItem.id,
            canvas_url: moduleItem.html_url,
            eligible_for_scheduling: category === 'academic',
            category: category,
            item_type: 'module_item',
            module_id: moduleItem.module_id,
            module_position: moduleItem.module_position
          });

        if (error) {
          console.error(`❌ Error inserting module item "${moduleItem.name}":`, error);
        } else {
          console.log(`  ✅ Added module item: ${studentName} | ${course.name} – ${moduleItem.name}${accountLabel ? ` (${accountLabel})` : ''}`);
          newAssignments++;
        }
      }
      
      // 6) Process quizzes  
      console.log(`   🧩 Processing ${quizzes.length} quizzes`);
      let quizzesProcessed = 0;
      let quizzesSkippedNoDueDate = 0;
      let quizzesSkippedOldDate = 0;
      
      for (const quiz of quizzes) {
        quizzesProcessed++;
        
        // Handle quizzes without due dates (like assignments)
        let quizDueDateToUse = null;
        let quizDueDateStatus = 'none';
        
        if (quiz.due_at) {
          const dueDate = new Date(quiz.due_at);
          const cutoffDate = new Date(ACADEMIC_YEAR_CUTOFF);
          
          if (dueDate < cutoffDate) {
            console.log(`  📅 Skipping old quiz: ${quiz.title} (due: ${dueDate.toDateString()})`);
            quizzesSkippedOldDate++;
            continue;
          }
          
          quizDueDateToUse = dueDate.toISOString();
          quizDueDateStatus = 'confirmed';
        } else {
          console.log(`  🧩 Processing quiz without due date: ${quiz.title} (may unlock later)`);
          quizzesSkippedNoDueDate++;
          quizDueDateStatus = 'pending';
        }
        
        // Check if quiz already exists
        const existingQuiz = existingAssignments?.find(existing => 
          existing.canvas_id === `quiz_${quiz.id}`
        );
        
        if (existingQuiz) {
          console.log(`  ✅ Quiz already exists: ${quiz.title}`);
          continue;
        }
        
        // Categorize quiz
        const category = categorizeAssignment(quiz.title);
        console.log(`  📂 Categorized quiz "${quiz.title}" as: ${category} (due_date_status: ${quizDueDateStatus})`);
        
        // Insert quiz as assignment
        const { error } = await supabase
          .from('assignments')
          .insert({
            student_name: studentName,
            title: quiz.title,
            course_name: course.name,
            due_date: quizDueDateToUse,
            canvas_id: `quiz_${quiz.id}`,
            canvas_url: quiz.html_url,
            eligible_for_scheduling: category === 'academic' && quizDueDateStatus === 'confirmed',
            category: category,
            item_type: 'quiz',
            quiz_type: quiz.quiz_type || 'assignment',
            notes: quizDueDateStatus === 'pending' ? 'Due date pending - may unlock later' : null
          });

        if (error) {
          console.error(`❌ Error inserting quiz "${quiz.title}":`, error);
        } else {
          console.log(`  ✅ Added quiz: ${studentName} | ${course.name} – ${quiz.title}${accountLabel ? ` (${accountLabel})` : ''}`);
          newAssignments++;
        }
      }
      
      // Course-level summary logging
      console.log(`   📊 Course "${course.name}" summary:`);
      console.log(`     - Assignments processed: ${assignmentsProcessed || 0}`);
      console.log(`     - Assignments without due dates: ${assignmentsSkippedNoDueDate || 0}`);
      console.log(`     - Assignments skipped (old dates): ${assignmentsSkippedOldDate || 0}`);
      console.log(`     - Module items processed: ${moduleAssignments.length}`);
      console.log(`     - Quizzes processed: ${quizzesProcessed || 0}`);
      console.log(`     - Quizzes without due dates: ${quizzesSkippedNoDueDate || 0}`);
      console.log(`     - Quizzes skipped (old dates): ${quizzesSkippedOldDate || 0}`);
    }

    console.log(`🎉 Sync complete for ${studentName}${accountLabel ? ` (${accountLabel})` : ''}: ${newAssignments} new assignments added`);
    console.log(`📈 Overall Statistics:`);
    console.log(`   - Total courses processed: ${courses.length}`);
    console.log(`   - Total new assignments/items added: ${newAssignments}`);
    console.log(`   - Academic year cutoff: ${ACADEMIC_YEAR_CUTOFF}`);
    
    return { success: true, newAssignments };

  } catch (error) {
    console.error(`💥 Error syncing ${studentName}${accountLabel ? ` (${accountLabel})` : ''}:`, error);
    throw error;
  }
}

async function updateSyncStatus(studentName: string, status: string, message: string, count: number = 0, syncType: string = 'manual') {
  try {
    await supabase
      .from('sync_status')
      .insert({
        student_name: studentName,
        status,
        message,
        assignments_count: count,
        sync_type: syncType
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

  const unauthorized = verifyRequest(req);
  if (unauthorized) return unauthorized;

  try {
    // Handle request body
    let studentName = null;
    let isScheduledRun = false;
    try {
      const body = await req.text();
      console.log(`📝 Request body: "${body}"`);
      if (body.trim()) {
        const parsed = JSON.parse(body);
        studentName = parsed.studentName;
        isScheduledRun = parsed.scheduledRun || false;
      }
    } catch (parseError) {
      console.log(`⚠️ No valid JSON in request body, syncing all students`);
    }
    
    const studentsToSync = studentName ? [studentName] : ['Abigail', 'Khalil'];
    const syncType = isScheduledRun ? 'scheduled' : 'manual';
    const results = {};

    for (const student of studentsToSync) {
      try {
        await updateSyncStatus(student, 'pending', `Starting sync for ${student}`, 0, syncType);
        
        let totalNewAssignments = 0;
        
        if (student === 'Abigail') {
          // Sync from both Canvas accounts for Abigail
          console.log(`🔄 Syncing Abigail from primary Canvas account...`);
          const result1 = await syncStudentAssignments(student, abigailToken, canvasBaseUrl, 'Primary Canvas');
          totalNewAssignments += result1.newAssignments;
          
          console.log(`🔄 Syncing Abigail from secondary Canvas account...`);
          const result2 = await syncStudentAssignments(student, abigailToken2, canvasBaseUrl2, 'Secondary Canvas');
          totalNewAssignments += result2.newAssignments;
          
          results[student] = { success: true, newAssignments: totalNewAssignments };
        } else if (student === 'Khalil') {
          // Sync from single Canvas account for Khalil
          if (!khalilToken) {
            throw new Error(`No Canvas token found for ${student}`);
          }
          const result = await syncStudentAssignments(student, khalilToken, canvasBaseUrl);
          results[student] = result;
          totalNewAssignments = result.newAssignments;
        }
        
        await updateSyncStatus(
          student, 
          'success', 
          `Sync completed successfully`, 
          totalNewAssignments,
          syncType
        );

      } catch (error) {
        console.error(`❌ Sync failed for ${student}:`, error);
        await updateSyncStatus(student, 'error', error.message, 0, syncType);
        results[student] = { success: false, error: error.message };
      }
    }

    // After successful sync, trigger auto-scheduling in the background
    if (Object.values(results).some((r: any) => r.success && r.newAssignments > 0)) {
      console.log(`🤖 Triggering auto-scheduler after successful sync...`);
      
      EdgeRuntime.waitUntil(
        (async () => {
          try {
            const schedulerResponse = await fetch(
              `${supabaseUrl}/functions/v1/auto-scheduler`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
              }
            );
            
            if (schedulerResponse.ok) {
              console.log(`✅ Auto-scheduler triggered successfully`);
            } else {
              console.error(`⚠️ Auto-scheduler trigger failed: ${schedulerResponse.status}`);
            }
          } catch (error) {
            console.error(`❌ Error triggering auto-scheduler:`, error);
          }
        })()
      );
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
