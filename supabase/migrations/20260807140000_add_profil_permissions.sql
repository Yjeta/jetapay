-- ============================================================================
-- Permissions détaillées par utilisateur (JETA GROUPE · Suivi des Paiements)
-- ============================================================================
-- À exécuter APRÈS 20260806120000_add_auth_rbac.sql.
--
-- Ajoute une colonne jsonb « permissions » sur profils :
--   NULL            → l'utilisateur suit les droits par défaut de son rôle
--   { menu: [actions] } → personnalisation spécifique (écrase le défaut du rôle
--                         pour les menus présents)
-- Format : { "fournisseurs": ["view","create","edit","delete"], ... } avec
-- actions possibles : view, create, edit, delete.
--
-- L'admin seul peut mettre à jour profils (politique profils_update), donc
-- l'écriture de cette colonne est déjà réservée à l'admin. Aucune autre
-- politique RLS n'est modifiée ici : les rôles continuent de gouverner la
-- vérification côté base (functions current_role / can_write).
-- ============================================================================

ALTER TABLE public.profils ADD COLUMN IF NOT EXISTS permissions jsonb;

COMMENT ON COLUMN public.profils.permissions IS
  'Permissions personnalisées (jsonb) : {menu: [view|create|edit|delete]}. NULL = défaut du rôle.';