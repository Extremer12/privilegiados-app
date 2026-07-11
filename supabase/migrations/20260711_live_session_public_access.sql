-- Migración: Permitir acceso público a sesiones en vivo activas para espectadores sin iniciar sesión.

-- 1. Permitir que cualquier persona (incluidos usuarios anónimos) pueda consultar sesiones en vivo que estén activas
CREATE POLICY "Active live sessions are viewable by public" 
  ON public.live_sessions FOR SELECT 
  TO public 
  USING (is_active = true);

-- 2. Permitir consulta pública de repertorios asociados a una sesión activa
CREATE POLICY "Setlists viewable by public during active session" 
  ON public.setlists FOR SELECT 
  TO public 
  USING (EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE ls.setlist_id = public.setlists.id AND ls.is_active = true
  ));

-- 3. Permitir consulta pública de las canciones en un repertorio durante una sesión activa
CREATE POLICY "Setlist songs viewable by public during active session" 
  ON public.setlist_songs FOR SELECT 
  TO public 
  USING (EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE ls.setlist_id = public.setlist_songs.setlist_id AND ls.is_active = true
  ));

-- 4. Permitir consulta pública de los detalles de canciones asociadas a un repertorio en sesión activa
CREATE POLICY "Songs viewable by public during active session" 
  ON public.songs FOR SELECT 
  TO public 
  USING (EXISTS (
    SELECT 1 FROM public.setlist_songs ss
    JOIN public.live_sessions ls ON ls.setlist_id = ss.setlist_id
    WHERE ss.song_id = public.songs.id AND ls.is_active = true
  ));

-- 5. Permitir consulta pública del grupo musical al que pertenece la sesión activa
CREATE POLICY "Music groups viewable by public when active session exists" 
  ON public.music_groups FOR SELECT 
  TO public 
  USING (is_public = true OR EXISTS (
    SELECT 1 FROM public.live_sessions ls
    JOIN public.setlists s ON s.id = ls.setlist_id
    WHERE s.group_id = public.music_groups.id AND ls.is_active = true
  ));
