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
    console.log('Raw request data:', JSON.stringify(requestData, null, 2));

    // Create a minimal valid assignment for testing
    const minimalAssignment = {
      student_name: requestData[0]?.student_name || 'Test Student',
      title: requestData[0]?.title || 'Test Assignment',
      source: 'manual',
      category: 'academic',
      assignment_type: 'life_skills',
      priority: 'medium'
    };

    console.log('Inserting minimal assignment:', JSON.stringify(minimalAssignment, null, 2));

    const { data, error } = await supabase
      .from('assignments')
      .insert([minimalAssignment])
      .select();

    if (error) {
      console.error('Database error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('Successfully created assignment:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      assignment: data[0], // Return the created assignment for immediate use
      message: 'Assignment created successfully' 
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
      error: error.message || 'Unknown error',
      details: error.details || null
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
});