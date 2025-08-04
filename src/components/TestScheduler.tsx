import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { getScheduleForStudentAndDay, getCurrentDayName } from '@/data/scheduleData';
import type { Assignment } from '@/hooks/useAssignments';

interface SchedulingPreview {
  block: number;
  time: string;
  assignment?: Assignment;
  overflow?: boolean; // If assignment is longer than 40 minutes
}

interface TestSchedulerProps {
  studentName: string;
  onSchedulingComplete?: () => void;
}

export function TestScheduler({ studentName, onSchedulingComplete }: TestSchedulerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<SchedulingPreview[]>([]);
  const [unscheduledCount, setUnscheduledCount] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const analyzeScheduling = async () => {
    setIsAnalyzing(true);
    setResult(null);
    
    try {
      console.log('🔍 Test Scheduler: Getting today\'s open blocks...');
      
      // Get today's assignment blocks
      const today = new Date();
      const currentDay = getCurrentDayName();
      const todaySchedule = getScheduleForStudentAndDay(studentName, currentDay);
      const assignmentBlocks = todaySchedule.filter(block => block.isAssignmentBlock && block.block);
      
      console.log(`📅 Found ${assignmentBlocks.length} assignment blocks for ${currentDay}`);
      
      // Get all unscheduled assignments that should be scheduled today
      console.log('📋 Fetching assignments within time windows...');
      
      const { data: allAssignments, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('student_name', studentName)
        .is('scheduled_block', null) // Only unscheduled assignments
        .not('due_date', 'is', null) // Must have a due date
        .order('due_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch assignments: ${error.message}`);
      }

      console.log(`📚 Found ${allAssignments?.length || 0} unscheduled assignments`);

      // Apply time window rules
      const assignments = (allAssignments || []).filter(assignment => {
        if (!assignment.due_date) return false;
        
        const dueDate = new Date(assignment.due_date);
        const timeToDeadline = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const estimatedMinutes = assignment.estimated_time_minutes || 30;
        
        // Regular assignments (< 2 hours): Schedule 3-4 days before due
        if (estimatedMinutes < 120) {
          return timeToDeadline <= 4 && timeToDeadline >= 0;
        }
        
        // Projects (>= 2 hours): Schedule 1-2 weeks before due
        return timeToDeadline <= 14 && timeToDeadline >= 0;
      });

      console.log(`✅ ${assignments.length} assignments are within scheduling time windows`);

      // Sort by due date (earliest first)
      assignments.sort((a, b) => {
        const aDate = new Date(a.due_date!);
        const bDate = new Date(b.due_date!);
        return aDate.getTime() - bDate.getTime();
      });

      // Create scheduling preview
      const schedulingPreview: SchedulingPreview[] = [];
      let assignmentIndex = 0;

      // Fill blocks with assignments in due date order
      for (const block of assignmentBlocks) {
        const assignment = assignments[assignmentIndex];
        const isOverflow = assignment && (assignment.estimated_time_minutes || 30) > 40;
        
        schedulingPreview.push({
          block: block.block!,
          time: `${block.start} - ${block.end}`,
          assignment: assignment as Assignment,
          overflow: isOverflow
        });

        if (assignment) {
          assignmentIndex++;
        }
      }

      setPreview(schedulingPreview);
      setUnscheduledCount(assignments.length - assignmentIndex);

      console.log(`📊 Scheduling preview: ${assignmentIndex} scheduled, ${assignments.length - assignmentIndex} unscheduled`);
      
    } catch (error) {
      console.error('❌ Test Scheduler analysis failed:', error);
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveSchedule = async () => {
    setIsSaving(true);
    setResult(null);
    
    try {
      console.log('💾 Saving schedule to database...');
      
      const today = new Date();
      const formattedDate = format(today, 'yyyy-MM-dd');
      const currentDay = getCurrentDayName();
      
      // Save each assignment to its scheduled block
      const updates = preview
        .filter(item => item.assignment)
        .map(item => ({
          id: item.assignment!.id,
          scheduled_block: item.block,
          scheduled_date: formattedDate,
          scheduled_day: currentDay
        }));

      console.log(`📝 Updating ${updates.length} assignments...`);

      for (const update of updates) {
        const { error } = await supabase
          .from('assignments')
          .update({
            scheduled_block: update.scheduled_block,
            scheduled_date: update.scheduled_date,
            scheduled_day: update.scheduled_day
          })
          .eq('id', update.id);

        if (error) {
          throw new Error(`Failed to update assignment ${update.id}: ${error.message}`);
        }
      }

      setResult(`✅ Successfully scheduled ${updates.length} assignments for today!`);
      
      // Notify parent component
      if (onSchedulingComplete) {
        onSchedulingComplete();
      }
      
    } catch (error) {
      console.error('❌ Save schedule failed:', error);
      setResult(`Error saving schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Test Scheduler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Simple Scheduling Rules:</strong>
            <br />
            • Regular assignments ({"<2h"}): Schedule 3-4 days before due
            <br />
            • Projects (≥2h): Schedule 1-2 weeks before due
            <br />
            • Always prioritize by due date (earliest first)
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button 
            onClick={analyzeScheduling} 
            disabled={isAnalyzing}
            className="flex-1"
          >
            {isAnalyzing ? 'Analyzing...' : 'Test Schedule Preview'}
          </Button>
          
          {preview.length > 0 && (
            <Button 
              onClick={saveSchedule} 
              disabled={isSaving}
              variant="default"
            >
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </Button>
          )}
        </div>
        
        {preview.length > 0 && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-3">📅 Today's Scheduling Preview</h3>
              <div className="space-y-2">
                {preview.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-background rounded border">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Block {item.block}</Badge>
                      <span className="text-sm text-muted-foreground">{item.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.assignment ? (
                        <>
                          <span className="text-sm font-medium">{item.assignment.title}</span>
                          {item.assignment.due_date && (
                            <Badge variant="secondary" className="text-xs">
                              Due {format(new Date(item.assignment.due_date), 'MM/dd')}
                            </Badge>
                          )}
                          {item.overflow && (
                            <Badge variant="destructive" className="text-xs">
                              {item.assignment.estimated_time_minutes}min ({">40min block"})
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">No assignment</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {unscheduledCount > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>{unscheduledCount}</strong> assignments couldn't fit in today's blocks
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {result && (
          <Alert className={result.includes('Error') ? 'border-destructive' : 'border-green-500'}>
            <AlertDescription>{result}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}