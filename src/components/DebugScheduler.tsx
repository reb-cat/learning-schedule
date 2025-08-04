import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { blockSharingScheduler } from '@/services/blockSharingScheduler';

export function DebugScheduler() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runScheduler = async () => {
    setIsRunning(true);
    try {
      console.log('Manual scheduler run starting...');
      const decision = await blockSharingScheduler.analyzeAndSchedule('Abigail', 7);
      console.log('Scheduler decision:', decision);
      
      await blockSharingScheduler.executeSchedule(decision);
      console.log('Scheduler executed successfully');
      
      setResult(decision);
    } catch (error) {
      console.error('Scheduler failed:', error);
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
        <Button 
          onClick={runScheduler} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Scheduler...' : 'Run Scheduler Manually'}
        </Button>
        
        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Scheduler Result:</h3>
            <pre className="text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}