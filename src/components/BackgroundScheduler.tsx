import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { unifiedScheduler } from '@/services/unifiedScheduler';
import { useToast } from '@/hooks/use-toast';

interface BackgroundSchedulerProps {
  studentName?: string;
  onSchedulingComplete?: () => void;
}

export function BackgroundScheduler({ studentName, onSchedulingComplete }: BackgroundSchedulerProps) {
  const [isActive, setIsActive] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [nextRun, setNextRun] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isActive) return;

    const runScheduler = async () => {
      try {
        console.log('🤖 Background scheduler running...');
        
        // Run scheduling for specified student or both students
        const students = studentName ? [studentName] : ['Abigail', 'Khalil'];
        let totalScheduled = 0;
        
        for (const student of students) {
          const result = await unifiedScheduler.analyzeAndSchedule(student, {
            autoExecute: true,
            daysAhead: 7
          });
          totalScheduled += result.stats.scheduledTasks;
        }
        
        setScheduledCount(totalScheduled);
        setLastRun(new Date());
        
        if (totalScheduled > 0) {
          toast({
            title: "Scheduling Complete",
            description: `Scheduled ${totalScheduled} assignments automatically`,
          });
          onSchedulingComplete?.();
        }
        
      } catch (error) {
        console.error('Background scheduler error:', error);
        toast({
          title: "Scheduling Error",
          description: "Background scheduler encountered an error",
          variant: "destructive"
        });
      }
    };

    // Run immediately, then every 30 minutes
    runScheduler();
    const interval = setInterval(runScheduler, 30 * 60 * 1000);

    // Set next run time
    setNextRun(new Date(Date.now() + 30 * 60 * 1000));

    return () => clearInterval(interval);
  }, [isActive, studentName, onSchedulingComplete, toast]);

  const toggleScheduler = () => {
    setIsActive(!isActive);
    if (!isActive) {
      toast({
        title: "Background Scheduler Activated",
        description: "Automatic scheduling will run every 30 minutes",
      });
    } else {
      toast({
        title: "Background Scheduler Stopped",
        description: "Automatic scheduling has been disabled",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Background Scheduler
            {studentName && <Badge variant="outline">{studentName}</Badge>}
          </div>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{scheduledCount}</div>
            <div className="text-sm text-muted-foreground">Last Scheduled</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                {lastRun ? lastRun.toLocaleTimeString() : 'Never'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Last Run</div>
          </div>
          <div className="text-center">
            <div className="text-sm">
              {nextRun && isActive ? nextRun.toLocaleTimeString() : 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">Next Run</div>
          </div>
        </div>

        <Button 
          onClick={toggleScheduler}
          className="w-full"
          variant={isActive ? "destructive" : "default"}
        >
          {isActive ? "Stop Scheduler" : "Start Scheduler"}
        </Button>

        {isActive && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Automatic scheduling active - runs every 30 minutes
          </div>
        )}
      </CardContent>
    </Card>
  );
}