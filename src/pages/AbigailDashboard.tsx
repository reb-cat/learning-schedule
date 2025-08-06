import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Calendar, Plus } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { getScheduleForStudentAndDay } from "@/data/scheduleData";
import { useAssignments } from "@/hooks/useAssignments";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { CoopChecklist } from "@/components/CoopChecklist";
import { OptimizedStudentBlockDisplay } from "@/components/OptimizedStudentBlockDisplay";
import { AllDayEventForm } from "@/components/AllDayEventForm";
import { AllDayEventsList } from "@/components/AllDayEventsList";
import { getEffectiveScheduleForDay } from "@/data/allDayEvents";

import { ErrorFallback } from "@/components/ErrorFallback";

const AbigailDashboard = () => {
  console.log('🏠 AbigailDashboard rendering...');
  
  try {
    const [searchParams] = useSearchParams();
    const dateParam = searchParams.get('date');
    
  const { assignments, loading: assignmentsLoading, error: assignmentsError, getScheduledAssignment, refetch, cacheStats, cleanupData } = useAssignments('Abigail');
  const [scheduledAssignments, setScheduledAssignments] = useState<{[key: string]: any}>({});
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [effectiveSchedule, setEffectiveSchedule] = useState<any[] | null>(null);
  const [hasAllDayEvent, setHasAllDayEvent] = useState(false);
  const loadingRef = useRef(false);
  const assignmentCacheRef = useRef<{[key: string]: any}>({});
    
    // Use date parameter if provided and valid, otherwise use today
    let displayDate = new Date();
    if (dateParam) {
      const parsedDate = parse(dateParam, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        displayDate = parsedDate;
      }
    }
    
  const dateDisplay = format(displayDate, "EEEE, MMMM d, yyyy");
  const formattedDate = format(displayDate, 'yyyy-MM-dd');
  const currentDay = format(displayDate, "EEEE");
  const isWeekend = currentDay === "Saturday" || currentDay === "Sunday";
  const baseTodaySchedule = getScheduleForStudentAndDay("Abigail", currentDay);

  // Check for all-day events and get effective schedule
  const checkEffectiveSchedule = useCallback(async () => {
    try {
      const schedule = await getEffectiveScheduleForDay(
        "Abigail", 
        currentDay, 
        formattedDate,
        (student, day) => getScheduleForStudentAndDay(student, day)
      );
      
      setEffectiveSchedule(schedule);
      setHasAllDayEvent(schedule === null);
    } catch (error) {
      console.error('Error checking effective schedule:', error);
      setEffectiveSchedule(baseTodaySchedule);
      setHasAllDayEvent(false);
    }
  }, [currentDay, formattedDate, baseTodaySchedule]);

  useEffect(() => {
    checkEffectiveSchedule();
  }, [checkEffectiveSchedule]);

  // Use effective schedule or fallback to base schedule
  const todaySchedule = effectiveSchedule || baseTodaySchedule;

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

  // Debounced update handler to prevent rapid successive calls
  const handleEventUpdate = useCallback(() => {
    // Clear cache to force fresh data
    assignmentCacheRef.current = {};
    
    // Use setTimeout to batch updates
    setTimeout(() => {
      checkEffectiveSchedule();
      loadScheduledAssignments();
    }, 100);
  }, [checkEffectiveSchedule, loadScheduledAssignments]);

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

    // Show error fallback for critical errors
    if (criticalError) {
      return (
        <ErrorFallback 
          error={criticalError}
          onRetry={() => {
            setCriticalError(null);
            refetch();
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">Welcome, Abigail!</h1>
              </div>
              <p className="text-lg text-muted-foreground mt-1">{dateDisplay}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Home size={16} />
                  Home
                </Button>
              </Link>
            </div>
          </div>
          
          <Tabs defaultValue="schedule" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                All-Day Events
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-6">
              {/* Co-op Checklist - only shows on co-op days */}
              <CoopChecklist 
                studentName="Abigail" 
                assignments={assignments} 
                currentDay={currentDay} 
                hasAllDayEvent={hasAllDayEvent}
              />

              {/* All-Day Events List */}
              <AllDayEventsList 
                studentName="Abigail" 
                selectedDate={formattedDate}
                onEventUpdate={handleEventUpdate}
              />

              {/* Today's Schedule */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Today's Schedule</h2>
                
                {hasAllDayEvent ? (
                  <Card className="bg-card border border-border">
                    <CardContent className="p-8 text-center">
                      <div className="text-6xl mb-4">📅</div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">All-Day Event</h3>
                      <p className="text-muted-foreground">No assignment blocks scheduled - check the event details above!</p>
                    </CardContent>
                  </Card>
                ) : isWeekend ? (
                  <Card className="bg-card border border-border">
                    <CardContent className="p-8 text-center">
                      <h3 className="text-lg font-semibold text-foreground mb-2">No classes today!</h3>
                      <p className="text-muted-foreground">Enjoy your weekend! 🎉</p>
                    </CardContent>
                  </Card>
                ) : todaySchedule.length === 0 ? (
                  <Card className="bg-card border border-border">
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No schedule available for {currentDay}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {todaySchedule.map((block, index) => (
                      <OptimizedStudentBlockDisplay
                        key={`${block.block || index}-${formattedDate}`}
                        block={block}
                        assignment={block.isAssignmentBlock ? scheduledAssignments[`${block.block}`] : undefined}
                        studentName="Abigail"
                        onAssignmentUpdate={handleEventUpdate}
                        isLoading={isLoadingAssignments}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              <AllDayEventForm onSuccess={handleEventUpdate} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in AbigailDashboard:', error);
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground">Welcome, Abigail!</h1>
          <p className="text-lg text-red-500 mt-1">Dashboard temporarily unavailable</p>
          <Link to="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2 mt-4">
              <Home size={16} />
              Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }
};

export default AbigailDashboard;