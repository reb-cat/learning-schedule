interface CanvasAssignment {
  id: number;
  name: string;
  description: string;
  due_at: string | null;
  course_id: number;
  submission: {
    submitted_at: string | null;
    workflow_state: string;
  } | null;
  points_possible: number;
}

interface CanvasSettings {
  apiUrl: string;
}

interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
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

  private async makeRequest(endpoint: string, student: 'Abigail' | 'Khalil'): Promise<any> {
    const settings = this.getSettings();
    if (!settings || !settings.apiUrl) {
      throw new Error("Canvas settings not configured");
    }

    // Get token from Supabase secrets
    const tokenKey = student === 'Abigail' ? 'ABIGAIL_CANVAS_TOKEN' : 'KHALIL_CANVAS_TOKEN';
    const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // In a real implementation, you'd fetch the secret from Supabase
    // For now, we'll check if it exists in the environment (which Supabase edge functions provide)
    const apiToken = typeof window !== 'undefined' ? null : process.env[tokenKey];
    
    if (!apiToken) {
      throw new Error(`API token not configured for ${student}. Please add ${tokenKey} in Supabase secrets.`);
    }

    const url = `${settings.apiUrl}/api/v1${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private guessSubjectFromAssignment(assignment: CanvasAssignment): string {
    const name = assignment.name.toLowerCase();
    const description = assignment.description?.toLowerCase() || "";
    
    if (name.includes('math') || name.includes('algebra') || name.includes('geometry') || name.includes('calculus')) {
      return 'Math';
    }
    if (name.includes('english') || name.includes('reading') || name.includes('writing') || name.includes('literature')) {
      return 'English';
    }
    if (name.includes('science') || name.includes('biology') || name.includes('chemistry') || name.includes('physics')) {
      return 'Science';
    }
    if (name.includes('history') || name.includes('social') || name.includes('government') || name.includes('civics')) {
      return 'History';
    }
    if (name.includes('spanish') || name.includes('french') || name.includes('language')) {
      return 'Spanish';
    }
    
    return 'General';
  }

  async getAssignmentsForStudent(student: 'Abigail' | 'Khalil'): Promise<Assignment[]> {
    const settings = this.getSettings();
    if (!settings) return [];

    try {
      // First, get all courses for the student
      const courses: CanvasCourse[] = await this.makeRequest('/courses?enrollment_state=active&per_page=100', student);
      
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

      let allAssignments: Assignment[] = [];

      // Fetch assignments from all courses
      for (const course of courses) {
        try {
          const assignments: CanvasAssignment[] = await this.makeRequest(
            `/courses/${course.id}/assignments?include[]=submission&per_page=100`,
            student
          );

      const courseAssignments = assignments
            .filter(assignment => {
              // Filter out submitted assignments
              if (assignment.submission?.workflow_state === 'submitted') {
                return false;
              }

              // Filter assignments due within 2 weeks
              if (assignment.due_at) {
                const dueDate = new Date(assignment.due_at);
                return dueDate <= twoWeeksFromNow && dueDate >= new Date();
              }

              return false;
            })
            .map(assignment => ({
              id: assignment.id,
              name: assignment.name,
              description: assignment.description || '',
              dueDate: assignment.due_at ? new Date(assignment.due_at) : null,
              courseId: assignment.course_id,
              isSubmitted: assignment.submission?.workflow_state === 'submitted',
              pointsPossible: assignment.points_possible || 0,
              subject: this.guessSubjectFromAssignment(assignment)
            }));

          allAssignments = [...allAssignments, ...courseAssignments];
        } catch (error) {
          console.error(`Error fetching assignments for course ${course.id}:`, error);
          // Continue with other courses even if one fails
        }
      }

      // Sort all assignments by due date
      return allAssignments.sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
    } catch (error) {
      console.error('Error fetching Canvas assignments:', error);
      return [];
    }
  }

  async submitAssignment(courseId: number, assignmentId: number, student: 'Abigail' | 'Khalil'): Promise<boolean> {
    try {
      await this.makeRequest(
        `/courses/${courseId}/assignments/${assignmentId}/submissions`,
        student
      );
      return true;
    } catch (error) {
      console.error('Error submitting assignment to Canvas:', error);
      return false;
    }
  }
}

export const canvasService = new CanvasService();