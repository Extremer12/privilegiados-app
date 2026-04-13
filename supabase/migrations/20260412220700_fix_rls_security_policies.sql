-- ============================================================
-- FIX: Restringir políticas SELECT a usuarios autenticados
-- Las políticas originales usan USING(true) sin TO authenticated,
-- lo que permite lectura a usuarios anónimos/no autenticados
-- ============================================================

-- -----------------------------------------------
-- 1. FIX: profiles - SELECT solo para authenticated
-- -----------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- -----------------------------------------------
-- 2. FIX: user_roles - SELECT solo para authenticated
-- -----------------------------------------------
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.user_roles;

CREATE POLICY "Roles are viewable by authenticated users"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- -----------------------------------------------
-- 3. FIX: service_sections - SELECT solo para authenticated
-- -----------------------------------------------
DROP POLICY IF EXISTS "Service sections viewable by authenticated users" ON public.service_sections;

CREATE POLICY "Service sections viewable by authenticated users only"
  ON public.service_sections FOR SELECT
  TO authenticated
  USING (true);
