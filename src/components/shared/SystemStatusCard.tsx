import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface SystemStatusCardProps {
  showDetails?: boolean;
  onStatusClick?: () => void;
}

export function SystemStatusCard({ showDetails = false, onStatusClick }: SystemStatusCardProps) {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      
      // Get recent sync status
      const { data: syncData } = await supabase
        .from('sync_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2);

      // Get assignment counts
      const { data: assignments } = await supabase
        .from('assignments')
        .select('student_name, completion_status');

      setSystemStatus({
        lastSync: syncData?.[0] || null,
        totalAssignments: assignments?.length || 0,
        abigailAssignments: assignments?.filter(a => a.student_name === 'Abigail').length || 0,
        khalilAssignments: assignments?.filter(a => a.student_name === 'Khalil').length || 0,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error fetching system status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔧 SystemStatusCard useEffect - DISABLED to debug auth loop');
    fetchSystemStatus();
    // TEMPORARILY DISABLED - DEBUGGING AUTH LOOP
    // const interval = setInterval(fetchSystemStatus, 60000); // Update every minute
    // return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Online</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Syncing</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading system status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={showDetails ? "" : "cursor-pointer hover:bg-accent/50"} onClick={!showDetails ? onStatusClick : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          System Status
          {systemStatus?.lastSync && getStatusBadge(systemStatus.lastSync.status)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Last Sync</span>
            <span className="text-sm">
              {systemStatus?.lastSync 
                ? new Date(systemStatus.lastSync.created_at).toLocaleTimeString()
                : 'Never'
              }
            </span>
          </div>
          
          {showDetails && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Assignments</span>
                <span className="text-sm font-medium">{systemStatus?.totalAssignments}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-sm font-medium text-blue-600">{systemStatus?.abigailAssignments}</div>
                  <div className="text-xs text-blue-700">Abigail</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="text-sm font-medium text-purple-600">{systemStatus?.khalilAssignments}</div>
                  <div className="text-xs text-purple-700">Khalil</div>
                </div>
              </div>
            </>
          )}
          
          {!showDetails && (
            <Button variant="outline" size="sm" className="w-full mt-2">
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}