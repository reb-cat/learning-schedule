import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { studentName, daysToCreate = 7 } = await req.json()

    if (!studentName) {
      throw new Error('Student name is required')
    }

    // Find the last Bible assignment for this student to determine where to continue
    const { data: lastAssignment } = await supabase
      .from('assignments')
      .select('notes')
      .eq('student_name', studentName)
      .eq('subject', 'Bible')
      .not('notes', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    // Extract the reading number from the last assignment's notes, or start from 1
    let startingIndex = 1;
    if (lastAssignment && lastAssignment.length > 0) {
      const notesMatch = lastAssignment[0].notes?.match(/Reading #(\d+)/);
      if (notesMatch) {
        startingIndex = parseInt(notesMatch[1]) + 1;
      }
    }

    // Fetch the next sequential readings from curriculum
    const { data: curriculumData, error: fetchError } = await supabase
      .from('bible_curriculum')
      .select('*')
      .order('week_number, day_of_week')
      .range(startingIndex - 1, startingIndex + daysToCreate - 1);

    if (fetchError) {
      throw fetchError;
    }

    if (!curriculumData || curriculumData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: `No more Bible curriculum found starting from reading #${startingIndex}` 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const assignments = [];
    const today = new Date();
    
    // Track current memory verse for daily repetition
    let currentMemoryVerse = null;

    curriculumData.forEach((item: any, index: number) => {
      const assignmentDate = new Date(today);
      assignmentDate.setDate(today.getDate() + index + 1); // Start tomorrow
      
      const readingNumber = startingIndex + index;
      
      // Create the daily reading assignment
      assignments.push({
        student_name: studentName,
        title: item.reading_title || `Bible Reading #${readingNumber}`,
        course_name: 'Bible',
        subject: 'Bible',
        assignment_type: 'academic',
        category: 'academic',
        task_type: 'academic',
        source: 'manual',
        estimated_time_minutes: 25,
        estimated_blocks_needed: 1,
        scheduling_priority: 3,
        due_date: assignmentDate.toISOString(),
        available_on: assignmentDate.toISOString().split('T')[0],
        completion_status: 'not_started',
        progress_percentage: 0,
        time_spent_minutes: 0,
        notes: `Bible Reading #${readingNumber}: ${item.reading_type || 'Daily Reading'}`,
        eligible_for_scheduling: true,
        is_fixed: false
      });

      // If this item has a memory verse, update our current memory verse
      if (item.reading_type === 'memory_verse' && item.reading_title) {
        currentMemoryVerse = item.reading_title;
      }

      // Add daily memory verse practice if we have one
      if (currentMemoryVerse) {
        assignments.push({
          student_name: studentName,
          title: `Memory Verse Practice: ${currentMemoryVerse}`,
          course_name: 'Bible',
          subject: 'Bible',
          assignment_type: 'academic',
          category: 'academic',
          task_type: 'academic',
          source: 'manual',
          estimated_time_minutes: 10,
          estimated_blocks_needed: 1,
          scheduling_priority: 3,
          due_date: assignmentDate.toISOString(),
          available_on: assignmentDate.toISOString().split('T')[0],
          completion_status: 'not_started',
          progress_percentage: 0,
          time_spent_minutes: 0,
          notes: `Daily practice for memory verse: ${currentMemoryVerse}`,
          eligible_for_scheduling: true,
          is_fixed: false
        });
      }
    });

    // Insert assignments into database
    const { error: insertError } = await supabase
      .from('assignments')
      .insert(assignments);

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        assignmentsCreated: assignments.length,
        startingFromReading: startingIndex,
        memoryVerseIncluded: currentMemoryVerse !== null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Bible assignments:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})