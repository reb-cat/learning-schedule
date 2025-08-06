import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Database,
  Zap
} from 'lucide-react';
import { useAssignments } from '@/hooks/useAssignments';

interface SystemHealthDashboardProps {
  studentName: string;
}

export function SystemHealthDashboard({ studentName }: SystemHealthDashboardProps) {
  const { 
    assignments, 
    loading, 
    error, 
    validateData,
    repairData,
    cleanupData
  } = useAssignments(studentName);

  const [validationResults, setValidationResults] = React.useState<any>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = React.useState(false);
  const [lastDiagnostic, setLastDiagnostic] = React.useState<Date | null>(null);

  const runCompleteDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      // Run validation
      const validation = await validateData();
      setValidationResults(validation);
      
      // If there are errors, offer to repair
      if (!validation.isValid) {
        console.warn('🔧 Data validation found issues:', validation);
      }
      
      // Memory monitoring removed - no longer needed without cache
      
      setLastDiagnostic(new Date());
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleRepairData = async () => {
    try {
      const result = await repairData();
      console.log('🔧 Data repair completed:', result);
      // Re-run diagnostics to verify fixes
      await runCompleteDiagnostics();
    } catch (error) {
      console.error('Data repair failed:', error);
    }
  };

  const getHealthStatus = () => {
    if (loading) return { status: 'checking', color: 'secondary', icon: RefreshCw };
    if (error && !assignments.length) return { status: 'critical', color: 'destructive', icon: XCircle };
    if (validationResults && !validationResults.isValid) return { status: 'warning', color: 'secondary', icon: AlertTriangle };
    if (assignments.length > 0) return { status: 'healthy', color: 'default', icon: CheckCircle };
    return { status: 'unknown', color: 'outline', icon: AlertTriangle };
  };

  const healthStatus = getHealthStatus();

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <h3 className="text-lg font-semibold">System Health</h3>
          <Badge variant={healthStatus.color as any} className="flex items-center gap-1">
            <healthStatus.icon className="h-3 w-3" />
            {healthStatus.status}
          </Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={runCompleteDiagnostics}
          disabled={isRunningDiagnostics}
        >
          {isRunningDiagnostics ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            'Run Diagnostics'
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Data Quality */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Data Quality</span>
            {validationResults && (
              <span className="text-xs text-muted-foreground">
                {validationResults.stats.totalChecked} assignments checked
              </span>
            )}
          </div>
          {validationResults ? (
            <div className="space-y-2">
              {validationResults.errors.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-destructive">
                    {validationResults.errors.length} critical errors
                  </span>
                  <Button variant="outline" size="sm" onClick={handleRepairData}>
                    Repair
                  </Button>
                </div>
              )}
              {validationResults.warnings.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-600">
                    {validationResults.warnings.length} warnings
                  </span>
                  <Button variant="outline" size="sm" onClick={cleanupData}>
                    Cleanup
                  </Button>
                </div>
              )}
              {validationResults.isValid && (
                <span className="text-sm text-green-600">All data valid</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Not checked</span>
          )}
        </div>

        {/* Database Status */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Database Status</span>
            <span className="text-xs text-muted-foreground">Fresh Data</span>
          </div>
          <Progress value={loading ? 50 : 100} className="h-2" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Mode: Direct DB</span>
            <span>Cache: Disabled</span>
          </div>
        </div>

        {/* Last Check */}
        {lastDiagnostic && (
          <div className="text-xs text-muted-foreground">
            Last checked: {lastDiagnostic.toLocaleTimeString()}
          </div>
        )}
      </div>
    </Card>
  );
}