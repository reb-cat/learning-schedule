import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAssignmentCache } from './useAssignmentCache';
import { useMemoryManager } from './useMemoryManager';
import { useDataValidator } from './useDataValidator';
import { useGlobalAssignmentStore } from './useGlobalAssignmentStore';
import { DataCleanupService } from '@/services/dataCleanupService';
import { IntelligentInference } from '@/services/intelligentInference';

export interface Assignment {
  id: string;
  student_name: string;
  title: string;
  course_name?: string;
  subject?: string;
  due_date?: string;
  urgency?: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
  cognitive_load?: 'light' | 'medium' | 'heavy';
  estimated_time_minutes?: number;
  actual_estimated_minutes?: number;
  canvas_id?: string;
  canvas_url?: string;
  category?: 'academic' | 'administrative';
  created_at: string;
  updated_at: string;
  // Completion tracking fields
  completion_status?: 'not_started' | 'completed' | 'in_progress' | 'stuck';
  progress_percentage?: number;
  time_spent_minutes?: number;
  stuck_reason?: string;
  completed?: boolean;
  completed_at?: string;
  actual_time_minutes?: number;
  difficulty_rating?: 'easy' | 'medium' | 'hard';
  completion_notes?: string;
  // Manual assignment fields
  assignment_type?: 'academic' | 'life_skills' | 'tutoring' | 'recurring';
  source?: 'canvas' | 'manual';
  recurrence_pattern?: any;
  notes?: string;
  priority?: 'high' | 'medium' | 'low';
  is_template?: boolean;
  parent_assignment_id?: string;
  // Scheduling fields
  scheduled_block?: number;
  scheduled_date?: string;
  scheduled_day?: string;
  // Multi-day scheduling fields
  original_assignment_id?: string;
  estimated_blocks_needed?: number;
  scheduling_priority?: number;
  is_split_assignment?: boolean;
  split_part_number?: number;
  total_split_parts?: number;
}

export const useAssignments = (studentName: string) => {
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const cache = useAssignmentCache();
  const globalStore = useGlobalAssignmentStore();
  const memoryManager = useMemoryManager({ maxCacheSize: 25, gcThreshold: 75 });
  const dataValidator = useDataValidator();

  const fetchAssignments = useCallback(async (forceRefresh = false) => {
    console.log('🔴 FETCH CALLED - manual only mode for:', studentName);
    try {
      // Check for pending requests first to prevent duplicates
      if (!forceRefresh && globalStore.hasPendingRequest(studentName)) {
        console.log(`⏳ Waiting for pending request for ${studentName}`);
        const pendingResult = await globalStore.getPendingRequest(studentName);
        if (pendingResult) {
          setAssignments(pendingResult);
          setLoading(false);
          return;
        }
      }

      // Check cache first unless forcing refresh
      if (!forceRefresh) {
        const cachedData = cache.get(studentName);
        if (cachedData) {
          console.log(`📋 Using cached assignments for ${studentName}`);
          setAssignments(cachedData);
          setLoading(false);
          return;
        }
        
        // Check global store for very fresh data
        const globalData = globalStore.get(studentName);
        if (globalData) {
          console.log(`🌐 Using global store data for ${studentName}`);
          setAssignments(globalData);
          cache.set(studentName, globalData);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);
      
      console.log(`🔍 Fetching assignments from assignments table for ${studentName}`);
      
      // Create promise for deduplication
      const fetchPromise = (async (): Promise<Assignment[]> => {
        // Add retry logic for network issues
        const maxRetries = 3;
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
          // GUARD: Prevent database calls to stop auth loop
          if (typeof window !== 'undefined' && (window as any).SAFE_MODE) {
            console.log('🛡️ SAFE MODE: Skipping database call');
            return [];
          }
          
          const query = supabase
            .from('assignments')
            .select('*')
            .eq('student_name', studentName)
            .order('due_date', { ascending: true, nullsFirst: false });

          const { data, error } = await query;

          if (error) {
            throw new Error(error.message);
          }

          let assignmentData = (data || []) as Assignment[];
          console.log(`📚 Found ${assignmentData.length} assignments for ${studentName}`);
          
          // Apply intelligent inference to fill missing data
          assignmentData = assignmentData.map(assignment => 
            IntelligentInference.applyInferenceToAssignment(assignment)
          );
          
          // Update global store, cache and state
          globalStore.set(studentName, assignmentData);
          cache.set(studentName, assignmentData);
          setAssignments(assignmentData);
          lastFetchRef.current = Date.now();
          
          return assignmentData;
          } catch (err) {
            lastError = err instanceof Error ? err : new Error('Unknown error');
            console.warn(`Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
            
            if (attempt < maxRetries) {
              // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
        }
        
        // All retries failed - use cached data if available instead of failing completely
        const cachedData = cache.get(studentName);
        if (cachedData && cachedData.length > 0) {
          console.warn('Using stale cached data due to fetch failure');
          setAssignments(cachedData);
          setError('Using cached data - connection issues detected');
          return cachedData;
        }
        
        throw lastError || new Error('Failed to fetch assignments after retries');
      })();
      
      // Set as pending request for deduplication
      globalStore.setPendingRequest(studentName, fetchPromise);
      
      // Await the result
      const result = await fetchPromise;
    } catch (err) {
      console.error('Error fetching assignments:', err);
      
      // Try to use cached data as fallback to prevent blank pages
      const cachedData = cache.get(studentName);
      if (cachedData && cachedData.length > 0) {
        console.warn('Using cached data as fallback after error');
        setAssignments(cachedData);
        setError('Using cached data - please refresh when connection improves');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
        // Set empty array instead of leaving assignments undefined
        setAssignments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [studentName, cache, globalStore]);

  const getScheduledAssignment = useCallback(async (block: number, date: string) => {
    // Add retry logic for scheduled assignments too
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .eq('student_name', studentName)
          .eq('scheduled_block', block)
          .eq('scheduled_date', date)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        // If no assignment found for today, check if there are assignments scheduled for past dates
        if (!data) {
          console.log('🔍 No assignment found for today, checking past dates for block:', block);
          
          const { data: pastAssignments, error: pastError } = await supabase
            .from('assignments')
            .select('*')
            .eq('student_name', studentName)
            .eq('scheduled_block', block)
            .lt('scheduled_date', date)
            .eq('completion_status', 'not_started')
            .order('scheduled_date', { ascending: false })
            .limit(1);

          if (pastError) {
            console.error('Error fetching past scheduled assignments:', pastError);
            return null;
          }

          if (pastAssignments && pastAssignments.length > 0) {
            const pastAssignment = pastAssignments[0];
            console.log('🔄 Found past assignment to show:', {
              title: pastAssignment.title,
              originalDate: pastAssignment.scheduled_date,
              requestedDate: date,
              block: block
            });
            
            return pastAssignment as Assignment;
          }
        }

        return data as Assignment | null;
      } catch (err) {
        console.error(`Error fetching scheduled assignment (attempt ${attempt}):`, err);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          return null;
        }
      }
    }
    
    return null;
  }, [studentName]);

  // Smart refresh logic - only fetch if data is stale or dependencies changed
  const shouldRefresh = useMemo(() => {
    const now = Date.now();
    const dataAge = now - lastFetchRef.current;
    const isStale = dataAge > 2 * 60 * 1000; // 2 minutes
    const shouldRefreshValue = isStale || lastFetchRef.current === 0;
    console.log('🔍 shouldRefresh check:', { studentName, isStale, dataAge, shouldRefreshValue });
    return shouldRefreshValue;
  }, [studentName]);

  // DISABLED: Comment out all automatic useEffects to stop loops
  // useEffect(() => {
  //   console.log('🔄 useEffect triggered:', { studentName, shouldRefresh });
  //   if (shouldRefresh) {
  //     console.log('📡 Starting fetchAssignments for:', studentName);
  //     fetchAssignments();
  //   }
  //   
  //   // Cleanup on unmount
  //   return () => {
  //     console.log('🧹 Cleaning up useAssignments for:', studentName);
  //     globalStore.clear(studentName);
  //   };
  // }, [fetchAssignments, shouldRefresh, studentName, globalStore]);

  // Invalidate cache when needed
  const invalidateCache = useCallback(() => {
    cache.invalidate(studentName);
  }, [cache, studentName]);

  // Data cleanup utilities
  const cleanupData = useCallback(async () => {
    try {
      await DataCleanupService.cleanupAssignmentData(studentName);
      // Refresh data after cleanup
      await fetchAssignments(true);
    } catch (error) {
      console.error('Data cleanup failed:', error);
    }
  }, [studentName, fetchAssignments]);

  const validateData = useCallback(async () => {
    return await dataValidator.validateAssignmentData(studentName);
  }, [studentName, dataValidator]);

  const repairData = useCallback(async () => {
    const result = await dataValidator.validateAndRepairData(studentName);
    if (result.repaired > 0) {
      // Refresh data after repair
      await fetchAssignments(true);
    }
    return result;
  }, [studentName, dataValidator, fetchAssignments]);

  // Periodic memory management
  const handleMemoryOptimization = useCallback(() => {
    const memoryStats = memoryManager.getMemoryStats();
    if (memoryStats && memoryStats.used > 50) {
      console.log('🧹 Optimizing memory usage...', memoryStats);
      cache.invalidate(); // Clear old cache entries
      memoryManager.forceCleanup();
    }
  }, [cache, memoryManager]);

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments,
    forceRefresh: () => fetchAssignments(true),
    getScheduledAssignment,
    invalidateCache,
    cleanupData,
    validateData,
    repairData,
    optimizeMemory: handleMemoryOptimization,
    cacheStats: cache.getStats(),
    memoryStats: memoryManager.getMemoryStats
  };
};