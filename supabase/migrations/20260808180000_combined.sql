-- =============================================
-- COMBINED: ensure_profile + paiements.deleted_at
-- Coller dans Supabase SQL Editor puis Run
-- =============================================

-- 1. SECURITY DEFINER function : auto-création du profil si absent
CREATE OR REPLACE FUNCTION public.ensure_profile(p_id uuid, p_email text, p_nom text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(p) INTO result FROM public.profils p WHERE p.id = p_id;
  IF result IS NOT NULL THEN
    RETURN result;
  END IF;

  INSERT INTO public.profils (id, email, nom, role, actif)
  VALUES (p_id, p_email, p_nom, 'lecture', true)
  ON CONFLICT (id) DO UPDATE SET email = COALESCE(EXCLUDED.email, profils.email);

  SELECT to_jsonb(p) INTO result FROM public.profils p WHERE p.id = p_id;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_profile(uuid, text, text) TO authenticated;

-- 2. Soft delete pour paiements
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
