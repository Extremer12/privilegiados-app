-- Migration: Phase 2 Database Security, RLS Policies and Performance Indexes

-- 1. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_songs_group_status ON public.songs (group_id, status);
CREATE INDEX IF NOT EXISTS idx_setlists_group_status ON public.setlists (group_id, status);

-- 2. Foreign Key Constraint Hardening: live_sessions.current_song_id ON DELETE SET NULL
ALTER TABLE public.live_sessions 
  DROP CONSTRAINT IF EXISTS live_sessions_current_song_id_fkey;

ALTER TABLE public.live_sessions 
  ADD CONSTRAINT live_sessions_current_song_id_fkey 
  FOREIGN KEY (current_song_id) 
  REFERENCES public.songs(id) 
  ON DELETE SET NULL;

-- 3. RLS Policy Hardening for Multi-tenant isolation

-- SONGS SELECT POLICY
DROP POLICY IF EXISTS "Songs are viewable by authenticated users" ON public.songs;

CREATE POLICY "Songs viewable by group members or active session" ON public.songs
  FOR SELECT
  USING (
    group_id IS NULL 
    OR is_group_member((SELECT auth.uid()), group_id)
    OR EXISTS (
      SELECT 1 
      FROM setlist_songs ss 
      JOIN live_sessions ls ON ls.setlist_id = ss.setlist_id 
      WHERE ss.song_id = songs.id AND ls.is_active = true
    )
  );

-- SETLISTS SELECT POLICY
DROP POLICY IF EXISTS "Setlists viewable by authenticated users" ON public.setlists;

CREATE POLICY "Setlists viewable by group members or active session" ON public.setlists
  FOR SELECT
  USING (
    group_id IS NULL 
    OR is_group_member((SELECT auth.uid()), group_id)
    OR EXISTS (
      SELECT 1 
      FROM live_sessions ls 
      WHERE ls.setlist_id = setlists.id AND ls.is_active = true
    )
  );

-- EVENTS SELECT POLICY
DROP POLICY IF EXISTS "Events are viewable by authenticated users" ON public.events;

CREATE POLICY "Events viewable by group members" ON public.events
  FOR SELECT
  USING (
    group_id IS NULL 
    OR is_group_member((SELECT auth.uid()), group_id)
  );

-- FORUM POSTS SELECT POLICY
DROP POLICY IF EXISTS "Forum posts are viewable by authenticated users" ON public.forum_posts;

CREATE POLICY "Forum posts viewable by group members" ON public.forum_posts
  FOR SELECT
  USING (
    group_id IS NULL 
    OR is_group_member((SELECT auth.uid()), group_id)
  );

-- CHAT MESSAGES SELECT POLICY
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.chat_messages;

CREATE POLICY "Chat messages viewable by group members" ON public.chat_messages
  FOR SELECT
  USING (
    group_id IS NULL 
    OR is_group_member((SELECT auth.uid()), group_id)
  );
