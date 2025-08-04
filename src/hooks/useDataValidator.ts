import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalChecked: number;
    errorsFound: number;
    warningsFound: number;
  };
}

export function useDataValidator() {
  const validationCache = useRef<Map<string, ValidationResult>>(new Map());

  const validateAssignmentData = useCallback(async (
    studentName: string
  ): Promise<ValidationResult> => {
    const cacheKey = studentName;
    
    // Check cache first
    const cached = validationCache.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let totalChecked = 0;

    try {
      // Fetch all assignments for validation
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('student_name', studentName);

      if (error) {
        errors.push(`Database query failed: ${error.message}`);
        return { isValid: false, errors, warnings, stats: { totalChecked: 0, errorsFound: 1, warningsFound: 0 } };
      }

      totalChecked = assignments?.length || 0;

      assignments?.forEach((assignment, index) => {
        const context = `Assignment ${index + 1} (${assignment.title})`;

        // Critical validations (errors)
        if (!assignment.id || typeof assignment.id !== 'string') {
          errors.push(`${context}: Missing or invalid ID`);
        } else if (assignment.id.includes('_part_')) {
          errors.push(`${context}: Malformed ID contains '_part_' suffix: ${assignment.id}`);
        }

        if (!assignment.student_name) {
          errors.push(`${context}: Missing student name`);
        }

        if (!assignment.title) {
          errors.push(`${context}: Missing title`);
        }

        // Data quality validations (warnings)
        if (!assignment.cognitive_load) {
          warnings.push(`${context}: Missing cognitive load`);
        }

        if (!assignment.urgency) {
          warnings.push(`${context}: Missing urgency`);
        }

        if (!assignment.task_type) {
          warnings.push(`${context}: Missing task type`);
        }

        if (assignment.due_date) {
          const dueDate = new Date(assignment.due_date);
          if (isNaN(dueDate.getTime())) {
            warnings.push(`${context}: Invalid due date format`);
          }
        }

        if (assignment.estimated_time_minutes && assignment.estimated_time_minutes < 0) {
          warnings.push(`${context}: Negative estimated time`);
        }

        if (assignment.estimated_time_minutes && assignment.estimated_time_minutes > 480) {
          warnings.push(`${context}: Estimated time exceeds 8 hours (${assignment.estimated_time_minutes} minutes)`);
        }
      });

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        stats: {
          totalChecked,
          errorsFound: errors.length,
          warningsFound: warnings.length
        }
      };

      // Cache result for 5 minutes
      validationCache.current.set(cacheKey, result);
      setTimeout(() => validationCache.current.delete(cacheKey), 5 * 60 * 1000);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Validation failed: ${errorMessage}`);
      
      return {
        isValid: false,
        errors,
        warnings,
        stats: { totalChecked: 0, errorsFound: 1, warningsFound: 0 }
      };
    }
  }, []);

  const validateAndRepairData = useCallback(async (
    studentName: string
  ): Promise<{ repaired: number; failed: number }> => {
    let repaired = 0;
    let failed = 0;

    try {
      // Find assignments with malformed IDs
      const { data: malformedAssignments, error } = await supabase
        .from('assignments')
        .select('id, original_assignment_id')
        .eq('student_name', studentName)
        .like('id', '%_part_%');

      if (error) {
        console.error('Failed to query malformed assignments:', error);
        return { repaired: 0, failed: 1 };
      }

      // Repair malformed IDs
      for (const assignment of malformedAssignments || []) {
        try {
          // Extract base UUID from malformed ID
          const baseId = assignment.id.split('_part_')[0];
          
          // Validate that it's a proper UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(baseId)) {
            await supabase
              .from('assignments')
              .update({ 
                original_assignment_id: assignment.id, // Preserve the original for reference
                id: baseId // Fix to proper UUID
              })
              .eq('id', assignment.id);
            
            repaired++;
            console.log(`✅ Repaired assignment ID: ${assignment.id} → ${baseId}`);
          } else {
            console.warn(`❌ Cannot repair malformed ID: ${assignment.id}`);
            failed++;
          }
        } catch (error) {
          console.error(`Failed to repair assignment ${assignment.id}:`, error);
          failed++;
        }
      }

      return { repaired, failed };
    } catch (error) {
      console.error('Data repair failed:', error);
      return { repaired: 0, failed: 1 };
    }
  }, []);

  return {
    validateAssignmentData,
    validateAndRepairData,
    clearCache: () => validationCache.current.clear()
  };
}