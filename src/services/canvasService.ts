import { supabase } from "@/integrations/supabase/client";

interface CanvasSettings {
  apiUrl: string;
}

export interface Assignment {
  id: number;
  name: string;
  description: string;
  dueDate: Date | null;
  courseId: number;
  isSubmitted: boolean;
  pointsPossible: number;
  subject?: string;
}

class CanvasService {
  private getSettings(): CanvasSettings | null {
    const settings = localStorage.getItem("canvasSettings");
    return settings ? JSON.parse(settings) : null;
  }

  async getAssignmentsForStudent(student: 'Abigail' | 'Khalil'): Promise<Assignment[]> {
    const settings = this.getSettings();
    if (!settings || !settings.apiUrl) {
      console.error('Canvas settings not configured');
      return [];
    }

    try {
      const { data, error } = await supabase.functions.invoke('canvas-api', {
        body: {
          student,
          action: 'getAssignments',
          apiUrl: settings.apiUrl
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Parse dates from the response
      const assignments = data.assignments.map((assignment: any) => ({
        ...assignment,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null
      }));

      return assignments;
    } catch (error) {
      console.error('Error fetching Canvas assignments:', error);
      return [];
    }
  }

  async submitAssignment(courseId: number, assignmentId: number, student: 'Abigail' | 'Khalil'): Promise<boolean> {
    const settings = this.getSettings();
    if (!settings || !settings.apiUrl) {
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('canvas-api', {
        body: {
          student,
          action: 'submitAssignment',
          apiUrl: settings.apiUrl,
          courseId,
          assignmentId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data.success;
    } catch (error) {
      console.error('Error submitting assignment to Canvas:', error);
      return false;
    }
  }
}

export const canvasService = new CanvasService();