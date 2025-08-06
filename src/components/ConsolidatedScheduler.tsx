import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { blockSharingScheduler, SchedulingDecision } from "@/services/blockSharingScheduler";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from 'date-fns';
import { cn } from "@/lib/utils";
import { useClearAssignmentScheduling } from "@/hooks/useClearAssignmentScheduling";
import { 
  getSmartDefaultRange, 
  shouldRestrictToFutureDates, 
  getCurrentTimeDisplay,
  getAdjustedDateRange
} from "@/utils/timeAwareness";
import { supabase } from "@/integrations/supabase/client";

interface ConsolidatedSchedulerProps {
  onSchedulingComplete?: () => void;
}

type DateRangeOption = 'today' | 'next3days' | 'nextweek' | 'custom';
type StudentOption = 'Abigail' | 'Khalil' | 'Both';

export function ConsolidatedScheduler({ onSchedulingComplete }: ConsolidatedSchedulerProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentOption>('Abigail');
  const [dateRange, setDateRange] = useState<DateRangeOption>(() => {
    const now = new Date();
    return getSmartDefaultRange(now);
  });
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [includeAdminTasks, setIncludeAdminTasks] = useState(true);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [forceNextDay, setForceNextDay] = useState(false);
  const [currentTime] = useState(new Date()); // Capture current time when component loads
  const [showDateAdjustmentSuggestion, setShowDateAdjustmentSuggestion] = useState(false);
  
  const [result, setResult] = useState<SchedulingDecision | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();
  const { clearScheduling, isClearing } = useClearAssignmentScheduling();

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
    setShowDateAdjustmentSuggestion(false);
    setResult(null);
    
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      
      // DEBUG: Log all time-related calculations
      console.log('=== TIME DEBUG ===');
      console.log('Current time:', now.toLocaleString());
      console.log('Selected dateRange:', dateRange);
      console.log('Custom date:', customDate);
      console.log('Current hour:', currentHour);
      console.log('Current minutes:', currentMinutes);
      
      // Check what getDaysAhead is actually returning
      const calculatedDaysAhead = getDaysAhead();
      console.log('Days ahead calculated:', calculatedDaysAhead);
      
      // Check what date the scheduler will actually target
      const targetDate = new Date();
      if (dateRange === 'custom' && customDate) {
        console.log('Using custom date:', customDate.toDateString());
      } else {
        targetDate.setDate(targetDate.getDate() + calculatedDaysAhead - 1);
        console.log('Target date will be:', targetDate.toDateString());
      }
      
      // Time awareness check - force tomorrow if all today's blocks have passed
      let actualRange = dateRange;
      let actualCustomDate = customDate;
      let forceTimeAwareness = false;
      
      // If it's after 8 PM and user selected "Today Only", force to tomorrow
      if (currentHour >= 20 && dateRange === 'today') {
        console.log('AFTER 8PM - Forcing tomorrow');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        actualCustomDate = tomorrow;
        actualRange = 'custom';
        forceTimeAwareness = true;
        
        console.log('Forced tomorrow date:', tomorrow.toDateString());
        
        toast({
          title: "Time Awareness Active",
          description: "⚠️ All blocks for today have passed. Scheduling for tomorrow instead.",
          variant: "default"
        });
      }
      
      // Check if date adjustment is needed (only if not already forced by time awareness)
      if (!forceTimeAwareness) {
        const { adjustedRange, adjustedDate, needsAdjustment } = getAdjustedDateRange(
          dateRange, 
          customDate, 
          currentTime
        );
        
        console.log('Date adjustment check:', { adjustedRange, adjustedDate, needsAdjustment });
        
        if (needsAdjustment) {
          console.log('Date adjustment needed - showing suggestion');
          setShowDateAdjustmentSuggestion(true);
          setIsAnalyzing(false);
          return;
        }
      }
      
      // Calculate days ahead based on actual range
      const getDaysAheadForRange = (range: DateRangeOption, customDt?: Date) => {
        switch (range) {
          case 'today':
            return 1;
          case 'next3days':
            return 3;
          case 'nextweek':
            return 7;
          case 'custom':
            if (customDt) {
              const diffTime = customDt.getTime() - new Date().getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return Math.max(1, diffDays);
            }
            return 1;
          default:
            return 1;
        }
      };
      
      const finalDaysAhead = getDaysAheadForRange(actualRange, actualCustomDate);
      console.log('Final days ahead:', finalDaysAhead);
      
      const startDate = forceNextDay ? addDays(new Date(), 1) : (actualRange === 'custom' && actualCustomDate ? actualCustomDate : new Date());
      
      console.log('Final scheduler startDate:', startDate);
      console.log('=== END TIME DEBUG ===');

      let schedulingResult: SchedulingDecision;
      
      if (selectedStudent === 'Both') {
        const abigailResult = await blockSharingScheduler.analyzeAndSchedule('Abigail', finalDaysAhead, startDate, currentTime);
        const khalilResult = await blockSharingScheduler.analyzeAndSchedule('Khalil', finalDaysAhead, startDate, currentTime);
        
        schedulingResult = {
          academic_blocks: [...abigailResult.academic_blocks, ...khalilResult.academic_blocks],
          administrative_tasks: [...abigailResult.administrative_tasks, ...khalilResult.administrative_tasks],
          unscheduled_tasks: [...abigailResult.unscheduled_tasks, ...khalilResult.unscheduled_tasks],
          warnings: [...abigailResult.warnings, ...khalilResult.warnings]
        };
      } else {
        schedulingResult = await blockSharingScheduler.analyzeAndSchedule(selectedStudent, finalDaysAhead, startDate, currentTime);
      }

      // DEBUG: Log what the scheduler actually returned
      console.log('=== SCHEDULER RESULTS DEBUG ===');
      console.log('Results:', schedulingResult);
      schedulingResult.academic_blocks.forEach(block => {
        block.tasks.forEach(task => {
          console.log(`Assignment: ${task.assignment.title} -> ${block.date} Block ${block.block_number}`);
        });
      });
      console.log('=== END SCHEDULER RESULTS DEBUG ===');

      setResult(schedulingResult);

      toast({
        title: "Analysis Complete",
        description: `Found ${schedulingResult.academic_blocks.length} blocks scheduled for ${selectedStudent}.`
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
  }, [selectedStudent, dateRange, customDate, includeAdminTasks, currentTime, getDaysAhead, toast]);

  const handleAutoSchedule = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const startDate = forceNextDay ? addDays(new Date(), 1) : (dateRange === 'custom' && customDate ? customDate : new Date());

      let schedulingResult: SchedulingDecision;
      
      if (selectedStudent === 'Both') {
        const abigailResult = await blockSharingScheduler.analyzeAndSchedule('Abigail', getDaysAhead(), startDate, currentTime);
        const khalilResult = await blockSharingScheduler.analyzeAndSchedule('Khalil', getDaysAhead(), startDate, currentTime);
        
        await blockSharingScheduler.executeSchedule(abigailResult);
        await blockSharingScheduler.executeSchedule(khalilResult);
        
        schedulingResult = {
          academic_blocks: [...abigailResult.academic_blocks, ...khalilResult.academic_blocks],
          administrative_tasks: [...abigailResult.administrative_tasks, ...khalilResult.administrative_tasks],
          unscheduled_tasks: [...abigailResult.unscheduled_tasks, ...khalilResult.unscheduled_tasks],
          warnings: [...abigailResult.warnings, ...khalilResult.warnings]
        };
      } else {
        schedulingResult = await blockSharingScheduler.analyzeAndSchedule(selectedStudent, getDaysAhead(), startDate, currentTime);
        await blockSharingScheduler.executeSchedule(schedulingResult);
      }

      setResult(schedulingResult);
      onSchedulingComplete?.();

      toast({
        title: "Auto-Schedule Complete!",
        description: `Successfully scheduled ${schedulingResult.academic_blocks.length} blocks for ${selectedStudent}.`
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
  }, [selectedStudent, getDaysAhead, includeAdminTasks, customDate, dateRange, currentTime, onSchedulingComplete, toast]);

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

      await blockSharingScheduler.executeSchedule(result);
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
    if (!result?.academic_blocks) return [];
    
    return result.academic_blocks.map(block => ({
      date: block.date,
      assignments: block.tasks.map(task => task.assignment).sort((a, b) => a.title.localeCompare(b.title))
    }));
  }, [result?.academic_blocks]);

  const totalMinutes = useMemo(() => {
    return result?.academic_blocks.reduce((sum, block) => 
      sum + block.used_minutes, 0
    ) || 0;
  }, [result?.academic_blocks]);

  const urgencyCounts = useMemo(() => {
    if (!result?.academic_blocks) return { high: 0, medium: 0, low: 0 };
    const allTasks = result.academic_blocks.flatMap(block => block.tasks.map(task => task.assignment));
    return allTasks.reduce((acc, assignment) => {
      const urgency = assignment.urgency || 'medium';
      acc[urgency as keyof typeof acc] = (acc[urgency as keyof typeof acc] || 0) + 1;
      return acc;
    }, { high: 0, medium: 0, low: 0 });
  }, [result?.academic_blocks]);

  
  // Debug function for all-day events
  const debugAllDayEvents = useCallback(async () => {
    console.log('=== ALL-DAY EVENTS DEBUG ===');
    
    const { data: events, error } = await supabase
      .from('all_day_events')
      .select('*')
      .order('event_date');
      
    if (error) {
      console.error('Error fetching all-day events:', error);
      return;
    }
    
    events?.forEach(event => {
      console.log(`Event: ${event.event_title}`);
      console.log(`  Database date: ${event.event_date}`);
      console.log(`  Created: ${event.created_at}`);
      
      // Check what day this date actually represents
      const eventDate = new Date(event.event_date + 'T00:00:00');
      console.log(`  Parsed as: ${eventDate.toDateString()}`);
      console.log(`  Day of week: ${eventDate.getDay()} (0=Sunday, 1=Monday, etc.)`);
    });
    
    console.log('=== END ALL-DAY EVENTS DEBUG ===');
  }, []);

  // Call debug function on component mount
  useEffect(() => {
    debugAllDayEvents();
  }, [debugAllDayEvents]);

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Scheduler Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">Configure your scheduling preferences</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Time Display */}
          <div className="p-3 bg-secondary/50 rounded-lg border">
            <div className="text-sm font-medium text-secondary-foreground">
              Current Time: {getCurrentTimeDisplay(currentTime)}
            </div>
            {shouldRestrictToFutureDates(currentTime) && (
              <div className="text-xs text-orange-600 mt-1">
                ⚠️ After 8 PM - Future dates recommended
              </div>
            )}
          </div>

          {/* Date Adjustment Suggestion */}
          {showDateAdjustmentSuggestion && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-sm font-medium text-orange-800 mb-2">
                📅 Date Adjustment Suggested
              </div>
              <div className="text-xs text-orange-700 mb-3">
                It's after 8 PM and all today's blocks have likely passed. Consider scheduling for tomorrow instead.
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => {
                    const tomorrow = new Date(currentTime);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setDateRange('custom');
                    setCustomDate(tomorrow);
                    setShowDateAdjustmentSuggestion(false);
                  }}
                >
                  Switch to Tomorrow
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowDateAdjustmentSuggestion(false)}
                >
                  Continue with Today
                </Button>
          </div>
          
          {/* Clear Cache Button for Testing */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Clear scheduler cache
                blockSharingScheduler.invalidateCache();
                toast({
                  title: "Cache Cleared",
                  description: "🗑️ Cache cleared"
                });
              }}
            >
              Clear Cache
            </Button>
          </div>
            </div>
          )}

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
                   <SelectItem value="today">
                     Today Only
                     {shouldRestrictToFutureDates(currentTime) && " (⚠️ Limited blocks available)"}
                   </SelectItem>
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
                 <div className="flex items-center justify-between">
                   <Label htmlFor="force-next-day" className="text-xs">Schedule for Next Day</Label>
                   <Switch
                     id="force-next-day"
                     checked={forceNextDay}
                     onCheckedChange={setForceNextDay}
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
                  const result = await clearScheduling(selectedStudent === 'Both' ? 'Abigail' : selectedStudent);
                  
                  if (selectedStudent === 'Both') {
                    const khalilResult = await clearScheduling('Khalil');
                    toast({
                      title: "Cleared Scheduling",
                      description: `${result.message} and ${khalilResult.message}`
                    });
                  } else {
                    toast({
                      title: "Cleared Scheduling", 
                      description: result.message
                    });
                  }
                  
                  onSchedulingComplete?.();
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
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                `Clear ${selectedStudent} Assignment Scheduling`
              )}
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
          <span><strong>Current Time:</strong> {getCurrentTimeDisplay(currentTime)}</span>
          <span><strong>Student:</strong> {selectedStudent}</span>
          <span><strong>Range:</strong> {getDateRangeDisplay()}</span>
          <span><strong>Admin Tasks:</strong> {includeAdminTasks ? 'Yes' : 'No'}</span>
          <span><strong>Preview Only:</strong> {previewOnly ? 'Yes' : 'No'}</span>
          {shouldRestrictToFutureDates(currentTime) && (
            <span className="text-yellow-600 font-medium">⚠️ After 8 PM - Future dates recommended</span>
          )}
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
                    <div className="text-2xl font-bold text-blue-600">{result.academic_blocks.reduce((sum, block) => sum + block.tasks.length, 0)}</div>
                    <div className="text-sm text-blue-700">Scheduled Tasks</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{result.academic_blocks.length}</div>
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
                {groupedDecisions.map(({ date, assignments }) => {
                  console.log('📅 Timeline Display Debug:', {
                    originalDate: date,
                    parsedDate: new Date(date).toISOString(),
                    formattedDisplay: format(new Date(date), 'EEEE, MMM d'),
                    forceNextDay: forceNextDay
                  });
                  
                  return (
                  <div key={date} className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(new Date(date), 'EEEE, MMM d')}
                    </h4>
                    <div className="space-y-2 ml-6">
                      {assignments.map((assignment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{assignment.title}</span>
                            <Badge variant={getUrgencyColor(assignment.urgency || 'medium')}>
                              {assignment.urgency || 'medium'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.estimated_time}min
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {result.academic_blocks.flatMap(block => 
                  block.tasks.map((task, index) => (
                    <div key={`${block.date}-${index}`} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{task.assignment.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={getUrgencyColor(task.assignment.urgency || 'medium')}>
                            {task.assignment.urgency || 'medium'}
                          </Badge>
                          <Badge variant={getCognitiveLoadColor(task.assignment.cognitive_load || 'medium')}>
                            <Brain className="w-3 h-3 mr-1" />
                            {task.assignment.cognitive_load || 'medium'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
                        <span><Clock className="w-3 h-3 inline mr-1" />{task.assignment.estimated_time}min</span>
                        <span>Block {block.block_number}</span>
                        <span>{format(new Date(block.date), 'MMM d')}</span>
                        <span>{task.assignment.course_name}</span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="admin" className="space-y-4">
                {result.administrative_tasks && result.administrative_tasks.length > 0 ? (
                  result.administrative_tasks.map((task, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-amber-900">{task.title}</h4>
                        <Badge variant="secondary">{task.priority || 'medium'}</Badge>
                      </div>
                      <p className="text-sm text-amber-800">Administrative task</p>
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