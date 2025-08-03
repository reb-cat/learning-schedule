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

// Academic year cutoff date - only sync assignments due on or after this date
const ACADEMIC_YEAR_CUTOFF = '2025-08-01T00:00:00Z';

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

// Function to extract fees and requirements from text content
function extractAdministrativeRequirements(content: string, courseName: string, source: string): Array<{
  title: string;
  description: string;
  type: string;
  priority: string;
  amount?: number;
  isDayOne?: boolean;
}> {
  if (!content) return [];
  
  const requirements: Array<any> = [];
  const extractedSupplies = new Set<string>(); // Prevent duplicates
  
  // Clean HTML content while preserving structure for better parsing
  const cleanContent = content
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  const contentLower = cleanContent.toLowerCase();
  
  // Extract copy fees
  const copyFeePatterns = [
    /copy\s*fee[s]?\s*[$:]?\s*(\$?\d+(?:\.\d{2})?)/gi,
    /copying\s*cost[s]?\s*[$:]?\s*(\$?\d+(?:\.\d{2})?)/gi,
    /copy\s*charge[s]?\s*[$:]?\s*(\$?\d+(?:\.\d{2})?)/gi,
    /copies?\s*will\s*be\s*(\$?\d+(?:\.\d{2})?)/gi
  ];
  
  copyFeePatterns.forEach(pattern => {
    const matches = cleanContent.matchAll(pattern);
    for (const match of matches) {
      const amount = parseFloat(match[1].replace('$', ''));
      requirements.push({
        title: `Copy Fee - ${courseName}`,
        description: `Copy fee required for ${courseName}: ${match[0]}`,
        type: 'fee',
        priority: 'high',
        amount: amount,
        isDayOne: contentLower.includes('first day') || contentLower.includes('day 1') || contentLower.includes('day one')
      });
    }
  });
  
  // Helper function to validate and parse a supply item
  function validateAndParseSupplyItem(text: string): {title: string; description: string; priority: string; normalizedTitle: string} | null {
    if (!text || text.length < 5 || text.length > 200) return null;
    
    const cleanText = text.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
    const lowerText = cleanText.toLowerCase();
    
    // Quality filters - must be meaningful content
    if (cleanText.split(/\s+/).length < 2) return null; // At least 2 words
    if (/^[^a-zA-Z]*$/.test(cleanText)) return null; // Must contain letters
    if (/^\d+$/.test(cleanText)) return null; // Not just numbers
    
    // Must contain actual supply keywords (not just any keywords)
    const coreSupplyKeywords = [
      'notebook', 'binder', 'folder', 'paper', 'pencil', 'pen', 'eraser', 'ruler',
      'calculator', 'highlighter', 'marker', 'scissors', 'glue', 'tape', 'stapler',
      'divider', 'tab', 'sleeve', 'protector', 'composition', 'spiral', 'loose-leaf',
      'index card', 'sticky note', 'post-it', 'flash card', 'workbook', 'textbook',
      'supplies', 'materials', 'pens', 'pencils', 'erasers', 'notebooks', 'binders'
    ];
    
    const hasCoreSupplyKeyword = coreSupplyKeywords.some(keyword => lowerText.includes(keyword));
    if (!hasCoreSupplyKeyword) return null;
    
    // Strong exclusion filters for common false positives
    const excludePatterns = [
      /^[a-z]+:\s*$/i, // Just "Name:" patterns
      /grading|grade[ds]?|assignment|homework|test|exam|quiz/i,
      /attendance|policy|contact|email|phone|office hours/i,
      /will be|you will|students will|please note|important/i,
      /^\w+\s*$/, // Single words
      /^(and|or|the|a|an|in|on|at|to|for|of|with|by)\s/i, // Starting with articles/prepositions
      /book\s*title|author|chapter|page|isbn/i, // Book-related non-supplies
      /\$\d+|\d+\s*dollars?/i // Contains prices (likely fees, not supplies)
    ];
    
    const hasExcludePattern = excludePatterns.some(pattern => pattern.test(cleanText));
    if (hasExcludePattern) return null;
    
    // Extract meaningful title
    let title = cleanText;
    
    // Handle quantity patterns properly
    const quantityMatch = cleanText.match(/^(\d+(?:[-\s]?(?:inch|ring|tab|hole|page|sheet|pack|box|set|subject))?)\s+(.+)/i);
    if (quantityMatch) {
      const quantity = quantityMatch[1].trim();
      const item = quantityMatch[2].split(/[,;]/)[0].trim();
      title = `${quantity} ${item}`;
    } else {
      // Take the main part before any additional descriptions
      title = cleanText.split(/[,;\.]/)[0].trim();
    }
    
    // Clean and limit title length
    if (title.length > 60) {
      const words = title.split(/\s+/);
      title = words.slice(0, 8).join(' ');
    }
    
    // Determine priority
    const priority = (lowerText.includes('required') || lowerText.includes('must') || lowerText.includes('need')) ? 'high' :
                    (lowerText.includes('optional') || lowerText.includes('suggested') || lowerText.includes('recommend')) ? 'low' : 'medium';
    
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    
    return {
      title: title,
      description: cleanText.length > title.length + 10 ? cleanText : title,
      priority: priority,
      normalizedTitle: normalizedTitle
    };
  }
  
  // Extract supplies - prioritize structured content
  
  // 1. First, extract from HTML lists (most reliable structure)
  const htmlListMatches = cleanContent.match(/<(?:ul|ol)[^>]*>(.*?)<\/(?:ul|ol)>/gis);
  if (htmlListMatches) {
    htmlListMatches.forEach(listHtml => {
      // Only process lists that contain supply-related content
      if (/(?:supplies?|materials?|bring|need|required|notebook|pencil|binder|folder|paper|calculator)/i.test(listHtml)) {
        const listItems = listHtml.match(/<li[^>]*>(.*?)<\/li>/gis);
        if (listItems) {
          listItems.forEach(li => {
            const text = li.replace(/<[^>]+>/g, '').trim();
            const validatedSupply = validateAndParseSupplyItem(text);
            if (validatedSupply && !extractedSupplies.has(validatedSupply.normalizedTitle)) {
              extractedSupplies.add(validatedSupply.normalizedTitle);
              requirements.push({
                title: validatedSupply.title,
                description: validatedSupply.description,
                type: 'supplies',
                priority: validatedSupply.priority,
                isDayOne: contentLower.includes('first day') || contentLower.includes('day 1') || contentLower.includes('day one')
              });
            }
          });
        }
      }
    });
  }
  
  // 2. Extract from clear supply sections with proper boundaries
  const supplySectionPatterns = [
    // Look for dedicated supply sections
    /(?:supplies?\s+(?:needed|required|list)|materials?\s+(?:needed|required|list)|bring\s+to\s+class)\s*:?\s*(.*?)(?=\n\s*(?:[A-Z][^:\n]*:|grading|attendance|homework|assignment|contact|syllabus|course\s+description)|$)/gis,
    // Look for "students need" or "you will need" sections
    /(?:students?\s+(?:will\s+)?need|you\s+(?:will\s+)?need|required\s+materials?)\s*:?\s*(.*?)(?=\n\s*(?:[A-Z][^:\n]*:|grading|attendance|homework|assignment|contact)|$)/gis
  ];
  
  supplySectionPatterns.forEach(pattern => {
    const matches = [...cleanContent.matchAll(pattern)];
    matches.forEach(match => {
      const sectionText = match[1];
      if (!sectionText || sectionText.length < 10) return;
      
      // Remove HTML tags from section for processing
      const cleanSection = sectionText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Look for structured list patterns within the section
      const listPatterns = [
        /(?:^|\n)\s*[-•*]\s*([^\n]+)/gm,  // Bullet points
        /(?:^|\n)\s*\d+\.\s*([^\n]+)/gm,  // Numbered lists
        /(?:^|\n)\s*[a-z]\)\s*([^\n]+)/gm, // Lettered lists
        /(?:^|\n)\s*([A-Za-z][^:\n]{10,}?)(?=\n|$)/gm // Plain lines that look like supplies
      ];
      
      listPatterns.forEach(listPattern => {
        const listMatches = [...cleanSection.matchAll(listPattern)];
        listMatches.forEach(listMatch => {
          const text = listMatch[1].trim();
          const validatedSupply = validateAndParseSupplyItem(text);
          if (validatedSupply && !extractedSupplies.has(validatedSupply.normalizedTitle)) {
            extractedSupplies.add(validatedSupply.normalizedTitle);
            requirements.push({
              title: validatedSupply.title,
              description: validatedSupply.description,
              type: 'supplies',
              priority: validatedSupply.priority,
              isDayOne: contentLower.includes('first day') || contentLower.includes('day 1') || contentLower.includes('day one')
            });
          }
        });
      });
    });
  });
  
  // Extract forms and permissions
  const formPatterns = [
    /(?:permission\s+)?(?:form|slip)[s]?\s+(?:required|needed|must\s+be\s+(?:signed|returned))/gi,
    /(?:medical|emergency)\s+(?:form|information)\s+(?:required|needed)/gi,
    /field\s+trip\s+(?:permission|form)/gi
  ];
  
  formPatterns.forEach(pattern => {
    const matches = cleanContent.matchAll(pattern);
    for (const match of matches) {
      requirements.push({
        title: `Form Required - ${courseName}`,
        description: `Administrative form needed for ${courseName}: ${match[0]}`,
        type: 'form',
        priority: 'high',
        isDayOne: contentLower.includes('first day') || contentLower.includes('day 1') || contentLower.includes('day one')
      });
    }
  });
  
  return requirements;
}

// Function to fetch and parse course syllabi
async function fetchCourseSyllabus(courseId: string, token: string): Promise<string> {
  try {
    const response = await fetch(
      `${canvasBaseUrl}/api/v1/courses/${courseId}?include[]=syllabus_body`,
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
async function fetchCourseAnnouncements(courseId: string, token: string): Promise<string> {
  try {
    const response = await fetch(
      `${canvasBaseUrl}/api/v1/announcements?context_codes[]=course_${courseId}&per_page=10&active_only=true`,
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
async function fetchCoursePages(courseId: string, token: string): Promise<string> {
  try {
    const response = await fetch(
      `${canvasBaseUrl}/api/v1/courses/${courseId}/pages?per_page=20&published=true`,
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
          `${canvasBaseUrl}/api/v1/courses/${courseId}/pages/${page.url}`,
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

async function syncStudentAssignments(studentName: string, token: string) {
  console.log(`🔄 Starting sync for ${studentName}...`);
  
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
      
      // Fetch additional course content for administrative requirements
      console.log(`   🔍 Fetching syllabi, announcements, and pages for ${course.name}...`);
      const [syllabusContent, announcementsContent, pagesContent] = await Promise.all([
        fetchCourseSyllabus(course.id, token),
        fetchCourseAnnouncements(course.id, token),
        fetchCoursePages(course.id, token)
      ]);
      
      // Extract administrative requirements from all content sources
      const allContent = `${syllabusContent}\n\n${announcementsContent}\n\n${pagesContent}`;
      const adminRequirements = extractAdministrativeRequirements(allContent, course.name, 'course_content');
      
      // Insert administrative requirements as notifications
      for (const req of adminRequirements) {
        console.log(`   📋 Found ${req.type}: ${req.title}${req.isDayOne ? ' (Day 1)' : ''}`);
        
        const { error: adminError } = await supabase
          .from('administrative_notifications')
          .insert({
            student_name: studentName,
            title: req.title,
            description: req.description,
            notification_type: req.type,
            priority: req.isDayOne ? 'high' : req.priority,
            course_name: course.name,
            amount: req.amount || null
          });
          
        if (adminError) {
          console.error(`❌ Error inserting administrative requirement "${req.title}":`, adminError);
        } else {
          console.log(`   ✅ Added administrative requirement: ${req.title}`);
        }
      }
      
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
        
        // Skip assignments due before the academic year cutoff
        const dueDate = new Date(assignment.due_at);
        const cutoffDate = new Date(ACADEMIC_YEAR_CUTOFF);
        if (dueDate < cutoffDate) {
          console.log(`  📅 Skipping old assignment: ${assignment.name} (due: ${dueDate.toDateString()})`);
          continue;
        }
        
        // Check if assignment already exists
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

        // Format due date
        const dueDateISO = dueDate.toISOString();

        // Categorize assignment
        const category = categorizeAssignment(assignment.name);
        console.log(`  📂 Categorized "${assignment.name}" as: ${category}`);

        // Insert new assignment
        const { error } = await supabase
          .from('assignments')
          .insert({
            student_name: studentName,
            title: assignment.name,
            course_name: course.name,
            due_date: dueDateISO,
            canvas_id: assignment.id?.toString(),
            canvas_url: assignment.html_url,
            eligible_for_scheduling: category === 'academic', // Only academic assignments are eligible for scheduling
            category: category
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
    // Handle empty request body
    let studentName = null;
    try {
      const body = await req.text();
      console.log(`📝 Request body: "${body}"`);
      if (body.trim()) {
        const parsed = JSON.parse(body);
        studentName = parsed.studentName;
      }
    } catch (parseError) {
      console.log(`⚠️ No valid JSON in request body, syncing all students`);
    }
    
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