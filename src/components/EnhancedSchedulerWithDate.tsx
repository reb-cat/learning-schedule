import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, Play, CheckCircle } from 'lucide-react';
import { blockSharingScheduler } from '@/services/blockSharingScheduler';
import { useToast } from '@/hooks/use-toast';
import type { SchedulingDecision } from '@/services/blockSharingScheduler';

interface EnhancedSchedulerWithDateProps {
  studentName: string;
  testDate?: Date;
  onSchedulingComplete?: () => void;
}

export function EnhancedSchedulerWithDate({ 
  studentName, 
  testDate,
  onSchedulingComplete 
}: EnhancedSchedulerWithDateProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [decision, setDecision] = useState<SchedulingDecision | null>(null);
  const { toast } = useToast();

  const handleAutoSchedule = async () => {
    setIsAnalyzing(true);
    try {
      console.log('Auto-scheduling for', studentName, 'with test date:', testDate);
      const result = await blockSharingScheduler.analyzeAndSchedule(studentName, 7, testDate);
      setDecision(result);
      
      toast({
        title: "Analysis Complete",
        description: `Found ${result.academic_blocks.filter(b => b.tasks.length > 0).length} blocks with assignments to schedule.`,
      });

      // Auto-execute if no critical warnings
      const hasCriticalWarnings = result.warnings.some(w => 
        w.includes('overdue') || w.includes('could not be scheduled')
      );
      
      if (!hasCriticalWarnings && result.academic_blocks.some(b => b.tasks.length > 0)) {
        setTimeout(() => executeSchedule(result), 1000);
      }
    } catch (error) {
      console.error('Auto-schedule error:', error);
      toast({
        title: "Scheduling Error",
        description: "Failed to analyze assignments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeSchedule = async (scheduleDecision: SchedulingDecision) => {
    setIsExecuting(true);
    try {
      await blockSharingScheduler.executeSchedule(scheduleDecision);
      
      toast({
        title: "Schedule Executed Successfully",
        description: "Assignments have been scheduled to available blocks.",
      });
      
      setDecision(null);
      onSchedulingComplete?.();
    } catch (error) {
      console.error('Execute schedule error:', error);
      toast({
        title: "Execution Error",
        description: "Failed to save schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'academic': return 'bg-blue-100 text-blue-800';
      case 'quick_review': return 'bg-green-100 text-green-800';
      case 'administrative': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCognitiveLoadColor = (load: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (load) {
      case 'heavy': return 'destructive';
      case 'medium': return 'secondary';
      case 'light': return 'outline';
      default: return 'default';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Enhanced Assignment Scheduler
          {testDate && (
            <Badge variant="outline" className="ml-2">
              Test Date: {testDate.toLocaleDateString()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <Button 
            onClick={handleAutoSchedule}
            disabled={isAnalyzing || isExecuting}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Auto-Schedule'}
          </Button>

          {decision && (
            <Button 
              onClick={() => executeSchedule(decision)}
              disabled={isExecuting}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {isExecuting ? 'Executing...' : 'Execute Schedule'}
            </Button>
          )}
        </div>

        {decision && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {decision.academic_blocks.filter(b => b.tasks.length > 0).length}
                </div>
                <div className="text-sm text-blue-600">Scheduled Blocks</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {decision.academic_blocks.reduce((sum, b) => sum + b.tasks.length, 0)}
                </div>
                <div className="text-sm text-green-600">Total Tasks</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {decision.unscheduled_tasks.length}
                </div>
                <div className="text-sm text-orange-600">Unscheduled</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {decision.administrative_tasks.length}
                </div>
                <div className="text-sm text-purple-600">Admin Tasks</div>
              </div>
            </div>

            {/* Warnings */}
            {decision.warnings.length > 0 && (
              <Alert>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {decision.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Academic Blocks */}
            {decision.academic_blocks.filter(b => b.tasks.length > 0).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Scheduled Academic Blocks</h3>
                {decision.academic_blocks
                  .filter(b => b.tasks.length > 0)
                  .map((block, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">
                            Block {block.block_number} - {block.day}, {block.date}
                          </span>
                          <Badge variant={getCognitiveLoadColor(block.cognitive_balance)}>
                            {block.cognitive_balance} load
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {block.tasks.map((task, taskIndex) => (
                            <div key={taskIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{task.assignment.title}</span>
                                <div className="text-sm text-gray-600">
                                  {task.assignment.subject} • {task.allocated_minutes} min
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Badge className={getTaskTypeColor(task.assignment.task_type)}>
                                  {task.assignment.task_type}
                                </Badge>
                                <Badge variant={getCognitiveLoadColor(task.assignment.cognitive_load)}>
                                  {task.assignment.cognitive_load}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          Used: {block.used_minutes}min / {block.total_minutes}min 
                          (Buffer: {block.total_minutes - block.used_minutes - block.buffer_minutes}min)
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            {/* Unscheduled Tasks */}
            {decision.unscheduled_tasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-orange-600">Unscheduled Tasks</h3>
                {decision.unscheduled_tasks.map((task, index) => (
                  <Card key={index} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{task.title}</span>
                          <div className="text-sm text-gray-600">
                            {task.subject} • {task.actual_estimated_minutes} min • Due: {task.due_date?.toLocaleDateString() || 'No due date'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getTaskTypeColor(task.task_type)}>
                            {task.task_type}
                          </Badge>
                          <Badge variant={getCognitiveLoadColor(task.cognitive_load)}>
                            {task.cognitive_load}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}