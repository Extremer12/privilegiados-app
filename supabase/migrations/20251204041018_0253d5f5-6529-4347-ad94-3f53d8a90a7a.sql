-- Create announcements table for important communications
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Announcements viewable by authenticated users"
ON public.announcements FOR SELECT
USING (true);

CREATE POLICY "Admins can create announcements"
ON public.announcements FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update own announcements"
ON public.announcements FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete own announcements"
ON public.announcements FOR DELETE
USING (auth.uid() = created_by);