import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';

export interface StudentSupply {
  id: string;
  title: string;
  description: string;
  courseName: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  urgency: 'needed_today' | 'needed_tomorrow' | 'needed_this_week' | 'upcoming';
  type: 'supplies' | 'forms' | 'materials';
}

export const useStudentSupplies = (studentName: string) => {
  const [supplies, setSupplies] = useState<StudentSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categorizeUrgency = (dueDate?: string): StudentSupply['urgency'] => {
    if (!dueDate) return 'upcoming';
    
    const due = new Date(dueDate);
    if (isToday(due)) return 'needed_today';
    if (isTomorrow(due)) return 'needed_tomorrow';
    if (isThisWeek(due)) return 'needed_this_week';
    return 'upcoming';
  };

  const isStudentRelevant = (title: string, description: string): boolean => {
    const content = `${title} ${description}`.toLowerCase();
    
    // Student-relevant keywords (things they need to bring/remember)
    const studentKeywords = [
      'bring', 'supplies', 'materials', 'notebook', 'pencil', 'pen',
      'calculator', 'textbook', 'binder', 'folder', 'paper',
      'headphones', 'charger', 'laptop', 'tablet', 'uniform',
      'equipment', 'tools', 'art supplies', 'lab coat'
    ];
    
    // Parent-only keywords (exclude these)
    const parentOnlyKeywords = [
      'payment', 'fee', 'tuition', 'purchase', 'buy', 'order',
      'permission slip', 'form to sign', 'contact', 'meeting'
    ];
    
    // Check if it contains parent-only keywords
    const hasParentOnlyKeywords = parentOnlyKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    if (hasParentOnlyKeywords) return false;
    
    // Check if it contains student-relevant keywords
    const hasStudentKeywords = studentKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    return hasStudentKeywords;
  };

  const extractSupplyType = (title: string): StudentSupply['type'] => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('form') || titleLower.includes('permission')) {
      return 'forms';
    }
    if (titleLower.includes('material') || titleLower.includes('equipment')) {
      return 'materials';
    }
    return 'supplies';
  };

  const fetchStudentSupplies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch administrative notifications that are student-relevant
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('administrative_notifications')
        .select('*')
        .eq('student_name', studentName)
        .eq('completed', false)
        .in('notification_type', ['supplies', 'materials', 'forms'])
        .order('due_date', { ascending: true, nullsFirst: false });

      if (notificationsError) {
        throw notificationsError;
      }

      // Filter and transform notifications to student supplies
      const studentSupplies: StudentSupply[] = (notificationsData || [])
        .filter(notification => 
          isStudentRelevant(notification.title, notification.description || '')
        )
        .map(notification => ({
          id: notification.id,
          title: notification.title.replace(/^Supplies Needed - /, ''),
          description: notification.description || '',
          courseName: notification.course_name || '',
          dueDate: notification.due_date,
          priority: notification.priority as StudentSupply['priority'],
          urgency: categorizeUrgency(notification.due_date),
          type: extractSupplyType(notification.title)
        }));

      setSupplies(studentSupplies);
    } catch (err) {
      console.error('Error fetching student supplies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch supplies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentSupplies();
  }, [studentName]);

  // Group supplies by urgency
  const suppliesByUrgency = {
    today: supplies.filter(s => s.urgency === 'needed_today'),
    tomorrow: supplies.filter(s => s.urgency === 'needed_tomorrow'),
    thisWeek: supplies.filter(s => s.urgency === 'needed_this_week'),
    upcoming: supplies.filter(s => s.urgency === 'upcoming')
  };

  return {
    supplies,
    suppliesByUrgency,
    loading,
    error,
    refetch: fetchStudentSupplies
  };
};