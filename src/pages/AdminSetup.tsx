import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdministrativePanel from '@/components/AdministrativePanel';
import { ManualAssignmentForm } from '@/components/ManualAssignmentForm';
import { 
  RefreshCw, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Database,
  Zap,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Plus,
  BookOpen,
  AlertTriangle
} from 'lucide-react';

const AdminSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { toast } = useToast();

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Starting sync...",
        description: "Fetching assignments from Canvas and updating schedules.",
      });

      const { data, error } = await supabase.functions.invoke('daily-canvas-sync');
      
      if (error) {
        throw new Error(error.message);
      }

      setSyncStatus(data);
      
      // Refresh diagnostics after sync
      const newDiagnostics = await getDiagnostics();
      setDiagnostics(newDiagnostics);
      
      toast({
        title: "Sync completed!",
        description: `Successfully processed assignments for both students.`,
      });

    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
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
        .limit(5);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sync status:', error);
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

  useEffect(() => {
    getSyncStatusFromDB().then(setSyncHistory);
    getDiagnostics().then(setDiagnostics);
  }, []);

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Canvas Integration & Scheduling Admin</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Monitor and manage the automated Canvas assignment sync and intelligent scheduling system. 
            View system diagnostics, trigger manual syncs, and ensure optimal learning schedules for both students.
          </p>
        </div>

        <AdministrativePanel />

        <Tabs defaultValue="sync" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Canvas Sync
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Manual Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-6">
            {/* Automated Daily Sync Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Automated Daily Sync
                </CardTitle>
                <CardDescription>
                  Scheduled daily at 6:00 AM to fetch new Canvas assignments and update scheduling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Daily Sync Active</p>
                      <p className="text-sm text-green-700">Next scheduled sync: Tomorrow at 6:00 AM</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Automated
                  </Badge>
                </div>

                {syncHistory.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Recent Sync History</h4>
                    <div className="space-y-2">
                      {syncHistory.slice(0, 3).map((sync) => (
                        <div key={sync.id} className="flex items-center justify-between p-3 bg-white rounded border">
                          <div className="flex items-center gap-3">
                            {getStatusBadge(sync.status)}
                            <div>
                              <p className="text-sm font-medium">{sync.student_name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(sync.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{sync.assignments_count} assignments</p>
                            <p className="text-xs text-gray-500">{sync.sync_type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Sync (Failsafe) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Manual Sync (Failsafe)
                </CardTitle>
                <CardDescription>
                  Emergency sync button for immediate Canvas assignment updates and schedule regeneration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">On-Demand Sync Available</p>
                      <p className="text-sm text-blue-700">Manually trigger assignment sync and scheduling update</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleManualSync} 
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Run Manual Sync
                      </>
                    )}
                  </Button>
                </div>

                {syncStatus && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Last Manual Sync Results</h4>
                    <pre className="text-sm bg-white p-3 rounded border overflow-auto">
                      {JSON.stringify(syncStatus, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sync Diagnostics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Sync Diagnostics
                </CardTitle>
                <CardDescription>
                  Detailed view of assignment counts, sync history, and system health metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {diagnostics && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </div>
                )}

                <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full">
                      {showDiagnostics ? (
                        <>
                          <ChevronUp className="mr-2 h-4 w-4" />
                          Hide Detailed Diagnostics
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Show Detailed Diagnostics
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {diagnostics && (
                      <>
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
                                {diagnostics.assignments?.slice(0, 10).map((assignment: any) => (
                                  <tr key={assignment.id} className="border-b">
                                    <td className="p-2">{assignment.student_name}</td>
                                    <td className="p-2">{assignment.title}</td>
                                    <td className="p-2">{assignment.subject}</td>
                                    <td className="p-2">
                                      <Badge variant={assignment.source === 'canvas' ? 'default' : 'secondary'}>
                                        {assignment.source}
                                      </Badge>
                                    </td>
                                    <td className="p-2">{assignment.assignment_type || 'academic'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium">Recent Sync History</h4>
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
                                {diagnostics.syncHistory?.map((sync: any) => (
                                  <tr key={sync.id} className="border-b">
                                    <td className="p-2">{sync.student_name}</td>
                                    <td className="p-2">{getStatusBadge(sync.status)}</td>
                                    <td className="p-2">{sync.assignments_count}</td>
                                    <td className="p-2">{new Date(sync.created_at).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Configuration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuration Status
                </CardTitle>
                <CardDescription>
                  System components and their current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <span className="text-sm font-medium">Canvas API</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <span className="text-sm font-medium">Supabase DB</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <span className="text-sm font-medium">Edge Functions</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <span className="text-sm font-medium">Scheduling Engine</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Ready</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Manual Assignment Management
                </CardTitle>
                <CardDescription>
                  Create and manage non-Canvas assignments like driving lessons, tutoring sessions, and life skills activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ManualAssignmentForm onSuccess={() => {
                  toast({
                    title: "Assignment Created",
                    description: "Manual assignment has been added to the system",
                  });
                  // Refresh diagnostics to show new assignment
                  getDiagnostics().then(setDiagnostics);
                }} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSetup;