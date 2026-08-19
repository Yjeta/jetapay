import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-jeta-green to-jeta-blue flex items-center justify-center shadow-lg shadow-jeta-blue/20">
        <Loader2 className="w-7 h-7 text-white animate-spin" />
      </div>
      <p className="text-sm text-gray-500 font-medium">Chargement de la session...</p>
    </div>
  );
}

function AccessDenied({ title, message }: { title: string; message: string }) {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full p-8 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-jeta-red" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <button
          onClick={() => signOut()}
          className="btn-secondary w-full"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    return (
      <AccessDenied
        title="Compte non configuré"
        message="Votre compte n'est pas encore configuré dans l'application. Contactez l'administrateur."
      />
    );
  }

  if (!profile.actif) {
    return (
      <AccessDenied
        title="Compte désactivé"
        message="Votre compte a été désactivé. Contactez l'administrateur pour plus d'informations."
      />
    );
  }

  return <>{children}</>;
}
