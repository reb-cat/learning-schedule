import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Database, Zap, Clock, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  hitRate: string;
  dataFreshness: number;
  lastRefresh: number;
  errorCount: number;
  avgResponseTime: number;
}

interface PerformanceMonitorProps {
  studentName: string;
  metrics?: PerformanceMetrics;
  onOptimize?: () => void;
}

export function PerformanceMonitor({ 
  studentName, 
  metrics,
  onOptimize 
}: PerformanceMonitorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [realtimeMetrics, setRealtimeMetrics] = useState<PerformanceMetrics>({
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: '0%',
    dataFreshness: 0,
    lastRefresh: Date.now(),
    errorCount: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    if (metrics) {
      setRealtimeMetrics(metrics);
    }
  }, [metrics]);

  const getPerformanceStatus = () => {
    const hitRate = parseFloat(realtimeMetrics.hitRate);
    const freshness = (Date.now() - realtimeMetrics.lastRefresh) / 1000 / 60; // minutes
    
    if (realtimeMetrics.errorCount > 5) return { status: 'error', color: 'destructive' };
    if (hitRate < 50 || freshness > 10) return { status: 'warning', color: 'secondary' };
    if (hitRate > 80 && freshness < 5) return { status: 'excellent', color: 'default' };
    return { status: 'good', color: 'outline' };
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Performance ({performanceStatus.status})</span>
            <Badge variant={performanceStatus.color as any}>
              {realtimeMetrics.hitRate}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <Card className="p-4 mt-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span>Cache: {realtimeMetrics.cacheHits}H / {realtimeMetrics.cacheMisses}M</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Freshness: {Math.round((Date.now() - realtimeMetrics.lastRefresh) / 1000 / 60)}m</span>
              </div>
              
              {realtimeMetrics.errorCount > 0 && (
                <div className="flex items-center gap-2 col-span-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Errors: {realtimeMetrics.errorCount}</span>
                </div>
              )}
            </div>
            
            {onOptimize && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOptimize}
                className="w-full"
              >
                Optimize Performance
              </Button>
            )}
          </div>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}