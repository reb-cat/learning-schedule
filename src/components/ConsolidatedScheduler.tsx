import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { blockSharingScheduler, SchedulingDecision } from "@/services/blockSharingScheduler";
import { useToast } from "@/hooks/use-toast";
import { useClearAssignmentScheduling } from "@/hooks/useClearAssignmentScheduling";

interface ConsolidatedSchedulerProps {
  onSchedulingComplete?: () => void;
}

type StudentOption = 'Abigail' | 'Khalil' | 'Both';

export function ConsolidatedScheduler({ onSchedulingComplete }: ConsolidatedSchedulerProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentOption>('Abigail');
  const [result, setResult] = useState<SchedulingDecision | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { clearScheduling, isClearing } = useClearAssignmentScheduling();

  const handleAutoSchedule = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      let schedulingResult: SchedulingDecision;
      
      if (selectedStudent === 'Both') {
        const abigailResult = await blockSharingScheduler.analyzeAndSchedule('Abigail', 3, new Date());
        const khalilResult = await blockSharingScheduler.analyzeAndSchedule('Khalil', 3, new Date());
        
        await blockSharingScheduler.executeSchedule(abigailResult);
        await blockSharingScheduler.executeSchedule(khalilResult);
        
        schedulingResult = {
          academic_blocks: [...abigailResult.academic_blocks, ...khalilResult.academic_blocks],
          administrative_tasks: [...abigailResult.administrative_tasks, ...khalilResult.administrative_tasks],
          unscheduled_tasks: [...abigailResult.unscheduled_tasks, ...khalilResult.unscheduled_tasks],
          warnings: [...abigailResult.warnings, ...khalilResult.warnings]
        };
      } else {
        schedulingResult = await blockSharingScheduler.analyzeAndSchedule(selectedStudent, 3, new Date());
        await blockSharingScheduler.executeSchedule(schedulingResult);
      }

      setResult(schedulingResult);
      onSchedulingComplete?.();

      toast({
        title: "Auto-Schedule Complete!",
        description: `Successfully scheduled assignments for ${selectedStudent}.`
      });
    } catch (error) {
      console.error('❌ Auto-schedule failed', error);
      toast({
        title: "Auto-Schedule Failed",
        description: "Unable to execute automatic scheduling. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedStudent, onSchedulingComplete, toast]);

  const handleClearSchedule = useCallback(async () => {
    try {
      if (selectedStudent === 'Both') {
        await clearScheduling();
      } else {
        await clearScheduling(selectedStudent);
      }
      
      setResult(null);
      onSchedulingComplete?.();
      
      toast({
        title: "Schedule Cleared",
        description: `Cleared schedule for ${selectedStudent}`
      });
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: "Unable to clear schedule. Please try again.",
        variant: "destructive"
      });
    }
  }, [selectedStudent, clearScheduling, onSchedulingComplete, toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Student Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Student</label>
            <Select value={selectedStudent} onValueChange={(value: StudentOption) => setSelectedStudent(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Abigail">Abigail</SelectItem>
                <SelectItem value="Khalil">Khalil</SelectItem>
                <SelectItem value="Both">Both Students</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              onClick={handleAutoSchedule} 
              disabled={isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Auto-Schedule'
              )}
            </Button>
            
            <Button 
              onClick={handleClearSchedule} 
              disabled={isClearing}
              variant="outline"
              className="flex-1"
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear Schedule'
              )}
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
              <h4 className="font-medium mb-2">Results</h4>
              <p className="text-sm text-muted-foreground">
                Scheduled {result.academic_blocks.length} assignments for {selectedStudent}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}