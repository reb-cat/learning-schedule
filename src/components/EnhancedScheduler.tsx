import React, { useState, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Calendar, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { blockSharingScheduler, type SchedulingDecision, type BlockComposition, type TaskClassification } from "@/services/blockSharingScheduler";
import { useToast } from "@/hooks/use-toast";

interface EnhancedSchedulerProps {
  studentName: string;
  onSchedulingComplete?: () => void;
}

const TaskBlock = memo(({ block, getCognitiveLoadColor, getTaskTypeColor }: {
  block: BlockComposition;
  getCognitiveLoadColor: (load: string) => string;
  getTaskTypeColor: (taskType: string) => string;
}) => (
  <Card className="bg-muted/50">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Block {block.block_number} • {block.day}
          </Badge>
          <Badge variant={getCognitiveLoadColor(block.cognitive_balance)}>
            {block.cognitive_balance} cognitive load
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {block.used_minutes}/{block.total_minutes}min
        </div>
      </div>
      
      <div className="space-y-2">
        {block.tasks.map((task, taskIndex) => (
          <div key={taskIndex} className="flex items-center justify-between p-2 bg-card rounded">
            <div className="flex-1">
              <div className="font-medium text-sm">{task.assignment.title}</div>
              <div className="text-xs text-muted-foreground">
                {task.assignment.course_name} • {task.assignment.subject}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getTaskTypeColor(task.assignment.task_type)} variant="secondary">
                {task.assignment.task_type.replace('_', ' ')}
              </Badge>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.allocated_minutes}m
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
));

TaskBlock.displayName = 'TaskBlock';

export const EnhancedScheduler: React.FC<EnhancedSchedulerProps> = memo(({
  studentName,
  onSchedulingComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [decision, setDecision] = useState<SchedulingDecision | null>(null);
  const { toast } = useToast();

  const handleAutoSchedule = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      console.log('Starting auto-schedule for:', studentName);
      const result = await blockSharingScheduler.analyzeAndSchedule(studentName);
      console.log('Scheduling result:', result);
      setDecision(result);
      
      // Auto-execute if there are no critical warnings
      const hasCriticalWarnings = result.warnings.some(w => 
        w.includes('overdue') || w.includes('heavy cognitive load')
      );
      
      console.log('Has critical warnings:', hasCriticalWarnings);
      
      if (!hasCriticalWarnings) {
        console.log('No critical warnings, executing schedule...');
        await executeSchedule(result);
      } else {
        toast({
          title: "Schedule Analysis Complete",
          description: `Found ${result.academic_blocks.length} schedulable blocks with ${result.warnings.length} warnings to review.`
        });
      }
    } catch (error) {
      console.error('Auto-scheduling failed:', error);
      toast({
        title: "Scheduling Failed",
        description: "Unable to analyze assignments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [studentName, toast]);

  const executeSchedule = useCallback(async (scheduleDecision?: SchedulingDecision) => {
    const targetDecision = scheduleDecision || decision;
    if (!targetDecision) return;

    console.log('Executing schedule decision:', targetDecision);
    setIsExecuting(true);
    try {
      await blockSharingScheduler.executeSchedule(targetDecision);
      console.log('Schedule execution completed successfully');
      
      toast({
        title: "Schedule Applied Successfully!",
        description: `Scheduled ${targetDecision.academic_blocks.reduce((acc, block) => acc + block.tasks.length, 0)} assignments across ${targetDecision.academic_blocks.length} blocks.`
      });
      
      setDecision(null);
      onSchedulingComplete?.();
    } catch (error) {
      console.error('Schedule execution failed:', error);
      toast({
        title: "Execution Failed",
        description: "Unable to save schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  }, [decision, onSchedulingComplete, toast]);

  const getTaskTypeColor = useCallback((taskType: string) => {
    switch (taskType) {
      case 'academic': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'quick_review': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'administrative': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }, []);

  const getCognitiveLoadColor = useCallback((load: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (load) {
      case 'heavy': return 'destructive';
      case 'medium': return 'default';
      case 'light': return 'secondary';
      default: return 'outline';
    }
  }, []);

  const schedulingStats = useMemo(() => {
    if (!decision) return null;
    
    return {
      totalBlocks: decision.academic_blocks.length,
      scheduledTasks: decision.academic_blocks.reduce((acc, block) => acc + block.tasks.length, 0),
      adminTasks: decision.administrative_tasks.length,
      unscheduledTasks: decision.unscheduled_tasks.length
    };
  }, [decision]);

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Smart Block Sharing Scheduler
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Automatically organizes assignments by time requirements and intelligently shares blocks for efficiency.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleAutoSchedule} 
            disabled={isAnalyzing || isExecuting}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Auto-Schedule'}
          </Button>
          
          {decision && (
            <Button 
              onClick={() => executeSchedule()}
              disabled={isExecuting}
              variant="outline"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Execute Schedule
            </Button>
          )}
        </div>

        {/* Results Display */}
        {decision && (
          <div className="space-y-4">
            {/* Summary Stats */}
            {schedulingStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{schedulingStats.totalBlocks}</div>
                  <div className="text-xs text-muted-foreground">Academic Blocks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{schedulingStats.scheduledTasks}</div>
                  <div className="text-xs text-muted-foreground">Scheduled Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{schedulingStats.adminTasks}</div>
                  <div className="text-xs text-muted-foreground">Admin Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{schedulingStats.unscheduledTasks}</div>
                  <div className="text-xs text-muted-foreground">Unscheduled</div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {decision.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {decision.warnings.map((warning, index) => (
                      <div key={index} className="text-sm">{warning}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Academic Blocks */}
            {decision.academic_blocks.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Scheduled Academic Blocks</h4>
                {decision.academic_blocks.map((block, index) => (
                  <TaskBlock 
                    key={index} 
                    block={block} 
                    getCognitiveLoadColor={getCognitiveLoadColor}
                    getTaskTypeColor={getTaskTypeColor}
                  />
                ))}
              </div>
            )}

            {/* Administrative Tasks */}
            {decision.administrative_tasks.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Administrative Checklist</h4>
                <Card className="bg-purple-50 dark:bg-purple-950/20">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {decision.administrative_tasks.map((task, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-card rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{task.title}</div>
                            <div className="text-xs text-muted-foreground">{task.course_name}</div>
                          </div>
                          <Badge className={getTaskTypeColor(task.task_type)} variant="secondary">
                            Admin Task
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Unscheduled Tasks */}
            {decision.unscheduled_tasks.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Unscheduled Tasks</h4>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      {decision.unscheduled_tasks.map((task, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{task.title}</span>
                          <span className="text-muted-foreground"> - {task.course_name}</span>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

EnhancedScheduler.displayName = 'EnhancedScheduler';