export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      administrative_notifications: {
        Row: {
          amount: number | null
          canvas_id: string | null
          canvas_url: string | null
          completed: boolean
          completed_at: string | null
          course_name: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          notification_type: string
          priority: string
          student_name: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          canvas_id?: string | null
          canvas_url?: string | null
          completed?: boolean
          completed_at?: string | null
          course_name?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notification_type?: string
          priority?: string
          student_name: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          canvas_id?: string | null
          canvas_url?: string | null
          completed?: boolean
          completed_at?: string | null
          course_name?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notification_type?: string
          priority?: string
          student_name?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          academic_year: string | null
          actual_estimated_minutes: number | null
          assignment_type: string | null
          block_position: number | null
          blocks_scheduling: boolean | null
          buffer_time_minutes: number | null
          canvas_id: string | null
          canvas_url: string | null
          category: string | null
          cognitive_load: string | null
          course_name: string | null
          created_at: string
          display_as_single_event: boolean | null
          due_date: string | null
          eligible_for_scheduling: boolean
          estimated_blocks_needed: number | null
          estimated_time_minutes: number | null
          event_group_id: string | null
          id: string
          is_full_day_block: boolean | null
          is_split_assignment: boolean | null
          is_template: boolean | null
          notes: string | null
          original_assignment_id: string | null
          parent_assignment_id: string | null
          priority: string | null
          recurrence_pattern: Json | null
          scheduled_block: number | null
          scheduled_date: string | null
          scheduled_day: string | null
          scheduling_priority: number | null
          shared_block_id: string | null
          source: string | null
          split_part_number: number | null
          student_name: string
          subject: string | null
          task_type: string | null
          title: string
          total_split_parts: number | null
          updated_at: string
          urgency: string | null
          volunteer_hours: number | null
          volunteer_organization: string | null
        }
        Insert: {
          academic_year?: string | null
          actual_estimated_minutes?: number | null
          assignment_type?: string | null
          block_position?: number | null
          blocks_scheduling?: boolean | null
          buffer_time_minutes?: number | null
          canvas_id?: string | null
          canvas_url?: string | null
          category?: string | null
          cognitive_load?: string | null
          course_name?: string | null
          created_at?: string
          display_as_single_event?: boolean | null
          due_date?: string | null
          eligible_for_scheduling?: boolean
          estimated_blocks_needed?: number | null
          estimated_time_minutes?: number | null
          event_group_id?: string | null
          id?: string
          is_full_day_block?: boolean | null
          is_split_assignment?: boolean | null
          is_template?: boolean | null
          notes?: string | null
          original_assignment_id?: string | null
          parent_assignment_id?: string | null
          priority?: string | null
          recurrence_pattern?: Json | null
          scheduled_block?: number | null
          scheduled_date?: string | null
          scheduled_day?: string | null
          scheduling_priority?: number | null
          shared_block_id?: string | null
          source?: string | null
          split_part_number?: number | null
          student_name: string
          subject?: string | null
          task_type?: string | null
          title: string
          total_split_parts?: number | null
          updated_at?: string
          urgency?: string | null
          volunteer_hours?: number | null
          volunteer_organization?: string | null
        }
        Update: {
          academic_year?: string | null
          actual_estimated_minutes?: number | null
          assignment_type?: string | null
          block_position?: number | null
          blocks_scheduling?: boolean | null
          buffer_time_minutes?: number | null
          canvas_id?: string | null
          canvas_url?: string | null
          category?: string | null
          cognitive_load?: string | null
          course_name?: string | null
          created_at?: string
          display_as_single_event?: boolean | null
          due_date?: string | null
          eligible_for_scheduling?: boolean
          estimated_blocks_needed?: number | null
          estimated_time_minutes?: number | null
          event_group_id?: string | null
          id?: string
          is_full_day_block?: boolean | null
          is_split_assignment?: boolean | null
          is_template?: boolean | null
          notes?: string | null
          original_assignment_id?: string | null
          parent_assignment_id?: string | null
          priority?: string | null
          recurrence_pattern?: Json | null
          scheduled_block?: number | null
          scheduled_date?: string | null
          scheduled_day?: string | null
          scheduling_priority?: number | null
          shared_block_id?: string | null
          source?: string | null
          split_part_number?: number | null
          student_name?: string
          subject?: string | null
          task_type?: string | null
          title?: string
          total_split_parts?: number | null
          updated_at?: string
          urgency?: string | null
          volunteer_hours?: number | null
          volunteer_organization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_parent_assignment_id_fkey"
            columns: ["parent_assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_original_assignment"
            columns: ["original_assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_patterns: {
        Row: {
          assignment_type: string
          average_duration_factor: number | null
          completion_count: number | null
          created_at: string
          id: string
          last_updated: string
          student_name: string
          subject: string
          total_actual_minutes: number | null
          total_estimated_minutes: number | null
          typical_cognitive_load: string | null
        }
        Insert: {
          assignment_type: string
          average_duration_factor?: number | null
          completion_count?: number | null
          created_at?: string
          id?: string
          last_updated?: string
          student_name: string
          subject: string
          total_actual_minutes?: number | null
          total_estimated_minutes?: number | null
          typical_cognitive_load?: string | null
        }
        Update: {
          assignment_type?: string
          average_duration_factor?: number | null
          completion_count?: number | null
          created_at?: string
          id?: string
          last_updated?: string
          student_name?: string
          subject?: string
          total_actual_minutes?: number | null
          total_estimated_minutes?: number | null
          typical_cognitive_load?: string | null
        }
        Relationships: []
      }
      student_energy_patterns: {
        Row: {
          confidence_score: number | null
          created_at: string
          data_points_count: number | null
          energy_data: Json
          id: string
          last_updated: string
          pattern_type: string
          student_name: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          data_points_count?: number | null
          energy_data: Json
          id?: string
          last_updated?: string
          pattern_type: string
          student_name: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          data_points_count?: number | null
          energy_data?: Json
          id?: string
          last_updated?: string
          pattern_type?: string
          student_name?: string
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          assignments_count: number | null
          created_at: string
          id: string
          message: string | null
          status: string
          student_name: string
          sync_type: string | null
          updated_at: string
        }
        Insert: {
          assignments_count?: number | null
          created_at?: string
          id?: string
          message?: string | null
          status: string
          student_name: string
          sync_type?: string | null
          updated_at?: string
        }
        Update: {
          assignments_count?: number | null
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          student_name?: string
          sync_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_estimated_blocks: {
        Args: { estimated_minutes: number }
        Returns: number
      }
      classify_task_type: {
        Args: { title: string; course_name: string }
        Returns: string
      }
      estimate_task_time: {
        Args: { title: string; estimated_minutes: number }
        Returns: number
      }
      update_energy_pattern: {
        Args: {
          p_student_name: string
          p_energy_data: Json
          p_confidence_adjustment?: number
        }
        Returns: undefined
      }
      update_learning_patterns: {
        Args: {
          p_student_name: string
          p_subject: string
          p_assignment_type: string
          p_estimated_minutes: number
          p_actual_minutes: number
          p_cognitive_load: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
