import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home } from "lucide-react";
import { format } from "date-fns";

const scheduleBlocks = [
  { time: "9:00-9:20 AM", subject: "Bible Study", isFixed: true },
  { time: "9:20-10:10 AM", subject: "Assignment Block 1", isFixed: false },
  { time: "10:10-11:00 AM", subject: "Assignment Block 2", isFixed: false },
  { time: "11:00-11:50 AM", subject: "Assignment Block 3", isFixed: false },
  { time: "11:50 AM-12:30 PM", subject: "Lunch", isFixed: true },
  { time: "12:30-1:20 PM", subject: "Assignment Block 4", isFixed: false },
  { time: "1:20-2:10 PM", subject: "Assignment Block 5", isFixed: false },
];

const AbigailDashboard = () => {
  const today = new Date();
  const dateDisplay = format(today, "EEEE, MMMM d, yyyy");

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
          
          <div className="space-y-3">
            {scheduleBlocks.map((block, index) => (
              <Card key={index} className={`${block.isFixed ? 'bg-muted' : 'bg-card'} border border-border`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="font-medium text-sm text-muted-foreground min-w-0">
                        {block.time}
                      </div>
                      <div className="font-semibold text-foreground">
                        {block.subject}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Not Started
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbigailDashboard;