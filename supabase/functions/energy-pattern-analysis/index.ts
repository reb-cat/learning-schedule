import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PerformanceAnalysis {
  studentName: string;
  subjectPerformance: Record<string, {
    averageEfficiency: number;
    completions: number;
    timeBlockDistribution: Record<number, number>;
  }>;
  timeBlockPerformance: Record<number, {
    averageEfficiency: number;
    completions: number;
  }>;
}

/**
 * Analyze performance patterns for energy pattern learning
 */
async function analyzePerformancePatterns(studentName: string): Promise<PerformanceAnalysis | null> {
  try {
    // Get learning patterns from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: patterns, error } = await supabase
      .from('learning_patterns')
      .select('*')
      .eq('student_name', studentName)
      .gte('last_updated', thirtyDaysAgo);

    if (error) {
      console.error('Error fetching learning patterns:', error);
      return null;
    }

    if (!patterns || patterns.length < 3) {
      console.log(`Not enough data for ${studentName} - need at least 3 completed assignments`);
      return null;
    }

    // Calculate subject performance
    const subjectPerformance: Record<string, any> = {};
    
    patterns.forEach(pattern => {
      if (!subjectPerformance[pattern.subject]) {
        subjectPerformance[pattern.subject] = {
          averageEfficiency: 0,
          completions: 0,
          timeBlockDistribution: {}
        };
      }
      
      subjectPerformance[pattern.subject].averageEfficiency += pattern.average_duration_factor || 1;
      subjectPerformance[pattern.subject].completions += pattern.completion_count || 1;
    });

    // Calculate averages
    Object.keys(subjectPerformance).forEach(subject => {
      const perf = subjectPerformance[subject];
      perf.averageEfficiency = perf.averageEfficiency / perf.completions;
    });

    // TODO: Implement time block performance analysis when we have scheduled assignment completion data

    return {
      studentName,
      subjectPerformance,
      timeBlockPerformance: {} // Placeholder for future implementation
    };

  } catch (error) {
    console.error('Error in analyzePerformancePatterns:', error);
    return null;
  }
}

/**
 * Update energy patterns based on performance analysis
 */
async function updateEnergyPatternFromAnalysis(analysis: PerformanceAnalysis): Promise<void> {
  try {
    // Get current energy pattern
    const { data: currentPattern, error: patternError } = await supabase
      .from('student_energy_patterns')
      .select('*')
      .eq('student_name', analysis.studentName)
      .single();

    if (patternError) {
      console.error('Error fetching current pattern:', patternError);
      return;
    }

    if (currentPattern.pattern_type === 'subject_based') {
      const energyData = currentPattern.energy_data as any;
      const updatedEnergyData = {
        high_energy_subjects: [] as string[],
        medium_energy_subjects: [] as string[],
        low_energy_subjects: [] as string[]
      };

      // Categorize subjects based on efficiency
      Object.entries(analysis.subjectPerformance).forEach(([subject, performance]: [string, any]) => {
        // Only update if we have sufficient data (at least 2 completions)
        if (performance.completions >= 2) {
          if (performance.averageEfficiency >= 1.2) {
            updatedEnergyData.high_energy_subjects.push(subject);
          } else if (performance.averageEfficiency >= 0.8) {
            updatedEnergyData.medium_energy_subjects.push(subject);
          } else {
            updatedEnergyData.low_energy_subjects.push(subject);
          }
        } else {
          // Keep in current category if insufficient data
          if (energyData.high_energy_subjects?.includes(subject)) {
            updatedEnergyData.high_energy_subjects.push(subject);
          } else if (energyData.medium_energy_subjects?.includes(subject)) {
            updatedEnergyData.medium_energy_subjects.push(subject);
          } else if (energyData.low_energy_subjects?.includes(subject)) {
            updatedEnergyData.low_energy_subjects.push(subject);
          } else {
            // Default to medium if not previously categorized
            updatedEnergyData.medium_energy_subjects.push(subject);
          }
        }
      });

      // Update the pattern in the database
      const { error: updateError } = await supabase
        .rpc('update_energy_pattern', {
          p_student_name: analysis.studentName,
          p_energy_data: updatedEnergyData,
          p_confidence_adjustment: 0.1
        });

      if (updateError) {
        console.error('Error updating energy pattern:', updateError);
      } else {
        console.log(`Updated energy pattern for ${analysis.studentName}:`, updatedEnergyData);
      }
    }

  } catch (error) {
    console.error('Error in updateEnergyPatternFromAnalysis:', error);
  }
}

/**
 * Main function to run energy pattern analysis for all students
 */
async function runEnergyPatternAnalysis(): Promise<{ success: boolean; results: any[] }> {
  console.log('Starting energy pattern analysis...');
  
  try {
    // Get all students with energy patterns
    const { data: students, error } = await supabase
      .from('student_energy_patterns')
      .select('student_name');

    if (error) {
      console.error('Error fetching students:', error);
      return { success: false, results: [] };
    }

    const results = [];

    for (const student of students || []) {
      console.log(`Analyzing patterns for ${student.student_name}...`);
      
      const analysis = await analyzePerformancePatterns(student.student_name);
      
      if (analysis) {
        await updateEnergyPatternFromAnalysis(analysis);
        results.push({
          studentName: student.student_name,
          status: 'updated',
          subjectCount: Object.keys(analysis.subjectPerformance).length
        });
      } else {
        results.push({
          studentName: student.student_name,
          status: 'insufficient_data'
        });
      }
    }

    console.log('Energy pattern analysis completed');
    return { success: true, results };

  } catch (error) {
    console.error('Error in runEnergyPatternAnalysis:', error);
    return { success: false, results: [] };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const result = await runEnergyPatternAnalysis();
    
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
