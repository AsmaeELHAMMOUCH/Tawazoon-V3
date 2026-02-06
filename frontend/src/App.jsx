import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";

import Accueil from "./Accueil";
import AppShell from "./layout/AppShell";
import ChoixActivitePage from "./pages/ChoixActivitePage";
import Sidebar from "./layout/Sidebar";
import SimulationEffectifs from "./pages/Simulation";
import SimulationDirectionV2 from "./pages/SimulationDirectionV2";
import VueCCP from "./pages/VueCCP";
import VueCNA from "./pages/VueCNA";
import VueCCI from "./pages/VueCCI";

// Simple error boundary to catch rendering errors in routes
import React from "react";

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // You may log to a service here if needed
    console.error("RouteErrorBoundary caught: ", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h2>Une erreur est survenue</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error)}</pre>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="btn">Réessayer</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import EnCours from "./pages/EnCours";
import ComparativeView from "./pages/Comparative_view";
import ResultsGlobal from "./pages/ResultsGlobal";
import Dashboard from "./pages/Dashboard";
import GraphPage from "./pages/GraphPage";
import Login from "./Login";
import SimulationMenu from "./pages/SimulationMenu";
import VueCategorie from "./pages/VueCategorie";
import SimulationHistoryPage from "./pages/SimulationHistoryPage";

// 🔹 IMPORTE TA PAGE MENU PARAMÉTRÉE
import MenuAnalyseEffectifs from "./pages/SimulationMenu";
import AlertsTestButton from "./components/alerts/AlertsTestButton";
import CategorisationCentre from "./components/views/CategorisationCentre";

// 🔹 NOUVELLE ARCHITECTURE DATA-DRIVEN - Intégrée directement dans SimulationEffectifs

function NotFound() {
  return <div className="p-6">404 — Page introuvable</div>;
}

const BYPASS_AUTH = true;

function getToken() {
  return (
    localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token")
  );
}

function ProtectedRoute({ children }) {
  if (BYPASS_AUTH) return children;
  const token = getToken();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function SidebarWithNav(props) {
  const navigate = useNavigate();
  const map = {
    // Simulation
    simulation: "/app/simulation/menu",
    comparatif: "/app/simulation?mode=comparatif",
    // Résultats
    dashboard: "/app",
    "vue-globale": "/app/global",
    "ratios-analyse": "/app/global?view=chart&group=centre",
    "budget-economies": "/app/global?view=chart&group=centre",
    "comparatif-positions": "/app/global?view=table&group=poste",
    projections: "/app/global?view=chart&group=region",
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
    } catch { }
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar
      {...props}
      onNavigate={(id) => navigate(map[id] ?? "/app")}
      onLogout={handleLogout}
    />
  );
}

function Layout() {
  return (
    <>
      <AppShell sidebar={SidebarWithNav}>
        <Outlet />
      </AppShell>
      {/* Bouton de test des alertes - À retirer en production */}
      {/* <AlertsTestButton /> */}
    </>
  );
}

export default function App() {
  const token = getToken();
  return (
    <BrowserRouter>
      {import.meta?.env?.DEV && !token && (
        <button
          onClick={() => {
            try {
              localStorage.setItem("auth_token", "debug-token");
            } catch { }
            window.location.href = "/choix-activite";
          }}
          style={{ position: "fixed", right: 12, bottom: 12, zIndex: 9999 }}
          className="px-3 py-2 rounded-md bg-green-600 text-white shadow hover:bg-green-700"
          title="Debug: se connecter sans backend"
        >
          Debug login
        </button>
      )}

      <Routes>
        {/* Page d'accueil */}
        <Route path="/" element={<Accueil />} />
        {/* Page de connexion */}
        <Route path="/login" element={<Login />} />
        {/* Page de choix d'activité */}
        <Route
          path="/choix-activite"
          element={
            <ProtectedRoute>
              <ChoixActivitePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/en-cours"
          element={
            <ProtectedRoute>
              <EnCours />
            </ProtectedRoute>
          }
        />

        {/* Espace application PROTÉGÉ avec Sidebar */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Redirection par défaut (choisis ce que tu veux ouvrir par défaut) */}
          <Route index element={<Navigate to="vue-globale/menu" replace />} />

          {/* ====== MENU PARAMÉTRÉ PAR SECTION ====== */}
          {/* /app/vue-globale/menu | /app/actuel/menu | /app/recommande/menu */}
          <Route path=":section/menu" element={<MenuAnalyseEffectifs />} />
          <Route path=":section/categorisation" element={<VueCategorie />} />

          {/* ====== VUE GLOBALE – CIBLES ====== */}
          <Route path="vue-globale/tableau" element={<Dashboard />} />
          <Route path="vue-globale/ratios" element={<GraphPage />} />
          <Route
            path="vue-globale/economies-budgetaires"
            element={<ResultsGlobal />}
          />
          <Route path="vue-globale/comparatif" element={<ComparativeView />} />
          <Route path="simulations/history" element={<SimulationHistoryPage />} />

          {/* ====== SIMULATION – MENUS ET VARIANTS ====== */}
          {/* Ton ancien menu spécifique si tu veux le garder */}
          <Route path="simulation/menu" element={<SimulationMenu />} />
          {/* Vue Simulation par défaut (poste) */}
          <Route path="simulation" element={<RouteErrorBoundary><SimulationEffectifs /></RouteErrorBoundary>} />
          {/* Vue Simulation CCP (standalone route) */}
          <Route path="simulation/ccp" element={<RouteErrorBoundary><VueCCP /></RouteErrorBoundary>} />
          {/* Vue Simulation CNA (standalone route) */}
          <Route path="simulation/cna" element={<RouteErrorBoundary><VueCNA /></RouteErrorBoundary>} />
          {/* Vue Simulation CCI (standalone route) */}
          <Route path="simulation/cci" element={<RouteErrorBoundary><VueCCI /></RouteErrorBoundary>} />
          {/* Variantes par flux (centre/direction/région/national) */}
          <Route path="simulation/centre" element={<RouteErrorBoundary><SimulationEffectifs /></RouteErrorBoundary>} />
          <Route path="simulation/direction" element={<RouteErrorBoundary><SimulationEffectifs /></RouteErrorBoundary>} />
          <Route path="simulation/direction-v2" element={<RouteErrorBoundary><SimulationDirectionV2 /></RouteErrorBoundary>} />
          <Route path="simulation/region" element={<RouteErrorBoundary><SimulationEffectifs /></RouteErrorBoundary>} />
          <Route path="simulation/national" element={<RouteErrorBoundary><SimulationEffectifs /></RouteErrorBoundary>} />
          <Route path="simulation/categorisation/:centreId" element={<RouteErrorBoundary><CategorisationCentre /></RouteErrorBoundary>} />


          {/* 404 dans /app */}
          <Route
            path="*"
            element={<div className="p-6">404 — Page introuvable</div>}
          />
        </Route>

        {/* 404 globale */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
