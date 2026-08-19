import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, LogIn, Loader2, ShieldCheck, Eye, EyeOff, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.');
      setSubmitting(false);
      return;
    }

    const err = await signIn(trimmedEmail, password);
    if (err) {
      setError('Identifiants invalides. Vérifiez votre email et votre mot de passe.');
      setSubmitting(false);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-jeta-blue-dark to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07]">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-jeta-green rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-jeta-blue rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] border border-white/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] border border-white/10 rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 animate-fade-in">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center bg-gradient-to-br from-gray-900 to-jeta-blue-dark">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-jeta-green to-jeta-blue flex items-center justify-center shadow-lg shadow-jeta-blue/30">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">JETA GROUPE</h1>
            <p className="text-sm text-gray-300 mt-1">Suivi des Paiements Fournisseurs</p>
          </div>

          <div className="px-8 py-8">
            <div className="flex items-center gap-2 mb-6 text-gray-600">
              <ShieldCheck className="w-5 h-5 text-jeta-green" />
              <h2 className="font-semibold">Connexion sécurisée</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adresse email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@jetagroupe.com"
                    autoComplete="email"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="input-field pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 animate-slide-down">
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Se connecter
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Accès réservé au personnel autorisé de JETA GROUPE
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          &copy; {new Date().getFullYear()} JETA GROUPE. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
