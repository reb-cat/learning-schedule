import React from 'react';
import { useAssignments } from '@/hooks/useAssignments';
import { AlertBanner } from '@/components/AlertBanner';
import { StudentSection } from '@/components/StudentSection';
import { ManualAssignmentForm } from '@/components/ManualAssignmentForm';
import { startOfWeek, endOfWeek, addWeeks, isWithinInterval, getDay } from 'date-fns';

import { SchedulingPreview } from '@/components/SchedulingPreview';
import { EditableAssignment } from '@/components/EditableAssignment';
import { CoopAdministrativeChecklist } from '@/components/CoopAdministrativeChecklist';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Play, Database, Plus } from "lucide-react";
import { useState, useEffect } from "react";
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

  // Extended assignment filtering - shows next 2 weeks
  const getWeeklyAssignments = (assignments: any[]) => {
    const now = new Date();
    
    // Define current week boundaries (Monday to Friday)
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    // Always show next week assignments (extended from Friday-only)
    const nextWeekStart = addWeeks(currentWeekStart, 1);
    const nextWeekEnd = addWeeks(currentWeekEnd, 1);
    
    const currentWeekAssignments: any[] = [];
    const nextWeekAssignments: any[] = [];
    
    assignments.forEach(assignment => {
      if (!assignment.due_date) return;
      const dueDate = new Date(assignment.due_date);
      
      // Check if assignment falls in current week
      if (isWithinInterval(dueDate, { start: currentWeekStart, end: currentWeekEnd })) {
        currentWeekAssignments.push(assignment);
      }
      // Check if assignment falls in next week (always show now)
      else if (isWithinInterval(dueDate, { start: nextWeekStart, end: nextWeekEnd })) {
        nextWeekAssignments.push(assignment);
      }
    });
    
    return { currentWeekAssignments, nextWeekAssignments, showNextWeek: true };
  };

  const abigailWeeklyData = getWeeklyAssignments(abigailAssignments);
  const khalilWeeklyData = getWeeklyAssignments(khalilAssignments);


  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Parent Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your children's academic progress</p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Dashboard Overview
            </TabsTrigger>
            <TabsTrigger value="add-assignment" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Manual Assignment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
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

        {/* Assignment Management - Weekly view with Friday preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Abigail's Upcoming Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* This Week Section */}
              {abigailWeeklyData.currentWeekAssignments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">This Week</h4>
                  {abigailWeeklyData.currentWeekAssignments.map((assignment) => (
                    <EditableAssignment 
                      key={assignment.id} 
                      assignment={assignment} 
                      onUpdate={handleAssignmentAdded}
                    />
                  ))}
                </div>
              )}
              
              {/* Next Week Preview (only on Friday) */}
              {abigailWeeklyData.showNextWeek && abigailWeeklyData.nextWeekAssignments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Next Week Preview</h4>
                  {abigailWeeklyData.nextWeekAssignments.map((assignment) => (
                    <EditableAssignment 
                      key={assignment.id} 
                      assignment={assignment} 
                      onUpdate={handleAssignmentAdded}
                    />
                  ))}
                </div>
              )}
              
              {/* No assignments message */}
              {abigailWeeklyData.currentWeekAssignments.length === 0 && 
               (!abigailWeeklyData.showNextWeek || abigailWeeklyData.nextWeekAssignments.length === 0) && (
                <p className="text-muted-foreground text-center py-4">No upcoming assignments this week</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Khalil's Upcoming Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* This Week Section */}
              {khalilWeeklyData.currentWeekAssignments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">This Week</h4>
                  {khalilWeeklyData.currentWeekAssignments.map((assignment) => (
                    <EditableAssignment 
                      key={assignment.id} 
                      assignment={assignment} 
                      onUpdate={handleAssignmentAdded}
                    />
                  ))}
                </div>
              )}
              
              {/* Next Week Preview (only on Friday) */}
              {khalilWeeklyData.showNextWeek && khalilWeeklyData.nextWeekAssignments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Next Week Preview</h4>
                  {khalilWeeklyData.nextWeekAssignments.map((assignment) => (
                    <EditableAssignment 
                      key={assignment.id} 
                      assignment={assignment} 
                      onUpdate={handleAssignmentAdded}
                    />
                  ))}
                </div>
              )}
              
              {/* No assignments message */}
              {khalilWeeklyData.currentWeekAssignments.length === 0 && 
               (!khalilWeeklyData.showNextWeek || khalilWeeklyData.nextWeekAssignments.length === 0) && (
                <p className="text-muted-foreground text-center py-4">No upcoming assignments this week</p>
              )}
            </CardContent>
          </Card>
        </div>

            {/* Co-op Administrative Checklists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CoopAdministrativeChecklist studentName="Abigail" />
              <CoopAdministrativeChecklist studentName="Khalil" />
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
        </Tabs>

      </div>
    </div>
  );
};

export default ParentDashboard;