import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Calendar, TestTube } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { getScheduleForStudentAndDay } from "@/data/scheduleData";
import { useAssignments } from "@/hooks/useAssignments";
import { useState, useEffect, useCallback } from "react";
import { CoopChecklist } from "@/components/CoopChecklist";
import { EnhancedSchedulerWithDate } from "@/components/EnhancedSchedulerWithDate";

import { stagingUtils, type StagingMode } from "@/utils/stagingUtils";

const KhalilDashboard = () => {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const stagingParam = searchParams.get('staging');
  
  // Determine staging mode
  const stagingMode: StagingMode = stagingParam === 'true' ? 'staging' : 'production';
  
  const { assignments, loading: assignmentsLoading, error: assignmentsError, getScheduledAssignment } = useAssignments('Khalil', stagingMode);
  const [scheduledAssignments, setScheduledAssignments] = useState<{[key: string]: any}>({});
  
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">Welcome, Khalil!</h1>
              {stagingMode === 'staging' && (
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                  <TestTube className="w-3 h-3 mr-1" />
                  Staging Mode
                </Badge>
              )}
            </div>
            <p className="text-lg text-muted-foreground mt-1">{dateDisplay}</p>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home size={16} />
              Home
            </Button>
          </Link>
        </div>
        
        <div className="space-y-6">
          {/* Enhanced Scheduler - shows for test dates */}
          {dateParam && (
            <EnhancedSchedulerWithDate 
              studentName="Khalil"
              testDate={displayDate}
              onSchedulingComplete={loadScheduledAssignments}
            />
          )}

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
                  <Card key={index} className={`${block.isAssignmentBlock ? 'bg-card' : 'bg-muted'} border border-border`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="font-medium text-sm text-muted-foreground min-w-0">
                            {block.start} - {block.end}
                          </div>
                          <div className="font-semibold text-foreground">
                            {block.isAssignmentBlock ? (
                              scheduledAssignments[`${block.block}`]?.title || 'Open Study Block'
                            ) : (
                              block.subject
                            )}
                          </div>
                          {block.block && (
                            <Badge variant="outline" className="text-xs">
                              Block {block.block}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {block.isAssignmentBlock && scheduledAssignments[`${block.block}`] ? 'Scheduled' : 'Available'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KhalilDashboard;