import React from 'react';
import { useAssignments } from '@/hooks/useAssignments';
import { AlertBanner } from '@/components/AlertBanner';
import { StudentSection } from '@/components/StudentSection';
import ParentTaskDashboard from '@/components/ParentTaskDashboard';
import { SchedulingPreview } from '@/components/SchedulingPreview';
import { EditableAssignment } from '@/components/EditableAssignment';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ParentDashboard = () => {
  // Fetch assignments for both students
  const { assignments: abigailAssignments, loading: abigailLoading, refetch: refetchAbigail } = useAssignments('Abigail');
  const { assignments: khalilAssignments, loading: khalilLoading, refetch: refetchKhalil } = useAssignments('Khalil');

  const handleAssignmentAdded = () => {
    refetchAbigail();
    refetchKhalil();
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
        {/* Parent Task Dashboard */}
        <ParentTaskDashboard />
      </div>
    </div>
  );
};

export default ParentDashboard;