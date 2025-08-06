import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { assignmentIds } = await req.json()

    if (!assignmentIds || !Array.isArray(assignmentIds)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing assignmentIds array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Clearing scheduling for assignments:', assignmentIds)

    const { data, error } = await supabase
      .from('assignments')
      .update({ 
        scheduled_date: null, 
        scheduled_block: null, 
        scheduled_day: null 
      })
      .in('id', assignmentIds)
      .select('id, title')

    if (error) {
      console.error('Error clearing scheduling:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Successfully cleared scheduling for:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        clearedAssignments: data?.length || 0,
        assignments: data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})