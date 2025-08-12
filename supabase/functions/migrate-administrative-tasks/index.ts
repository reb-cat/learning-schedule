import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
}

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const unauthorized = verifyRequest(req);
  if (unauthorized) return unauthorized;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' },
    });

    console.log('Starting administrative task migration...');

    // Fetch all administrative assignments that need migration
    const { data: adminAssignments, error: fetchError } = await supabase
      .from('assignments')
      .select('*')
      .or('category.eq.administrative,task_type.eq.administrative')
      .eq('eligible_for_scheduling', true);

    if (fetchError) {
      console.error('Error fetching administrative assignments:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${adminAssignments?.length || 0} administrative assignments to migrate`);

    if (!adminAssignments || adminAssignments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No administrative assignments found to migrate',
          migratedCount: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    let migratedCount = 0;
    let errors: string[] = [];

    // Process each administrative assignment
    for (const assignment of adminAssignments) {
      try {
        // Determine notification type based on title
        const notificationType = assignment.title.toLowerCase().includes('fee') ? 'fees' : 'forms';
        
        // Extract amount if it's a fee
        let amount = null;
        if (notificationType === 'fees') {
          // Try to extract amount from title (basic extraction)
          const amountMatch = assignment.title.match(/\$?(\d+(?:\.\d{2})?)/);
          if (amountMatch) {
            amount = parseFloat(amountMatch[1]);
          }
        }

        // Create administrative notification
        const { error: insertError } = await supabase
          .from('administrative_notifications')
          .insert({
            student_name: assignment.student_name,
            title: assignment.title,
            description: `Migrated from ${assignment.course_name || 'assignments'}`,
            notification_type: notificationType,
            priority: assignment.priority || 'medium',
            due_date: assignment.due_date,
            amount: amount,
            canvas_id: assignment.canvas_id,
            canvas_url: assignment.canvas_url,
            course_name: assignment.course_name,
            completed: false
          });

        if (insertError) {
          console.error(`Error inserting notification for assignment ${assignment.id}:`, insertError);
          errors.push(`Failed to migrate ${assignment.title}: ${insertError.message}`);
          continue;
        }

        // Mark original assignment as not eligible for scheduling
        const { error: updateError } = await supabase
          .from('assignments')
          .update({ 
            eligible_for_scheduling: false,
            notes: `Migrated to administrative_notifications on ${new Date().toISOString()}`
          })
          .eq('id', assignment.id);

        if (updateError) {
          console.error(`Error updating assignment ${assignment.id}:`, updateError);
          errors.push(`Failed to update original assignment ${assignment.title}: ${updateError.message}`);
          continue;
        }

        migratedCount++;
        console.log(`Successfully migrated: ${assignment.title} for ${assignment.student_name}`);

      } catch (error) {
        console.error(`Error processing assignment ${assignment.id}:`, error);
        errors.push(`Error processing ${assignment.title}: ${error.message}`);
      }
    }

    console.log(`Migration completed. Migrated: ${migratedCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully migrated ${migratedCount} administrative tasks`,
        migratedCount,
        totalFound: adminAssignments.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Migration failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Administrative task migration failed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
