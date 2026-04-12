-- Create event type enum
CREATE TYPE public.event_type AS ENUM ('ensayo', 'presentacion', 'reunion', 'servicio', 'otro');

-- Add event_type column to events table
ALTER TABLE public.events 
ADD COLUMN event_type public.event_type DEFAULT 'otro';

-- Add DELETE RLS policy for events
CREATE POLICY "Users can delete own events"
ON public.events
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);