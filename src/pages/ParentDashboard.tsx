import React from 'react';
import { useAssignments } from '@/hooks/useAssignments';
import { AlertBanner } from '@/components/AlertBanner';
import { StudentSection } from '@/components/StudentSection';
import ParentTaskDashboard from '@/components/ParentTaskDashboard';
import { SchedulingPreview } from '@/components/SchedulingPreview';
import { EditableAssignment } from '@/components/EditableAssignment';
import { CoopAdministrativeChecklist } from '@/components/CoopAdministrativeChecklist';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Play, Database } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ParentDashboard = () => {
  // Fetch assignments for both students
  const { assignments: abigailAssignments, loading: abigailLoading, refetch: refetchAbigail } = useAssignments('Abigail');
  const { assignments: khalilAssignments, loading: khalilLoading, refetch: refetchKhalil } = useAssignments('Khalil');
  const [testingScheduler, setTestingScheduler] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const handleAssignmentAdded = () => {
    refetchAbigail();
    refetchKhalil();
  };

  const handleTestAutoScheduler = async () => {
    setTestingScheduler(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-scheduler', {
        body: { testMode: true }
      });
      
      if (error) throw error;
      
      toast.success("Auto-scheduler test completed successfully!");
      handleAssignmentAdded(); // Refresh assignments to see changes
    } catch (error) {
      console.error('Auto-scheduler test failed:', error);
      toast.error("Auto-scheduler test failed. Check console for details.");
    } finally {
      setTestingScheduler(false);
    }
  };

  const handleMigrateAdministrativeTasks = async () => {
    setMigrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-administrative-tasks');
      
      if (error) throw error;
      
      const result = data as { success: boolean; migratedCount: number; message: string; errors?: string[] };
      
      if (result.success) {
        toast.success(`${result.message}. Migrated ${result.migratedCount} tasks.`);
        if (result.errors && result.errors.length > 0) {
          console.warn('Migration errors:', result.errors);
        }
        handleAssignmentAdded(); // Refresh to see changes
      } else {
        throw new Error(result.message || 'Migration failed');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error("Migration failed. Check console for details.");
    } finally {
      setMigrating(false);
    }
  };

  // Filter assignments to only show those due within next 48 hours
  const getRelevantAssignments = (assignments: any[]) => {
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));
    
    return assignments.filter(assignment => {
      if (!assignment.due_date) return false;
      const dueDate = new Date(assignment.due_date);
      return dueDate <= fortyEightHoursFromNow;
    });
  };

  const relevantAbigailAssignments = getRelevantAssignments(abigailAssignments);
  const relevantKhalilAssignments = getRelevantAssignments(khalilAssignments);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Parent Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your children's academic progress</p>
        </div>

        {/* Alert Banner */}
        <AlertBanner 
          abigailAssignments={abigailAssignments}
          khalilAssignments={khalilAssignments}
        />

        {/* Two Column Student Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="todays-progress">
          {/* Abigail Section */}
          <StudentSection
            studentName="Abigail"
            assignments={abigailAssignments}
            loading={abigailLoading}
            onAssignmentAdded={handleAssignmentAdded}
          />

          {/* Khalil Section */}
          <StudentSection
            studentName="Khalil"
            assignments={khalilAssignments}
            loading={khalilLoading}
            onAssignmentAdded={handleAssignmentAdded}
          />
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Auto-Scheduler Control
                <Button 
                  onClick={handleTestAutoScheduler}
                  disabled={testingScheduler}
                  className="flex items-center gap-2"
                >
                  <Play size={16} />
                  {testingScheduler ? 'Running...' : 'Test Auto-Scheduler'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manually trigger the auto-scheduler to distribute unscheduled assignments across the next 5 days based on due dates and priorities.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Administrative Task Migration
                <Button 
                  onClick={handleMigrateAdministrativeTasks}
                  disabled={migrating}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Database size={16} />
                  {migrating ? 'Migrating...' : 'Migrate Admin Tasks'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Move administrative tasks (fees, forms) from assignments to the administrative checklist.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Smart Scheduling Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SchedulingPreview 
            studentName="Abigail" 
            onSchedulingComplete={handleAssignmentAdded}
          />
          <SchedulingPreview 
            studentName="Khalil" 
            onSchedulingComplete={handleAssignmentAdded}
          />
        </div>

        {/* Assignment Management - Only show assignments due within 48 hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Abigail's Upcoming Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {relevantAbigailAssignments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No assignments due in next 48 hours</p>
              ) : (
                relevantAbigailAssignments.map((assignment) => (
                  <EditableAssignment 
                    key={assignment.id} 
                    assignment={assignment} 
                    onUpdate={handleAssignmentAdded}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Khalil's Upcoming Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {relevantKhalilAssignments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No assignments due in next 48 hours</p>
              ) : (
                relevantKhalilAssignments.map((assignment) => (
                  <EditableAssignment 
                    key={assignment.id} 
                    assignment={assignment} 
                    onUpdate={handleAssignmentAdded}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
        {/* Co-op Administrative Checklists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CoopAdministrativeChecklist studentName="Abigail" />
          <CoopAdministrativeChecklist studentName="Khalil" />
        </div>

        {/* Parent Task Dashboard */}
        <ParentTaskDashboard />
      </div>
    </div>
  );
};

export default ParentDashboard;