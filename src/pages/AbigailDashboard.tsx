import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, RefreshCw } from "lucide-react";
import { CoopChecklist } from "@/components/CoopChecklist";
import { OptimizedStudentBlockDisplay } from "@/components/OptimizedStudentBlockDisplay";
import { ErrorFallback } from "@/components/ErrorFallback";
import { GuidedDayView } from "@/components/GuidedDayView";
import { useStudentDashboard } from "@/hooks/useStudentDashboard";
import { useScheduledAssignments } from "@/hooks/useScheduledAssignments";

const AbigailDashboard = () => {
  const [isGuidedMode, setIsGuidedMode] = useState(false);
  
  try {
    const {
      assignments,
      assignmentsLoading,
      assignmentsError,
      getScheduledAssignment,
      refetch,
      criticalError,
      setCriticalError,
      todaySchedule,
      hasAllDayEvent,
      isCheckingAllDayEvent,
      dateDisplay,
      formattedDate,
      currentDay,
      isWeekend,
      handleEventUpdate,
      forceRefresh,
      isAutoScheduling
    } = useStudentDashboard('Abigail');

    const { scheduledAssignments, isLoadingAssignments, clearCache } = useScheduledAssignments(
      getScheduledAssignment,
      formattedDate,
      todaySchedule
    );

    // Derive the exact assignments shown in Regular View (ordered by blocks)
    const guidedAssignments = todaySchedule
      .filter((b: any) => b.isAssignmentBlock)
      .map((b: any) => scheduledAssignments[`${b.block}`])
      .filter((a: any) => Boolean(a));

    // Update event handler to clear assignment cache
    const handleEventUpdateWithCache = () => {
      clearCache();
      handleEventUpdate();
    };

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
              <Button
                variant="outline"
                size="sm"
                onClick={forceRefresh}
                disabled={isAutoScheduling}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isAutoScheduling ? 'animate-spin' : ''}`} />
                {isAutoScheduling ? 'Scheduling...' : 'Force Refresh'}
              </Button>
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={!isGuidedMode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setIsGuidedMode(false)}
                  className="text-sm"
                >
                  Regular View
                </Button>
                <Button
                  variant={isGuidedMode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setIsGuidedMode(true)}
                  className="text-sm"
                >
                  Guided Day
                </Button>
              </div>
              <Link to="/">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Home size={16} />
                  Home
                </Button>
              </Link>
            </div>
          </div>
          
          {isGuidedMode ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Guided Day Mode</h2>
<GuidedDayView 
                assignments={guidedAssignments as any}
                studentName="Abigail"
                formattedDate={formattedDate}
                onAssignmentUpdate={() => {
                  clearCache();
                  handleEventUpdate();
                  refetch();
                }}
              />
            </div>
          ) : (
            <>
              {/* Co-op Checklist - only shows on co-op days */}
              <CoopChecklist 
                studentName="Abigail" 
                assignments={assignments} 
                currentDay={currentDay} 
                hasAllDayEvent={hasAllDayEvent}
                isCheckingAllDayEvent={isCheckingAllDayEvent}
              />

              {/* Today's Schedule */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Today's Schedule</h2>
                
                {isCheckingAllDayEvent ? (
                  <Card className="bg-card border border-border">
                    <CardContent className="p-8 text-center">
                      <div className="text-muted-foreground">Loading schedule...</div>
                    </CardContent>
                  </Card>
                ) : hasAllDayEvent ? (
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
                        key={`block-${index}-${block.start}-${formattedDate}`}
                        block={block}
                        assignment={block.isAssignmentBlock ? scheduledAssignments[`${block.block}`] : undefined}
                        studentName="Abigail"
                        onAssignmentUpdate={() => {
                          clearCache();
                          handleEventUpdate();
                          refetch();
                        }}
                        isLoading={isLoadingAssignments}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
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