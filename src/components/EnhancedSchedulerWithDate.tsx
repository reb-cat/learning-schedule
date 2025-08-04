import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { blockSharingScheduler, type SchedulingDecision } from '@/services/blockSharingScheduler';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, Users, CheckCircle, Loader2 } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [decision, setDecision] = useState<SchedulingDecision | null>(null);
  const [hasScheduled, setHasScheduled] = useState(false);

  // Auto-schedule when component mounts
  useEffect(() => {
    const autoSchedule = async () => {
      if (hasScheduled) return; // Prevent re-scheduling
      
      setIsLoading(true);
      setDecision(null);
      
      try {
        console.log('Auto-scheduling for:', studentName, 'testDate:', testDate);
        const result = await blockSharingScheduler.analyzeAndSchedule(
          studentName, 
          7, // 7 days ahead
          testDate
        );
        
        // Auto-execute the schedule
        await blockSharingScheduler.executeSchedule(result);
        setDecision(result);
        setHasScheduled(true);
        
        console.log('Auto-scheduling completed:', result);
        onSchedulingComplete?.();
      } catch (error) {
        console.error('Error during auto-scheduling:', error);
      } finally {
        setIsLoading(false);
      }
    };

    autoSchedule();
  }, [studentName, testDate, onSchedulingComplete, hasScheduled]);

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

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'stuck': return <Badge variant="destructive" className="text-xs">Stuck</Badge>;
      case 'in_progress': return <Badge variant="secondary" className="text-xs">In Progress</Badge>;
      case 'completed': return <Badge variant="outline" className="text-xs">Completed</Badge>;
      default: return <Badge variant="outline" className="text-xs">Not Started</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Auto-Scheduling in Progress...
            </>
          ) : hasScheduled ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              Schedule Updated
            </>
          ) : (
            'Enhanced Auto-Scheduler'
          )}
          {testDate && (
            <Badge variant="outline" className="text-xs">
              Test Date: {testDate.toLocaleDateString()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Automatically analyzing and scheduling assignments...
            </AlertDescription>
          </Alert>
        )}

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
                <AlertTriangle className="h-4 w-4" />
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
                                {getStatusBadge(task.assignment.completion_status)}
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
                            {task.subject} • {task.estimated_time} min • Due: {task.due_date?.toLocaleDateString() || 'No due date'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {getStatusBadge(task.completion_status)}
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