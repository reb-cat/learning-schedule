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

    const { studentName, weekNumber } = await req.json()

    if (!studentName) {
      throw new Error('Student name is required')
    }

    // Calculate current week if not provided
    const currentWeek = weekNumber || (() => {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const now = new Date();
      const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      return Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
    })();

    // Get next Monday
    const getNextMonday = () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      return nextMonday;
    };

    // Fetch Bible curriculum for this week
    const { data: curriculumData, error: fetchError } = await supabase
      .from('bible_curriculum')
      .select('*')
      .eq('week_number', currentWeek)
      .order('day_of_week');

    if (fetchError) {
      throw fetchError;
    }

    if (!curriculumData || curriculumData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: `No Bible curriculum found for week ${currentWeek}. Try a different week.` 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const startDate = getNextMonday();

    // Create assignments for each day
    const assignments = curriculumData.map((item: any, index: number) => {
      const assignmentDate = new Date(startDate);
      assignmentDate.setDate(startDate.getDate() + index);
      
      return {
        student_name: studentName,
        title: item.reading_title || `Week ${currentWeek} Bible Reading`,
        course_name: 'Bible',
        subject: 'Bible',
        assignment_type: 'reading',
        category: 'academic',
        task_type: 'academic',
        source: 'curriculum',
        estimated_time_minutes: 30,
        estimated_blocks_needed: 1,
        scheduling_priority: 3,
        due_date: assignmentDate.toISOString(),
        available_on: assignmentDate.toISOString().split('T')[0],
        completion_status: 'not_started',
        progress_percentage: 0,
        time_spent_minutes: 0,
        notes: `Week ${currentWeek}, Day ${item.day_of_week}: ${item.reading_type || 'Daily Reading'}`,
        eligible_for_scheduling: true,
        is_fixed: false
      };
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
        weekNumber: currentWeek
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