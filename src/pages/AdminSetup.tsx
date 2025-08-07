import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
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
        </div>

        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
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
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-6">
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

            {/* Add Assignment Form */}
            <Collapsible open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Manual Assignment
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isAddFormOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Create homework, appointments, and activities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ManualAssignmentForm onSuccess={handleAssignmentAdded} />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
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
            {/* Co-op Administrative Checklists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CoopAdministrativeChecklist studentName="Abigail" />
              <CoopAdministrativeChecklist studentName="Khalil" />
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            {/* Manual Sync */}
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <RefreshCw className="h-6 w-6" />
                  Canvas Sync
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
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
                  <div className="p-4 bg-gray-50 rounded-lg mt-6">
                    <h4 className="font-medium mb-2">Last Manual Sync Results</h4>
                    <pre className="text-sm bg-white p-3 rounded border overflow-auto">
                      {JSON.stringify(syncStatus, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSetup;