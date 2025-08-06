import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Zap,
  Brain,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useAssignments } from '@/hooks/useAssignments';

interface AnalyticsInsight {
  metric: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
  actionable?: boolean;
}

interface StudentAnalyticsDashboardProps {
  studentName: string;
}

export function StudentAnalyticsDashboard({ studentName }: StudentAnalyticsDashboardProps) {
  const { assignments, validateData } = useAssignments(studentName);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const generateInsights = async () => {
    setIsAnalyzing(true);
    try {
      const newInsights: AnalyticsInsight[] = [];
      
      // Assignment completion insights
      const completedAssignments = assignments.filter(a => a.completed).length;
      const completionRate = assignments.length > 0 ? (completedAssignments / assignments.length) * 100 : 0;
      
      newInsights.push({
        metric: 'Completion Rate',
        value: `${Math.round(completionRate)}%`,
        trend: completionRate > 75 ? 'up' : completionRate > 50 ? 'stable' : 'down',
        description: `${completedAssignments} of ${assignments.length} assignments completed`,
        actionable: completionRate < 75
      });

      // Cognitive load distribution
      const cognitiveLoads = assignments.reduce((acc, a) => {
        if (a.cognitive_load) acc[a.cognitive_load] = (acc[a.cognitive_load] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const heavyLoadPercentage = assignments.length > 0 ? 
        ((cognitiveLoads.heavy || 0) / assignments.length) * 100 : 0;
      
      newInsights.push({
        metric: 'Heavy Cognitive Load',
        value: `${Math.round(heavyLoadPercentage)}%`,
        trend: heavyLoadPercentage > 40 ? 'up' : heavyLoadPercentage > 20 ? 'stable' : 'down',
        description: `${cognitiveLoads.heavy || 0} assignments require heavy cognitive effort`,
        actionable: heavyLoadPercentage > 40
      });

      // Time estimation accuracy
      const estimatedVsActual = assignments
        .filter(a => a.estimated_time_minutes && a.actual_time_minutes)
        .map(a => ({
          estimated: a.estimated_time_minutes!,
          actual: a.actual_time_minutes!,
          accuracy: Math.abs(a.estimated_time_minutes! - a.actual_time_minutes!) / a.estimated_time_minutes!
        }));

      if (estimatedVsActual.length > 0) {
        const avgAccuracy = estimatedVsActual.reduce((sum, item) => sum + item.accuracy, 0) / estimatedVsActual.length;
        const accuracyPercentage = Math.max(0, (1 - avgAccuracy) * 100);
        
        newInsights.push({
          metric: 'Time Estimation Accuracy',
          value: `${Math.round(accuracyPercentage)}%`,
          trend: accuracyPercentage > 80 ? 'up' : accuracyPercentage > 60 ? 'stable' : 'down',
          description: `Average accuracy across ${estimatedVsActual.length} completed assignments`,
          actionable: accuracyPercentage < 70
        });
      }

      // Overdue assignments
      const overdueCount = assignments.filter(a => a.urgency === 'overdue').length;
      newInsights.push({
        metric: 'Overdue Tasks',
        value: overdueCount.toString(),
        trend: overdueCount === 0 ? 'up' : overdueCount < 3 ? 'stable' : 'down',
        description: overdueCount === 0 ? 'No overdue assignments!' : `${overdueCount} assignments past due date`,
        actionable: overdueCount > 0
      });

      // Scheduled efficiency
      const scheduledCount = assignments.filter(a => a.scheduled_date && a.scheduled_block).length;
      const schedulingRate = assignments.length > 0 ? (scheduledCount / assignments.length) * 100 : 0;
      
      newInsights.push({
        metric: 'Scheduling Efficiency',
        value: `${Math.round(schedulingRate)}%`,
        trend: schedulingRate > 80 ? 'up' : schedulingRate > 60 ? 'stable' : 'down',
        description: `${scheduledCount} assignments have scheduled time slots`,
        actionable: schedulingRate < 70
      });

      setInsights(newInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (assignments.length > 0) {
      generateInsights();
    }
  }, [assignments]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default: return <Target className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Learning Analytics</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generateInsights}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <Zap className="h-4 w-4 animate-pulse" />
          ) : (
            'Refresh Insights'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg border ${
              insight.actionable ? 'border-orange-200 bg-orange-50' : 'border-border bg-card'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {insight.metric}
              </span>
              {getTrendIcon(insight.trend)}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-2xl font-bold ${getTrendColor(insight.trend)}`}>
                {insight.value}
              </span>
              {insight.actionable && (
                <Badge variant="secondary" className="text-xs">
                  Action Needed
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              {insight.description}
            </p>
          </div>
        ))}
      </div>

      {insights.length === 0 && !isAnalyzing && (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Generate insights to see learning analytics</p>
        </div>
      )}
    </Card>
  );
}