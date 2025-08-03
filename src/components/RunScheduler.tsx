import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Clock, Brain } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { smartScheduler, SchedulingResult, SchedulingDecision } from '@/services/smartScheduler';
import { Assignment } from '@/hooks/useAssignments';
import { useToast } from '@/hooks/use-toast';

interface RunSchedulerProps {
  studentName: string;
  onSchedulingComplete?: () => void;
}

export const RunScheduler = ({ studentName, onSchedulingComplete }: RunSchedulerProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [schedulingResult, setSchedulingResult] = useState<SchedulingResult | null>(null);
  const { toast } = useToast();

  const handleAnalyzeScheduling = async () => {
    setIsAnalyzing(true);
    try {
      const result = await smartScheduler.analyzeSchedulingNeeds(studentName);
      setSchedulingResult(result);
      
      toast({
        title: "Scheduling Analysis Complete",
        description: `Found ${result.decisions.length} optimal placements for assignments`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze scheduling needs. Please try again.",
        variant: "destructive",
      });
      console.error('Scheduling analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteScheduling = async () => {
    if (!schedulingResult) return;
    
    setIsExecuting(true);
    try {
      await smartScheduler.executeScheduling(
        schedulingResult.decisions,
        schedulingResult.splitAssignments
      );
      
      toast({
        title: "Scheduling Complete",
        description: `Successfully scheduled ${schedulingResult.decisions.length} assignments`,
      });
      
      setSchedulingResult(null);
      onSchedulingComplete?.();
    } catch (error) {
      toast({
        title: "Scheduling Failed",
        description: "Could not save scheduling changes. Please try again.",
        variant: "destructive",
      });
      console.error('Scheduling execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCognitiveLoadColor = (load: string) => {
    switch (load) {
      case 'heavy': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'light': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Smart Assignment Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Analyze unscheduled assignments and get optimal scheduling recommendations 
            based on due dates, cognitive load, and student preferences.
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyzeScheduling}
              disabled={isAnalyzing || isExecuting}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Scheduling Needs'}
            </Button>
            
            {schedulingResult && (
              <Button 
                onClick={handleExecuteScheduling}
                disabled={isExecuting}
                variant="default"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {isExecuting ? 'Scheduling...' : 'Execute Schedule'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {schedulingResult && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {schedulingResult.decisions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Scheduled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {schedulingResult.splitAssignments.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Split Parts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {schedulingResult.unscheduledAssignments.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Unscheduled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {schedulingResult.warnings.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduling Decisions */}
          {schedulingResult.decisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Proposed Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {schedulingResult.decisions.map((decision, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{decision.assignment.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {decision.assignment.course_name} • {decision.assignment.subject}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getUrgencyColor(decision.urgencyLevel)}>
                          {decision.urgencyLevel}
                        </Badge>
                        <Badge variant="secondary" className={getCognitiveLoadColor(
                          decision.assignment.cognitive_load || 'medium'
                        )}>
                          {decision.assignment.cognitive_load || 'medium'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(decision.targetDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Block {decision.targetBlock}
                      </div>
                      {decision.assignment.due_date && (
                        <div className="text-muted-foreground">
                          Due: {formatDate(decision.assignment.due_date)}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-muted p-3 rounded text-sm">
                      <strong>Reasoning:</strong> {decision.reasoning}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Split Assignments */}
          {schedulingResult.splitAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Split Assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {schedulingResult.splitAssignments.map((assignment, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">{assignment.title}</h4>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(assignment.scheduled_date!)} • Block {assignment.scheduled_block}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {schedulingResult.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong>Scheduling Warnings:</strong>
                  <ul className="list-disc list-inside space-y-1">
                    {schedulingResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Unscheduled Assignments */}
          {schedulingResult.unscheduledAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Unscheduled Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {schedulingResult.unscheduledAssignments.map((assignment, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="font-medium">{assignment.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {assignment.course_name} • {assignment.subject}
                        {assignment.due_date && ` • Due: ${formatDate(assignment.due_date)}`}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};