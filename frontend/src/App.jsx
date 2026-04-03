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
import SchemaProcessPage from "./pages/SchemaProcessPage";
import ReferentielPage from "./pages/ReferentielPage";

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
import EsignMenu from "./pages/EsignMenu";
import EffectifsParPosition3 from "./pages/EffectifsParPosition3";
import EffectifGlobalPage from "./pages/EffectifGlobalPage";
import ComparaisonEffectifPage from "./pages/ComparaisonEffectifPage.jsx";

// ?? IMPORTE TA PAGE MENU PARAMÉTRÉE
import MenuAnalyseEffectifs from "./pages/SimulationMenu";
import AlertsTestButton from "./components/alerts/AlertsTestButton";

import CategorisationCentre from "./components/views/CategorisationCentre";
import CentreBuilder from "./pages/CentreBuilder"; // ?? Page Builder (Créer Centre)
import AjoutTache from "./pages/admin/AjoutTache"; // ?? Page Ajout Tâche
import CentersTasksManager from "./pages/admin/CentersTasksManager"; // ?? Page gestion Tâches
import PostesManager from "./pages/admin/PostesManager"; // ?? Page gestion Postes
import CentresTypologieManager from "./pages/admin/CentresTypologieManager"; // ?? Page gestion Typologies
import Glossary from "./pages/help/Glossary"; // ?? Page Glossaire
import MainMenu from "./pages/MainMenu"; // ?? Page Menu Principal
import CentresUniques from "./pages/CentresUniques"; // ?? Page Centres Uniques
import CNDPSimulation from "./pages/centres_uniq/CNDPSimulation"; // ?? CNDP Isolated Page
import SimulationCentresUniques from "./pages/SimulationCentresUniques"; // ?? Parent Page CNDP/Bandoeng
import GlobalImportPage from "./pages/GlobalImportPage"; // ?? Global Import
import SimulationIntervenantAvancee from "./pages/SimulationIntervenantAvancee"; // ?? Simulation Intervenant Avancée
import CapaciteNominale from "./pages/CapaciteNominale";
import ChronogrammeTachesPage from "./pages/ChronogrammeTachesPage";
import ChronogrammePositionsPage from "./pages/ChronogrammePositionsPage";
import ChronogrammeGraphPage from "./pages/ChronogrammeGraphPage";
import IndexAdequation from "./pages/IndexAdequation";
import NormesDimensionnementPage from "./pages/NormesDimensionnementPage";
import SimulationRecommandeePage from "./pages/SimulationRecommandeePage";
import SimulationRecommandeeGlobalPage from "./pages/SimulationRecommandeeGlobalPage";
import NormesDimensionnementRecommandeesPage from "./pages/NormesDimensionnementRecommandeesPage";
import ComparaisonActuelRecoPage from "./pages/ComparaisonActuelRecoPage";
import CapaciteNominaleRecPage from "./pages/CapaciteNominaleRecPage";
import SchemaProcessRecommandePage from "./pages/SchemaProcessRecommandePage";
import ChronogrammeRecommandePage from "./pages/ChronogrammeRecommandePage";
import ChronogrammePositionRecommandeePage from "./pages/ChronogrammePositionRecommandeePage";
import SimulationGlobaleV3Page from "./pages/SimulationGlobaleV3Page";
import RatiosProductivitePage from "./pages/RatiosProductivitePage.jsx";
import EconomiesBudgetairesPage from "./pages/EconomiesBudgetairesPage";
import ComparatifPositionsPage from "./pages/ComparatifPositionsPage";

// ...




// ?? NOUVELLE ARCHITECTURE DATA-DRIVEN - Intégrée directement dans SimulationEffectifs

function NotFound() {
  return <div className="p-6">404 age introuvable</div>;
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
        <Route path="/schema-process" element={<SchemaProcessPage />} />
        <Route path="/referentiel" element={<ReferentielPage />} />
        {/* Menu ESIGN */}
        <Route path="/esign" element={<EsignMenu />} />
        {/* Effectifs par position (version web) */}
        <Route path="/app/effectifs-par-position3" element={<EffectifsParPosition3 />} />
        {/* Page de choix d'activité */}
        <Route
          path="/choix-activite"
          element={
            <ProtectedRoute>
              <ChoixActivitePage />
            </ProtectedRoute>
          }
        />
        <Route path="/app/effectif-global" element={<EffectifGlobalPage />} />
        <Route path="/comparatif-effectifs" element={<ComparaisonEffectifPage />} />
        <Route path="/app/actuel/normes" element={<NormesDimensionnementPage />} />
        <Route path="/app/actuel/capacite-nominale" element={<CapaciteNominale />} />
        <Route path="/app/actuel/chronogramme/taches" element={<ChronogrammeTachesPage />} />
        <Route path="/app/actuel/chronogramme/positions" element={<ChronogrammePositionsPage />} />
        <Route path="/dimensionnement-recommande/position" element={<SimulationRecommandeePage />} />
        <Route path="/dimensionnement-recommande/global" element={<SimulationRecommandeeGlobalPage />} />
        <Route path="/dimensionnement-recommande/normes" element={<NormesDimensionnementRecommandeesPage />} />
        <Route path="/dimensionnement-recommande/comparatif" element={<ComparaisonActuelRecoPage />} />
        <Route path="/dimensionnement-recommande/capacite-nominale" element={<CapaciteNominaleRecPage />} />
        <Route path="/dimensionnement-recommande/schema-process" element={<SchemaProcessRecommandePage />} />
        <Route path="/dimensionnement-recommande/chronogramme/taches" element={<ChronogrammeRecommandePage />} />
        <Route path="/dimensionnement-recommande/chronogramme/positions" element={<ChronogrammePositionRecommandeePage />} />
        <Route path="/app/vue-globale/tableau" element={<SimulationGlobaleV3Page />} />
        <Route path="/app/vue-globale/v3" element={<SimulationGlobaleV3Page />} />
        <Route path="/app/vue-globale/ratios" element={<RouteErrorBoundary><RatiosProductivitePage /></RouteErrorBoundary>} />
        <Route path="/app/vue-globale/ratios-productivite" element={<RouteErrorBoundary><RatiosProductivitePage /></RouteErrorBoundary>} />
        <Route path="/app/vue-globale/economies-budgetaires" element={<ProtectedRoute><EconomiesBudgetairesPage /></ProtectedRoute>} />
        <Route path="/app/vue-globale/comparatif-positions" element={<ProtectedRoute><ComparatifPositionsPage /></ProtectedRoute>} />
        <Route path="/app/recommande/schema" element={<SchemaProcessRecommandePage />} />
        <Route path="/app/actuel/chronogramme/positions/graphe" element={<ChronogrammeGraphPage />} />
        <Route
          path="/en-cours"
          element={
            <ProtectedRoute>
              <EnCours />
            </ProtectedRoute>
          }
        />

        {/* Menu Principal (sans sidebar) */}
        <Route
          path="/menu-principal"
          element={
            <ProtectedRoute>
              <RouteErrorBoundary>
                <MainMenu />
              </RouteErrorBoundary>
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
          {/* Redirection vers le menu principal */}
          <Route index element={<Navigate to="/menu-principal" replace />} />

          {/* ====== MENU PARAMÉTRÉ PAR SECTION ====== */}
          {/* /app/vue-globale/menu | /app/actuel/menu | /app/recommande/menu */}
          <Route path=":section/menu" element={<MenuAnalyseEffectifs />} />
          <Route path=":section/categorisation" element={<VueCategorie />} />

          <Route path="vue-globale/comparatif" element={<ComparativeView />} />
          {/* Les routes Ratios sont maintenant en dehors du Layout (pas de double sidebar) */}
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
          <Route path="simulation/cndp" element={<RouteErrorBoundary><CNDPSimulation /></RouteErrorBoundary>} />
          <Route path="simulation/centres-uniques" element={<RouteErrorBoundary><SimulationCentresUniques /></RouteErrorBoundary>} />
          <Route path="simulation/intervenant-avancee" element={<RouteErrorBoundary><SimulationIntervenantAvancee /></RouteErrorBoundary>} />
          <Route path="simulation/index_Adequation" element={<RouteErrorBoundary><IndexAdequation /></RouteErrorBoundary>} />



          <Route path="simulation/capacite-nominale" element={<RouteErrorBoundary><CapaciteNominale /></RouteErrorBoundary>} />
          <Route path="simulation/capacite_nominale" element={<RouteErrorBoundary><CapaciteNominale /></RouteErrorBoundary>} />

          {/* Administration */}
          <Route path="admin/import-tasks" element={<RouteErrorBoundary><GlobalImportPage /></RouteErrorBoundary>} />

          <Route path="creer-centre" element={<RouteErrorBoundary><CentreBuilder /></RouteErrorBoundary>} />
          <Route path="centres-uniques" element={<RouteErrorBoundary><CentresUniques /></RouteErrorBoundary>} />
          <Route path="builder" element={<RouteErrorBoundary><AjoutTache /></RouteErrorBoundary>} />
          <Route path="taches-manager" element={<RouteErrorBoundary><CentersTasksManager /></RouteErrorBoundary>} />
          <Route path="postes-manager" element={<RouteErrorBoundary><PostesManager /></RouteErrorBoundary>} />
          <Route path="centres-typologie" element={<RouteErrorBoundary><CentresTypologieManager /></RouteErrorBoundary>} />
          <Route path="glossary" element={<RouteErrorBoundary><Glossary /></RouteErrorBoundary>} />


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







