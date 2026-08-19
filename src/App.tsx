import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { PaiementsPage } from './pages/PaiementsPage';
import { FilialesPage } from './pages/FilialesPage';
import { FournisseursPage } from './pages/FournisseursPage';
import { FacturesPage } from './pages/FacturesPage';
import { RapportsPage } from './pages/RapportsPage';
import { GrandLivrePage } from './pages/GrandLivrePage';
import { ZonesPage } from './pages/ZonesPage';
import { ChantiersPage } from './pages/ChantiersPage';
import { LocalisationsPage } from './pages/LocalisationsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { ValidationsPage } from './pages/ValidationsPage';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from './components/ToastContainer';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<PaiementsPage />} />
              <Route path="filiales" element={<FilialesPage />} />
              <Route path="fournisseurs" element={<FournisseursPage />} />
              <Route path="factures" element={<FacturesPage />} />
              <Route path="grand-livre" element={<GrandLivrePage />} />
              <Route path="grand-livre/:fournisseurId" element={<GrandLivrePage />} />
              <Route path="zones" element={<ZonesPage />} />
              <Route path="chantiers" element={<ChantiersPage />} />
              <Route path="localisations" element={<LocalisationsPage />} />
              <Route path="rapports" element={<RapportsPage />} />
              <Route path="validations" element={<ValidationsPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
