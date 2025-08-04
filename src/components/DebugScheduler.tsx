import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { blockSharingScheduler } from '@/services/blockSharingScheduler';
import { stagingUtils } from '@/utils/stagingUtils';

export function DebugScheduler() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [currentMode, setCurrentMode] = useState(stagingUtils.getCurrentMode());

  useEffect(() => {
    const checkMode = () => {
      setCurrentMode(stagingUtils.getCurrentMode());
    };
    
    // Check mode on mount and when storage changes
    checkMode();
    window.addEventListener('storage', checkMode);
    
    return () => window.removeEventListener('storage', checkMode);
  }, []);

  const runScheduler = async () => {
    const mode = stagingUtils.getCurrentMode();
    if (mode === 'production') {
      alert('Scheduler can only be run in staging mode for safety. Please switch to staging mode first.');
      return;
    }

    setIsRunning(true);
    try {
      console.log('🚀 Manual scheduler run starting in staging mode...');
      
      // Get raw data for debugging
      const rawTasks = await blockSharingScheduler.getClassifiedTasks('Abigail');
      const rawBlocks = await blockSharingScheduler.getAvailableBlocks('Abigail', 7);
      
      console.log('📋 Raw Tasks Found:', rawTasks.length, rawTasks);
      console.log('🕒 Raw Blocks Found:', rawBlocks.length, rawBlocks);
      
      const decision = await blockSharingScheduler.analyzeAndSchedule('Abigail', 7);
      console.log('📊 Final Scheduler Decision:', decision);
      
      // Enhanced result with debug info
      const enhancedResult = {
        ...decision,
        debug: {
          rawTasksCount: rawTasks.length,
          rawBlocksCount: rawBlocks.length,
          rawTasks: rawTasks.slice(0, 3), // First 3 for brevity
          rawBlocks: rawBlocks.slice(0, 3) // First 3 for brevity
        }
      };
      
      await blockSharingScheduler.executeSchedule(decision);
      console.log('✅ Scheduler executed successfully');
      
      setResult(enhancedResult);
    } catch (error) {
      console.error('❌ Scheduler failed:', error);
      setResult({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const isProductionMode = currentMode === 'production';
  const assignmentsTable = stagingUtils.getTableName('assignments', currentMode);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Debug Scheduler
          <Badge variant={isProductionMode ? "destructive" : "secondary"}>
            {currentMode.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isProductionMode && (
          <Alert>
            <AlertDescription>
              ⚠️ Currently in <strong>Production</strong> mode. Switch to <strong>Staging</strong> mode to safely test the scheduler.
              <br />
              <small>Would affect table: <code>assignments</code></small>
            </AlertDescription>
          </Alert>
        )}
        
        {!isProductionMode && (
          <Alert>
            <AlertDescription>
              ✅ Running in <strong>Staging</strong> mode. Safe to test scheduler.
              <br />
              <small>Will affect table: <code>{assignmentsTable}</code></small>
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={runScheduler} 
          disabled={isRunning || isProductionMode}
          className="w-full"
          variant={isProductionMode ? "outline" : "default"}
        >
          {isRunning ? 'Running Scheduler...' : 'Run Scheduler for Abigail (7 days)'}
        </Button>
        
        {result && (
          <div className="mt-4 space-y-4">
            {result.debug && (
              <div className="p-4 bg-blue-50 rounded-lg border">
                <h3 className="font-semibold mb-2 text-blue-800">🔍 Debug Info:</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Raw Tasks:</strong> {result.debug.rawTasksCount}</p>
                  <p><strong>Raw Blocks:</strong> {result.debug.rawBlocksCount}</p>
                  <p><strong>Scheduled Blocks:</strong> {result.scheduledBlocks?.length || 0}</p>
                  <p><strong>Unscheduled Tasks:</strong> {result.unscheduledTasks?.length || 0}</p>
                </div>
              </div>
            )}
            
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Full Scheduler Result:</h3>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}