-- Migration: Academia de Teoría Musical & Recursos Multimedia

-- 1. Create theory_categories table
CREATE TABLE IF NOT EXISTS public.theory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text NOT NULL DEFAULT 'Music',
  color_gradient text NOT NULL DEFAULT 'from-purple-500 to-indigo-600',
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Create theory_resources table
CREATE TABLE IF NOT EXISTS public.theory_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.theory_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'article', -- 'video', 'pdf', 'article', 'image', 'audio'
  youtube_url text,
  file_url text,
  file_name text,
  article_body text,
  target_level text DEFAULT 'todos', -- 'principiante', 'intermedio', 'avanzado', 'todos'
  instrument text DEFAULT 'general', -- 'vocal', 'guitarra', 'bajo', 'teclado', 'bateria', 'sonido', 'general'
  duration_minutes integer,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create theory_favorites table
CREATE TABLE IF NOT EXISTS public.theory_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.theory_resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (resource_id, user_id)
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_theory_resources_category ON public.theory_resources (category_id);
CREATE INDEX IF NOT EXISTS idx_theory_resources_instrument ON public.theory_resources (instrument);
CREATE INDEX IF NOT EXISTS idx_theory_resources_level ON public.theory_resources (target_level);
CREATE INDEX IF NOT EXISTS idx_theory_favorites_user ON public.theory_favorites (user_id);

-- 5. Helper Function: Is Theory Admin Check
CREATE OR REPLACE FUNCTION public.is_theory_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE user_id = _user_id 
      AND group_id = '4e634cc1-9bb8-460b-8d9c-7b87f62b6fb4'::uuid 
      AND role = 'admin' 
      AND status = 'approved'
  );
$$;

-- 6. Enable RLS
ALTER TABLE public.theory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theory_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theory_favorites ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for theory_categories
DROP POLICY IF EXISTS "Theory categories viewable by all authenticated" ON public.theory_categories;
CREATE POLICY "Theory categories viewable by all authenticated" ON public.theory_categories
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Theory categories manageable by theory admins" ON public.theory_categories;
CREATE POLICY "Theory categories manageable by theory admins" ON public.theory_categories
  FOR ALL USING (is_theory_admin(auth.uid())) WITH CHECK (is_theory_admin(auth.uid()));

-- 8. RLS Policies for theory_resources
DROP POLICY IF EXISTS "Theory resources viewable by all authenticated" ON public.theory_resources;
CREATE POLICY "Theory resources viewable by all authenticated" ON public.theory_resources
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Theory resources manageable by theory admins" ON public.theory_resources;
CREATE POLICY "Theory resources manageable by theory admins" ON public.theory_resources
  FOR ALL USING (is_theory_admin(auth.uid())) WITH CHECK (is_theory_admin(auth.uid()));

-- 9. RLS Policies for theory_favorites
DROP POLICY IF EXISTS "Users can manage own theory favorites" ON public.theory_favorites;
CREATE POLICY "Users can manage own theory favorites" ON public.theory_favorites
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 10. Seed Default Categories
INSERT INTO public.theory_categories (name, slug, description, icon, color_gradient, sort_order)
VALUES 
  ('Teoría & Armonía', 'teoria-armonia', 'Lógica musical, intervalos, escalas y formación de acordes.', 'Music', 'from-blue-600 to-indigo-700', 1),
  ('Canto & Técnica Vocal', 'canto-vocal', 'Afinación, respiración diafragmática, registros y dicción.', 'Mic', 'from-purple-600 to-pink-600', 2),
  ('Guitarra & Bajo', 'guitarra-bajo', 'Posición de acordes, digitación, acompañamiento y ritmo.', 'Guitar', 'from-amber-600 to-orange-600', 3),
  ('Teclado & Piano', 'teclado-piano', 'Lectura de cifrado, pads, inversiones y arpegios.', 'Piano', 'from-emerald-600 to-teal-700', 4),
  ('Batería & Percusión', 'bateria-percusion', 'Metrónomo, groovings, dinámicas y tiempo musical.', 'Drum', 'from-red-600 to-rose-700', 5),
  ('Sonido & Producción', 'sonido-produccion', 'Monitoreo, mezcla en vivo, ecualización y microfonía.', 'Volume2', 'from-cyan-600 to-blue-700', 6)
ON CONFLICT (slug) DO NOTHING;

-- 11. Storage Bucket & Policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('theory-files', 'theory-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Access for theory-files" ON storage.objects;
CREATE POLICY "Public Read Access for theory-files" ON storage.objects
  FOR SELECT USING (bucket_id = 'theory-files');

DROP POLICY IF EXISTS "Theory Admins Upload for theory-files" ON storage.objects;
CREATE POLICY "Theory Admins Upload for theory-files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'theory-files' 
    AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      OR EXISTS (
        SELECT 1 FROM public.group_members 
        WHERE user_id = auth.uid() 
          AND group_id = '4e634cc1-9bb8-460b-8d9c-7b87f62b6fb4'::uuid 
          AND role = 'admin' 
          AND status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS "Theory Admins Delete for theory-files" ON storage.objects;
CREATE POLICY "Theory Admins Delete for theory-files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'theory-files' 
    AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      OR EXISTS (
        SELECT 1 FROM public.group_members 
        WHERE user_id = auth.uid() 
          AND group_id = '4e634cc1-9bb8-460b-8d9c-7b87f62b6fb4'::uuid 
          AND role = 'admin' 
          AND status = 'approved'
      )
    )
  );
