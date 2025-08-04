import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Calendar } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { getScheduleForStudentAndDay } from "@/data/scheduleData";
import { useAssignments } from "@/hooks/useAssignments";
import { useState, useEffect, useCallback } from "react";
import { CoopChecklist } from "@/components/CoopChecklist";
import { StudentBlockDisplay } from "@/components/StudentBlockDisplay";
import { BackgroundScheduler } from "@/components/BackgroundScheduler";
import { ErrorFallback } from "@/components/ErrorFallback";
import { ErrorMonitoring } from "@/components/ErrorMonitoring";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { SystemHealthDashboard } from "@/components/SystemHealthDashboard";
import { StudentAnalyticsDashboard } from "@/components/StudentAnalyticsDashboard";
import { SystemBenchmarkDashboard } from "@/components/SystemBenchmarkDashboard";

const KhalilDashboard = () => {
  console.log('🏠 KhalilDashboard rendering...');
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const { assignments, loading: assignmentsLoading, error: assignmentsError, getScheduledAssignment, refetch, cacheStats, cleanupData } = useAssignments('Khalil');
  const [scheduledAssignments, setScheduledAssignments] = useState<{[key: string]: any}>({});
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  
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
  const todaySchedule = getScheduleForStudentAndDay("Khalil", currentDay);

  // Load scheduled assignments for this date
  const loadScheduledAssignments = useCallback(async () => {
    if (!getScheduledAssignment) return;
    
    const assignmentMap: {[key: string]: any} = {};
    
    for (const block of todaySchedule) {
      if (block.isAssignmentBlock && block.block) {
        const assignment = await getScheduledAssignment(block.block, formattedDate);
        if (assignment) {
          assignmentMap[`${block.block}`] = assignment;
        }
      }
    }
    
    setScheduledAssignments(assignmentMap);
  }, [getScheduledAssignment, formattedDate, todaySchedule]);

  useEffect(() => {
    loadScheduledAssignments();
  }, [loadScheduledAssignments]);

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
      <ErrorMonitoring 
        studentName="Khalil" 
        onError={(error, context) => {
          setErrorCount(prev => prev + 1);
          console.warn('Dashboard Error:', { error, context });
        }} 
      />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">Welcome, Khalil!</h1>
            </div>
            <p className="text-lg text-muted-foreground mt-1">{dateDisplay}</p>
          </div>
          <div className="flex items-center gap-2">
            <PerformanceMonitor 
              studentName="Khalil" 
              metrics={{
                cacheHits: cacheStats.hits,
                cacheMisses: cacheStats.misses,
                hitRate: cacheStats.hitRate,
                dataFreshness: Date.now(),
                lastRefresh: Date.now(),
                errorCount,
                avgResponseTime: 0
              }}
              onOptimize={async () => {
                await cleanupData();
                await refetch();
              }}
            />
            <Link to="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Home size={16} />
                Home
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Background scheduler - runs silently */}
          <BackgroundScheduler 
            studentName="Khalil" 
            onSchedulingComplete={loadScheduledAssignments}
          />
          
          {/* Co-op Checklist - only shows on co-op days */}
          <CoopChecklist 
            studentName="Khalil" 
            assignments={assignments} 
            currentDay={currentDay} 
          />

          {/* Today's Schedule */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Today's Schedule</h2>
            
            {isWeekend ? (
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
                  <StudentBlockDisplay
                    key={index}
                    block={block}
                    assignment={block.isAssignmentBlock ? scheduledAssignments[`${block.block}`] : undefined}
                    studentName="Khalil"
                    onAssignmentUpdate={loadScheduledAssignments}
                  />
                ))}
              </div>
            )}
          </div>

          {/* System Health Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemHealthDashboard studentName="Khalil" />
            <StudentAnalyticsDashboard studentName="Khalil" />
          </div>

          {/* Performance Benchmark */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Performance Metrics</h2>
            <SystemBenchmarkDashboard studentName="Khalil" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default KhalilDashboard;