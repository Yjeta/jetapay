import { useState, useEffect, useCallback } from 'react';
import { supabase, adminSupabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_LABELS, MENUS, ALL_ACTIONS, ACTION_LABELS, ROLE_DEFAULT_PERMISSIONS } from '../types';
import type { UserRole, MenuKey, ActionKey, MenuPermissions } from '../types';
import {
  ShieldCheck,
  Plus,
  X,
  Loader2,
  UserPlus,
  Mail,
  User as UserIcon,
  KeyRound,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings2,
  RotateCcw,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string | null;
  nom: string | null;
  role: UserRole;
  actif: boolean;
  permissions: MenuPermissions | null;
  created_at: string | null;
}

const roleBadgeStyles: Record<UserRole, string> = {
  admin: 'badge bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-300',
  comptable: 'badge bg-gradient-to-r from-blue-100 to-blue-50 text-jeta-blue border-blue-200',
  assistant: 'badge bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-700 border-indigo-200',
  lecture: 'badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200',
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AdminPage() {
  const { profile: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('comptable');
  const [creating, setCreating] = useState(false);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [permUser, setPermUser] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const full = await supabase
      .from('profils')
      .select('id, email, nom, role, actif, permissions, created_at')
      .order('created_at', { ascending: true });
    if (full.error && /permissions/i.test(full.error.message || '')) {
      // Colonne "permissions" absente (migration non appliquée) : on retombe
      // sur les colonnes de base sans personnalisation.
      const fb = await supabase
        .from('profils')
        .select('id, email, nom, role, actif, created_at')
        .order('created_at', { ascending: true });
      if (fb.error !== null) {
        toast.error(`Erreur de chargement des utilisateurs : ${fb.error.message}`);
      } else {
        setUsers(((fb.data as unknown[]) || []).map((r) => ({ ...(r as object), permissions: null }) as AdminUser));
      }
    } else if (full.error) {
      toast.error(`Erreur de chargement des utilisateurs : ${full.error.message}`);
    } else {
      setUsers((full.data as AdminUser[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async () => {
    const trimmedEmail = email.trim();
    const trimmedNom = nom.trim();

    if (!trimmedEmail || !password) {
      toast.error('Email et mot de passe sont obligatoires.');
      return;
    }
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setCreating(true);
    const { data, error } = await adminSupabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { data: { nom: trimmedNom || trimmedEmail } },
    });

    if (error) {
      toast.error(`Impossible de créer le compte : ${error.message}`);
      setCreating(false);
      return;
    }

    const newUserId = data.user?.id;
    if (newUserId) {
      // Si la confirmation d'email est désactivée, le profil existe déjà
      // (trigger) : on peut définir le rôle immédiatement.
      const { error: profileError } = await supabase
        .from('profils')
        .update({ role, nom: trimmedNom || trimmedEmail })
        .eq('id', newUserId);
      if (profileError) {
        // Profil non encore créé (confirmation d'email active)
        toast.info('Compte créé. Le rôle sera attribué après confirmation de l\'email.');
      } else {
        toast.success(`Utilisateur ${trimmedEmail} créé avec le rôle ${ROLE_LABELS[role]}.`);
      }
    }

    setCreating(false);
    setShowCreate(false);
    setEmail('');
    setNom('');
    setPassword('');
    setRole('comptable');
    fetchUsers();
  };

  const handleRoleChange = async (user: AdminUser, newRole: UserRole) => {
    if (user.id === currentUser?.id && newRole !== 'admin') {
      toast.warning('Vous ne pouvez pas retirer votre propre rôle administrateur.');
      return;
    }
    setUpdatingId(user.id);
    const { error } = await supabase
      .from('profils')
      .update({ role: newRole, permissions: null })
      .eq('id', user.id);
    if (error) {
      toast.error(`Erreur lors du changement de rôle : ${error.message}`);
    } else {
      toast.success(`Rôle de ${user.email} mis à jour : ${ROLE_LABELS[newRole]}.`);
      fetchUsers();
    }
    setUpdatingId(null);
  };

  const handleToggleActif = async (user: AdminUser) => {
    const nextActif = !user.actif;
    if (user.id === currentUser?.id && !nextActif) {
      toast.warning('Vous ne pouvez pas désactiver votre propre compte.');
      return;
    }
    setUpdatingId(user.id);
    const { error } = await supabase.from('profils').update({ actif: nextActif }).eq('id', user.id);
    if (error) {
      toast.error(`Erreur lors de la mise à jour : ${error.message}`);
    } else {
      toast.success(nextActif
        ? `Compte ${user.email} réactivé.`
        : `Compte ${user.email} désactivé.`);
      fetchUsers();
    }
    setUpdatingId(null);
  };

  const handleSavePermissions = async (permissions: MenuPermissions) => {
    if (!permUser) return;
    setUpdatingId(permUser.id);
    const { error } = await supabase
      .from('profils')
      .update({ permissions })
      .eq('id', permUser.id);
    if (error) {
      toast.error(`Erreur lors de l'enregistrement des permissions : ${error.message}`);
    } else {
      toast.success(`Permissions de ${permUser.email} enregistrées.`);
      setPermUser(null);
      fetchUsers();
    }
    setUpdatingId(null);
  };

  return (
    <div>
      <div className="card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col lg:flex-row gap-4 lg:items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center shadow-lg shadow-gray-600/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Utilisateurs</h2>
              <p className="text-sm text-gray-500">
                {users.length} compte{users.length !== 1 ? 's' : ''} · rôles : admin, comptable, lecture
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchUsers} className="btn-secondary" title="Actualiser">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvel utilisateur</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-left">Utilisateur</th>
                <th className="px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-left">Email</th>
                <th className="px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-left">Rôle</th>
                <th className="px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-left">Statut</th>
                <th className="px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-left">Créé le</th>
                <th className="px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                    Chargement des utilisateurs...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-jeta-blue/10 text-jeta-blue flex items-center justify-center font-semibold text-xs">
                          {(user.nom || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{user.nom || '—'}</span>
                        {user.id === currentUser?.id && (
                          <span className="text-[10px] font-semibold text-jeta-blue bg-jeta-blue/10 px-1.5 py-0.5 rounded">vous</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{user.email || '—'}</td>
                    <td className="px-5 py-4">
                      <select
                        value={user.role}
                        disabled={updatingId === user.id}
                        onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                        className={`${roleBadgeStyles[user.role]} cursor-pointer transition-colors disabled:opacity-60`}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{ROLE_LABELS[r.value]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      {user.actif ? (
                        <span className="badge bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Actif
                        </span>
                      ) : (
                        <span className="badge bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200">
                          <XCircle className="w-3 h-3" /> Désactivé
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(user.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPermUser(user)}
                          disabled={updatingId === user.id}
                          className="p-2 text-gray-400 hover:text-jeta-blue hover:bg-jeta-blue/5 rounded-lg transition-colors disabled:opacity-50"
                          title="Gérer les permissions de cet utilisateur"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActif(user)}
                          disabled={updatingId === user.id}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                          title={user.actif ? 'Désactiver le compte' : 'Réactiver le compte'}
                        >
                          {user.actif ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de création */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-jeta-green to-jeta-blue rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Nouvel utilisateur</h3>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adresse email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@jetagroupe.com"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom complet</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Prenom Nom"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe temporaire *</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe (6 caractères min.)"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rôle</label>
                <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="select-field">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{ROLE_LABELS[r.value]}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  <strong>Admin</strong> : accès total · <strong>Comptable</strong> : CRUD fournisseurs, grand livre, provinces, localisations, chantiers + saisie des paiements/factures (sans suppression) · <strong>Lecture</strong> : consultation seule
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary">Annuler</button>
                <button onClick={handleCreate} disabled={creating} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Créer le compte
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal d'édition des permissions */}
      {permUser && (
        <PermissionsEditor
          user={permUser}
          onClose={() => setPermUser(null)}
          onSave={handleSavePermissions}
        />
      )}
    </div>
  );
}

type Matrix = Record<MenuKey, Record<ActionKey, boolean>>;

function buildMatrix(role: UserRole, custom: MenuPermissions | null): Matrix {
  const defaults = ROLE_DEFAULT_PERMISSIONS[role];
  const m = {} as Matrix;
  for (const menu of MENUS) {
    const perms = custom && custom[menu.key] !== undefined ? custom[menu.key] : defaults[menu.key];
    m[menu.key] = {
      view: !!perms?.includes('view'),
      create: !!perms?.includes('create'),
      edit: !!perms?.includes('edit'),
      delete: !!perms?.includes('delete'),
    };
  }
  return m;
}

function PermissionsEditor({ user, onClose, onSave }: { user: AdminUser; onClose: () => void; onSave: (perms: MenuPermissions) => void }) {
  const toast = useToast();
  const [matrix, setMatrix] = useState<Matrix>(() => buildMatrix(user.role, user.permissions));

  const isAdminRole = user.role === 'admin';

  const toggle = (menu: MenuKey, action: ActionKey) => {
    if (isAdminRole) return;
    setMatrix((prev) => ({ ...prev, [menu]: { ...prev[menu], [action]: !prev[menu][action] } }));
  };

  const resetToRole = () => {
    if (isAdminRole) return;
    setMatrix(buildMatrix(user.role, null));
    toast.info('Permissions réinitialisées sur les droits du rôle.');
  };

  const submit = () => {
    const perms: MenuPermissions = {};
    for (const menu of MENUS) {
      perms[menu.key] = ALL_ACTIONS.filter((a) => matrix[menu.key][a]);
    }
    onSave(perms);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-jeta-blue to-jeta-blue-dark rounded-xl flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Permissions — {user.nom || user.email}</h3>
              <p className="text-xs text-gray-500">Rôle : {ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAdminRole ? (
          <div className="p-6">
            <div className="card bg-gradient-to-r from-gray-50 to-white border-gray-200 p-6 text-center">
              <ShieldCheck className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold">Accès administrateur</p>
              <p className="text-sm text-gray-500 mt-1">
                Le rôle Administrateur dispose de tous les droits sur tous les modules.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider text-left">Module</th>
                    {ALL_ACTIONS.map((a) => (
                      <th key={a} className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider text-center">
                        {ACTION_LABELS[a]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MENUS.map((menu) => (
                    <tr key={menu.key} className="table-row">
                      <td className="px-4 py-3 font-medium text-gray-800">{menu.label}</td>
                      {ALL_ACTIONS.map((action) => (
                        <td key={action} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={matrix[menu.key][action]}
                            onChange={() => toggle(menu.key, action)}
                            className="rounded border-gray-300 text-jeta-blue focus:ring-jeta-blue w-4 h-4"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Les cases sont pré-remplies selon les droits du rôle « {ROLE_LABELS[user.role]} ». Cochez ou décochez pour personnaliser cet utilisateur.
            </p>
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <button onClick={resetToRole} disabled={isAdminRole} className="btn-secondary disabled:opacity-50">
            <RotateCcw className="w-4 h-4" />
            Réinitialiser (droits du rôle)
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary">Annuler</button>
            <button onClick={submit} className="btn-primary">
              <CheckCircle2 className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
