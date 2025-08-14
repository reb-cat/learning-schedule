import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const BibleAssignmentImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    try {
      setIsImporting(true);

      const { data, error } = await supabase.functions.invoke('import-bible-assignments', {
        body: { studentNames: ['Abigail', 'Khalil'] }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Imported ${data.assignmentsCount} Bible assignments for both students.`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import Bible assignments",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Bible Assignments Import</CardTitle>
        <CardDescription>
          Import the 52-week Bible curriculum for both Abigail and Khalil.
          This will create shared assignments that stay synchronized.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleImport} 
          disabled={isImporting}
          className="w-full"
        >
          {isImporting ? 'Importing...' : 'Import Bible Assignments'}
        </Button>
      </CardContent>
    </Card>
  );
};