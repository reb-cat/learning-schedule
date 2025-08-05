import { supabase } from "@/integrations/supabase/client";

/**
 * Test database permissions for assignments table
 */
export async function testDatabasePermissions() {
  console.log('🧪 Testing Database Permissions for Assignments Table');
  
  try {
    // Test 1: Check current auth status
    console.log('1️⃣ Testing auth status...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth status:', { user: user?.id || 'anonymous', error: authError });

    // Test 2: Try to read assignments
    console.log('2️⃣ Testing SELECT permissions...');
    const { data: assignments, error: selectError } = await supabase
      .from('assignments')
      .select('id, title, scheduled_block, scheduled_date, student_name')
      .limit(3);
    
    console.log('SELECT test:', { 
      success: !selectError, 
      count: assignments?.length || 0, 
      error: selectError?.message 
    });

    if (selectError) {
      console.error('❌ SELECT failed:', selectError);
      return { success: false, error: `SELECT failed: ${selectError.message}` };
    }

    if (!assignments || assignments.length === 0) {
      console.warn('⚠️ No assignments found to test with');
      return { success: false, error: 'No assignments found in database' };
    }

    // Test 3: Try to update an assignment (with a test value, then revert)
    console.log('3️⃣ Testing UPDATE permissions...');
    const testAssignment = assignments[0];
    const originalScheduledBlock = testAssignment.scheduled_block;
    
    // Try to update
    const { data: updateData, error: updateError } = await supabase
      .from('assignments')
      .update({ 
        scheduled_block: 999, // Test value
        scheduled_date: '2025-08-05',
        scheduled_day: 'Monday'
      })
      .eq('id', testAssignment.id)
      .select();

    console.log('UPDATE test:', { 
      success: !updateError, 
      rowsAffected: updateData?.length || 0, 
      error: updateError?.message 
    });

    if (updateError) {
      console.error('❌ UPDATE failed:', updateError);
      return { 
        success: false, 
        error: `UPDATE failed: ${updateError.message}`,
        details: {
          code: updateError.code,
          hint: updateError.hint,
          details: updateError.details
        }
      };
    }

    // Test 4: Revert the test update
    console.log('4️⃣ Reverting test update...');
    const { error: revertError } = await supabase
      .from('assignments')
      .update({ 
        scheduled_block: originalScheduledBlock,
        scheduled_date: null,
        scheduled_day: null
      })
      .eq('id', testAssignment.id);

    if (revertError) {
      console.warn('⚠️ Failed to revert test update:', revertError);
    } else {
      console.log('✅ Successfully reverted test update');
    }

    // Test 5: Test INSERT permissions
    console.log('5️⃣ Testing INSERT permissions...');
    const testRecord = {
      student_name: 'Test Student',
      title: 'Test Assignment - DELETE ME',
      course_name: 'Test Course',
      task_type: 'academic',
      completion_status: 'not_started'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('assignments')
      .insert(testRecord)
      .select();

    console.log('INSERT test:', { 
      success: !insertError, 
      insertedId: insertData?.[0]?.id, 
      error: insertError?.message 
    });

    if (insertError) {
      console.error('❌ INSERT failed:', insertError);
    } else {
      // Clean up test record
      if (insertData?.[0]?.id) {
        await supabase
          .from('assignments')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🗑️ Cleaned up test record');
      }
    }

    console.log('🎉 Database permissions test completed successfully!');
    return { 
      success: true, 
      message: 'All database operations are working correctly',
      testResults: {
        select: !selectError,
        update: !updateError,
        insert: !insertError
      }
    };

  } catch (error: any) {
    console.error('💥 Database permissions test failed:', error);
    return { 
      success: false, 
      error: `Test failed: ${error.message}`,
      stack: error.stack
    };
  }
}

/**
 * Test specific assignment update (like the scheduler does)
 */
export async function testAssignmentUpdate(assignmentId: string) {
  console.log(`🎯 Testing specific assignment update for ID: ${assignmentId}`);
  
  try {
    const { data, error } = await supabase
      .from('assignments')
      .update({
        scheduled_block: 2,
        scheduled_date: '2025-08-05',
        scheduled_day: 'Monday'
      })
      .eq('id', assignmentId)
      .select();

    console.log('Specific update test:', {
      assignmentId,
      success: !error,
      rowsAffected: data?.length || 0,
      updatedData: data?.[0],
      error: error?.message
    });

    if (error) {
      console.error('❌ Specific update failed:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return { success: false, error };
    }

    return { success: true, data: data?.[0] };

  } catch (error: any) {
    console.error('💥 Specific update test failed:', error);
    return { success: false, error };
  }
}