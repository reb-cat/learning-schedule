import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

        

        <Tabs defaultValue="sync" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Canvas Sync
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Diagnostics
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Manual Assignments
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
                  <Button 
                    onClick={handleManualSync} 
                    disabled={isLoading}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 px-8"
                  >
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

            {/* Recent Sync Status - Dropdown Summary */}
            {syncHistory.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Recent Sync Status</p>
                    <p className="text-sm text-gray-500">
                      Last: {new Date(syncHistory[0].created_at).toLocaleString()} 
                      {syncHistory[0].sync_type === 'scheduled' ? ' (Auto)' : ' (Manual)'}
                    </p>
                  </div>
                  {getStatusBadge(syncHistory[0].status)}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      View History
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 max-h-64 overflow-y-auto bg-white border shadow-lg z-50">
                    <div className="px-3 py-2 border-b">
                      <p className="font-medium text-sm">Recent Sync History</p>
                    </div>
                    {syncHistory.slice(0, 10).map((sync) => (
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
            )}
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
                          Hide Detailed Data
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Show Detailed Data
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
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <ManualAssignmentForm onSuccess={() => {
              toast({
                title: "Assignment Created",
                description: "Manual assignment has been added to the system",
              });
              // Refresh diagnostics to show new assignment
              getDiagnostics().then(setDiagnostics);
            }} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSetup;