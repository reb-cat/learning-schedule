import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { unifiedScheduler, UnifiedSchedulingResult, SchedulerOptions } from "@/services/unifiedScheduler";
import { useToast } from "@/hooks/use-toast";
import { useClearAssignmentScheduling } from "@/hooks/useClearAssignmentScheduling";

interface ConsolidatedSchedulerProps {
  onSchedulingComplete?: () => void;
}

type StudentOption = 'Abigail' | 'Khalil' | 'Both';

export function ConsolidatedScheduler({ onSchedulingComplete }: ConsolidatedSchedulerProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentOption>('Abigail');
  const [result, setResult] = useState<UnifiedSchedulingResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { clearScheduling, isClearing } = useClearAssignmentScheduling();

  const handleAutoSchedule = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const options: SchedulerOptions = {
        daysAhead: 3, // Default to "Next 3 Days"
        startDate: new Date(),
        previewOnly: false,
        includeAdminTasks: true,
        autoExecute: true,
        currentTime: new Date()
      };

      let schedulingResult: UnifiedSchedulingResult;
      
      if (selectedStudent === 'Both') {
        const abigailResult = await unifiedScheduler.analyzeAndSchedule('Abigail', options);
        const khalilResult = await unifiedScheduler.analyzeAndSchedule('Khalil', options);
        
        await unifiedScheduler.executeSchedule(abigailResult, 'Abigail');
        await unifiedScheduler.executeSchedule(khalilResult, 'Khalil');
        
        schedulingResult = {
          ...abigailResult,
          stats: {
            ...abigailResult.stats,
            scheduledTasks: abigailResult.stats.scheduledTasks + khalilResult.stats.scheduledTasks,
            totalBlocks: abigailResult.stats.totalBlocks + khalilResult.stats.totalBlocks
          }
        };
      } else {
        schedulingResult = await unifiedScheduler.analyzeAndSchedule(selectedStudent, options);
        await unifiedScheduler.executeSchedule(schedulingResult, selectedStudent);
      }

      setResult(schedulingResult);
      onSchedulingComplete?.();

      toast({
        title: "Auto-Schedule Complete!",
        description: `Successfully scheduled ${schedulingResult.stats.scheduledTasks} assignments for ${selectedStudent}.`
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
                Scheduled {result.stats.scheduledTasks} assignments across {result.stats.totalBlocks} blocks for {selectedStudent}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}