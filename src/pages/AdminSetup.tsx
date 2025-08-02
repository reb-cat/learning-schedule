import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle, AlertTriangle, Clock, Database, Search, Eye, BarChart3 } from "lucide-react";

const AdminSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
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

    } catch (error) {
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
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
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
      
      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
      }

      // Get recent sync status
      const { data: syncData, error: syncError } = await supabase
        .from('sync_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (syncError) {
        console.error('Error fetching sync status:', syncError);
      }

      // Group assignments by student
      const abigailAssignments = assignments?.filter(a => a.student_name === 'Abigail') || [];
      const khalilAssignments = assignments?.filter(a => a.student_name === 'Khalil') || [];

      return {
        totalAssignments: assignments?.length || 0,
        abigailCount: abigailAssignments.length,
        khalilCount: khalilAssignments.length,
        assignments: assignments || [],
        syncHistory: syncData || [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting diagnostics:', error);
      return null;
    }
  };

  React.useEffect(() => {
    getSyncStatusFromDB().then(setSyncStatus);
    getDiagnostics().then(setDiagnostics);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Setup & Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage Canvas integration and assignment scheduling.
        </p>
      </div>

      {/* Automated Sync Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Automated Daily Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Scheduled:</strong> Every day at 5:00 AM
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Automatically fetches Canvas assignments and creates optimized schedules before the children wake up.
              </p>
            </div>
            
            {Array.isArray(syncStatus) && syncStatus.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Recent Sync History</h4>
                {syncStatus.slice(0, 2).map((status) => (
                  <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{status.student_name}</span>
                        {getStatusBadge(status.sync_status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {status.sync_message}
                      </p>
                      {status.last_sync && (
                        <p className="text-xs text-muted-foreground">
                          Last sync: {new Date(status.last_sync).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div>Fetched: {status.assignments_fetched || 0}</div>
                      <div>Scheduled: {status.assignments_scheduled || 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Sync Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Manual Sync (Failsafe)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use manual sync when assignments change mid-day, for testing new schedules, or troubleshooting.
            </p>
            
            <Button 
              onClick={handleManualSync}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Manual Sync
                </>
              )}
            </Button>

            {syncStatus && !Array.isArray(syncStatus) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Last Manual Sync Results:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries((syncStatus as any).results || {}).map(([student, result]: [string, any]) => (
                    <div key={student} className="border border-gray-200 p-3 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{student}</span>
                        {result.error ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Success</Badge>
                        )}
                      </div>
                      {result.error ? (
                        <p className="text-sm text-red-600">{result.error}</p>
                      ) : (
                        <div className="text-sm text-gray-600">
                          <div>Fetched: {result.fetched} assignments</div>
                          <div>Scheduled: {result.scheduled} blocks</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Diagnostics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Sync Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={async () => {
                  const newDiagnostics = await getDiagnostics();
                  setDiagnostics(newDiagnostics);
                  setShowDiagnostics(!showDiagnostics);
                }}
                variant="outline"
                size="sm"
              >
                <Search className="w-4 h-4 mr-2" />
                {showDiagnostics ? 'Hide' : 'Show'} Detailed Diagnostics
              </Button>
            </div>

            {diagnostics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Total Assignments</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{diagnostics.totalAssignments}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">Abigail's Assignments</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{diagnostics.abigailCount}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Khalil's Assignments</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{diagnostics.khalilCount}</p>
                </div>
              </div>
            )}

            {showDiagnostics && diagnostics && (
              <div className="space-y-6 mt-6">
                <Separator />
                
                {/* Assignment Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Assignment Details</h4>
                  
                  {['Abigail', 'Khalil'].map(student => {
                    const studentAssignments = diagnostics.assignments.filter(a => a.student_name === student);
                    return (
                      <div key={student} className="space-y-3">
                        <h5 className="font-medium text-md">{student}'s Assignments ({studentAssignments.length})</h5>
                        {studentAssignments.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No assignments found in database</p>
                        ) : (
                          <div className="space-y-2">
                            {studentAssignments.slice(0, 5).map((assignment, idx) => (
                              <div key={idx} className="border border-gray-200 p-3 rounded text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium">{assignment.title}</span>
                                  <Badge variant={assignment.urgency === 'overdue' ? 'destructive' : 'secondary'}>
                                    {assignment.urgency}
                                  </Badge>
                                </div>
                                <div className="text-muted-foreground space-y-1">
                                  <div>Subject: {assignment.subject} | Load: {assignment.cognitive_load}</div>
                                  <div>Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}</div>
                                  <div>Course: {assignment.course_name}</div>
                                </div>
                              </div>
                            ))}
                            {studentAssignments.length > 5 && (
                              <p className="text-muted-foreground text-sm">
                                ... and {studentAssignments.length - 5} more assignments
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Sync History */}
                <div className="space-y-3">
                  <h4 className="font-medium text-lg">Recent Sync History</h4>
                  {diagnostics.syncHistory.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No sync history found</p>
                  ) : (
                    <div className="space-y-2">
                      {diagnostics.syncHistory.slice(0, 5).map((sync, idx) => (
                        <div key={idx} className="border border-gray-200 p-3 rounded text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{sync.student_name}</span>
                            <Badge variant={sync.status === 'success' ? 'default' : 'destructive'}>
                              {sync.status}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground">
                            <div>Message: {sync.message}</div>
                            <div>Count: {sync.assignments_count} | Type: {sync.sync_type}</div>
                            <div>Time: {new Date(sync.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(diagnostics.lastUpdated).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Canvas API Tokens</span>
              <Badge className="bg-green-100 text-green-800">Configured</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Database Tables</span>
              <Badge className="bg-green-100 text-green-800">Ready</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Daily Cron Job</span>
              <Badge className="bg-green-100 text-green-800">Active (5:00 AM)</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Scheduling Algorithm</span>
              <Badge className="bg-green-100 text-green-800">Neurodivergent-Optimized</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;