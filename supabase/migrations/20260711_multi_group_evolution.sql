-- ============================================================
-- Migration: Multi-Group Evolution
-- Transforms Privilegiados App from single-tenant to multi-tenant
-- All existing data migrates to "Generación Privilegiada" group
-- ============================================================

-- 1. Create music_groups table
CREATE TABLE public.music_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create group_members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.music_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'miembro',
  display_name TEXT,
  instrument TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 3. Create group_join_requests table (historical log)
CREATE TABLE public.group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.music_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  instrument TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add group_id column to all content tables
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.music_groups(id) ON DELETE CASCADE;
ALTER TABLE public.setlists ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.music_groups(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.music_groups(id) ON DELETE CASCADE;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.music_groups(id) ON DELETE CASCADE;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.music_groups(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.music_groups(id) ON DELETE CASCADE;

-- 5. Enable RLS on new tables
ALTER TABLE public.music_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: check if user is admin of a group
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND role = 'admin'
      AND status = 'approved'
  )
$$;

-- Helper function: check if user is approved member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND status = 'approved'
  )
$$;

-- ============================================================
-- RLS Policies for music_groups
-- ============================================================

-- Public groups visible to everyone authenticated; private only to members
CREATE POLICY "Public groups viewable by authenticated"
  ON public.music_groups FOR SELECT
  TO authenticated
  USING (is_public = true OR is_group_member((select auth.uid()), id));

-- Any authenticated user can create a group
CREATE POLICY "Authenticated users can create groups"
  ON public.music_groups FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

-- Only group admin can update
CREATE POLICY "Group admin can update group"
  ON public.music_groups FOR UPDATE
  TO authenticated
  USING (is_group_admin((select auth.uid()), id));

-- Only group admin can delete
CREATE POLICY "Group admin can delete group"
  ON public.music_groups FOR DELETE
  TO authenticated
  USING (is_group_admin((select auth.uid()), id));

-- ============================================================
-- RLS Policies for group_members
-- ============================================================

-- Members visible to other approved members of the same group
CREATE POLICY "Group members viewable by group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (is_group_member((select auth.uid()), group_id));

-- Users can insert themselves (as pending)
CREATE POLICY "Users can request to join"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Group admin can update member status/role
CREATE POLICY "Group admin can manage members"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING (is_group_admin((select auth.uid()), group_id));

-- Group admin can remove members; users can remove themselves
CREATE POLICY "Admin or self can delete membership"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (
    is_group_admin((select auth.uid()), group_id) 
    OR (select auth.uid()) = user_id
  );

-- ============================================================
-- RLS Policies for group_join_requests
-- ============================================================

-- Requesters see their own; admins see all for their group
CREATE POLICY "Join requests viewable by admin or self"
  ON public.group_join_requests FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id 
    OR is_group_admin((select auth.uid()), group_id)
  );

-- Any authenticated user can create a join request
CREATE POLICY "Users can submit join requests"
  ON public.group_join_requests FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Group admin can update (approve/reject)
CREATE POLICY "Group admin can review requests"
  ON public.group_join_requests FOR UPDATE
  TO authenticated
  USING (is_group_admin((select auth.uid()), group_id));

-- ============================================================
-- 6. MIGRATE EXISTING DATA to "Generación Privilegiada"
-- ============================================================

-- Create the founding group using the first admin user
DO $$
DECLARE
  _admin_id UUID;
  _group_id UUID := gen_random_uuid();
BEGIN
  -- Find first admin
  SELECT user_id INTO _admin_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;

  -- Fallback: if no admin, use the first profile
  IF _admin_id IS NULL THEN
    SELECT id INTO _admin_id FROM public.profiles LIMIT 1;
  END IF;

  -- Only proceed if we have at least one user
  IF _admin_id IS NOT NULL THEN
    -- Create the group
    INSERT INTO public.music_groups (id, name, slug, description, created_by, is_public)
    VALUES (_group_id, 'Generación Privilegiada', 'generacion-privilegiada', 
            'Ministerio de Alabanza', _admin_id, true);

    -- Migrate all existing users as approved members
    INSERT INTO public.group_members (group_id, user_id, role, display_name, instrument, status, joined_at)
    SELECT 
      _group_id,
      p.id,
      CASE 
        WHEN EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') THEN 'admin'
        WHEN EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'lider') THEN 'lider'
        WHEN EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'moderador') THEN 'moderador'
        ELSE 'miembro'
      END,
      p.full_name,
      NULL::text,
      'approved',
      COALESCE(p.created_at, NOW())
    FROM profiles p
    ON CONFLICT (group_id, user_id) DO NOTHING;

    -- Link all existing content to the group
    UPDATE public.songs SET group_id = _group_id WHERE group_id IS NULL;
    UPDATE public.setlists SET group_id = _group_id WHERE group_id IS NULL;
    UPDATE public.events SET group_id = _group_id WHERE group_id IS NULL;
    UPDATE public.forum_posts SET group_id = _group_id WHERE group_id IS NULL;
    UPDATE public.announcements SET group_id = _group_id WHERE group_id IS NULL;
    UPDATE public.chat_messages SET group_id = _group_id WHERE group_id IS NULL;
  END IF;
END
$$;

-- ============================================================
-- 7. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON public.group_members(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_id ON public.group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_status ON public.group_join_requests(group_id, status);
CREATE INDEX IF NOT EXISTS idx_music_groups_slug ON public.music_groups(slug);
CREATE INDEX IF NOT EXISTS idx_songs_group_id ON public.songs(group_id);
CREATE INDEX IF NOT EXISTS idx_setlists_group_id ON public.setlists(group_id);
CREATE INDEX IF NOT EXISTS idx_events_group_id ON public.events(group_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_group_id ON public.forum_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_announcements_group_id ON public.announcements(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON public.chat_messages(group_id);

-- ============================================================
-- 8. Storage bucket for group logos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-logos', 'group-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Group logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-logos');

CREATE POLICY "Authenticated users can upload group logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'group-logos');

CREATE POLICY "Authenticated users can update group logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'group-logos');

CREATE POLICY "Authenticated users can delete group logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'group-logos');

-- ============================================================
-- 9. Triggers
-- ============================================================
CREATE TRIGGER update_music_groups_updated_at
  BEFORE UPDATE ON public.music_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 10. Enable realtime for new tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests;
