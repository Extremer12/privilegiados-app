-- Create setlists table
CREATE TABLE public.setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  service_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create setlist_songs junction table
CREATE TABLE public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID REFERENCES public.setlists(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create live_sessions table for real-time worship
CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID REFERENCES public.setlists(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  current_song_id UUID REFERENCES public.songs(id),
  current_position INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create live_comments table for real-time communication
CREATE TABLE public.live_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for setlists
CREATE POLICY "Setlists viewable by authenticated users"
  ON public.setlists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create setlists"
  ON public.setlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own setlists"
  ON public.setlists FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own setlists"
  ON public.setlists FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for setlist_songs
CREATE POLICY "Setlist songs viewable by authenticated users"
  ON public.setlist_songs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage setlist songs"
  ON public.setlist_songs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
      AND setlists.created_by = auth.uid()
    )
  );

-- RLS Policies for live_sessions
CREATE POLICY "Live sessions viewable by authenticated users"
  ON public.live_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create live sessions"
  ON public.live_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own live sessions"
  ON public.live_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for live_comments
CREATE POLICY "Comments viewable by authenticated users"
  ON public.live_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.live_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.live_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_comments;

-- Create trigger for updated_at
CREATE TRIGGER update_setlists_updated_at
  BEFORE UPDATE ON public.setlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();