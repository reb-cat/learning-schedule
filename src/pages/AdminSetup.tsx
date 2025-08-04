import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RefreshCw, Calendar, ChevronDown, ChevronUp, Database, Zap, Settings, CheckCircle, XCircle, AlertCircle, Clock, Plus, BookOpen, AlertTriangle, TestTube, Trash, Copy } from 'lucide-react';
import { stagingUtils, type StagingMode } from '@/utils/stagingUtils';
import { RunScheduler } from '@/components/RunScheduler';
import { EnhancedScheduler } from '@/components/EnhancedScheduler';
import { DebugScheduler } from '@/components/DebugScheduler';
const AdminSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [studentSyncStatus, setStudentSyncStatus] = useState<any[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [stagingMode, setStagingMode] = useState<StagingMode>(stagingUtils.getCurrentMode());
  const [stagingLoading, setStagingLoading] = useState(false);
  const { toast } = useToast();
  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Starting sync...",
        description: "Fetching assignments from Canvas and updating schedules."
      });
      const {
        data,
        error
      } = await supabase.functions.invoke('daily-canvas-sync');
      if (error) {
        throw new Error(error.message);
      }
      setSyncStatus(data);

      // Refresh diagnostics and student status after sync
      const newDiagnostics = await getDiagnostics();
      setDiagnostics(newDiagnostics);
      const newStudentStatus = await getStudentSyncStatus();
      setStudentSyncStatus(newStudentStatus);
      toast({
        title: "Sync completed!",
        description: `Successfully processed assignments for both students.`
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const getSyncStatusFromDB = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('sync_status').select('*').order('created_at', {
        ascending: false
      }).limit(10);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return [];
    }
  };
  const getStudentSyncStatus = async () => {
    try {
      // Get the most recent successful sync for each student
      const {
        data,
        error
      } = await supabase.from('sync_status').select('*').neq('status', 'pending').order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Group by student and get the most recent for each
      const studentStatus = ['Abigail', 'Khalil'].map(student => {
        const studentSyncs = data?.filter(sync => sync.student_name === student) || [];
        return studentSyncs.length > 0 ? studentSyncs[0] : null;
      }).filter(Boolean);
      return studentStatus;
    } catch (error) {
      console.error('Error fetching student sync status:', error);
      return [];
    }
  };
  const getDiagnostics = async () => {
    try {
      // Get assignment counts
      const {
        data: assignments,
        error: assignmentsError
      } = await supabase.from('assignments').select('*');
      if (assignmentsError) throw assignmentsError;

      // Get sync status
      const {
        data: syncData,
        error: syncError
      } = await supabase.from('sync_status').select('*').order('created_at', {
        ascending: false
      }).limit(10);
      if (syncError) throw syncError;
      return {
        assignments: assignments || [],
        syncHistory: syncData || [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting diagnostics:', error);
      return null;
    }
  };
  useEffect(() => {
    getSyncStatusFromDB().then(setSyncHistory);
    getDiagnostics().then(setDiagnostics);
    getStudentSyncStatus().then(setStudentSyncStatus);
  }, []);
  const handleStagingToggle = (checked: boolean) => {
    const newMode: StagingMode = checked ? 'staging' : 'production';
    setStagingMode(newMode);
    stagingUtils.setMode(newMode);
    toast({
      title: `Switched to ${newMode} mode`,
      description: `All data operations will now use ${newMode} tables.`
    });
  };

  const handleClearStaging = async () => {
    setStagingLoading(true);
    try {
      await stagingUtils.clearStagingData();
      toast({
        title: "Staging data cleared",
        description: "All staging tables have been emptied."
      });
    } catch (error: any) {
      toast({
        title: "Error clearing staging data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setStagingLoading(false);
    }
  };

  const handleCopyToStaging = async () => {
    setStagingLoading(true);
    try {
      await stagingUtils.copyProductionToStaging();
      toast({
        title: "Production data copied to staging",
        description: "All production data has been copied to staging tables."
      });
    } catch (error: any) {
      toast({
        title: "Error copying to staging",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setStagingLoading(false);
    }
  };

  const handleSeedTestData = async () => {
    setStagingLoading(true);
    try {
      await stagingUtils.seedTestData();
      toast({
        title: "Test data seeded",
        description: "Sample assignments for August 2025 have been added to staging."
      });
    } catch (error: any) {
      toast({
        title: "Error seeding test data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setStagingLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Running</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  return <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Technical Dashboard</h1>
          
        </div>

        

        <Tabs defaultValue="sync" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Canvas Sync
            </TabsTrigger>
            <TabsTrigger value="staging" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Staging Environment
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Diagnostics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-6">
            {/* Manual Sync - Now Prominent */}
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <RefreshCw className="h-6 w-6" />
                  Manual Canvas Sync
                </CardTitle>
                <CardDescription className="text-base">
                  Automatic sync runs daily at 4:00 AM UTC. Use this button for immediate manual sync.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-4 p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <p className="font-medium text-blue-900 mb-2">Ready to sync assignments</p>
                    <p className="text-sm text-blue-700">Click below to fetch latest Canvas assignments and update schedules</p>
                  </div>
                  <Button onClick={handleManualSync} disabled={isLoading} size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                    {isLoading ? <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Syncing...
                      </> : <>
                        <RefreshCw className="mr-2 h-5 w-5" />
                        Run Manual Sync
                      </>}
                  </Button>
                </div>

                {syncStatus && <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Last Manual Sync Results</h4>
                    <pre className="text-sm bg-white p-3 rounded border overflow-auto">
                      {JSON.stringify(syncStatus, null, 2)}
                    </pre>
                  </div>}
              </CardContent>
            </Card>

            {/* Student Sync Status - Show Both Students */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Student Sync Status
                </CardTitle>
                <CardDescription>
                  Most recent sync status for each student
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studentSyncStatus.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {studentSyncStatus.map(sync => <div key={sync.id} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-lg">{sync.student_name}</h4>
                          {getStatusBadge(sync.status)}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Last sync:</span> {new Date(sync.created_at).toLocaleString()}
                          </p>
                          <p>
                            <span className="font-medium">Type:</span> {sync.sync_type === 'scheduled' ? 'Automatic' : 'Manual'}
                          </p>
                          <p>
                            <span className="font-medium">Assignments:</span> {sync.assignments_count || 0} items
                          </p>
                          {sync.message && <p>
                              <span className="font-medium">Message:</span> {sync.message}
                            </p>}
                        </div>
                      </div>)}
                  </div> : <p className="text-gray-500 text-center py-4">No sync data available</p>}
                
                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        View Complete History
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 max-h-64 overflow-y-auto bg-white border shadow-lg z-50">
                      <div className="px-3 py-2 border-b">
                        <p className="font-medium text-sm">Complete Sync History</p>
                      </div>
                      {syncHistory.slice(0, 10).map(sync => <DropdownMenuItem key={sync.id} className="flex items-center justify-between p-3 cursor-default">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {getStatusBadge(sync.status)}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{sync.student_name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(sync.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-500 ml-2">
                            <div>{sync.assignments_count} items</div>
                            <div>{sync.sync_type}</div>
                          </div>
                        </DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staging" className="space-y-6">
            {/* Staging Environment Controls */}
            <Card className="border-2 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TestTube className="h-6 w-6" />
                  Staging Environment
                </CardTitle>
                <CardDescription className="text-base">
                  Safe testing environment with isolated data. Use this to test scheduling scenarios without affecting real assignments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Mode Indicator */}
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="staging-mode" className="text-sm font-medium">
                      Current Mode:
                    </Label>
                    <Badge variant={stagingMode === 'staging' ? 'default' : 'secondary'} className="text-sm">
                      {stagingMode === 'staging' ? '🧪 Staging' : '🏢 Production'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="staging-mode" className="text-sm">
                      Enable Staging Mode
                    </Label>
                    <Switch
                      id="staging-mode"
                      checked={stagingMode === 'staging'}
                      onCheckedChange={handleStagingToggle}
                    />
                  </div>
                </div>

                {/* Staging Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trash className="h-5 w-5" />
                        Clear Staging
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Remove all data from staging tables
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={handleClearStaging} 
                        disabled={stagingLoading}
                        variant="destructive"
                        className="w-full"
                      >
                        {stagingLoading ? 'Clearing...' : 'Clear All Staging Data'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Copy className="h-5 w-5" />
                        Copy Production
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Copy all production data to staging
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={handleCopyToStaging} 
                        disabled={stagingLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {stagingLoading ? 'Copying...' : 'Copy to Staging'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Seed Test Data
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Add sample assignments for August 2025
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={handleSeedTestData} 
                        disabled={stagingLoading}
                        className="w-full"
                      >
                        {stagingLoading ? 'Seeding...' : 'Add Test Data'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">How to use staging:</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Toggle staging mode on above</li>
                    <li>2. Seed test data or copy production data</li>
                    <li>3. Visit student dashboards with <code className="bg-blue-100 px-1 rounded">?staging=true</code></li>
                    <li>4. Test scheduling scenarios like <code className="bg-blue-100 px-1 rounded">/khalil?date=2025-08-19&staging=true</code></li>
                    <li>5. Clear staging data when finished testing</li>
                  </ol>
                </div>

                {/* Scheduling Controls - Only shown in staging mode */}
                {stagingMode === 'staging' && (
                  <div className="space-y-6">
                    <div className="border-t pt-6">
                      <h4 className="font-medium text-orange-900 mb-4">Test Assignment Scheduling</h4>
                      <p className="text-sm text-orange-700 mb-4">
                        After seeding test data, use these tools to schedule assignments into time blocks:
                      </p>
                      
                      {/* Debug Scheduler - New enhanced scheduler */}
                      <div className="mb-6">
                        <DebugScheduler />
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium mb-2">Khalil's Scheduler</h5>
                          <EnhancedScheduler 
                            studentName="Khalil" 
                            onSchedulingComplete={() => {
                              toast({
                                title: "Khalil's schedule updated",
                                description: "Visit his dashboard to see the scheduled assignments."
                              });
                            }}
                          />
                        </div>
                        
                        <div>
                          <h5 className="font-medium mb-2">Abigail's Scheduler</h5>
                          <EnhancedScheduler 
                            studentName="Abigail" 
                            onSchedulingComplete={() => {
                              toast({
                                title: "Abigail's schedule updated",
                                description: "Visit her dashboard to see the scheduled assignments."
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Links */}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('/khalil?staging=true&date=2025-08-19', '_blank')}
                  >
                    Test Khalil Aug 19, 2025
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('/abigail?staging=true&date=2025-08-19', '_blank')}
                  >
                    Test Abigail Aug 19, 2025
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('/khalil?staging=true', '_blank')}
                  >
                    Khalil Staging
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('/abigail?staging=true', '_blank')}
                  >
                    Abigail Staging
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-6">
            {/* Detailed Diagnostics - Moved to separate tab */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Diagnostics
                </CardTitle>
                <CardDescription>
                  Detailed view of assignment counts, sync history, and system health metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {diagnostics && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded border">
                      <p className="text-2xl font-bold text-blue-600">{diagnostics.assignments?.length || 0}</p>
                      <p className="text-sm text-gray-600">Total Assignments</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded border">
                      <p className="text-2xl font-bold text-green-600">
                        {diagnostics.assignments?.filter((a: any) => a.source === 'canvas').length || 0}
                      </p>
                      <p className="text-sm text-gray-600">Canvas Assignments</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded border">
                      <p className="text-2xl font-bold text-purple-600">
                        {diagnostics.assignments?.filter((a: any) => a.source === 'manual').length || 0}
                      </p>
                      <p className="text-sm text-gray-600">Manual Assignments</p>
                    </div>
                  </div>}

                <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full">
                      {showDiagnostics ? <>
                          <ChevronUp className="mr-2 h-4 w-4" />
                          Hide Detailed Data
                        </> : <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Show Detailed Data
                        </>}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {diagnostics && <>
                        <div className="space-y-3">
                          <h4 className="font-medium">Assignment Details</h4>
                          <div className="max-h-64 overflow-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Student</th>
                                  <th className="text-left p-2">Title</th>
                                  <th className="text-left p-2">Subject</th>
                                  <th className="text-left p-2">Source</th>
                                  <th className="text-left p-2">Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {diagnostics.assignments?.slice(0, 10).map((assignment: any) => <tr key={assignment.id} className="border-b">
                                    <td className="p-2">{assignment.student_name}</td>
                                    <td className="p-2">{assignment.title}</td>
                                    <td className="p-2">{assignment.subject}</td>
                                    <td className="p-2">
                                      <Badge variant={assignment.source === 'canvas' ? 'default' : 'secondary'}>
                                        {assignment.source}
                                      </Badge>
                                    </td>
                                    <td className="p-2">{assignment.assignment_type || 'academic'}</td>
                                  </tr>)}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium">Complete Sync History</h4>
                          <div className="max-h-64 overflow-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Student</th>
                                  <th className="text-left p-2">Status</th>
                                  <th className="text-left p-2">Count</th>
                                  <th className="text-left p-2">Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {diagnostics.syncHistory?.map((sync: any) => <tr key={sync.id} className="border-b">
                                    <td className="p-2">{sync.student_name}</td>
                                    <td className="p-2">{getStatusBadge(sync.status)}</td>
                                    <td className="p-2">{sync.assignments_count}</td>
                                    <td className="p-2">{new Date(sync.created_at).toLocaleString()}</td>
                                  </tr>)}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </div>;
};
export default AdminSetup;