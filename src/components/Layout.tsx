import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ROLE_LABELS } from '../types';
import type { MenuKey } from '../types';
import {
  Wallet,
  Building2,
  Users,
  BarChart3,
  FileText,
  BookOpen,
  MapPin,
  HardHat,
  Calendar,
  Bell,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  UserCircle,
  ClipboardCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const navItems: { path: string; label: string; icon: LucideIcon; color: string; menu: MenuKey }[] = [
  { path: '/', label: 'Paiements', icon: Wallet, color: 'from-jeta-blue to-jeta-blue-dark', menu: 'paiements' },
  { path: '/filiales', label: 'Filiales', icon: Building2, color: 'from-jeta-green to-jeta-green-dark', menu: 'filiales' },
  { path: '/fournisseurs', label: 'Fournisseurs', icon: Users, color: 'from-amber-500 to-amber-600', menu: 'fournisseurs' },
  { path: '/factures', label: 'Factures', icon: FileText, color: 'from-purple-500 to-purple-600', menu: 'factures' },
  { path: '/grand-livre', label: 'Grand Livre', icon: BookOpen, color: 'from-teal-500 to-teal-600', menu: 'grand-livre' },
  { path: '/zones', label: 'Provinces', icon: MapPin, color: 'from-sky-500 to-sky-600', menu: 'zones' },
  { path: '/localisations', label: 'Localisations', icon: MapPin, color: 'from-teal-500 to-teal-600', menu: 'localisations' },
  { path: '/chantiers', label: 'Chantiers', icon: HardHat, color: 'from-amber-500 to-amber-600', menu: 'chantiers' },
  { path: '/rapports', label: 'Rapports', icon: BarChart3, color: 'from-jeta-red to-jeta-red-dark', menu: 'rapports' },
  { path: '/validations', label: 'Validations', icon: ClipboardCheck, color: 'from-emerald-500 to-emerald-600', menu: 'validations' },
  { path: '/admin', label: 'Administration', icon: ShieldCheck, color: 'from-gray-600 to-gray-800', menu: 'admin' },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Tableau de Bord', subtitle: 'Synthese et gestion des paiements' },
  '/filiales': { title: 'Filiales', subtitle: 'Gestion des filiales et de leurs comptes bancaires' },
  '/fournisseurs': { title: 'Fournisseurs', subtitle: 'Gestion des fournisseurs et de leurs comptes bancaires' },
  '/factures': { title: 'Factures Fournisseurs', subtitle: 'Suivi des factures et liaison avec les paiements' },
  '/grand-livre': { title: 'Grand Livre', subtitle: 'Lettrage et rapprochement des factures fournisseurs' },
  '/zones': { title: 'Provinces', subtitle: 'Gestion des provinces' },
  '/localisations': { title: 'Localisations', subtitle: 'Villes et zones rattachees aux provinces' },
  '/chantiers': { title: 'Chantiers', subtitle: 'Gestion des chantiers et projets' },
  '/rapports': { title: 'Rapports & Analyses', subtitle: 'Indicateurs, tendances et export des donnees' },
  '/admin': { title: 'Administration', subtitle: 'Gestion des utilisateurs et des acces' },
};

const TABLES_NOTIFS: { name: string; label: string }[] = [
  { name: 'paiements', label: 'Paiements' },
  { name: 'factures', label: 'Factures' },
  { name: 'fournisseurs', label: 'Fournisseurs' },
  { name: 'zones_geographiques', label: 'Provinces' },
  { name: 'localisations', label: 'Localisations' },
  { name: 'chantiers', label: 'Chantiers' },
];

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, role, signOut, hasPerm } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [notifCounts, setNotifCounts] = useState<{ table: string; label: string; count: number }[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!hasPerm('validations', 'view')) {
      setPendingCount(0);
      setNotifCounts([]);
      return;
    }
    let total = 0;
    const counts: { table: string; label: string; count: number }[] = [];
    for (const t of TABLES_NOTIFS) {
      const { count, error } = await supabase
        .from(t.name)
        .select('id', { count: 'exact', head: true })
        .eq('validation_status', 'en_attente');
      if (!error && count) {
        total += count;
        counts.push({ table: t.name, label: t.label, count });
      }
    }
    setPendingCount(total);
    setNotifCounts(counts);
  }, [hasPerm]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 flex">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900
          text-white flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-5'} h-16 border-b border-white/10`}>
          <img
            src="/LOGO_JG_B.png"
            alt="JETA GROUPE"
            className={`h-10 w-auto object-contain transition-all duration-300 ${collapsed ? 'w-10' : ''}`}
          />
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="text-xs text-gray-400 font-medium whitespace-nowrap">Suivi des Paiements</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          <div className="space-y-1">
            {navItems.filter((item) => hasPerm(item.menu, 'view')).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                   transition-all duration-200 ease-out group
                   ${isActive
                     ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg'
                     : 'text-gray-400 hover:text-white hover:bg-white/10'
                   }
                   ${collapsed ? 'justify-center' : ''}`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                {!collapsed && item.menu === 'validations' && pendingCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-jeta-red text-white rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-12 border-t border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
          <div className="max-w-full mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Left Side - Page Title (hidden on mobile, shown on desktop) */}
              <div className="hidden lg:flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 font-medium">
                  {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => { fetchNotifs(); setNotifOpen((o) => !o); }}
                    className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {pendingCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-[1rem] h-[1rem] bg-jeta-red rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                        {pendingCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden animate-slide-down">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-jeta-blue/5 to-transparent flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-900">Notifications</p>
                          <span className="text-[10px] font-semibold text-jeta-blue bg-jeta-blue/10 px-2 py-0.5 rounded-full">
                            {pendingCount} en attente
                          </span>
                        </div>
                        <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                          {notifCounts.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-gray-500">
                              Aucune écriture en attente de validation
                            </p>
                          ) : (
                            notifCounts.map((n) => (
                              <button
                                key={n.table}
                                onClick={() => { setNotifOpen(false); navigate('/validations'); }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                              >
                                <p className="text-sm font-semibold text-gray-800">{n.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {n.count} écriture{n.count > 1 ? 's' : ''} en attente de validation
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                        <button
                          onClick={() => { setNotifOpen(false); navigate('/validations'); }}
                          className="w-full px-4 py-2.5 text-sm font-semibold text-jeta-blue hover:bg-jeta-blue/5 border-t border-gray-100 transition-colors text-center"
                        >
                          Voir les validations
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* User Info */}
                <div className="hidden md:flex items-center gap-3 pl-3 border-l border-gray-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-jeta-blue to-jeta-blue-dark flex items-center justify-center text-white shadow-sm">
                      <UserCircle className="w-5 h-5" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-sm font-semibold text-gray-900 max-w-[12rem] truncate">
                        {profile?.nom || user?.email || 'Utilisateur'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {role ? ROLE_LABELS[role] : '—'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-gray-400 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors"
                    title="Se déconnecter"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile logout */}
                <button
                  onClick={handleSignOut}
                  className="md:hidden p-2 text-gray-500 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-full mx-auto w-full px-4 sm:px-6 py-4">
          <Breadcrumbs />
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-full mx-auto px-4 sm:px-6 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
              <span>JETA GROUPE - Plateforme de Suivi des Paiements v2.0.0</span>
              <span>&copy; {new Date().getFullYear()} JETA GROUPE. Tous droits reserves.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Breadcrumbs() {
  const location = useLocation();
  const path = location.pathname;
  const basePath = '/' + path.split('/').filter(Boolean)[0];
  const info = pageTitles[path] || pageTitles[basePath];
  if (!info) return null;
  return (
    <div className="mb-6 animate-fade-in">
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
        <span className="hover:text-gray-600 transition-colors">JETA GROUPE</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-600 font-medium">{info.title}</span>
      </nav>
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{info.title}</h1>
        <p className="text-sm text-gray-500 hidden sm:block">{info.subtitle}</p>
      </div>
    </div>
  );
}
