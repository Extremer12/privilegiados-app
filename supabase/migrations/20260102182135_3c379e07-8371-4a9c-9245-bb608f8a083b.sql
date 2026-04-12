-- Drop existing delete policy for events
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

-- Create new delete policy for events (creator OR admin can delete)
CREATE POLICY "Users can delete own events or admins"
ON public.events
FOR DELETE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

-- Drop existing update policy for events  
DROP POLICY IF EXISTS "Users can update own events" ON public.events;

-- Create new update policy for events (creator OR admin can update)
CREATE POLICY "Users can update own events or admins"
ON public.events
FOR UPDATE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

-- Drop existing delete policy for songs
DROP POLICY IF EXISTS "Users can delete own songs" ON public.songs;

-- Create new delete policy for songs (creator OR admin can delete)
CREATE POLICY "Users can delete own songs or admins"
ON public.songs
FOR DELETE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

-- Drop existing update policy for songs
DROP POLICY IF EXISTS "Users can update own songs" ON public.songs;

-- Create new update policy for songs (creator OR admin can update)
CREATE POLICY "Users can update own songs or admins"
ON public.songs
FOR UPDATE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));