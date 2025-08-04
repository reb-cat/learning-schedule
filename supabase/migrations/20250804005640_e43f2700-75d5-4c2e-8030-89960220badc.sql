-- Create staging tables that mirror production tables exactly

-- 1. Create assignments_staging table
CREATE TABLE public.assignments_staging (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name text NOT NULL,
  title text NOT NULL,
  course_name text,
  subject text,
  due_date timestamp with time zone,
  estimated_time_minutes integer,
  actual_estimated_minutes integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  eligible_for_scheduling boolean NOT NULL DEFAULT true,
  recurrence_pattern jsonb,
  is_template boolean DEFAULT false,
  parent_assignment_id uuid,
  scheduled_block integer,
  scheduled_date date,
  scheduled_day text,
  original_assignment_id uuid,
  estimated_blocks_needed integer DEFAULT 1,
  scheduling_priority integer DEFAULT 5,
  task_type text DEFAULT 'academic'::text,
  academic_year text,
  category text DEFAULT 'academic'::text,
  assignment_type text DEFAULT 'academic'::text,
  source text DEFAULT 'staging'::text,
  quiz_type text,
  notes text,
  priority text DEFAULT 'medium'::text,
  volunteer_organization text,
  urgency text,
  cognitive_load text,
  module_id text,
  canvas_id text,
  canvas_url text,
  item_type text DEFAULT 'assignment'::text,
  volunteer_hours integer,
  module_position integer,
  is_split_assignment boolean DEFAULT false,
  split_part_number integer DEFAULT 1,
  total_split_parts integer DEFAULT 1,
  block_position integer DEFAULT 1,
  shared_block_id uuid,
  buffer_time_minutes integer DEFAULT 0,
  is_full_day_block boolean DEFAULT false,
  blocks_scheduling boolean DEFAULT false,
  event_group_id uuid,
  display_as_single_event boolean DEFAULT false
);

-- 2. Create administrative_notifications_staging table
CREATE TABLE public.administrative_notifications_staging (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name text NOT NULL,
  title text NOT NULL,
  description text,
  notification_type text NOT NULL DEFAULT 'general'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  course_name text,
  due_date timestamp with time zone,
  amount numeric,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  canvas_url text,
  canvas_id text
);

-- 3. Create learning_patterns_staging table
CREATE TABLE public.learning_patterns_staging (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name text NOT NULL,
  subject text NOT NULL,
  assignment_type text NOT NULL,
  completion_count integer DEFAULT 0,
  total_estimated_minutes integer DEFAULT 0,
  total_actual_minutes integer DEFAULT 0,
  typical_cognitive_load text,
  average_duration_factor numeric DEFAULT 1.0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_name, subject, assignment_type)
);

-- 4. Create student_energy_patterns_staging table
CREATE TABLE public.student_energy_patterns_staging (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name text NOT NULL,
  pattern_type text NOT NULL,
  energy_data jsonb NOT NULL,
  confidence_score numeric DEFAULT 0.5,
  data_points_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_updated timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Create sync_status_staging table
CREATE TABLE public.sync_status_staging (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name text NOT NULL,
  status text NOT NULL,
  message text,
  sync_type text DEFAULT 'manual'::text,
  assignments_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all staging tables
ALTER TABLE public.assignments_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_notifications_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_patterns_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_energy_patterns_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_status_staging ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for staging tables (same as production but for staging)
-- Assignments staging policies
CREATE POLICY "Anyone can view assignments staging" 
ON public.assignments_staging 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can modify assignments staging" 
ON public.assignments_staging 
FOR ALL 
USING (false);

-- Administrative notifications staging policies
CREATE POLICY "Anyone can view administrative notifications staging" 
ON public.administrative_notifications_staging 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can modify administrative notifications staging" 
ON public.administrative_notifications_staging 
FOR ALL 
USING (true);

-- Learning patterns staging policies
CREATE POLICY "Anyone can view learning patterns staging" 
ON public.learning_patterns_staging 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can modify learning patterns staging" 
ON public.learning_patterns_staging 
FOR ALL 
USING (false);

-- Student energy patterns staging policies
CREATE POLICY "Anyone can view energy patterns staging" 
ON public.student_energy_patterns_staging 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can modify energy patterns staging" 
ON public.student_energy_patterns_staging 
FOR ALL 
USING (false);

-- Sync status staging policies
CREATE POLICY "Anyone can view sync status staging" 
ON public.sync_status_staging 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can modify sync status staging" 
ON public.sync_status_staging 
FOR ALL 
USING (false);

-- Add triggers for updated_at columns
CREATE TRIGGER update_assignments_staging_updated_at
BEFORE UPDATE ON public.assignments_staging
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_administrative_notifications_staging_updated_at
BEFORE UPDATE ON public.administrative_notifications_staging
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_patterns_staging_updated_at
BEFORE UPDATE ON public.learning_patterns_staging
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sync_status_staging_updated_at
BEFORE UPDATE ON public.sync_status_staging
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add auto-classification trigger for staging assignments
CREATE TRIGGER auto_classify_staging_assignment
BEFORE INSERT OR UPDATE ON public.assignments_staging
FOR EACH ROW
EXECUTE FUNCTION public.auto_classify_assignment();