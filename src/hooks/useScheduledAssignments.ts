import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export const useScheduledAssignments = (
  getScheduledAssignment: (block: number, date: string) => Promise<any>,
  formattedDate: string,
  todaySchedule: any[]
) => {
  const [scheduledAssignments, setScheduledAssignments] = useState<{[key: string]: any}>({});
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const loadingRef = useRef(false);
  const assignmentCacheRef = useRef<{[key: string]: any}>({});

  // Stabilize getScheduledAssignment function
  const stableGetScheduledAssignment = useCallback(getScheduledAssignment, [getScheduledAssignment]);

  // Memoize expensive calculations with stable dependencies
  const assignmentBlocks = useMemo(() => 
    todaySchedule?.filter(block => block.isAssignmentBlock && block.block) || [],
    [todaySchedule]
  );

  // Load scheduled assignments with stabilized dependencies and batch loading
  const loadScheduledAssignments = useCallback(async () => {
    if (!stableGetScheduledAssignment || assignmentBlocks.length === 0 || loadingRef.current) return;
    
    // Prevent concurrent loading
    loadingRef.current = true;
    setIsLoadingAssignments(true);
    
    try {
      // Generate cache key for this specific combination
      const cacheKey = `${formattedDate}-${assignmentBlocks.map(b => b.block).join(',')}`;
      
      // Check if we already have this exact data cached
      if (assignmentCacheRef.current[cacheKey]) {
        const cachedAssignments = assignmentCacheRef.current[cacheKey];
        
        // Deep equality check - only update if data actually changed
        const currentAssignmentsStr = JSON.stringify(scheduledAssignments);
        const cachedAssignmentsStr = JSON.stringify(cachedAssignments);
        
        if (currentAssignmentsStr !== cachedAssignmentsStr) {
          setScheduledAssignments(cachedAssignments);
        }
        return;
      }

      const assignmentPromises = assignmentBlocks.map(async (block) => {
        try {
          const assignment = await stableGetScheduledAssignment(block.block!, formattedDate);
          return assignment ? [`${block.block}`, assignment] : null;
        } catch (error) {
          console.warn('Error loading assignment for block:', block.block, error);
          return null;
        }
      });

      const results = await Promise.all(assignmentPromises);
      const assignmentMap = Object.fromEntries(
        results.filter((result): result is [string, any] => result !== null)
      );
      
      // Cache the result
      assignmentCacheRef.current[cacheKey] = assignmentMap;
      
      // Only update state if data actually changed
      const currentAssignmentsStr = JSON.stringify(scheduledAssignments);
      const newAssignmentsStr = JSON.stringify(assignmentMap);
      
      if (currentAssignmentsStr !== newAssignmentsStr) {
        setScheduledAssignments(assignmentMap);
      }
    } catch (error) {
      console.error('Error loading scheduled assignments:', error);
    } finally {
      loadingRef.current = false;
      setIsLoadingAssignments(false);
    }
  }, [stableGetScheduledAssignment, formattedDate, assignmentBlocks, scheduledAssignments]);

  useEffect(() => {
    loadScheduledAssignments();
  }, [loadScheduledAssignments]);

  // Clear cache function
  const clearCache = useCallback(() => {
    assignmentCacheRef.current = {};
  }, []);

  return {
    scheduledAssignments,
    isLoadingAssignments,
    loadScheduledAssignments,
    clearCache
  };
};