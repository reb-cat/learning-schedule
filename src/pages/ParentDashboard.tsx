import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdministrativePanel from '@/components/AdministrativePanel';
import { ManualAssignmentForm } from '@/components/ManualAssignmentForm';
import { useAssignments } from '@/hooks/useAssignments';
import { 
  Users, 
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  BookOpen
} from 'lucide-react';

const ParentDashboard = () => {
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const { assignments: abigailAssignments } = useAssignments('Abigail');
  const { assignments: khalilAssignments } = useAssignments('Khalil');

  const getUpcomingAssignments = (assignments: any[]) => {
    const now = new Date();
    const upcoming = assignments.filter(a => {
      if (!a.due_date) return false;
      const dueDate = new Date(a.due_date);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0;
    });
    return upcoming.slice(0, 3);
  };

  const getOverdueAssignments = (assignments: any[]) => {
    const now = new Date();
    return assignments.filter(a => {
      if (!a.due_date) return false;
      return new Date(a.due_date) < now;
    });
  };

  const abigailUpcoming = getUpcomingAssignments(abigailAssignments);
  const khalilUpcoming = getUpcomingAssignments(khalilAssignments);
  const abigailOverdue = getOverdueAssignments(abigailAssignments);
  const khalilOverdue = getOverdueAssignments(khalilAssignments);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Parent Dashboard</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Manage administrative tasks, track progress, and create custom assignments for your children's learning journey.
          </p>
        </div>

        {/* Quick Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Abigail - Upcoming</p>
                  <p className="text-2xl font-bold text-primary">{abigailUpcoming.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Khalil - Upcoming</p>
                  <p className="text-2xl font-bold text-primary">{khalilUpcoming.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue Items</p>
                  <p className="text-2xl font-bold text-destructive">
                    {abigailOverdue.length + khalilOverdue.length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Active</p>
                  <p className="text-2xl font-bold text-secondary-foreground">
                    {abigailAssignments.length + khalilAssignments.length}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-secondary-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="administrative" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="administrative" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Administrative Tasks
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Assignment
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Student Overview
            </TabsTrigger>
          </TabsList>

          {/* Administrative Tasks Tab */}
          <TabsContent value="administrative" className="space-y-6">
            <AdministrativePanel />
          </TabsContent>

          {/* Create Assignment Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Selection</CardTitle>
                <CardDescription>
                  Choose which student this assignment is for before creating
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select student for assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Abigail">Abigail</SelectItem>
                    <SelectItem value="Khalil">Khalil</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedStudent && (
              <div>
                {/* Student-specific guidance */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Creating assignment for {selectedStudent}</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedStudent === 'Abigail' 
                            ? 'Consider executive function needs - consistent structure and clear deadlines work best.'
                            : 'For optimal learning with dyslexia, schedule in morning blocks (2-4) when focus is strongest.'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ManualAssignmentForm 
                  onSuccess={() => {
                    // Could add success callback logic here
                  }}
                />
              </div>
            )}

            {!selectedStudent && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Select a Student</h3>
                  <p className="text-muted-foreground">
                    Please select which student this assignment is for to continue
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Student Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Abigail's Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Abigail's Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Assignments</span>
                      <Badge variant="secondary">{abigailAssignments.length}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Upcoming This Week</span>
                      <Badge variant="default">{abigailUpcoming.length}</Badge>
                    </div>
                    {abigailOverdue.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Overdue</span>
                        <Badge variant="destructive">{abigailOverdue.length}</Badge>
                      </div>
                    )}
                  </div>

                  {abigailUpcoming.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Upcoming Assignments</h4>
                      {abigailUpcoming.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{assignment.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Khalil's Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Khalil's Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Assignments</span>
                      <Badge variant="secondary">{khalilAssignments.length}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Upcoming This Week</span>
                      <Badge variant="default">{khalilUpcoming.length}</Badge>
                    </div>
                    {khalilOverdue.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Overdue</span>
                        <Badge variant="destructive">{khalilOverdue.length}</Badge>
                      </div>
                    )}
                  </div>

                  {khalilUpcoming.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Upcoming Assignments</h4>
                      {khalilUpcoming.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{assignment.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ParentDashboard;