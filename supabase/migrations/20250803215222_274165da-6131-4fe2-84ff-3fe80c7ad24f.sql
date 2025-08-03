-- Create student energy patterns table for adaptive learning
CREATE TABLE public.student_energy_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('subject_based', 'time_based')),
  energy_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  data_points_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_name)
);

-- Enable RLS
ALTER TABLE public.student_energy_patterns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view energy patterns" 
ON public.student_energy_patterns 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can modify energy patterns" 
ON public.student_energy_patterns 
FOR ALL 
USING (false);

-- Insert initial energy patterns based on self-report data
INSERT INTO public.student_energy_patterns (student_name, pattern_type, energy_data, confidence_score, data_points_count) 
VALUES 
(
  'Khalil', 
  'subject_based', 
  '{
    "high_energy_subjects": ["PE", "Physical Education"],
    "medium_energy_subjects": ["History", "Life Skills", "Math", "Art"],
    "low_energy_subjects": ["Science", "English"]
  }'::jsonb,
  0.7,
  1
),
(
  'Abigail', 
  'time_based', 
  '{
    "high_energy_blocks": [1, 2, 3],
    "medium_energy_blocks": [4, 5],
    "low_energy_blocks": [6, 7, 8]
  }'::jsonb,
  0.7,
  1
);

-- Create function to update energy patterns
CREATE OR REPLACE FUNCTION public.update_energy_pattern(
  p_student_name TEXT,
  p_energy_data JSONB,
  p_confidence_adjustment DECIMAL DEFAULT 0.1
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.student_energy_patterns 
  SET 
    energy_data = p_energy_data,
    confidence_score = LEAST(1.0, confidence_score + p_confidence_adjustment),
    data_points_count = data_points_count + 1,
    last_updated = now()
  WHERE student_name = p_student_name;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student energy pattern not found: %', p_student_name;
  END IF;
END;
$function$;