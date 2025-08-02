import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdministrativeNotification {
  id: string;
  student_name: string;
  title: string;
  description?: string;
  notification_type: string;
  priority: string;
  due_date?: string;
  amount?: number;
  completed: boolean;
  completed_at?: string;
  canvas_id?: string;
  canvas_url?: string;
  course_name?: string;
  created_at: string;
  updated_at: string;
}

export const useAdministrativeNotifications = () => {
  const [notifications, setNotifications] = useState<AdministrativeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch from administrative_notifications table
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('administrative_notifications')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false });

      if (notificationsError) {
        throw notificationsError;
      }

      // Fetch administrative assignments from assignments table
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('category', 'administrative')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (assignmentsError) {
        throw assignmentsError;
      }

      // Transform assignments to match notification interface
      const transformedAssignments = (assignmentsData || []).map(assignment => ({
        id: assignment.id,
        student_name: assignment.student_name,
        title: assignment.title,
        description: `From ${assignment.course_name}`,
        notification_type: assignment.title.toLowerCase().includes('fee') ? 'fees' : 'forms',
        priority: 'high',
        due_date: assignment.due_date,
        amount: assignment.title.toLowerCase().includes('fee') ? null : undefined,
        completed: false,
        completed_at: undefined,
        canvas_id: assignment.canvas_id,
        canvas_url: assignment.canvas_url,
        course_name: assignment.course_name,
        created_at: assignment.created_at,
        updated_at: assignment.updated_at
      }));

      // Combine both sources
      const allNotifications = [
        ...(notificationsData || []),
        ...transformedAssignments
      ];

      setNotifications(allNotifications as AdministrativeNotification[]);
    } catch (err) {
      console.error('Error fetching administrative notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (id: string) => {
    try {
      const { error } = await supabase
        .from('administrative_notifications')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, completed: true, completed_at: new Date().toISOString() }
            : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as completed:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return {
    notifications,
    loading,
    error,
    refetch: fetchNotifications,
    markAsCompleted
  };
};