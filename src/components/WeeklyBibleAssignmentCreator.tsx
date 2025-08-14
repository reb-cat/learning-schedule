import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';

interface WeeklyBibleAssignmentCreatorProps {
  studentName: string;
  onAssignmentsCreated?: () => void;
}

export const WeeklyBibleAssignmentCreator = ({ 
  studentName, 
  onAssignmentsCreated 
}: WeeklyBibleAssignmentCreatorProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const getCurrentWeekNumber = () => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  };

  const handleCreateWeeklyAssignments = async () => {
    try {
      setIsCreating(true);
      
      const { data, error } = await supabase.functions.invoke('create-weekly-bible-assignments', {
        body: { 
          studentName,
          weekNumber: getCurrentWeekNumber() 
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: `Created ${data.assignmentsCreated} Bible assignments for week ${data.weekNumber}`,
      });

      onAssignmentsCreated?.();

    } catch (error) {
      console.error('Create assignments error:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create Bible assignments",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          Weekly Bible
        </CardTitle>
        <CardDescription className="text-xs">
          Create this week's Bible reading assignments
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          onClick={handleCreateWeeklyAssignments} 
          disabled={isCreating}
          size="sm"
          className="w-full"
        >
          {isCreating ? 'Creating...' : 'Create Week\'s Assignments'}
        </Button>
      </CardContent>
    </Card>
  );
};