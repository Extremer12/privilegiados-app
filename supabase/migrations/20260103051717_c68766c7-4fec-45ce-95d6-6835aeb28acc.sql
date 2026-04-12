-- Agregar columna para secciones del servicio en setlist_songs
ALTER TABLE public.setlist_songs 
ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'alabanza',
ADD COLUMN IF NOT EXISTS assigned_to TEXT,
ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Crear tabla para la estructura del culto
CREATE TABLE IF NOT EXISTS public.service_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  assigned_person TEXT,
  notes TEXT,
  bible_verse TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agregar columnas adicionales a setlists
ALTER TABLE public.setlists
ADD COLUMN IF NOT EXISTS theme_verse TEXT,
ADD COLUMN IF NOT EXISTS service_director TEXT,
ADD COLUMN IF NOT EXISTS preacher TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Habilitar RLS
ALTER TABLE public.service_sections ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para service_sections
CREATE POLICY "Service sections viewable by authenticated users" 
ON public.service_sections 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage service sections via setlist ownership" 
ON public.service_sections 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM setlists 
    WHERE setlists.id = service_sections.setlist_id 
    AND setlists.created_by = auth.uid()
  )
);

-- Habilitar realtime para las nuevas tablas
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_sections;