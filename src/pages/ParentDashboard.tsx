import React from 'react';
import { useAssignments } from '@/hooks/useAssignments';
import { AlertBanner } from '@/components/AlertBanner';
import { StudentSection } from '@/components/StudentSection';
import ParentTaskDashboard from '@/components/ParentTaskDashboard';
import { EnhancedScheduler } from '@/components/EnhancedScheduler';

const ParentDashboard = () => {
  // Fetch assignments for both students
  const { assignments: abigailAssignments, loading: abigailLoading, refetch: refetchAbigail } = useAssignments('Abigail');
  const { assignments: khalilAssignments, loading: khalilLoading, refetch: refetchKhalil } = useAssignments('Khalil');

  const handleAssignmentAdded = () => {
    refetchAbigail();
    refetchKhalil();
  };

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

        {/* Enhanced Scheduler Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnhancedScheduler 
            studentName="Abigail" 
            onSchedulingComplete={handleAssignmentAdded}
          />
          <EnhancedScheduler 
            studentName="Khalil" 
            onSchedulingComplete={handleAssignmentAdded}
          />
        </div>

        {/* Parent Task Dashboard */}
        <ParentTaskDashboard />
      </div>
    </div>
  );
};

export default ParentDashboard;