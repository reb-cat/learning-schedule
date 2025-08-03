import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, Brain, AlertTriangle, CheckCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SchedulingDecision {
  assignment: any;
  targetDate: string;
  targetDay: string;
  targetBlock: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  estimatedMinutes: number;
}

interface SchedulingPreviewProps {
  studentName: string;
  onSchedulingComplete?: () => void;
}

export function SchedulingPreview({ studentName, onSchedulingComplete }: SchedulingPreviewProps) {
  const [decisions, setDecisions] = useState<SchedulingDecision[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const { toast } = useToast();

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getCognitiveLoadColor = (load: string) => {
    switch (load) {
      case 'heavy': return 'destructive';
      case 'medium': return 'secondary';
      case 'light': return 'outline';
      default: return 'outline';
    }
  };

  const analyzeScheduling = async () => {
    setIsAnalyzing(true);
    try {
      // Call the auto-scheduler with preview mode
      const response = await supabase.functions.invoke('scheduling-preview', {
        body: { studentName, previewOnly: true }
      });

      if (response.error) throw response.error;

      setDecisions(response.data.decisions || []);
      setAnalysisComplete(true);
      
      toast({
        title: "Analysis Complete",
        description: `Found ${response.data.decisions?.length || 0} assignments to schedule`,
      });
    } catch (error) {
      console.error('Error analyzing scheduling:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze scheduling needs",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeScheduling = async () => {
    setIsExecuting(true);
    try {
      // Execute the actual scheduling
      const response = await supabase.functions.invoke('auto-scheduler', {
        body: { studentName }
      });

      if (response.error) throw response.error;

      toast({
        title: "Scheduling Complete",
        description: `Successfully scheduled ${response.data.results?.[studentName]?.scheduledCount || 0} assignments`,
      });

      onSchedulingComplete?.();
      setDecisions([]);
      setAnalysisComplete(false);
    } catch (error) {
      console.error('Error executing scheduling:', error);
      toast({
        title: "Scheduling Failed",
        description: "Could not execute scheduling",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const groupedDecisions = decisions.reduce((groups, decision) => {
    if (!groups[decision.targetDate]) {
      groups[decision.targetDate] = [];
    }
    groups[decision.targetDate].push(decision);
    return groups;
  }, {} as Record<string, SchedulingDecision[]>);

  const totalMinutes = decisions.reduce((sum, d) => sum + d.estimatedMinutes, 0);
  const urgencyCounts = decisions.reduce((counts, d) => {
    counts[d.urgency] = (counts[d.urgency] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Scheduling Preview for {studentName}
        </CardTitle>
        <CardDescription>
          Analyze and preview assignment scheduling before execution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={analyzeScheduling} 
            disabled={isAnalyzing || isExecuting}
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            {isAnalyzing ? "Analyzing..." : "Analyze Scheduling"}
          </Button>
          
          {analysisComplete && decisions.length > 0 && (
            <Button 
              onClick={executeScheduling} 
              disabled={isExecuting}
              variant="default"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isExecuting ? "Executing..." : "Execute Schedule"}
            </Button>
          )}
        </div>

        {analysisComplete && (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{decisions.length}</div>
                    <p className="text-sm text-muted-foreground">Assignments</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{Math.round(totalMinutes / 60)}h</div>
                    <p className="text-sm text-muted-foreground">Total Time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{Object.keys(groupedDecisions).length}</div>
                    <p className="text-sm text-muted-foreground">Days Used</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{urgencyCounts.critical || 0}</div>
                    <p className="text-sm text-muted-foreground">Critical</p>
                  </CardContent>
                </Card>
              </div>

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
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dayDecisions
                        .sort((a, b) => a.targetBlock - b.targetBlock)
                        .map((decision, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Block {decision.targetBlock}</Badge>
                              <span className="font-medium">{decision.assignment.title}</span>
                              <Badge variant={getUrgencyColor(decision.urgency)}>
                                {decision.urgency}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {decision.estimatedMinutes}m
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              {decisions.map((decision, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{decision.assignment.title}</h4>
                        <div className="flex gap-2">
                          <Badge variant={getUrgencyColor(decision.urgency)}>
                            {decision.urgency}
                          </Badge>
                          <Badge variant={getCognitiveLoadColor(decision.assignment.cognitive_load)}>
                            {decision.assignment.cognitive_load || 'medium'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Subject:</strong> {decision.assignment.subject} | 
                        <strong> Due:</strong> {decision.assignment.due_date ? new Date(decision.assignment.due_date).toLocaleDateString() : 'No due date'} | 
                        <strong> Scheduled:</strong> {decision.targetDay}, Block {decision.targetBlock}
                      </div>
                      <div className="text-sm">
                        <strong>Reasoning:</strong> {decision.reasoning}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}

        {analysisComplete && decisions.length === 0 && (
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