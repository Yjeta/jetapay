import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole, MenuKey, ActionKey, MenuPermissions } from '../types';
import { ROLE_DEFAULT_PERMISSIONS } from '../types';

export interface Profile {
  id: string;
  email: string | null;
  nom: string | null;
  role: UserRole;
  actif: boolean;
  permissions?: MenuPermissions | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  role: UserRole | null;
  isAdmin: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canDeleteIn: (menu: string) => boolean;
  hasPerm: (menu: MenuKey, action: ActionKey) => boolean;
}

const COMPTABLE_DELETE_MENUS = ['fournisseurs', 'grand-livre', 'zones', 'localisations', 'chantiers'];

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (uid?: string) => {
    let id = uid;
    if (!id) {
      const { data: userData } = await supabase.auth.getUser();
      id = userData.user?.id;
    }
    if (!id) {
      setProfile(null);
      return;
    }
    let result = await supabase
      .from('profils')
      .select('id, email, nom, role, actif, permissions, created_at, updated_at')
      .eq('id', id)
      .single();
    if (result.error && /permissions/i.test(result.error.message || '')) {
      result = await supabase
        .from('profils')
        .select('id, email, nom, role, actif, created_at, updated_at')
        .eq('id', id)
        .single();
    }
    if (result.error || !result.data) {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email || '';
      const nom = userData.user?.user_metadata?.nom || email.split('@')[0];
      const { data: inserted, error: insertErr } = await supabase
        .rpc('ensure_profile', { p_id: id, p_email: email, p_nom: nom });
      if (!insertErr && inserted) {
        setProfile(inserted as Profile);
        return;
      }
    }
    setProfile((result.data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        refreshProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        refreshProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const role = profile?.role ?? null;
  const isAdmin = role === 'admin';
  const canEdit = role === 'admin' || role === 'comptable' || role === 'assistant';
  const canDelete = role === 'admin';
  const canDeleteIn = useCallback((menu: string): boolean => {
    if (role === 'admin') return true;
    if (role === 'comptable' && COMPTABLE_DELETE_MENUS.includes(menu)) return true;
    return false;
  }, [role]);

  const hasPerm = useCallback((menu: MenuKey, action: ActionKey): boolean => {
    if (role === 'admin') return true;
    if (!role) return false;
    const custom = profile?.permissions;
    const menuDefaults = ROLE_DEFAULT_PERMISSIONS[role][menu];
    const menuPerms =
      custom && custom[menu] ? custom[menu] : menuDefaults;
    return !!menuPerms && menuPerms.includes(action);
  }, [role, profile?.permissions]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signOut,
        refreshProfile,
        role,
        isAdmin,
        canEdit,
        canDelete,
        canDeleteIn,
        hasPerm,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de AuthProvider');
  return ctx;
}
