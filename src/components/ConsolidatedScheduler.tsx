import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Eye,
  Loader2,
  Settings,
  Users
} from "lucide-react";
import { unifiedScheduler, UnifiedSchedulingResult, SchedulerOptions } from "@/services/unifiedScheduler";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from 'date-fns';
import { cn } from "@/lib/utils";
import { useClearAssignmentScheduling } from "@/hooks/useClearAssignmentScheduling";

interface ConsolidatedSchedulerProps {
  onSchedulingComplete?: () => void;
}

type DateRangeOption = 'today' | 'next3days' | 'nextweek' | 'custom';
type StudentOption = 'Abigail' | 'Khalil' | 'Both';

export function ConsolidatedScheduler({ onSchedulingComplete }: ConsolidatedSchedulerProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentOption>('Abigail');
  const [dateRange, setDateRange] = useState<DateRangeOption>('today');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [includeAdminTasks, setIncludeAdminTasks] = useState(true);
  const [previewOnly, setPreviewOnly] = useState(false);
  
  const [result, setResult] = useState<UnifiedSchedulingResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();
  const { clearScheduling } = useClearAssignmentScheduling();

  const getDaysAhead = useCallback(() => {
    switch (dateRange) {
      case 'today':
        return 1;
      case 'next3days':
        return 3;
      case 'nextweek':
        return 7;
      case 'custom':
        if (customDate) {
          const diffTime = customDate.getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return Math.max(1, diffDays);
        }
        return 1;
      default:
        return 1;
    }
  }, [dateRange, customDate]);

  const getDateRangeDisplay = useCallback(() => {
    switch (dateRange) {
      case 'today':
        return 'Today Only';
      case 'next3days':
        return 'Next 3 Days';
      case 'nextweek':
        return 'Next Week';
      case 'custom':
        return customDate ? `Until ${format(customDate, 'MMM dd')}` : 'Custom';
      default:
        return 'Today Only';
    }
  }, [dateRange, customDate]);

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const options: SchedulerOptions = {
        daysAhead: getDaysAhead(),
        startDate: dateRange === 'custom' && customDate ? customDate : new Date(),
        previewOnly: true,
        includeAdminTasks,
        autoExecute: false
      };

      let schedulingResult: UnifiedSchedulingResult;
      
      if (selectedStudent === 'Both') {
        const abigailResult = await unifiedScheduler.analyzeAndSchedule('Abigail', options);
        const khalilResult = await unifiedScheduler.analyzeAndSchedule('Khalil', options);
        
        schedulingResult = {
          ...abigailResult,
          stats: {
            ...abigailResult.stats,
            scheduledTasks: abigailResult.stats.scheduledTasks + khalilResult.stats.scheduledTasks,
            totalBlocks: abigailResult.stats.totalBlocks + khalilResult.stats.totalBlocks,
            adminTasks: abigailResult.stats.adminTasks + khalilResult.stats.adminTasks,
            unscheduledTasks: abigailResult.stats.unscheduledTasks + khalilResult.stats.unscheduledTasks
          },
          decisions: [...abigailResult.decisions, ...khalilResult.decisions],
          warnings: [...abigailResult.warnings, ...khalilResult.warnings],
          administrativeTasks: [...abigailResult.administrativeTasks, ...khalilResult.administrativeTasks],
          splitAssignments: [...abigailResult.splitAssignments, ...khalilResult.splitAssignments],
          unscheduledAssignments: [...abigailResult.unscheduledAssignments, ...khalilResult.unscheduledAssignments]
        };
      } else {
        schedulingResult = await unifiedScheduler.analyzeAndSchedule(selectedStudent, options);
      }

      setResult(schedulingResult);

      toast({
        title: "Analysis Complete",
        description: `Found ${schedulingResult.stats.scheduledTasks} assignments to schedule across ${schedulingResult.stats.totalBlocks} blocks for ${selectedStudent}.`
      });
    } catch (error) {
      console.error('❌ Consolidated Scheduler: Analysis failed', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze assignments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedStudent, getDaysAhead, includeAdminTasks, toast]);

  const handleAutoSchedule = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const options: SchedulerOptions = {
        daysAhead: getDaysAhead(),
        startDate: dateRange === 'custom' && customDate ? customDate : new Date(),
        previewOnly: false,
        includeAdminTasks,
        autoExecute: true
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
  }, [selectedStudent, getDaysAhead, includeAdminTasks, onSchedulingComplete, toast]);

  const handleExecute = useCallback(async () => {
    if (!result) return;

    setIsExecuting(true);
    try {
      if (selectedStudent === 'Both') {
        toast({
          title: "Execution Notice",
          description: "For 'Both' students mode, please use individual student scheduling for execution.",
          variant: "default"
        });
        return;
      }

      await unifiedScheduler.executeSchedule(result, selectedStudent);
      onSchedulingComplete?.();

      toast({
        title: "Schedule Executed!",
        description: `Successfully applied schedule for ${selectedStudent}.`
      });
    } catch (error) {
      console.error('❌ Execute failed', error);
      toast({
        title: "Execution Failed",
        description: "Unable to execute schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  }, [result, selectedStudent, onSchedulingComplete, toast]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getCognitiveLoadColor = (load: string) => {
    switch (load) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const groupedDecisions = useMemo(() => {
    if (!result?.decisions) return [];
    
    const grouped = result.decisions.reduce((acc, decision) => {
      const dateKey = decision.targetDate;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(decision);
      return acc;
    }, {} as Record<string, typeof result.decisions>);

    return Object.entries(grouped).map(([date, decisions]) => ({
      date,
      decisions: decisions.sort((a, b) => a.targetBlock - b.targetBlock)
    }));
  }, [result?.decisions]);

  const totalMinutes = useMemo(() => {
    return result?.decisions.reduce((sum, decision) => 
      sum + (decision.assignment.estimated_time_minutes || 0), 0
    ) || 0;
  }, [result?.decisions]);

  const urgencyCounts = useMemo(() => {
    if (!result?.decisions) return { high: 0, medium: 0, low: 0 };
    return result.decisions.reduce((acc, decision) => {
      const urgency = decision.assignment.urgency || 'medium';
      acc[urgency as keyof typeof acc] = (acc[urgency as keyof typeof acc] || 0) + 1;
      return acc;
    }, { high: 0, medium: 0, low: 0 });
  }, [result?.decisions]);

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Scheduler Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">Configure your scheduling preferences</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Controls Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Student Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                Student
              </Label>
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

            {/* Date Range Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                Time Range
              </Label>
              <Select value={dateRange} onValueChange={(value: DateRangeOption) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today Only</SelectItem>
                  <SelectItem value="next3days">Next 3 Days</SelectItem>
                  <SelectItem value="nextweek">Next Week</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Settings className="h-3 w-3" />
                Options
              </Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-tasks" className="text-xs">Admin Tasks</Label>
                  <Switch
                    id="admin-tasks"
                    checked={includeAdminTasks}
                    onCheckedChange={setIncludeAdminTasks}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="preview-only" className="text-xs">Preview Only</Label>
                  <Switch
                    id="preview-only"
                    checked={previewOnly}
                    onCheckedChange={setPreviewOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Custom Date Picker (only when custom is selected) */}
          {dateRange === 'custom' && (
            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-2 block">Select End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !customDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate ? format(customDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Clear Scheduling Button */}
          <div className="border-t pt-4">
            <Button 
              onClick={async () => {
                try {
                  await clearScheduling(['20b60480-f710-491b-b782-3fbafb9f81b1', 'c5994b9d-d762-47df-9384-611a29a0e851']);
                  toast({
                    title: "Scheduling Cleared",
                    description: "Manual assignments are now available for scheduling.",
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to clear assignment scheduling.",
                    variant: "destructive"
                  });
                }
              }}
              variant="outline"
              size="sm"
            >
              Clear Manual Assignment Scheduling
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || isExecuting}
              variant="outline"
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Analyze Schedule
                </>
              )}
            </Button>

            <Button 
              onClick={handleAutoSchedule} 
              disabled={isAnalyzing || isExecuting}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Auto-Scheduling...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Auto-Schedule
                </>
              )}
            </Button>

            {result && !previewOnly && (
              <Button 
                onClick={handleExecute} 
                disabled={isExecuting || isAnalyzing}
                variant="secondary"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Execute Schedule
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Configuration Display */}
      <div className="text-sm text-muted-foreground bg-background border rounded-lg p-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span><strong>Student:</strong> {selectedStudent}</span>
          <span><strong>Range:</strong> {getDateRangeDisplay()}</span>
          <span><strong>Admin Tasks:</strong> {includeAdminTasks ? 'Yes' : 'No'}</span>
          <span><strong>Preview Only:</strong> {previewOnly ? 'Yes' : 'No'}</span>
        </div>
      </div>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduling Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="admin">Admin Tasks</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{result.stats.scheduledTasks}</div>
                    <div className="text-sm text-blue-700">Scheduled Tasks</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{result.stats.totalBlocks}</div>
                    <div className="text-sm text-green-700">Time Blocks</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{Math.round(totalMinutes / 60 * 10) / 10}h</div>
                    <div className="text-sm text-purple-700">Total Time</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{urgencyCounts.high}</div>
                    <div className="text-sm text-orange-700">High Priority</div>
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {result.warnings.map((warning, index) => (
                          <div key={index}>{warning}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                {groupedDecisions.map(({ date, decisions }) => (
                  <div key={date} className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(new Date(date), 'EEEE, MMM d')}
                    </h4>
                    <div className="space-y-2 ml-6">
                      {decisions.map((decision, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">Block {decision.targetBlock}</Badge>
                            <span className="font-medium">{decision.assignment.title}</span>
                            <Badge variant={getUrgencyColor(decision.assignment.urgency || 'medium')}>
                              {decision.assignment.urgency || 'medium'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {decision.assignment.estimated_time_minutes}min
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {result.decisions.map((decision, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{decision.assignment.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={getUrgencyColor(decision.assignment.urgency || 'medium')}>
                          {decision.assignment.urgency || 'medium'}
                        </Badge>
                        <Badge variant={getCognitiveLoadColor(decision.assignment.cognitive_load || 'medium')}>
                          <Brain className="w-3 h-3 mr-1" />
                          {decision.assignment.cognitive_load || 'medium'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
                      <span><Clock className="w-3 h-3 inline mr-1" />{decision.assignment.estimated_time_minutes}min</span>
                      <span>Block {decision.targetBlock}</span>
                      <span>{format(new Date(decision.targetDate), 'MMM d')}</span>
                      <span>{decision.assignment.course_name}</span>
                    </div>
                    <p className="text-sm">{decision.reasoning}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="admin" className="space-y-4">
                {result.administrativeTasks && result.administrativeTasks.length > 0 ? (
                  result.administrativeTasks.map((task, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-amber-900">{task.title}</h4>
                        <Badge variant="secondary">{task.priority || 'medium'}</Badge>
                      </div>
                      <p className="text-sm text-amber-800">{task.notes || 'Administrative task'}</p>
                      {task.due_date && (
                        <p className="text-xs text-amber-700 mt-1">
                          Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No administrative tasks found</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}