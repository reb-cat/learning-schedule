import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Calendar, CheckCircle } from "lucide-react";
import { format, parse, isValid, isToday, isTomorrow } from "date-fns";
import { getScheduleForStudentAndDay } from "@/data/scheduleData";
import { canvasService } from "@/services/canvasService";
import { assignmentScheduler } from "@/services/assignmentScheduler";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const AbigailDashboard = () => {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  
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
  const baseSchedule = getScheduleForStudentAndDay("Abigail", currentDay);

  useEffect(() => {
    syncWithCanvas();
    loadLastSyncTime();
  }, [currentDay]);

  const loadLastSyncTime = () => {
    const lastSync = localStorage.getItem('lastSync_Abigail');
    if (lastSync) {
      setLastSynced(new Date(lastSync));
    }
  };

  const syncWithCanvas = async () => {
    setSyncing(true);
    try {
      const assignments = await canvasService.getAssignmentsForStudent('Abigail');
      const scheduledBlocks = assignmentScheduler.scheduleAssignments(
        'Abigail',
        currentDay,
        assignments,
        baseSchedule
      );
      setSchedule(scheduledBlocks);
      
      const now = new Date();
      localStorage.setItem('lastSync_Abigail', now.toISOString());
      setLastSynced(now);
      
      toast({
        title: "Synced with Canvas",
        description: `Found ${assignments.length} assignments`
      });
    } catch (error) {
      console.error('Sync error:', error);
      setSchedule(baseSchedule);
      toast({
        title: "Sync failed",
        description: "Using default schedule",
        variant: "destructive"
      });
    }
    setSyncing(false);
  };

  const toggleAssignmentComplete = (blockIndex: number) => {
    const assignment = assignmentScheduler.getAssignmentForBlock('Abigail', currentDay, blockIndex);
    if (assignment) {
      const newCompleted = !assignment.isCompleted;
      assignmentScheduler.markAssignmentCompleted('Abigail', currentDay, blockIndex, newCompleted);
      
      // Update local state
      setSchedule(prev => prev.map((block, index) => 
        index === blockIndex ? { ...block, isCompleted: newCompleted } : block
      ));
      
      toast({
        title: newCompleted ? "Marked Complete" : "Marked Incomplete",
        description: assignment.assignment.name
      });
    }
  };

  const getDueDateBadge = (assignment: any) => {
    if (!assignment?.dueDate) return null;
    
    const dueDate = new Date(assignment.dueDate);
    if (isToday(dueDate)) {
      return <Badge variant="destructive" className="text-xs ml-2">Due Today</Badge>;
    }
    if (isTomorrow(dueDate)) {
      return <Badge variant="secondary" className="text-xs ml-2">Due Tomorrow</Badge>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome, Abigail!</h1>
            <p className="text-lg text-muted-foreground mt-1">{dateDisplay}</p>
            {lastSynced && (
              <p className="text-sm text-muted-foreground">
                Last synced: {format(lastSynced, "h:mm a")}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={syncWithCanvas}
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <Calendar size={16} />
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
            <Link to="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Home size={16} />
                Home
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Today's Schedule</h2>
          
          {isWeekend ? (
            <Card className="bg-card border border-border">
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">No classes today!</h3>
                <p className="text-muted-foreground">Enjoy your weekend! 🎉</p>
              </CardContent>
            </Card>
          ) : schedule.length === 0 ? (
            <Card className="bg-card border border-border">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No schedule available for {currentDay}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {schedule.map((block, index) => (
                <Card key={index} className={`${block.isAssignmentBlock ? 'bg-card' : 'bg-muted'} border border-border`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="font-medium text-sm text-muted-foreground min-w-0">
                          {block.start} - {block.end}
                        </div>
                        <div className="font-semibold text-foreground flex items-center">
                          {block.subject}
                          {block.assignment && getDueDateBadge(block.assignment)}
                        </div>
                        {block.block && (
                          <Badge variant="outline" className="text-xs">
                            Block {block.block}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {block.assignment ? (
                          <Button
                            variant={block.isCompleted ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleAssignmentComplete(index)}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle size={14} />
                            {block.isCompleted ? "Done" : "Mark Done"}
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {block.isAssignmentBlock && block.subject === 'Free Period' ? 'Free Period' : 'Not Started'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AbigailDashboard;