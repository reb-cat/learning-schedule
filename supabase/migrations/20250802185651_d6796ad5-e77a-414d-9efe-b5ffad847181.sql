-- Clean up Canvas-related tables since API tokens will be in Supabase secrets instead
DROP TABLE IF EXISTS public.assignments;
DROP TABLE IF EXISTS public.canvas_credentials;