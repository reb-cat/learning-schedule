import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parse, isValid } from 'date-fns';
import { useAssignments } from './useAssignments';
import { getScheduleForStudentAndDay } from '@/data/scheduleData';
import { getEffectiveScheduleForDay } from '@/data/allDayEvents';

export const useStudentDashboard = (studentName: string) => {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const { assignments, loading: assignmentsLoading, error: assignmentsError, getScheduledAssignment, refetch } = useAssignments(studentName);
  
  // State for dashboard data
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [effectiveSchedule, setEffectiveSchedule] = useState<any[] | null>(null);
  const [hasAllDayEvent, setHasAllDayEvent] = useState<boolean | null>(null);
  const [isCheckingAllDayEvent, setIsCheckingAllDayEvent] = useState(true);

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
    setIsCheckingAllDayEvent(true);
    
    try {
      // Set a hard 3-second timeout - if it takes longer, just show regular schedule
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const schedulePromise = getEffectiveScheduleForDay(
        studentName, 
        currentDay, 
        formattedDate,
        (student, day) => getScheduleForStudentAndDay(student, day)
      );
      
      const schedule = await Promise.race([schedulePromise, timeoutPromise]) as any[] | null;
      
      setEffectiveSchedule(schedule);
      setHasAllDayEvent(schedule === null);
    } catch (error) {
      console.log('All-day event check failed/timed out - using regular schedule');
      // On any error or timeout, just show the regular schedule
      setEffectiveSchedule(undefined);
      setHasAllDayEvent(false);
    } finally {
      // ALWAYS reset loading state, no matter what happens
      setIsCheckingAllDayEvent(false);
    }
  }, [studentName, currentDay, formattedDate]);

  useEffect(() => {
    checkEffectiveSchedule();
  }, [checkEffectiveSchedule]);

  // Use effective schedule or fallback to base schedule
  const baseSchedule = effectiveSchedule || baseTodaySchedule;
  
  // Enrich schedule blocks with their assignments
  const todaySchedule = useMemo(() => {
    if (!baseSchedule) return [];
    
    return baseSchedule.map(block => ({
      ...block,
      assignments: block.isAssignmentBlock 
        ? assignments.filter(a => 
            a.scheduled_date === formattedDate && 
            a.scheduled_block === block.block
          )
        : []
    }));
  }, [baseSchedule, assignments, formattedDate]);

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
    handleEventUpdate
  };
};