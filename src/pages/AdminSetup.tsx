import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RefreshCw, Calendar, ChevronDown, Database, Settings, CheckCircle, AlertCircle, Clock, AlertTriangle, BookOpen, Plus, CheckSquare } from 'lucide-react';
import { useAssignments } from '@/hooks/useAssignments';
import { AlertBanner } from '@/components/AlertBanner';
import { StudentSection } from '@/components/StudentSection';
import { ManualAssignmentForm } from '@/components/ManualAssignmentForm';
import { CoopAdministrativeChecklist } from '@/components/CoopAdministrativeChecklist';
import { useAdministrativeNotifications } from '@/hooks/useAdministrativeNotifications';

import { SystemStatusCard } from '@/components/shared/SystemStatusCard';
import { ConsolidatedScheduler } from '@/components/ConsolidatedScheduler';
import { DatabasePermissionTest } from '@/components/DatabasePermissionTest';
import { SystemHealthDashboard } from '@/components/SystemHealthDashboard';
import { StudentAnalyticsDashboard } from '@/components/StudentAnalyticsDashboard';
import { SystemBenchmarkDashboard } from '@/components/SystemBenchmarkDashboard';

const AdminSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [studentSyncStatus, setStudentSyncStatus] = useState<any[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { toast } = useToast();

  // Fetch assignments for both students
  const { assignments: abigailAssignments, loading: abigailLoading, refetch: refetchAbigail } = useAssignments('Abigail');
  const { assignments: khalilAssignments, loading: khalilLoading, refetch: refetchKhalil } = useAssignments('Khalil');
  
  // Fetch administrative notifications for badge count
  const { notifications } = useAdministrativeNotifications();
  
  // Filter function to remove split assignments - only show parent assignments
  const filterParentAssignments = (assignments: any[]) => {
    return assignments.filter(assignment => assignment.split_part_number === null);
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Starting sync...",
        description: "Fetching assignments from Canvas and updating schedules."
      });
      const { data, error } = await supabase.functions.invoke('daily-canvas-sync');
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
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
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
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .neq('status', 'pending')
        .order('created_at', { ascending: false });
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
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*');
      if (assignmentsError) throw assignmentsError;

      // Get sync status
      const { data: syncData, error: syncError } = await supabase
        .from('sync_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
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

  const handleAssignmentAdded = () => {
    // Refetch fresh data from database
    refetchAbigail();
    refetchKhalil();
  };

  // Auto-refresh every 30 seconds to keep data current
  useEffect(() => {
    const interval = setInterval(() => {
      // Silently refresh data to catch any updates from student dashboards
      refetchAbigail();
      refetchKhalil();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refetchAbigail, refetchKhalil]);

  useEffect(() => {
    getSyncStatusFromDB().then(setSyncHistory);
    getDiagnostics().then(setDiagnostics);
    getStudentSyncStatus().then(setStudentSyncStatus);
  }, []);

  // Calculate pending admin tasks count for badge
  const pendingTasksCount = notifications.filter(notification => !notification.completed).length;

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Admin Control Center</h1>
          <p className="text-muted-foreground">Complete management dashboard for students, assignments, and system operations</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Student Overview
            </TabsTrigger>
            <TabsTrigger value="add-assignment" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Assignment
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule & Clear
            </TabsTrigger>
            <TabsTrigger value="admin-tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Admin Tasks
              {pendingTasksCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {pendingTasksCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Canvas Sync
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              System Diagnostics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AlertBanner 
                  abigailAssignments={filterParentAssignments(abigailAssignments)}
                  khalilAssignments={filterParentAssignments(khalilAssignments)}
                />
              </div>
              <SystemStatusCard showDetails={true} />
            </div>

            {/* Two Column Student Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Abigail Section */}
              <StudentSection
                studentName="Abigail"
                assignments={filterParentAssignments(abigailAssignments)}
                loading={abigailLoading}
                onAssignmentAdded={handleAssignmentAdded}
              />

              {/* Khalil Section */}
              <StudentSection
                studentName="Khalil"
                assignments={filterParentAssignments(khalilAssignments)}
                loading={khalilLoading}
                onAssignmentAdded={handleAssignmentAdded}
              />
            </div>
          </TabsContent>

          <TabsContent value="add-assignment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Manual Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ManualAssignmentForm onSuccess={handleAssignmentAdded} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-6">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-bold">Unified Assignment Scheduler</h2>
              <p className="text-muted-foreground">Schedule assignments and clear schedules - consolidated scheduling system with dynamic student selection and flexible date ranges</p>
            </div>
            
            <ConsolidatedScheduler 
              onSchedulingComplete={() => {
                handleAssignmentAdded();
                toast({
                  title: "Schedule updated",
                  description: "Assignment scheduler has updated the schedules."
                });
              }}
            />
          </TabsContent>

          <TabsContent value="admin-tasks" className="space-y-6">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-bold">Administrative Tasks</h2>
              <p className="text-muted-foreground">Manage fees, forms, and administrative requirements</p>
            </div>
            
            {/* Co-op Administrative Checklists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CoopAdministrativeChecklist studentName="Abigail" />
              <CoopAdministrativeChecklist studentName="Khalil" />
            </div>
          </TabsContent>

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
                    {isLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5" />
                        Run Manual Sync
                      </>
                    )}
                  </Button>
                </div>

                {syncStatus && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Last Manual Sync Results</h4>
                    <pre className="text-sm bg-white p-3 rounded border overflow-auto">
                      {JSON.stringify(syncStatus, null, 2)}
                    </pre>
                  </div>
                )}
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
                {studentSyncStatus.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {studentSyncStatus.map(sync => (
                      <div key={sync.id} className="p-4 border rounded-lg bg-gray-50">
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
                          {sync.message && (
                            <p>
                              <span className="font-medium">Message:</span> {sync.message}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No sync data available</p>
                )}
                
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
                      {syncHistory.slice(0, 10).map(sync => (
                        <DropdownMenuItem key={sync.id} className="flex items-center justify-between p-3 cursor-default">
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
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <SystemStatusCard showDetails={true} />
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Diagnostics
                </CardTitle>
                <CardDescription>
                  Current system status and data overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {diagnostics ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {diagnostics.assignments?.length || 0}
                        </div>
                        <div className="text-sm text-blue-700">Total Assignments</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {diagnostics.assignments?.filter((a: any) => a.student_name === 'Abigail').length || 0}
                        </div>
                        <div className="text-sm text-green-700">Abigail's Assignments</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {diagnostics.assignments?.filter((a: any) => a.student_name === 'Khalil').length || 0}
                        </div>
                        <div className="text-sm text-purple-700">Khalil's Assignments</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {diagnostics.syncHistory?.length || 0}
                        </div>
                        <div className="text-sm text-orange-700">Recent Syncs</div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Last Updated</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(diagnostics.lastUpdated).toLocaleString()}
                      </p>
                    </div>

                    <Button 
                      onClick={() => getDiagnostics().then(setDiagnostics)} 
                      variant="outline" 
                      className="w-full"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Diagnostics
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Loading diagnostics...</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Permission Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Permission Test
                </CardTitle>
                <CardDescription>
                  Verify RLS policies and Supabase client permissions for assignments table
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DatabasePermissionTest />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSetup;