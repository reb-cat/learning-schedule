-- Add new fields to assignments table for enhanced multi-day event support
ALTER TABLE public.assignments 
ADD COLUMN is_full_day_block boolean DEFAULT false,
ADD COLUMN blocks_scheduling boolean DEFAULT false,
ADD COLUMN event_group_id uuid DEFAULT NULL,
ADD COLUMN display_as_single_event boolean DEFAULT false,
ADD COLUMN volunteer_hours integer DEFAULT NULL,
ADD COLUMN volunteer_organization text DEFAULT NULL;