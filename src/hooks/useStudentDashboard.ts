import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parse, isValid } from 'date-fns';
import { useAssignments } from './useAssignments';
import { useScheduleTemplate } from './useScheduleTemplate';
import { getEffectiveScheduleForDay } from '@/data/allDayEvents';
import { blockSharingScheduler } from '@/services/blockSharingScheduler';

export const useStudentDashboard = (studentName: string) => {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const { assignments, loading: assignmentsLoading, error: assignmentsError, getScheduledAssignment, refetch } = useAssignments(studentName);
  const { getScheduleForStudentAndDay } = useScheduleTemplate(studentName);
  
  // State for dashboard data
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [effectiveSchedule, setEffectiveSchedule] = useState<any[] | null>(null);
  const [hasAllDayEvent, setHasAllDayEvent] = useState<boolean | null>(null);
  const [isCheckingAllDayEvent, setIsCheckingAllDayEvent] = useState(true);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const autoSchedulerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoScheduledRef = useRef(false);

  // Date handling
  const displayDate = useMemo(() => {
    let date = new Date();
    if (dateParam) {
      const parsedDate = parse(dateParam, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        date = parsedDate;
      }
    }
    return date;
  }, [dateParam]);

  const dateDisplay = format(displayDate, "EEEE, MMMM d, yyyy");
  const formattedDate = format(displayDate, 'yyyy-MM-dd');
  const currentDay = format(displayDate, "EEEE");
  const isWeekend = currentDay === "Saturday" || currentDay === "Sunday";
  const baseTodaySchedule = getScheduleForStudentAndDay(studentName, currentDay);

  // Listen for assignment clearing events
  useEffect(() => {
    const handleAssignmentsCleared = () => {
      refetch();
    };
    
    window.addEventListener('assignmentsCleared', handleAssignmentsCleared);
    return () => window.removeEventListener('assignmentsCleared', handleAssignmentsCleared);
  }, [refetch]);

  // Check for all-day events and get effective schedule
  const checkEffectiveSchedule = useCallback(async () => {
    console.log(`🔍 [${studentName}] Checking schedule for ${currentDay} (${formattedDate})`);
    console.log(`📋 [${studentName}] Base schedule from template:`, baseTodaySchedule);
    
    setIsCheckingAllDayEvent(true);
    
    try {
      // Set a hard 1-second timeout - fail fast
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 1000)
      );
      
      const schedulePromise = getEffectiveScheduleForDay(
        studentName, 
        currentDay, 
        formattedDate,
        (student, day) => getScheduleForStudentAndDay(student, day)
      );
      
      const schedule = await Promise.race([schedulePromise, timeoutPromise]) as any[] | null;
      
      console.log(`✅ [${studentName}] All-day event check result:`, schedule === null ? 'Has all-day event' : 'Regular schedule');
      setEffectiveSchedule(schedule);
      setHasAllDayEvent(schedule === null);
    } catch (error) {
      console.log(`⚠️ [${studentName}] All-day event check failed/timed out - using regular schedule:`, baseTodaySchedule);
      // On any error or timeout, just show the regular schedule
      setEffectiveSchedule(undefined);
      setHasAllDayEvent(false);
    } finally {
      setIsCheckingAllDayEvent(false);
    }
  }, [studentName, currentDay, formattedDate, baseTodaySchedule]);

  useEffect(() => {
    checkEffectiveSchedule();
  }, [checkEffectiveSchedule]);

  // Use effective schedule or fallback to base schedule
  const baseSchedule = effectiveSchedule || baseTodaySchedule;
  console.log(`📅 [${studentName}] Final baseSchedule:`, baseSchedule);
  
  // Enrich schedule blocks with their assignments
  const todaySchedule = useMemo(() => {
    if (!baseSchedule || baseSchedule.length === 0) {
      console.log(`❌ [${studentName}] No baseSchedule available!`);
      return [];
    }
    
    console.log(`🔧 [${studentName}] Enriching ${baseSchedule.length} blocks with assignments`);
    const enrichedSchedule = baseSchedule.map(block => ({
      ...block,
      assignments: block.isAssignmentBlock 
        ? assignments.filter(a => 
            a.scheduled_date === formattedDate && 
            a.scheduled_block === block.block
          )
        : []
    }));
    
    console.log(`✅ [${studentName}] Final enriched schedule:`, enrichedSchedule);
    return enrichedSchedule;
  }, [baseSchedule, assignments, formattedDate, studentName]);

  // Handle critical errors that would cause blank pages
  useEffect(() => {
    if (assignmentsError && !assignments.length && !assignmentsLoading) {
      // Only show critical error if we have no data at all
      const isCritical = assignmentsError.includes('timeout') || 
                        assignmentsError.includes('network') || 
                        assignmentsError.includes('connection') ||
                        !assignmentsError.includes('cached');
      
      if (isCritical) {
        setCriticalError(assignmentsError);
      }
    } else {
      setCriticalError(null);
    }
  }, [assignmentsError, assignments.length, assignmentsLoading]);

  // Debounced update handler to prevent rapid successive calls
  const handleEventUpdate = useCallback(() => {
    // Use setTimeout to batch updates
    setTimeout(() => {
      checkEffectiveSchedule();
    }, 100);
  }, [checkEffectiveSchedule]);

  // Auto-scheduling logic
  const triggerAutoScheduling = useCallback(async () => {
    if (isAutoScheduling) return;
    
    console.log(`🤖 Auto-scheduling triggered for ${studentName}`);
    setIsAutoScheduling(true);
    
    try {
      const result = await blockSharingScheduler.analyzeAndSchedule(studentName, 7, new Date());
      
      if (result.academic_blocks.length > 0) {
        await blockSharingScheduler.executeSchedule(result);
      }
      
      console.log(`✅ Auto-scheduling completed for ${studentName}`);
      refetch();
    } catch (error) {
      console.error(`❌ Auto-scheduling failed for ${studentName}:`, error);
    } finally {
      setIsAutoScheduling(false);
    }
  }, [studentName, isAutoScheduling, refetch]);

  // Auto-schedule when assignments are loaded and we detect unscheduled assignments
  useEffect(() => {
    if (assignmentsLoading || !assignments.length) return;
    
    const unscheduledCount = assignments.filter(a => 
      !a.scheduled_date && 
      a.completion_status !== 'completed'
    ).length;
    
    if (unscheduledCount > 0 && !hasAutoScheduledRef.current) {
      console.log(`📋 Found ${unscheduledCount} unscheduled assignments - triggering auto-scheduler`);
      hasAutoScheduledRef.current = true;
      
      if (autoSchedulerRef.current) {
        clearTimeout(autoSchedulerRef.current);
      }
      
      autoSchedulerRef.current = setTimeout(() => {
        triggerAutoScheduling();
      }, 2000);
    }
  }, [assignments, assignmentsLoading, triggerAutoScheduling, studentName]);
  // Reset one-time auto-schedule when date or student changes
  useEffect(() => {
    hasAutoScheduledRef.current = false;
  }, [formattedDate, studentName]);

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    console.log(`🔄 Force refresh triggered for ${studentName}`);
    await triggerAutoScheduling();
  }, [triggerAutoScheduling, studentName]);

  return {
    // Data
    assignments,
    assignmentsLoading,
    assignmentsError,
    getScheduledAssignment,
    refetch,
    criticalError,
    setCriticalError,
    
    // Schedule
    todaySchedule,
    hasAllDayEvent,
    isCheckingAllDayEvent,
    
    // Date info
    displayDate,
    dateDisplay,
    formattedDate,
    currentDay,
    isWeekend,
    
    // Event handlers
    handleEventUpdate,
    forceRefresh,
    
    // Auto-scheduling state
    isAutoScheduling
  };
};