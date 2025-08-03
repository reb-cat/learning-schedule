-- Create learning_patterns table to track actual vs estimated performance
CREATE TABLE public.learning_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  assignment_type TEXT NOT NULL,
  average_duration_factor DECIMAL(3,2) DEFAULT 1.0,
  typical_cognitive_load TEXT CHECK (typical_cognitive_load IN ('light', 'medium', 'heavy')),
  completion_count INTEGER DEFAULT 0,
  total_estimated_minutes INTEGER DEFAULT 0,
  total_actual_minutes INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_patterns ENABLE ROW LEVEL SECURITY;

-- Create policies for learning patterns
CREATE POLICY "Anyone can view learning patterns" 
ON public.learning_patterns 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can insert learning patterns" 
ON public.learning_patterns 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Only service role can update learning patterns" 
ON public.learning_patterns 
FOR UPDATE 
USING (false);

CREATE POLICY "Only service role can delete learning patterns" 
ON public.learning_patterns 
FOR DELETE 
USING (false);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_learning_patterns_updated_at
BEFORE UPDATE ON public.learning_patterns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique index to prevent duplicate patterns
CREATE UNIQUE INDEX idx_learning_patterns_unique 
ON public.learning_patterns(student_name, subject, assignment_type);

-- Create function to update learning patterns when assignments are completed
CREATE OR REPLACE FUNCTION public.update_learning_patterns(
  p_student_name TEXT,
  p_subject TEXT,
  p_assignment_type TEXT,
  p_estimated_minutes INTEGER,
  p_actual_minutes INTEGER,
  p_cognitive_load TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.learning_patterns (
    student_name,
    subject,
    assignment_type,
    completion_count,
    total_estimated_minutes,
    total_actual_minutes,
    typical_cognitive_load
  )
  VALUES (
    p_student_name,
    p_subject,
    p_assignment_type,
    1,
    p_estimated_minutes,
    p_actual_minutes,
    p_cognitive_load
  )
  ON CONFLICT (student_name, subject, assignment_type)
  DO UPDATE SET
    completion_count = learning_patterns.completion_count + 1,
    total_estimated_minutes = learning_patterns.total_estimated_minutes + p_estimated_minutes,
    total_actual_minutes = learning_patterns.total_actual_minutes + p_actual_minutes,
    average_duration_factor = ROUND(
      (learning_patterns.total_actual_minutes + p_actual_minutes)::DECIMAL / 
      GREATEST(learning_patterns.total_estimated_minutes + p_estimated_minutes, 1), 2
    ),
    typical_cognitive_load = p_cognitive_load,
    last_updated = now();
END;
$function$;