import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { blockSharingScheduler } from '@/services/blockSharingScheduler';

export function DebugScheduler() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runScheduler = async () => {
    setIsRunning(true);
    try {
      console.log('🚀 Manual scheduler run starting...');
      
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
      
      // Force refresh the page to show updated assignments
      window.location.reload();
      
      setResult(enhancedResult);
    } catch (error) {
      console.error('❌ Scheduler failed:', error);
      setResult({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Debug Scheduler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            ✅ Running with <strong>Production</strong> data.
            <br />
            <small>Will affect table: <code>assignments</code></small>
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={runScheduler} 
          disabled={isRunning}
          className="w-full"
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