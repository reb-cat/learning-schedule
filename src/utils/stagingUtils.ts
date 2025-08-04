import { supabase } from "@/integrations/supabase/client";

export type StagingMode = 'production' | 'staging';

export const stagingUtils = {
  // Get the current staging mode from URL or localStorage
  getCurrentMode(): StagingMode {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStaging = urlParams.get('staging');
    
    if (urlStaging === 'true') {
      localStorage.setItem('staging-mode', 'staging');
      return 'staging';
    } else if (urlStaging === 'false') {
      localStorage.setItem('staging-mode', 'production');
      return 'production';
    }
    
    return (localStorage.getItem('staging-mode') as StagingMode) || 'production';
  },

  // Set staging mode and update URL
  setMode(mode: StagingMode) {
    localStorage.setItem('staging-mode', mode);
    const url = new URL(window.location.href);
    url.searchParams.set('staging', mode === 'staging' ? 'true' : 'false');
    window.history.replaceState({}, '', url.toString());
  },

  // Get table name based on staging mode
  getTableName(baseTable: string, mode?: StagingMode): string {
    const currentMode = mode || this.getCurrentMode();
    return currentMode === 'staging' ? `${baseTable}_staging` : baseTable;
  },

  // Clear all staging data
  async clearStagingData(): Promise<void> {
    await supabase.from('assignments_staging').delete().neq('id', '');
    await supabase.from('administrative_notifications_staging').delete().neq('id', '');
    await supabase.from('learning_patterns_staging').delete().neq('id', '');
    await supabase.from('student_energy_patterns_staging').delete().neq('id', '');
    await supabase.from('sync_status_staging').delete().neq('id', '');
  },

  // Copy production data to staging
  async copyProductionToStaging(): Promise<void> {
    // Copy assignments
    const { data: assignments } = await supabase.from('assignments').select('*');
    if (assignments && assignments.length > 0) {
      await supabase.from('assignments_staging').insert(
        assignments.map(a => ({ ...a, id: undefined, source: 'staging' }))
      );
    }

    // Copy administrative notifications
    const { data: notifications } = await supabase.from('administrative_notifications').select('*');
    if (notifications && notifications.length > 0) {
      await supabase.from('administrative_notifications_staging').insert(
        notifications.map(n => ({ ...n, id: undefined }))
      );
    }

    // Copy learning patterns
    const { data: patterns } = await supabase.from('learning_patterns').select('*');
    if (patterns && patterns.length > 0) {
      await supabase.from('learning_patterns_staging').insert(
        patterns.map(p => ({ ...p, id: undefined }))
      );
    }

    // Copy energy patterns
    const { data: energy } = await supabase.from('student_energy_patterns').select('*');
    if (energy && energy.length > 0) {
      await supabase.from('student_energy_patterns_staging').insert(
        energy.map(e => ({ ...e, id: undefined }))
      );
    }
  },

  // Seed staging data with test assignments for August 2025
  async seedTestData(): Promise<void> {
    // Check if test data already exists to prevent duplicates
    const { data: existing } = await supabase
      .from('assignments_staging')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('Test data already exists, skipping seed');
      return;
    }

    const testAssignments = [
      {
        student_name: 'Abigail',
        title: 'Math Chapter 12 Review',
        course_name: 'Algebra II',
        subject: 'Math',
        due_date: '2024-01-15T23:59:00Z',
        estimated_time_minutes: 45,
        cognitive_load: 'medium',
        urgency: 'medium',
        completion_status: 'not_started',
        task_type: 'academic',
        source: 'staging'
      },
      {
        student_name: 'Abigail',
        title: 'Science Lab Report - Chemical Reactions',
        course_name: 'Chemistry',
        subject: 'Science',
        due_date: '2024-01-16T23:59:00Z',
        estimated_time_minutes: 60,
        cognitive_load: 'high',
        urgency: 'high',
        completion_status: 'not_started',
        task_type: 'academic',
        source: 'staging'
      },
      {
        student_name: 'Abigail',
        title: 'English Literature Analysis',
        course_name: 'AP English',
        subject: 'English',
        due_date: '2024-01-18T23:59:00Z',
        estimated_time_minutes: 75,
        cognitive_load: 'high',
        urgency: 'medium',
        completion_status: 'not_started',
        task_type: 'academic',
        source: 'staging'
      },
      {
        student_name: 'Abigail',
        title: 'History Essay - World War II',
        course_name: 'AP History',
        subject: 'History',
        due_date: '2024-01-20T23:59:00Z',
        estimated_time_minutes: 90,
        cognitive_load: 'high',
        urgency: 'low',
        completion_status: 'not_started',
        task_type: 'academic',
        source: 'staging'
      },
      {
        student_name: 'Abigail',
        title: 'Forensics Case Study Analysis',
        course_name: 'Forensic Science',
        subject: 'Science',
        due_date: '2024-01-22T23:59:00Z',
        estimated_time_minutes: 90,
        cognitive_load: 'high',
        urgency: 'low',
        completion_status: 'not_started',
        task_type: 'academic',
        source: 'staging'
      },
      {
        student_name: 'Abigail',
        title: 'Baking Project - Chocolate Cake',
        course_name: 'Life Skills',
        subject: 'Life Skills',
        due_date: '2024-01-25T23:59:00Z',
        estimated_time_minutes: 120,
        cognitive_load: 'low',
        urgency: 'low',
        completion_status: 'not_started',
        task_type: 'academic',
        source: 'staging'
      }
    ];

    const { error } = await supabase
      .from('assignments_staging')
      .insert(testAssignments);

    if (error) {
      console.error('Error seeding test data:', error);
      throw error;
    }

    console.log('Test data seeded successfully');
  }
};