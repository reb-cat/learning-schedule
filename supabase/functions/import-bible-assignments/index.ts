import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Bible curriculum data
const bibleData = [
  { week: 1, reading1: "Genesis 1-2", reading2: "Genesis 3-4", reading3: "Genesis 6-7", reading4: "Genesis 8-9", reading5: "Job 1-2", memoryVerses: "", notes: "Discuss a Bible memory plan with your group." },
  { week: 2, reading1: "Job 38-39", reading2: "Job 40-42", reading3: "Genesis 11-12", reading4: "Genesis 15", reading5: "Genesis 16-17", memoryVerses: "", notes: "Discuss a Bible memory plan with your group." },
  { week: 3, reading1: "Genesis 18-19", reading2: "Genesis 20-21", reading3: "Genesis 22", reading4: "Genesis 24", reading5: "Genesis 25:19-34; 26", memoryVerses: "Psalm 23:1-3", notes: "" },
  { week: 4, reading1: "Genesis 27-28", reading2: "Genesis 29-30:24", reading3: "Genesis 31-32", reading4: "Genesis 33 & 35", reading5: "Genesis 37", memoryVerses: "Psalm 23:1-3", notes: "" },
  { week: 5, reading1: "Genesis 39-40", reading2: "Genesis 41", reading3: "Genesis 42-43", reading4: "Genesis 44-45", reading5: "Genesis 46-47", memoryVerses: "Psalm 23:1-3", notes: "" },
  { week: 6, reading1: "Genesis 48-49", reading2: "Genesis 50–Exodus 1", reading3: "Exodus 2-3", reading4: "Exodus 4-5", reading5: "Exodus 6-7", memoryVerses: "Psalm 23:1-3", notes: "" },
  { week: 7, reading1: "Exodus 8-9", reading2: "Exodus 10-11", reading3: "Exodus 12", reading4: "Exodus 13:17-14", reading5: "Exodus 16-17", memoryVerses: "Psalm 23:4-6", notes: "" },
  { week: 8, reading1: "Exodus 19-20", reading2: "Exodus 24-25", reading3: "Exodus 26-27", reading4: "Exodus 28-29", reading5: "Exodus 30-31", memoryVerses: "Psalm 23:4-6", notes: "" },
  { week: 9, reading1: "Exodus 32-33", reading2: "Exodus 34-36:1", reading3: "Exodus 40", reading4: "Leviticus 8-9", reading5: "Leviticus 16-17", memoryVerses: "Psalm 23:4-6", notes: "" },
  { week: 10, reading1: "Leviticus 23", reading2: "Leviticus 26", reading3: "Numbers 11-12", reading4: "Numbers 13-14", reading5: "Numbers 16-17", memoryVerses: "Psalm 23:4-6", notes: "" },
  { week: 11, reading1: "Numbers 20; 27:12-23", reading2: "Numbers 34-35", reading3: "Deuteronomy 1-2", reading4: "Deuteronomy 3-4", reading5: "Deuteronomy 6-7", memoryVerses: "Matthew 5:3-6", notes: "" },
  { week: 12, reading1: "Deuteronomy 8-9", reading2: "Deuteronomy 30-31", reading3: "Deuteronomy 32:48-52; 34", reading4: "Joshua 1-2", reading5: "Joshua 3-4", memoryVerses: "Matthew 5:3-6", notes: "" },
  { week: 13, reading1: "Joshua 5:10-15; 6", reading2: "Joshua 7-8", reading3: "Joshua 23-24", reading4: "Judges 2-3", reading5: "Judges 4", memoryVerses: "Matthew 5:3-6", notes: "" },
  { week: 14, reading1: "Judges 6-7", reading2: "Judges 13-14", reading3: "Judges 15-16", reading4: "Ruth 1-2", reading5: "Ruth 3-4", memoryVerses: "Matthew 5:3-6", notes: "" },
  { week: 15, reading1: "1 Samuel 1-2", reading2: "1 Samuel 3; 8", reading3: "1 Samuel 9-10", reading4: "1 Samuel 13-14", reading5: "1 Samuel 15-16", memoryVerses: "Matthew 5:7-10", notes: "" },
  { week: 16, reading1: "1 Samuel 17-18", reading2: "1 Samuel 19-20", reading3: "1 Samuel 21-22", reading4: "Psalm 22; 1 Samuel 24-25:1", reading5: "1 Samuel 28; 31", memoryVerses: "Matthew 5:7-10", notes: "" },
  { week: 17, reading1: "2 Samuel 1; 2:1-7", reading2: "2 Samuel 3:1; 5; Psalm 23", reading3: "2 Samuel 6-7", reading4: "Psalm 18; 2 Samuel 9", reading5: "2 Samuel 11-12", memoryVerses: "Matthew 5:7-10", notes: "" },
  { week: 18, reading1: "Psalm 51", reading2: "2 Samuel 24; Psalm 24", reading3: "Psalms 1; 19", reading4: "Psalms 103; 119:1-48", reading5: "Psalm 119:49-128", memoryVerses: "Matthew 5:7-10", notes: "" },
  { week: 19, reading1: "Psalms 119:129-176; 139", reading2: "Psalms 148-150", reading3: "1 Kings 2", reading4: "1 Kings 3; 6", reading5: "1 Kings 8; 9:1-9", memoryVerses: "1 Corinthians 13:4-7", notes: "" },
  { week: 20, reading1: "Proverbs 1-2", reading2: "Proverbs 3-4", reading3: "Proverbs 16-18", reading4: "Proverbs 31", reading5: "1 Kings 11-12", memoryVerses: "1 Corinthians 13:4-7", notes: "" },
  { week: 21, reading1: "1 Kings 16:29-34; 17", reading2: "1 Kings 18-19", reading3: "1 Kings 21-22", reading4: "2 Kings 2", reading5: "2 Kings 5; 6:1-23", memoryVerses: "1 Corinthians 13:4-7", notes: "" },
  { week: 22, reading1: "Jonah 1-2", reading2: "Jonah 3-4", reading3: "Hosea 1-3", reading4: "Amos 1:1; 9", reading5: "Joel 1-3", memoryVerses: "1 Corinthians 13:4-7", notes: "" },
  { week: 23, reading1: "Isaiah 6; 9", reading2: "Isaiah 44-45", reading3: "Isaiah 52-53", reading4: "Isaiah 65-66", reading5: "Micah 1; 4:6-13; 5", memoryVerses: "Exodus 20:3, 4, 7, 8, 12", notes: "" },
  { week: 24, reading1: "2 Kings 17-18", reading2: "2 Kings 19-21", reading3: "2 Kings 22-23", reading4: "Jeremiah 1-3:5", reading5: "Jeremiah 25; 29", memoryVerses: "Exodus 20:3, 4, 7, 8, 12", notes: "" },
  { week: 25, reading1: "Jeremiah 31:31-40; 32-33", reading2: "Jeremiah 52; 2 Kings 24-25", reading3: "Ezekiel 1:1-3; 36:16-38; 37", reading4: "Daniel 1-2", reading5: "Daniel 3", memoryVerses: "Exodus 20:3, 4, 7, 8, 12", notes: "" },
  { week: 26, reading1: "Daniel 5-6", reading2: "Daniel 9-10; 12", reading3: "Ezra 1-2", reading4: "Ezra 3-4", reading5: "Ezra 5-6", memoryVerses: "Exodus 20:3, 4, 7, 8, 12", notes: "" },
  { week: 27, reading1: "Zechariah 1:1-6; 2; 12", reading2: "Ezra 7-8", reading3: "Ezra 9-10", reading4: "Esther 1-2", reading5: "Esther 3-4", memoryVerses: "", notes: "Review the first 6 Bible passages." },
  { week: 28, reading1: "Esther 5-7", reading2: "Esther 8-10", reading3: "Nehemiah 1-2", reading4: "Nehemiah 3-4", reading5: "Nehemiah 5-6", memoryVerses: "Exodus 20:13-17", notes: "" },
  { week: 29, reading1: "Nehemiah 7-8", reading2: "Nehemiah 9", reading3: "Nehemiah 10", reading4: "Nehemiah 11", reading5: "Nehemiah 12", memoryVerses: "Exodus 20:13-17", notes: "" },
  { week: 30, reading1: "Nehemiah 13", reading2: "Malachi 1", reading3: "Malachi 2", reading4: "Malachi 3", reading5: "Malachi 4", memoryVerses: "Exodus 20:13-17", notes: "" },
  { week: 31, reading1: "Luke 1", reading2: "Luke 2", reading3: "Matthew 1-2", reading4: "Mark 1", reading5: "John 1", memoryVerses: "Exodus 20:13-17", notes: "" },
  { week: 32, reading1: "Matthew 2-4", reading2: "Matthew 5", reading3: "Matthew 6", reading4: "Matthew 7", reading5: "Matthew 8", memoryVerses: "Galatians 5:22-23", notes: "" },
  { week: 33, reading1: "Luke 9:10-62", reading2: "Mark 9-10", reading3: "Luke 12", reading4: "John 3-4", reading5: "Luke 14", memoryVerses: "Galatians 5:22-23", notes: "" },
  { week: 34, reading1: "John 6", reading2: "Matthew 19:16-30", reading3: "Luke 15-16", reading4: "Luke 17:11-37; 18", reading5: "Mark 10", memoryVerses: "Galatians 5:22-23", notes: "" },
  { week: 35, reading1: "John 11; Matthew 21:1-13", reading2: "John 13", reading3: "John 14-15", reading4: "John 16", reading5: "Matt 24", memoryVerses: "Galatians 5:22-23", notes: "" },
  { week: 36, reading1: "Matthew 24:1-46", reading2: "John 17", reading3: "Matthew 26:47-27:31", reading4: "Matthew 27:32-66; Luke 23:26-56", reading5: "John 19", memoryVerses: "Isaiah 53:4-5", notes: "" },
  { week: 37, reading1: "Mark 16; Matthew 28", reading2: "Luke 24", reading3: "John 20-21", reading4: "Matthew 28", reading5: "Acts 1", memoryVerses: "Isaiah 53:4-5", notes: "" },
  { week: 38, reading1: "Acts 2-3", reading2: "Acts 4-5", reading3: "Acts 6", reading4: "Acts 7", reading5: "Acts 8-9", memoryVerses: "Isaiah 53:4-5", notes: "" },
  { week: 39, reading1: "Acts 10-11", reading2: "Acts 12", reading3: "Acts 13-14", reading4: "James 1-2", reading5: "James 3-5", memoryVerses: "Isaiah 53:4-5", notes: "" },
  { week: 40, reading1: "Acts 15-16", reading2: "Galatians 1-3", reading3: "Galatians 4-6", reading4: "Acts 17-18:17", reading5: "1 Thess. 1-2", memoryVerses: "Numbers 6:24-26", notes: "" },
  { week: 41, reading1: "1 Thess. 3-5", reading2: "2 Thess. 1-3", reading3: "Acts 18-19", reading4: "1 Cor. 1-2", reading5: "1 Cor. 3-4", memoryVerses: "Numbers 6:24-26", notes: "" },
  { week: 42, reading1: "1 Cor. 4-5", reading2: "1 Cor. 6-7", reading3: "1 Cor. 8-9", reading4: "1 Cor. 10-11", reading5: "1 Cor. 12-14", memoryVerses: "Numbers 6:24-26", notes: "" },
  { week: 43, reading1: "1 Cor. 15-16", reading2: "2 Cor. 1-2", reading3: "2 Cor. 3-4", reading4: "2 Cor. 5-6", reading5: "2 Cor. 7-8", memoryVerses: "Numbers 6:24-26", notes: "" },
  { week: 44, reading1: "2 Cor. 9-10", reading2: "2 Cor. 11-13", reading3: "Romans 1-2; Acts 20:1-3", reading4: "Romans 3-4", reading5: "Romans 5-6", memoryVerses: "Joshua 24:15", notes: "" },
  { week: 45, reading1: "Romans 7-8", reading2: "Romans 9-10", reading3: "Romans 11-12", reading4: "Romans 13-14", reading5: "Romans 15-16", memoryVerses: "Joshua 24:15", notes: "" },
  { week: 46, reading1: "Acts 20-21", reading2: "Acts 22-23", reading3: "Acts 24-25", reading4: "Acts 26-27", reading5: "Acts 28", memoryVerses: "Joshua 24:15", notes: "" },
  { week: 47, reading1: "Colossians 1-2", reading2: "Colossians 3-4", reading3: "Ephesians 1-2", reading4: "Ephesians 3-4", reading5: "Ephesians 5-6", memoryVerses: "Joshua 24:15", notes: "" },
  { week: 48, reading1: "Philippians 1-2", reading2: "Philippians 3-4", reading3: "Hebrews 1-2", reading4: "Hebrews 3-4", reading5: "Hebrews 5-6", memoryVerses: "1 Corinthians 10:13", notes: "" },
  { week: 49, reading1: "Hebrews 6-7", reading2: "Hebrews 8-9", reading3: "Hebrews 10", reading4: "Hebrew 11", reading5: "Hebrews 12", memoryVerses: "1 Corinthians 10:13", notes: "" },
  { week: 50, reading1: "1 Timothy 1-3", reading2: "1 Timothy 4-6", reading3: "2 Timothy 1-2", reading4: "2 Timothy 3-4", reading5: "1 Peter 1-2", memoryVerses: "1 Corinthians 10:13", notes: "" },
  { week: 51, reading1: "1 Peter 3-4", reading2: "1 Peter 5; 1 John 1", reading3: "1 John 2-3", reading4: "1 John 4-5", reading5: "Revelation 1", memoryVerses: "1 Corinthians 10:13", notes: "" },
  { week: 52, reading1: "Revelation 2", reading2: "Revelation 3", reading3: "Revelation 19:6-20", reading4: "Revelation 21", reading5: "Revelation 22", memoryVerses: "", notes: "Review all 12 Bible passages." }
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { studentNames = ['Abigail', 'Khalil'] } = await req.json();

    console.log('Starting Bible assignments import...');

    const assignments = [];
    
    // Create assignments for each week
    for (const weekData of bibleData) {
      const readings = [
        weekData.reading1,
        weekData.reading2, 
        weekData.reading3,
        weekData.reading4,
        weekData.reading5
      ].filter(reading => reading && reading.trim());

      // Add memory verses if they exist
      if (weekData.memoryVerses && weekData.memoryVerses.trim()) {
        readings.push(`Memory: ${weekData.memoryVerses}`);
      }

      // Create assignments for each reading
      for (let i = 0; i < readings.length; i++) {
        const reading = readings[i];
        const readingType = i < 5 ? `Reading ${i + 1}` : 'Memory Verses';
        const sharedBlockId = `bible-week-${weekData.week}-${readingType.toLowerCase().replace(' ', '-')}`;
        
        // Create assignment for each student
        for (const studentName of studentNames) {
          assignments.push({
            title: `Week ${weekData.week} ${readingType}: ${reading}`,
            student_name: studentName,
            subject: 'Bible',
            course_name: 'Bible Study',
            is_fixed: true,
            shared_block_id: sharedBlockId,
            task_type: 'academic',
            assignment_type: 'reading',
            estimated_time_minutes: 15,
            priority: 'medium',
            completion_status: 'not_started',
            eligible_for_scheduling: true,
            instructions: weekData.notes || `Read ${reading}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    console.log(`Inserting ${assignments.length} Bible assignments...`);

    // Insert all assignments
    const { data, error } = await supabase
      .from('assignments')
      .insert(assignments);

    if (error) {
      console.error('Error inserting assignments:', error);
      throw error;
    }

    console.log('Bible assignments imported successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Imported ${assignments.length} Bible assignments`,
        assignmentsCount: assignments.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});