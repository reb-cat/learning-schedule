import React from 'react';
import { useAssignments } from '@/hooks/useAssignments';
import { AlertBanner } from '@/components/AlertBanner';
import { StudentSection } from '@/components/StudentSection';
import { ManualAssignmentForm } from '@/components/ManualAssignmentForm';
import { CoopAdministrativeChecklist } from '@/components/CoopAdministrativeChecklist';
import { AdminNavigation } from '@/components/shared/AdminNavigation';
import { SystemStatusCard } from '@/components/shared/SystemStatusCard';
import { SharedSchedulerService } from '@/components/shared/SharedSchedulerService';
import { useAdministrativeNotifications } from '@/hooks/useAdministrativeNotifications';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CheckSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
// Split assignment cleanup removed - using continuation system now


const ParentDashboard = () => {
  const navigate = useNavigate();
  
  // Fetch assignments for both students
  const { assignments: abigailAssignments, loading: abigailLoading, refetch: refetchAbigail, forceRefresh: forceRefreshAbigail } = useAssignments('Abigail');
  const { assignments: khalilAssignments, loading: khalilLoading, refetch: refetchKhalil, forceRefresh: forceRefreshKhalil } = useAssignments('Khalil');
  
  // Fetch administrative notifications for badge count
  const { notifications } = useAdministrativeNotifications();
  
  // Filter function to remove split assignments - only show parent assignments
  const filterParentAssignments = (assignments: any[]) => {
    return assignments.filter(assignment => assignment.split_part_number === null);
  };

  const handleAssignmentAdded = () => {
    // Force refetch to bypass cache and get fresh data from database
    forceRefreshAbigail();
    forceRefreshKhalil();
  };

  // DISABLED: Auto-refresh causing infinite loops
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     // Silently refresh data to catch any updates from student dashboards
  //     forceRefreshAbigail();
  //     forceRefreshKhalil();
  //   }, 30000); // 30 seconds

  //   return () => clearInterval(interval);
  // }, [forceRefreshAbigail, forceRefreshKhalil]);




  // Calculate pending admin tasks count for badge
  const pendingTasksCount = notifications.filter(notification => !notification.completed).length;


  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <AdminNavigation />
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Parent Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your children's academic progress</p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Student Overview
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
            <TabsTrigger value="scheduling" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Quick Scheduling
            </TabsTrigger>
            <TabsTrigger value="add-assignment" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Assignment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AlertBanner 
                  abigailAssignments={filterParentAssignments(abigailAssignments)}
                  khalilAssignments={filterParentAssignments(khalilAssignments)}
                />
              </div>
              <SystemStatusCard onStatusClick={() => navigate('/admin')} />
            </div>

            {/* Two Column Student Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="todays-progress">
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

          <TabsContent value="scheduling" className="space-y-6">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-bold">Quick Scheduling</h2>
              <p className="text-muted-foreground">Preview and manage assignment schedules</p>
            </div>
            
            {/* Quick Scheduling - Preview Mode */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Abigail's Schedule Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <SharedSchedulerService 
                    studentName="Abigail" 
                    mode="preview"
                    onSchedulingComplete={handleAssignmentAdded}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Khalil's Schedule Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <SharedSchedulerService 
                    studentName="Khalil" 
                    mode="preview"
                    onSchedulingComplete={handleAssignmentAdded}
                  />
                </CardContent>
              </Card>
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