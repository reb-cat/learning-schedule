import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  Clock, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Eye,
  Loader2,
  Settings
} from "lucide-react";
import { unifiedScheduler, UnifiedSchedulingResult, SchedulerOptions } from "@/services/unifiedScheduler";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

interface UnifiedSchedulerProps {
  studentName: string;
  onSchedulingComplete?: () => void;
  mode?: 'full' | 'preview' | 'today';
  autoRefresh?: boolean;
}

export function UnifiedScheduler({ 
  studentName, 
  onSchedulingComplete,
  mode = 'full',
  autoRefresh = true
}: UnifiedSchedulerProps) {
  const [result, setResult] = useState<UnifiedSchedulingResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(mode === 'preview');
  const [includeAdminTasks, setIncludeAdminTasks] = useState(true);
  const [daysAhead, setDaysAhead] = useState(mode === 'today' ? 1 : 7);
  const { toast } = useToast();

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      console.log('🔍 Unified Scheduler: Starting analysis', {
        studentName,
        mode,
        previewOnly,
        daysAhead
      });

      const options: SchedulerOptions = {
        daysAhead,
        previewOnly: true, // Always preview first
        includeAdminTasks,
        autoExecute: false
      };

      const schedulingResult = await unifiedScheduler.analyzeAndSchedule(studentName, options);
      setResult(schedulingResult);

      toast({
        title: "Analysis Complete",
        description: `Found ${schedulingResult.stats.scheduledTasks} assignments to schedule across ${schedulingResult.stats.totalBlocks} blocks.`
      });
    } catch (error) {
      console.error('❌ Unified Scheduler: Analysis failed', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze assignments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [studentName, mode, previewOnly, daysAhead, includeAdminTasks, toast]);

  const handleExecute = useCallback(async () => {
    if (!result) {
      console.warn('🚫 Execute called but no result available');
      return;
    }

    console.log('🎬 USER CLICKED EXECUTE SCHEDULE:', {
      studentName,
      scheduledTasks: result.stats.scheduledTasks,
      totalBlocks: result.stats.totalBlocks,
      timestamp: new Date().toISOString()
    });

    setIsExecuting(true);
    try {
      console.log('💾 Calling unifiedScheduler.executeSchedule...');
      const executionResult = await unifiedScheduler.executeSchedule(result, studentName);

      console.log('✅ Execute completed:', executionResult);

      if (executionResult.success) {
        // Full or partial success
        if (executionResult.errors.length === 0) {
          toast({
            title: "Schedule Applied Successfully!",
            description: `Successfully scheduled ${executionResult.successCount} assignments across ${result.stats.totalBlocks} blocks.`
          });
        } else {
          // Partial success with errors
          toast({
            title: "Schedule Partially Applied",
            description: `Scheduled ${executionResult.successCount}/${executionResult.totalCount} assignments. ${executionResult.errors.length} errors occurred.`,
            variant: "destructive"
          });
          
          // Log detailed errors for debugging
          console.error('🔍 Execution errors:', executionResult.errors);
          
          // Show detailed error information
          setTimeout(() => {
            toast({
              title: "Execution Errors",
              description: executionResult.errors.slice(0, 3).join('\n') + (executionResult.errors.length > 3 ? '\n...' : ''),
              variant: "destructive"
            });
          }, 1000);
        }

        // Force page refresh to show updated assignments
        if (autoRefresh) {
          console.log('🔄 Auto-refreshing page to show updated assignments');
          window.location.reload();
        }

        setResult(null);
        onSchedulingComplete?.();
      } else {
        // Complete failure
        const errorSummary = executionResult.errors.length > 0 
          ? executionResult.errors[0] 
          : 'Unknown error occurred';
          
        toast({
          title: "Execution Failed",
          description: `Failed to schedule assignments: ${errorSummary}`,
          variant: "destructive"
        });

        // Show all errors in console for debugging
        console.error('🔍 All execution errors:', executionResult.errors);
      }
    } catch (error: any) {
      console.error('❌ EXECUTE SCHEDULE FAILED in component:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Execution Failed",
        description: `Unexpected error: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  }, [result, studentName, autoRefresh, onSchedulingComplete, toast]);

  const handleAutoSchedule = useCallback(async () => {
    console.log('🎬 USER CLICKED AUTO-SCHEDULE:', {
      studentName,
      daysAhead,
      includeAdminTasks,
      timestamp: new Date().toISOString()
    });

    setIsAnalyzing(true);
    try {
      const options: SchedulerOptions = {
        daysAhead,
        includeAdminTasks,
        autoExecute: true // Auto-execute if no critical warnings
      };

      console.log('🔄 Calling unifiedScheduler.analyzeAndSchedule with autoExecute...');
      const schedulingResult = await unifiedScheduler.analyzeAndSchedule(studentName, options);
      
      console.log('📊 Auto-schedule analysis complete:', {
        scheduledTasks: schedulingResult.stats.scheduledTasks,
        warnings: schedulingResult.warnings.length,
        warningsList: schedulingResult.warnings
      });

      // Check if it was auto-executed
      const hasCriticalWarnings = schedulingResult.warnings.some(w => 
        w.includes('overdue') || w.includes('critical')
      );

      if (!hasCriticalWarnings) {
        console.log('✅ Auto-execute completed successfully - no critical warnings');
        toast({
          title: "Auto-Schedule Complete!",
          description: `Automatically scheduled ${schedulingResult.stats.scheduledTasks} assignments.`
        });
        
        if (autoRefresh) {
          console.log('🔄 Auto-refreshing page to show updated assignments');
          window.location.reload();
        }
        onSchedulingComplete?.();
      } else {
        console.log('⚠️ Manual review required due to critical warnings');
        setResult(schedulingResult);
        toast({
          title: "Manual Review Required",
          description: `Found ${schedulingResult.warnings.length} warnings that need your attention.`
        });
      }
    } catch (error) {
      console.error('❌ AUTO-SCHEDULE FAILED in component:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Auto-Schedule Failed",
        description: `Unable to auto-schedule: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [studentName, daysAhead, includeAdminTasks, autoRefresh, onSchedulingComplete, toast]);

  const getUrgencyColor = useCallback((urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  }, []);

  const getCognitiveLoadColor = useCallback((load: string) => {
    switch (load) {
      case 'heavy': return 'destructive';
      case 'medium': return 'secondary';
      case 'light': return 'outline';
      default: return 'outline';
    }
  }, []);

  const groupedDecisions = useMemo(() => {
    if (!result) return {};
    return result.decisions.reduce((groups, decision) => {
      if (!groups[decision.targetDate]) {
        groups[decision.targetDate] = [];
      }
      groups[decision.targetDate].push(decision);
      return groups;
    }, {} as Record<string, typeof result.decisions>);
  }, [result]);

  const totalMinutes = useMemo(() => {
    return result?.decisions.reduce((sum, d) => sum + d.estimatedMinutes, 0) || 0;
  }, [result]);

  const urgencyCounts = useMemo(() => {
    return result?.decisions.reduce((counts, d) => {
      counts[d.urgencyLevel] = (counts[d.urgencyLevel] || 0) + 1;
      return counts;
    }, {} as Record<string, number>) || {};
  }, [result]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Unified Scheduler for {studentName}
          {mode === 'today' && <Badge variant="outline">Today Only</Badge>}
          {mode === 'preview' && <Badge variant="outline">Preview Mode</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Intelligent assignment scheduling with cognitive load balancing and block sharing
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Settings Panel */}
        {mode === 'full' && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                <Label className="font-medium">Scheduling Options</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="preview-only"
                    checked={previewOnly}
                    onCheckedChange={setPreviewOnly}
                  />
                  <Label htmlFor="preview-only">Preview Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-admin"
                    checked={includeAdminTasks}
                    onCheckedChange={setIncludeAdminTasks}
                  />
                  <Label htmlFor="include-admin">Include Admin Tasks</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="days-ahead">Days Ahead:</Label>
                  <select 
                    id="days-ahead"
                    value={daysAhead} 
                    onChange={(e) => setDaysAhead(Number(e.target.value))}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value={1}>1 Day</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>1 Week</option>
                    <option value={14}>2 Weeks</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || isExecuting}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze Schedule'}
          </Button>
          
          {mode !== 'preview' && (
            <Button 
              onClick={handleAutoSchedule} 
              disabled={isAnalyzing || isExecuting}
              variant="default"
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Auto-Schedule
            </Button>
          )}
          
          {result && !previewOnly && (
            <Button 
              onClick={handleExecute} 
              disabled={isExecuting}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Execute Schedule
            </Button>
          )}
        </div>

        {/* Results Display */}
        {result && (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="admin">Admin Tasks</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-primary">{result.stats.totalBlocks}</div>
                    <p className="text-sm text-muted-foreground">Blocks Used</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{result.stats.scheduledTasks}</div>
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">{result.stats.adminTasks}</div>
                    <p className="text-sm text-muted-foreground">Admin Tasks</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{result.stats.unscheduledTasks}</div>
                    <p className="text-sm text-muted-foreground">Unscheduled</p>
                  </CardContent>
                </Card>
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {result.warnings.map((warning, index) => (
                        <div key={index} className="text-sm">{warning}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Critical Urgency Alert */}
              {urgencyCounts.critical > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {urgencyCounts.critical} critical assignment(s) found. These are overdue or due today.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="timeline" className="space-y-4">
              {Object.entries(groupedDecisions).map(([date, dayDecisions]) => (
                <Card key={date}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-2">
                       {dayDecisions
                         .sort((a, b) => a.targetBlock - b.targetBlock)
                         .map((decision, idx) => {
                           // DEBUG: Log each decision being rendered
                           console.log('=== RENDER DEBUG ===', 'Decision:', decision, 'studentName prop:', studentName, 'decision.studentName:', decision.studentName);
                           return (
                             <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">Block {decision.targetBlock}</Badge>
                                 <div>
                                   <div className="font-medium">{decision.assignment.title} - {decision.studentName || studentName}</div>
                                 <div className="text-xs text-muted-foreground">{decision.assignment.course_name}</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getUrgencyColor(decision.urgencyLevel)}>
                                {decision.urgencyLevel}
                              </Badge>
                              <Badge variant={getCognitiveLoadColor(decision.cognitiveLoad)}>
                                {decision.cognitiveLoad}
                              </Badge>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {decision.estimatedMinutes}m
                               </div>
                             </div>
                           </div>
                           );
                         })}
                     </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              {result.decisions.map((decision, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{decision.assignment.title} - {decision.studentName || studentName}</h4>
                         <div className="flex gap-2">
                           <Badge variant={getUrgencyColor(decision.urgencyLevel)}>
                             {decision.urgencyLevel}
                           </Badge>
                           <Badge variant={getCognitiveLoadColor(decision.cognitiveLoad)}>
                             {decision.cognitiveLoad}
                           </Badge>
                         </div>
                       </div>
                        <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                          <div><strong>Student:</strong> {decision.studentName || studentName}</div>
                         <div><strong>Subject:</strong> {decision.assignment.subject || decision.assignment.course_name}</div>
                         <div><strong>Due:</strong> {decision.assignment.due_date ? format(new Date(decision.assignment.due_date), 'MMM d, yyyy') : 'No due date'}</div>
                         <div><strong>Scheduled:</strong> {format(new Date(decision.targetDate), 'EEE, MMM d')}, Block {decision.targetBlock}</div>
                         <div><strong>Duration:</strong> {decision.estimatedMinutes} minutes</div>
                       </div>
                      <div className="text-sm bg-muted/50 p-2 rounded">
                        <strong>Reasoning:</strong> {decision.reasoning}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="admin" className="space-y-4">
              {result.administrativeTasks.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold">Administrative Checklist</h4>
                  {result.administrativeTasks.map((task, index) => (
                    <Card key={index} className="bg-purple-50 dark:bg-purple-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                           <div>
                              <div className="font-medium">{task.title} - {(task as any).studentName || studentName}</div>
                             <div className="text-sm text-muted-foreground">{task.course_name}</div>
                             {task.due_date && (
                               <div className="text-xs text-muted-foreground">
                                 Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                               </div>
                             )}
                           </div>
                          <Badge variant="secondary">Admin Task</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No administrative tasks found.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* No Results Message */}
        {result && result.decisions.length === 0 && result.administrativeTasks.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No assignments need scheduling at this time. All assignments are either scheduled or not eligible for scheduling.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}