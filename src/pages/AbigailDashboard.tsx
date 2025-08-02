import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home } from "lucide-react";
import { format } from "date-fns";
import { getScheduleForStudentAndDay, getCurrentDayName } from "@/data/scheduleData";

const AbigailDashboard = () => {
  const today = new Date();
  const dateDisplay = format(today, "EEEE, MMMM d, yyyy");
  const currentDay = getCurrentDayName();
  const todaySchedule = getScheduleForStudentAndDay("Abigail", currentDay);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome, Abigail!</h1>
            <p className="text-lg text-muted-foreground mt-1">{dateDisplay}</p>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home size={16} />
              Home
            </Button>
          </Link>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Today's Schedule</h2>
          
          {todaySchedule.length === 0 ? (
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
  );
};

export default AbigailDashboard;