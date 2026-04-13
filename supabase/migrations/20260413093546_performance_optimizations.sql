-- Migration: 20260413093546_performance_optimizations.sql
-- Description: Implementa las 4 recomendaciones críticas de rendimiento y seguridad detectadas en la auditoría v2.

-- 1. SOLUCIÓN: Fijar search_path en la función de trigger para seguridad
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;


-- 2. SOLUCIÓN: Crear índices en 15 foreign keys para mejorar rendimiento de JOINs y DELETEs
CREATE INDEX IF NOT EXISTS idx_chat_messages_author_id ON public.chat_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON public.forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author_id ON public.forum_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post_id ON public.forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_live_comments_session_id ON public.live_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_current_song_id ON public.live_sessions(current_song_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_setlist_id ON public.live_sessions(setlist_id);
CREATE INDEX IF NOT EXISTS idx_service_sections_setlist_id ON public.service_sections(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON public.setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON public.setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_setlists_event_id ON public.setlists(event_id);
CREATE INDEX IF NOT EXISTS idx_song_comments_song_id ON public.song_comments(song_id);
CREATE INDEX IF NOT EXISTS idx_song_comments_user_id ON public.song_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_created_by ON public.songs(created_by);


-- 3. SOLUCIÓN: Consolidar "Multiple Permissive Policies" en user_roles, setlist_songs, service_sections
-- Eliminamos las pólizas "ALL" que chocaban con los "SELECT" globales y las separamos en INSERT, UPDATE, DELETE

-- A. user_roles
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE USING (has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE USING (has_role((select auth.uid()), 'admin'::app_role));

-- B. setlist_songs
DROP POLICY IF EXISTS "Users can manage setlist songs" ON public.setlist_songs;

CREATE POLICY "Users can insert setlist songs" ON public.setlist_songs FOR INSERT WITH CHECK (
    EXISTS ( SELECT 1 FROM setlists WHERE setlists.id = setlist_id AND setlists.created_by = (select auth.uid()) )
);
CREATE POLICY "Users can update setlist songs" ON public.setlist_songs FOR UPDATE USING (
    EXISTS ( SELECT 1 FROM setlists WHERE setlists.id = setlist_id AND setlists.created_by = (select auth.uid()) )
);
CREATE POLICY "Users can delete setlist songs" ON public.setlist_songs FOR DELETE USING (
    EXISTS ( SELECT 1 FROM setlists WHERE setlists.id = setlist_id AND setlists.created_by = (select auth.uid()) )
);

-- C. service_sections
DROP POLICY IF EXISTS "Users can manage service sections via setlist ownership" ON public.service_sections;

CREATE POLICY "Users can insert service sections" ON public.service_sections FOR INSERT WITH CHECK (
    EXISTS ( SELECT 1 FROM setlists WHERE setlists.id = setlist_id AND setlists.created_by = (select auth.uid()) )
);
CREATE POLICY "Users can update service sections" ON public.service_sections FOR UPDATE USING (
    EXISTS ( SELECT 1 FROM setlists WHERE setlists.id = setlist_id AND setlists.created_by = (select auth.uid()) )
);
CREATE POLICY "Users can delete service sections" ON public.service_sections FOR DELETE USING (
    EXISTS ( SELECT 1 FROM setlists WHERE setlists.id = setlist_id AND setlists.created_by = (select auth.uid()) )
);


-- 4. SOLUCIÓN: Reescribir TODOS los RLS policies restantes envolviendo auth.uid() en (select auth.uid()) 
-- Esto previene la reevaluación repetitiva de InitPlans. Transformamos dinámicamente cada policy en su versión optimizada.

DO $$ 
DECLARE
    pol record;
    new_qual text;
    new_with_check text;
    sql_stm text;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          -- targetea sólamente pólizas donde auth.uid() o auth.role() no esté envuelto en un subselect
          AND (
            (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%') OR 
            (qual LIKE '%auth.role()%' AND qual NOT LIKE '%(select auth.role())%') OR 
            (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%') OR 
            (with_check LIKE '%auth.role()%' AND with_check NOT LIKE '%(select auth.role())%')
          )
    LOOP
        new_qual := pol.qual;
        new_with_check := pol.with_check;
        
        -- Reemplazos
        IF new_qual IS NOT NULL THEN
            new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())');
            new_qual := replace(new_qual, 'auth.role()', '(select auth.role())');
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            new_with_check := replace(new_with_check, 'auth.uid()', '(select auth.uid())');
            new_with_check := replace(new_with_check, 'auth.role()', '(select auth.role())');
        END IF;
        
        -- Borramos la policy antigua
        sql_stm := format('DROP POLICY %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
        EXECUTE sql_stm;
        
        -- Creados la nueva policy con las mismas reglas pero con el código reemplazado
        sql_stm := format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s ', 
            pol.policyname, 
            pol.schemaname, 
            pol.tablename, 
            pol.cmd,
            array_to_string(pol.roles, ', ')
        );
        
        IF new_qual IS NOT NULL THEN
            sql_stm := sql_stm || format('USING (%s) ', new_qual);
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            sql_stm := sql_stm || format('WITH CHECK (%s)', new_with_check);
        END IF;
        
        EXECUTE sql_stm;
    END LOOP;
END
$$;
