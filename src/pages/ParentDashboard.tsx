import React from 'react';
import { useAssignments } from '@/hooks/useAssignments';
import { AlertBanner } from '@/components/AlertBanner';
import { QuickActionsBar } from '@/components/QuickActionsBar';
import { StudentSection } from '@/components/StudentSection';
import AdministrativePanel from '@/components/AdministrativePanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings } from 'lucide-react';

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

        {/* Quick Actions Bar */}
        <QuickActionsBar />

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

        {/* Administrative Panel - Collapsible at Bottom */}
        <Collapsible>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Administrative Panel
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <AdministrativePanel />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
};

export default ParentDashboard;