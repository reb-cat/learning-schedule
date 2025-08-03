import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    console.log('Creating manual assignment:', requestData);

    // Transform and validate the data before inserting
    const transformedData = requestData.map((assignment: any) => ({
      ...assignment,
      // Ensure due_date is properly formatted for timestamp with time zone
      due_date: assignment.due_date ? new Date(assignment.due_date).toISOString() : null,
      // Set proper defaults for database constraints
      eligible_for_scheduling: true,
      estimated_blocks_needed: 1,
      scheduling_priority: 5,
      is_split_assignment: false,
      split_part_number: 1,
      total_split_parts: 1,
      block_position: 1,
      buffer_time_minutes: 0,
      // Set task_type based on assignment_type if not provided
      task_type: assignment.task_type || (assignment.assignment_type === 'volunteer_events' ? 'volunteer' : 'academic')
    }));

    // Insert the assignment(s) using service role permissions
    console.log('About to insert assignments:', JSON.stringify(transformedData, null, 2));
    
    const { data, error } = await supabase
      .from('assignments')
      .insert(transformedData)
      .select();

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('Successfully created assignment(s):', data);

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      message: 'Assignment(s) created successfully' 
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
});