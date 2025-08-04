import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity,
  Clock,
  Calendar,
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface PerformanceBenchmark {
  category: string;
  current: number;
  target: number;
  trend: 'improving' | 'declining' | 'stable';
  unit: string;
}

interface SystemBenchmarkProps {
  studentName: string;
}

export function SystemBenchmarkDashboard({ studentName }: SystemBenchmarkProps) {
  const [benchmarks, setBenchmarks] = useState<PerformanceBenchmark[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runPerformanceBenchmark = async () => {
    setIsRunning(true);
    
    try {
      // Simulate performance measurements
      const startTime = performance.now();
      
      // Cache performance test
      const cacheStart = performance.now();
      localStorage.setItem('test-cache', JSON.stringify({ test: 'data' }));
      const cached = localStorage.getItem('test-cache');
      localStorage.removeItem('test-cache');
      const cacheTime = performance.now() - cacheStart;

      // Memory usage check
      const memoryUsage = (performance as any).memory ? 
        (performance as any).memory.usedJSHeapSize / 1024 / 1024 : 0;

      // Component render benchmark
      const renderStart = performance.now();
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
      const renderTime = performance.now() - renderStart;

      // Database response simulation
      const dbStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      const dbResponseTime = performance.now() - dbStart;

      const totalTime = performance.now() - startTime;

      const newBenchmarks: PerformanceBenchmark[] = [
        {
          category: 'Page Load Time',
          current: totalTime,
          target: 2000,
          trend: totalTime < 2000 ? 'improving' : totalTime < 3000 ? 'stable' : 'declining',
          unit: 'ms'
        },
        {
          category: 'Cache Performance',
          current: cacheTime,
          target: 5,
          trend: cacheTime < 5 ? 'improving' : cacheTime < 10 ? 'stable' : 'declining',
          unit: 'ms'
        },
        {
          category: 'Memory Usage',
          current: memoryUsage,
          target: 50,
          trend: memoryUsage < 50 ? 'improving' : memoryUsage < 75 ? 'stable' : 'declining',
          unit: 'MB'
        },
        {
          category: 'Render Time',
          current: renderTime,
          target: 16.67, // 60fps
          trend: renderTime < 16.67 ? 'improving' : renderTime < 33 ? 'stable' : 'declining',
          unit: 'ms'
        },
        {
          category: 'DB Response',
          current: dbResponseTime,
          target: 200,
          trend: dbResponseTime < 200 ? 'improving' : dbResponseTime < 500 ? 'stable' : 'declining',
          unit: 'ms'
        }
      ];

      setBenchmarks(newBenchmarks);
      setLastRun(new Date());
      
      console.log(`🏃‍♂️ Performance benchmark completed for ${studentName}:`, {
        totalTime: `${totalTime.toFixed(2)}ms`,
        cacheTime: `${cacheTime.toFixed(2)}ms`,
        memoryUsage: `${memoryUsage.toFixed(2)}MB`,
        renderTime: `${renderTime.toFixed(2)}ms`,
        dbResponseTime: `${dbResponseTime.toFixed(2)}ms`
      });
      
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Run initial benchmark
    runPerformanceBenchmark();
  }, [studentName]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default: return <Target className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getPerformanceScore = () => {
    if (benchmarks.length === 0) return 0;
    
    const scores = benchmarks.map(benchmark => {
      const ratio = benchmark.current / benchmark.target;
      if (benchmark.category === 'Memory Usage') {
        // Lower is better for memory
        return ratio <= 1 ? 100 : Math.max(0, 100 - (ratio - 1) * 50);
      } else {
        // Lower is better for time-based metrics
        return ratio <= 1 ? 100 : Math.max(0, 100 - (ratio - 1) * 25);
      }
    });

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  const performanceScore = getPerformanceScore();

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Performance Benchmark</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={runPerformanceBenchmark}
          disabled={isRunning}
        >
          {isRunning ? (
            <Zap className="h-4 w-4 animate-pulse" />
          ) : (
            'Run Benchmark'
          )}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Performance Score */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold">{performanceScore}</span>
              <span className="text-muted-foreground">/100</span>
              {performanceScore >= 80 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <Progress value={performanceScore} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Overall Performance Score
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            {benchmarks.slice(0, 4).map((benchmark, index) => (
              <div key={index} className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <span className={`text-lg font-semibold ${getTrendColor(benchmark.trend)}`}>
                    {benchmark.current.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {benchmark.unit}
                  </span>
                  {getTrendIcon(benchmark.trend)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {benchmark.category}
                </p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {benchmarks.map((benchmark, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{benchmark.category}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${getTrendColor(benchmark.trend)}`}>
                    {benchmark.current.toFixed(2)}{benchmark.unit}
                  </span>
                  {getTrendIcon(benchmark.trend)}
                </div>
              </div>
              <Progress 
                value={Math.min(100, (benchmark.target / Math.max(benchmark.current, benchmark.target)) * 100)} 
                className="h-2" 
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Target: {benchmark.target}{benchmark.unit}</span>
                <span>
                  {benchmark.current <= benchmark.target ? 'Meeting target' : 'Needs optimization'}
                </span>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {lastRun && (
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Last benchmark: {lastRun.toLocaleTimeString()}
        </div>
      )}
    </Card>
  );
}