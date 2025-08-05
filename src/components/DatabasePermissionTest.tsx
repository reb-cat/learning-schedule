import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { testDatabasePermissions, testAssignmentUpdate } from '@/utils/testDatabasePermissions';
import { useToast } from '@/hooks/use-toast';

export function DatabasePermissionTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  const runPermissionTest = async () => {
    setIsLoading(true);
    setTestResults(null);
    
    try {
      const results = await testDatabasePermissions();
      setTestResults(results);
      
      if (results.success) {
        toast({
          title: "Database Permissions Test Passed!",
          description: "All database operations are working correctly.",
        });
      } else {
        toast({
          title: "Database Permissions Test Failed",
          description: results.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Test failed:', error);
      toast({
        title: "Test Error",
        description: `Failed to run test: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testSpecificUpdate = async () => {
    setIsLoading(true);
    
    try {
      // Test with a known assignment ID
      const testId = '4caa7043-949a-47fc-9de4-109616b4dd8a'; // Math Homework
      const results = await testAssignmentUpdate(testId);
      
      if (results.success) {
        toast({
          title: "Assignment Update Test Passed!",
          description: "Successfully updated assignment scheduling fields.",
        });
      } else {
        toast({
          title: "Assignment Update Test Failed",
          description: results.error?.message || 'Unknown error',
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Update Test Error",
        description: `Failed to test update: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Database Permission Test</CardTitle>
        <CardDescription>
          Test RLS policies and Supabase client permissions for the assignments table
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button 
            onClick={runPermissionTest} 
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? 'Testing...' : 'Run Full Permission Test'}
          </Button>
          
          <Button 
            onClick={testSpecificUpdate} 
            disabled={isLoading}
            variant="outline"
          >
            Test Assignment Update
          </Button>
        </div>

        {testResults && (
          <Alert variant={testResults.success ? "default" : "destructive"}>
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={testResults.success ? "default" : "destructive"}>
                    {testResults.success ? "✅ PASSED" : "❌ FAILED"}
                  </Badge>
                  <span className="font-medium">
                    {testResults.message || testResults.error}
                  </span>
                </div>
                
                {testResults.testResults && (
                  <div className="text-sm space-y-1">
                    <div>SELECT: {testResults.testResults.select ? '✅' : '❌'}</div>
                    <div>UPDATE: {testResults.testResults.update ? '✅' : '❌'}</div>
                    <div>INSERT: {testResults.testResults.insert ? '✅' : '❌'}</div>
                  </div>
                )}
                
                {testResults.details && (
                  <div className="text-sm mt-2 p-2 bg-muted rounded">
                    <strong>Error Details:</strong>
                    <pre className="text-xs mt-1">
                      {JSON.stringify(testResults.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>This test verifies:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>RLS policies allow SELECT operations</li>
            <li>RLS policies allow UPDATE operations on scheduling fields</li>
            <li>RLS policies allow INSERT operations (for new assignments)</li>
            <li>Supabase client has proper permissions in frontend context</li>
            <li>No authentication barriers for scheduling operations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}