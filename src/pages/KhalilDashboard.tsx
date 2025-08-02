import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Clock, BookOpen } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { getScheduleForStudentAndDay } from "@/data/scheduleData";
import { useAssignments } from "@/hooks/useAssignments";

const KhalilDashboard = () => {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const { assignments, loading: assignmentsLoading, error: assignmentsError } = useAssignments('Khalil');
  
  // Use date parameter if provided and valid, otherwise use today
  let displayDate = new Date();
  if (dateParam) {
    const parsedDate = parse(dateParam, 'yyyy-MM-dd', new Date());
    if (isValid(parsedDate)) {
      displayDate = parsedDate;
    }
  }
  
  const dateDisplay = format(displayDate, "EEEE, MMMM d, yyyy");
  const currentDay = format(displayDate, "EEEE");
  const isWeekend = currentDay === "Saturday" || currentDay === "Sunday";
  const todaySchedule = getScheduleForStudentAndDay("Khalil", currentDay);

  // Get today's assignments
  const todayAssignments = assignments.filter(assignment => {
    if (!assignment.due_date) return false;
    const dueDate = new Date(assignment.due_date);
    return format(dueDate, 'yyyy-MM-dd') === format(displayDate, 'yyyy-MM-dd');
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome, Khalil!</h1>
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
          {/* Today's Assignments */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Today's Assignments</h2>
            
            {assignmentsLoading ? (
              <Card className="bg-card border border-border">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Loading assignments...</p>
                </CardContent>
              </Card>
            ) : assignmentsError ? (
              <Card className="bg-card border border-border">
                <CardContent className="p-6 text-center">
                  <p className="text-destructive">Error loading assignments: {assignmentsError}</p>
                </CardContent>
              </Card>
            ) : todayAssignments.length === 0 ? (
              <Card className="bg-card border border-border">
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No assignments due today!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {todayAssignments.map((assignment) => (
                  <Card key={assignment.id} className="bg-card border border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground">{assignment.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.course_name} • {assignment.subject}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {assignment.cognitive_load}
                            </Badge>
                            {assignment.estimated_time_minutes && (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {assignment.estimated_time_minutes}m
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant={assignment.urgency === 'overdue' ? 'destructive' : 'default'}>
                          {assignment.urgency?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* All Assignments */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">All Assignments ({assignments.length})</h2>
            
            {assignments.length === 0 ? (
              <Card className="bg-card border border-border">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No assignments found. Try running a manual sync from the Admin page.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {assignments.slice(0, 10).map((assignment) => (
                  <Card key={assignment.id} className="bg-card border border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{assignment.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.course_name} • {assignment.subject}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant={assignment.urgency === 'overdue' ? 'destructive' : 'secondary'} className="text-xs">
                            {assignment.urgency?.replace('_', ' ')}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {assignment.cognitive_load}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {assignments.length > 10 && (
                  <p className="text-center text-muted-foreground text-sm">
                    ... and {assignments.length - 10} more assignments
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Schedule */}
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
                            {block.subject}
                          </div>
                          {block.block && (
                            <Badge variant="outline" className="text-xs">
                              Block {block.block}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Not Started
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