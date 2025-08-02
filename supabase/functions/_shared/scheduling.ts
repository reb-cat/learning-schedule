// Shared scheduling logic for edge functions
export async function scheduleAssignments(supabase: any, studentName: string): Promise<number> {
  try {
    // Get today's date
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[dayOfWeek];
    
    // Skip scheduling on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`Skipping scheduling for ${studentName} - weekend`);
      return 0;
    }
    
    // Clear any existing scheduled blocks for today
    await supabase
      .from('assignments')
      .update({
        scheduled_block: null,
        scheduled_date: null,
        scheduled_day: null
      })
      .eq('student_name', studentName)
      .eq('scheduled_date', today.toISOString().split('T')[0]);
    
    // Get unscheduled assignments, prioritized (only academic assignments)
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('student_name', studentName)
      .eq('category', 'academic') // Only schedule academic assignments
      .is('scheduled_block', null)
      .order('urgency', { ascending: false }) // overdue first
      .order('due_date', { ascending: true }); // then by due date
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!assignments || assignments.length === 0) {
      console.log(`No assignments to schedule for ${studentName}`);
      return 0;
    }
    
    console.log(`Scheduling ${assignments.length} assignments for ${studentName}`);
    
    // Define available assignment blocks (2-8, skipping lunch block 5)
    const availableBlocks = [2, 3, 4, 6, 7, 8];
    const scheduledBlocks = new Set();
    
    // Student-specific accommodations
    const accommodations = getStudentAccommodations(studentName);
    
    // Track cognitive load per block
    const blockCognitiveLoads = new Map();
    let heavyBlocksBeforeLunch = 0;
    let scheduledCount = 0;
    
    // Always try to put Math in Block 2 first
    const mathAssignment = assignments.find(a => a.subject === 'Math' && !scheduledBlocks.has(2));
    if (mathAssignment && availableBlocks.includes(2)) {
      await scheduleAssignment(supabase, mathAssignment, 2, today, currentDay);
      scheduledBlocks.add(2);
      blockCognitiveLoads.set(2, mathAssignment.cognitive_load);
      if (mathAssignment.cognitive_load === 'heavy') heavyBlocksBeforeLunch++;
      scheduledCount++;
      console.log(`✓ Scheduled Math in Block 2: ${mathAssignment.title}`);
    }
    
    // Schedule remaining assignments
    for (const assignment of assignments) {
      if (assignment.scheduled_block) continue; // Already scheduled
      if (scheduledCount >= availableBlocks.length) break; // No more blocks
      
      const bestBlock = findBestBlock(
        assignment,
        availableBlocks,
        scheduledBlocks,
        blockCognitiveLoads,
        accommodations,
        heavyBlocksBeforeLunch
      );
      
      if (bestBlock) {
        await scheduleAssignment(supabase, assignment, bestBlock, today, currentDay);
        scheduledBlocks.add(bestBlock);
        blockCognitiveLoads.set(bestBlock, assignment.cognitive_load);
        
        if (assignment.cognitive_load === 'heavy' && bestBlock < 5) {
          heavyBlocksBeforeLunch++;
        }
        
        scheduledCount++;
        console.log(`✓ Scheduled ${assignment.subject} in Block ${bestBlock}: ${assignment.title}`);
      }
    }
    
    console.log(`Scheduled ${scheduledCount} assignments for ${studentName} on ${currentDay}`);
    return scheduledCount;
    
  } catch (error) {
    console.error(`Error scheduling assignments for ${studentName}:`, error);
    throw error;
  }
}

function getStudentAccommodations(studentName: string) {
  const accommodations = {
    'Abigail': {
      readingLoad: 'medium',
      preferredReadingBlocks: [2, 3, 4],
      maxReadingBlocksPerDay: 2
    },
    'Khalil': {
      maxBlockLength: 40,
      requiresTransitionBuffer: true,
      preferredStructure: 'predictable'
    }
  };
  
  return accommodations[studentName] || {};
}

function findBestBlock(
  assignment: any,
  availableBlocks: number[],
  scheduledBlocks: Set<number>,
  blockCognitiveLoads: Map<number, string>,
  accommodations: any,
  heavyBlocksBeforeLunch: number
): number | null {
  
  const unscheduledBlocks = availableBlocks.filter(block => !scheduledBlocks.has(block));
  
  for (const block of unscheduledBlocks) {
    // Check cognitive load constraints
    if (assignment.cognitive_load === 'heavy') {
      // Max 2 heavy blocks before lunch (blocks 2-4)
      if (block < 5 && heavyBlocksBeforeLunch >= 2) continue;
      
      // No consecutive heavy cognitive loads
      const prevBlock = block - 1;
      const nextBlock = block + 1;
      if (blockCognitiveLoads.get(prevBlock) === 'heavy' || 
          blockCognitiveLoads.get(nextBlock) === 'heavy') continue;
    }
    
    // Student-specific accommodations
    if (accommodations.preferredReadingBlocks && 
        assignment.subject === 'Language Arts' &&
        !accommodations.preferredReadingBlocks.includes(block)) {
      // Try to find a preferred block first, but allow fallback
      const preferredAvailable = accommodations.preferredReadingBlocks
        .find(b => unscheduledBlocks.includes(b));
      if (preferredAvailable) continue;
    }
    
    // Avoid same subject in consecutive blocks
    const prevSubject = getScheduledSubject(blockCognitiveLoads, block - 1);
    const nextSubject = getScheduledSubject(blockCognitiveLoads, block + 1);
    if (prevSubject === assignment.subject || nextSubject === assignment.subject) continue;
    
    return block;
  }
  
  // Fallback: return first available block if no optimal found
  return unscheduledBlocks[0] || null;
}

function getScheduledSubject(blockCognitiveLoads: Map<number, string>, block: number): string | null {
  // This would need to be enhanced to track subjects per block
  // For now, just return null as we're focusing on cognitive load
  return null;
}

async function scheduleAssignment(
  supabase: any,
  assignment: any,
  block: number,
  date: Date,
  day: string
) {
  const { error } = await supabase
    .from('assignments')
    .update({
      scheduled_block: block,
      scheduled_date: date.toISOString().split('T')[0],
      scheduled_day: day
    })
    .eq('id', assignment.id);
    
  if (error) {
    throw new Error(`Error scheduling assignment: ${error.message}`);
  }
}