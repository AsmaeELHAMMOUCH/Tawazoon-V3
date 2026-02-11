import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
} from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { api } from "../lib/api";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function IndexAdequation() {
  const location = useLocation();
  const navigate = useNavigate();
  const centreLabel = location.state?.centreLabel || "Centre non sélectionné";
  const centreId = location.state?.centreId;

  // 🆕 Récupérer les résultats de simulation depuis location.state
  const simulationResults = location.state?.simulationResults;
  const centreInfo = location.state?.centreInfo;
  const volumes = location.state?.volumes;
  const simulationParams = location.state?.simulationParams;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIndiceModal, setShowIndiceModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(null); // 'mois', 'jour', 'heure'

  // Process simulation results into adequation format
  useEffect(() => {
    if (!centreId) {
      setLoading(false);
      return;
    }

    // Si on a des résultats de simulation, on les utilise directement
    if (simulationResults?.postes && Array.isArray(simulationResults.postes)) {
      const positions = simulationResults.postes.map((poste) => {
        // Effectif actuel = effectif_statutaire + effectif_aps
        const effectif_actuel = (poste.effectif_statutaire || 0) + (poste.effectif_aps || 0);

        // Effectif calculé = etp_calcule (résultat de simulation)
        const effectif_calcule = poste.etp_calcule || 0;

        // Effectif recommandé = etp_arrondi (résultat de simulation arrondi)
        const effectif_recommande = poste.etp_arrondi || 0;

        // Volumes - TODO: calculer depuis les tâches ou volumes passés
        // Pour l'instant, on utilise des valeurs par défaut ou depuis les volumes passés
        const dossiers_mois = volumes?.[poste.poste_id]?.mensuel || 0;
        const dossiers_par_jour = volumes?.[poste.poste_id]?.journalier || 0;
        const volume_heure = volumes?.[poste.poste_id]?.horaire || 0;

        return {
          centre: centreLabel, // Nom du centre
          poste: poste.poste_label || poste.label || `Poste ${poste.poste_id}`,
          type: poste.type_poste || "MOD", // MOD ou MOI
          effectif_actuel,
          effectif_calcule: Math.round(effectif_calcule), // Arrondir pour affichage
          effectif_recommande,
          dossiers_mois,
          dossiers_par_jour,
          volume_activites_par_heure_total: volume_heure,
        };
      });

      setData({
        centre_id: centreId,
        centre_label: centreLabel,
        positions,
      });
      setLoading(false);
    } else {
      // Fallback: utiliser des données mockées si pas de résultats de simulation
      console.warn("⚠️ Aucun résultat de simulation trouvé dans location.state");
      setData(mockData);
      setLoading(false);
    }
  }, [centreId, simulationResults, centreLabel, volumes]);

  // Calculate totals and indices
  const calculations = useMemo(() => {
    if (!data?.positions) return null;

    const totals = data.positions.reduce(
      (acc, pos) => ({
        actuel: acc.actuel + (pos.effectif_actuel || 0),
        calcule: acc.calcule + (pos.effectif_calcule || 0),
        recommande: acc.recommande + (pos.effectif_recommande || 0),
        dossiers_mois: acc.dossiers_mois + (pos.dossiers_mois || 0),
        dossiers_jour: acc.dossiers_jour + (pos.dossiers_par_jour || 0),
        volume_heure: acc.volume_heure + (pos.volume_activites_par_heure_total || 0),
      }),
      { actuel: 0, calcule: 0, recommande: 0, dossiers_mois: 0, dossiers_jour: 0, volume_heure: 0 }
    );

    // Calculate indices
    // Calculate indices (INVERTED LOGIC: Actuel / Cible)
    // Taux de couverture de la cible par l'actuel
    const indice_calc_vs_actuel = totals.calcule > 0
      ? Math.round((totals.actuel / totals.calcule) * 100)
      : 0;
    const indice_reco_vs_actuel = totals.recommande > 0
      ? Math.round((totals.actuel / totals.recommande) * 100)
      : 0;
    const indice_reco_vs_calc = totals.recommande > 0
      ? Math.round((totals.calcule / totals.recommande) * 100)
      : 0;

    // Calculate average volumes for totals
    const safeDiv = (num, denom) => (denom > 0 ? num / denom : 0);
    const effectifForAvg = totals.actuel > 0 ? totals.actuel : 1;

    return {
      totals,
      indices: {
        calc_vs_actuel: indice_calc_vs_actuel,
        reco_vs_actuel: indice_reco_vs_actuel,
        reco_vs_calc: indice_reco_vs_calc,
      },
      averages: {
        mois_actuel: safeDiv(totals.dossiers_mois, totals.actuel),
        mois_calcule: safeDiv(totals.dossiers_mois, totals.calcule),
        mois_recommande: safeDiv(totals.dossiers_mois, totals.recommande),
        jour_actuel: safeDiv(totals.dossiers_jour, totals.actuel),
        jour_calcule: safeDiv(totals.dossiers_jour, totals.calcule),
        jour_recommande: safeDiv(totals.dossiers_jour, totals.recommande),
        heure_actuel: safeDiv(totals.volume_heure, totals.actuel),
        heure_calcule: safeDiv(totals.volume_heure, totals.calcule),
        heure_recommande: safeDiv(totals.volume_heure, totals.recommande),
      },
    };
  }, [data]);

  // Badge color logic
  const getBadgeColor = (value) => {
    if (value >= 95 && value <= 105) return "green";
    if ((value >= 90 && value < 95) || (value > 105 && value <= 110)) return "orange";
    return "red";
  };

  const badgeStyles = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-300",
    orange: "bg-amber-100 text-amber-800 border-amber-300",
    red: "bg-rose-100 text-rose-800 border-rose-300",
  };

  // Export CSV function
  const exportToCSV = () => {
    if (!data?.positions || !calculations) return;

    const lines = [];
    lines.push("TABLEAU RECAPITULATIF");
    lines.push("Indicateur;Valeur");
    lines.push(`Effectif Actuel Total;${calculations.totals.actuel}`);
    lines.push(`Effectif Calculé Total;${calculations.totals.calcule}`);
    lines.push(`Effectif Recommandé Total;${calculations.totals.recommande}`);
    lines.push(`Volume Moyen/Mois (Actuel);${calculations.averages.mois_actuel.toFixed(2)}`);
    lines.push(`Volume Moyen/Jour (Actuel);${calculations.averages.jour_actuel.toFixed(2)}`);
    lines.push(`Volume Moyen/Heure (Actuel);${calculations.averages.heure_actuel.toFixed(2)}`);
    lines.push("");
    lines.push("TABLEAU DETAILLE");
    lines.push("Poste;Effectif Actuel;Effectif Calculé;Effectif Recommandé;Vol Moy/Mois (Actuel);Vol Moy/Mois (Calc);Vol Moy/Mois (Reco);Vol Moy/Jour (Actuel);Vol Moy/Jour (Calc);Vol Moy/Jour (Reco);Vol Moy/Heure (Actuel);Vol Moy/Heure (Calc);Vol Moy/Heure (Reco)");

    data.positions.forEach((pos) => {
      const safeDiv = (num, denom) => (denom > 0 ? (num / denom).toFixed(2) : "0.00");
      lines.push([
        pos.poste,
        pos.effectif_actuel || 0,
        pos.effectif_calcule || 0,
        pos.effectif_recommande || 0,
        safeDiv(pos.dossiers_mois, pos.effectif_actuel),
        safeDiv(pos.dossiers_mois, pos.effectif_calcule),
        safeDiv(pos.dossiers_mois, pos.effectif_recommande),
        safeDiv(pos.dossiers_par_jour, pos.effectif_actuel),
        safeDiv(pos.dossiers_par_jour, pos.effectif_calcule),
        safeDiv(pos.dossiers_par_jour, pos.effectif_recommande),
        safeDiv(pos.volume_activites_par_heure_total, pos.effectif_actuel),
        safeDiv(pos.volume_activites_par_heure_total, pos.effectif_calcule),
        safeDiv(pos.volume_activites_par_heure_total, pos.effectif_recommande),
      ].join(";"));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `adequation_${centreLabel}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Export Indices CSV
  const exportIndicesCSV = () => {
    if (!calculations) return;

    const lines = [];
    lines.push("INDICES D'ADEQUATION");
    lines.push("Indicateur;Valeur;Statut");
    lines.push(`Calculé vs Actuel;${calculations.indices.calc_vs_actuel}%;${getBadgeColor(calculations.indices.calc_vs_actuel)}`);
    lines.push(`Recommandé vs Actuel;${calculations.indices.reco_vs_actuel}%;${getBadgeColor(calculations.indices.reco_vs_actuel)}`);
    lines.push(`Recommandé vs Calculé;${calculations.indices.reco_vs_calc}%;${getBadgeColor(calculations.indices.reco_vs_calc)}`);

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `indices_adequation_${centreLabel}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!centreId) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-amber-800 font-semibold">Aucun centre sélectionné</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Index d'Adéquation
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Analyse des effectifs et volumes - {centreLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>
        </div>





        {/* Results Table */}
        {data?.positions && (
          <ResultsTable
            positions={data.positions}
            totals={calculations?.totals}
            averages={calculations?.averages}
          />
        )}


        {/* Navigation vers Capacité Nominale */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/app/simulation/capacite_nominale', {
              state: {
                simulationResults,
                volumes,
                simulationParams,
                centreId,
                centreLabel
              }
            })}
            className="w-full sm:w-auto p-4 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 transition-all shadow-sm hover:shadow text-left flex items-center gap-4 group"
          >
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Capacité Nominale</h3>
              <p className="text-sm text-slate-500 mt-0.5">Accéder à l'analyse détaillée des volumes (Mois / Jour / Heure)</p>
            </div>
            <div className="ml-auto text-blue-400 group-hover:translate-x-1 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </button>
        </div>

        {/* Legend */}
        <LegendCard />
      </div>

      {/* Modals */}
      {
        showIndiceModal && calculations && (
          <IndiceModal
            indices={calculations.indices}
            onClose={() => setShowIndiceModal(false)}
            getBadgeColor={getBadgeColor}
          />
        )
      }

      {
        showChartModal && data?.positions && (
          <ChartModal
            type={showChartModal}
            positions={data.positions}
            onClose={() => setShowChartModal(null)}
          />
        )
      }
    </div >
  );
}

// ========== COMPONENTS ==========

function IndiceCard({ title, value, color }) {
  const styles = {
    green: {
      bg: "bg-gradient-to-br from-emerald-50 to-green-50",
      border: "border-emerald-300",
      text: "text-emerald-800",
      icon: "text-emerald-600",
    },
    orange: {
      bg: "bg-gradient-to-br from-amber-50 to-orange-50",
      border: "border-amber-300",
      text: "text-amber-800",
      icon: "text-amber-600",
    },
    red: {
      bg: "bg-gradient-to-br from-rose-50 to-red-50",
      border: "border-rose-300",
      text: "text-rose-800",
      icon: "text-rose-600",
    },
  };

  const style = styles[color];
  const Icon = value > 105 ? TrendingUp : value < 95 ? TrendingDown : Minus;

  return (
    <div className={`rounded-xl border-2 ${style.border} ${style.bg} p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
        <Icon className={`w-4 h-4 ${style.icon}`} />
      </div>
      <div className={`text-xl font-bold ${style.text}`}>{value}%</div>
      <div className="mt-1 text-[10px] text-slate-600">
        {value >= 95 && value <= 105 ? "Optimal" : value >= 90 && value <= 110 ? "Acceptable" : "Critique"}
      </div>
    </div>
  );
}

function ResultsTable({ positions, totals, averages }) {
  const safeDiv = (num, denom) => (denom > 0 ? (num / denom).toFixed(2) : "0.00");

  // Calculer les indices pour chaque ligne (INVERTED: Actuel / Cible)
  const calculateIndices = (actuel, calcule, recommande) => {
    // Actuel vs Calculé
    const indexCalc = calcule > 0 ? Math.round((actuel / calcule) * 100) : 0;
    // Actuel vs Recommandé
    const indexReco = recommande > 0 ? Math.round((actuel / recommande) * 100) : 0;
    // Actuel vs Optimisé (Estimé ici comme Recommandé + 10%)
    const opti = Math.round(recommande * 1.1);
    const indexOpti = opti > 0 ? Math.round((actuel / opti) * 100) : 0;

    return { indexCalc, indexReco, indexOpti };
  };

  // Fonction pour obtenir la couleur de fond selon l'indice
  const getIndexColor = (index) => {
    if (index >= 95 && index <= 105) return "bg-emerald-100 text-emerald-800";
    if ((index >= 90 && index < 95) || (index > 105 && index <= 110)) return "bg-amber-100 text-amber-800";
    return "bg-rose-100 text-rose-800";
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-bold text-slate-800">Index d'Adéquation</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="px-2 py-1 text-left font-bold text-slate-700 border-r border-slate-300">Centre</th>
              <th className="px-2 py-1 text-left font-bold text-slate-700 border-r border-slate-300">Intervenant</th>
              <th className="px-2 py-1 text-center font-bold text-slate-700 border-r border-slate-300">Type</th>
              <th className="px-2 py-1 text-center font-bold text-blue-700 bg-blue-50 border-r border-slate-300">Actuel</th>
              <th className="px-2 py-1 text-center font-bold text-cyan-700 bg-cyan-50 border-r border-slate-300">Calculé</th>
              <th className="px-2 py-1 text-center font-bold text-slate-700 bg-slate-50 border-r border-slate-300">Index</th>
              <th className="px-2 py-1 text-center font-bold text-emerald-700 bg-emerald-50 border-r border-slate-300">Recommandé</th>
              <th className="px-2 py-1 text-center font-bold text-slate-700 bg-slate-50 border-r border-slate-300">Index</th>
              <th className="px-2 py-1 text-center font-bold text-purple-700 bg-purple-50 border-r border-slate-300">Optimisé</th>
              <th className="px-2 py-1 text-center font-bold text-slate-700 bg-slate-50">Index</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {positions.map((pos, idx) => {
              const { indexCalc, indexReco, indexOpti } = calculateIndices(
                pos.effectif_actuel,
                pos.effectif_calcule,
                pos.effectif_recommande
              );

              // Déterminer le type (MOD/MOI) - à adapter selon vos données
              const type = pos.type || "MOD";

              return (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-2 py-1 text-slate-600 border-r border-slate-200">
                    {pos.centre || "AM Fes"}
                  </td>
                  <td className="px-2 py-1 font-medium text-slate-800 border-r border-slate-200">
                    {pos.poste}
                  </td>
                  <td className="px-2 py-1 text-center border-r border-slate-200">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${type === "MOD" ? "bg-blue-100 text-blue-800" : "bg-fuchsia-100 text-fuchsia-800"
                      }`}>
                      {type}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-center font-semibold text-slate-800 bg-blue-50/30 border-r border-slate-200">
                    {pos.effectif_actuel || 0}
                  </td>
                  <td className="px-2 py-1 text-center font-semibold text-slate-800 bg-cyan-50/30 border-r border-slate-200">
                    {pos.effectif_calcule || 0}
                  </td>
                  <td className={`px-2 py-1 text-center font-bold border-r border-slate-200 ${getIndexColor(indexCalc)}`}>
                    {indexCalc > 0 ? `${indexCalc}%` : "-"}
                  </td>
                  <td className="px-2 py-1 text-center font-semibold text-slate-800 bg-emerald-50/30 border-r border-slate-200">
                    {pos.effectif_recommande || 0}
                  </td>
                  <td className={`px-2 py-1 text-center font-bold border-r border-slate-200 ${getIndexColor(indexReco)}`}>
                    {indexReco > 0 ? `${indexReco}%` : "-"}
                  </td>
                  <td className="px-2 py-1 text-center font-semibold text-slate-800 bg-purple-50/30 border-r border-slate-200">
                    {pos.effectif_recommande || 0}
                  </td>
                  <td className={`px-2 py-1 text-center font-bold ${getIndexColor(indexOpti)}`}>
                    {indexOpti > 0 ? `${indexOpti}%` : "-"}
                  </td>
                </tr>
              );
            })}



            {/* TOTAL Row */}
            {totals && (() => {
              const idxCalc = totals.calcule > 0 ? Math.round((totals.actuel / totals.calcule) * 100) : 0;
              const idxReco = totals.recommande > 0 ? Math.round((totals.actuel / totals.recommande) * 100) : 0;
              const idxOpti = totals.recommande > 0 ? Math.round((totals.actuel / (totals.recommande * 1.1)) * 100) : 0;

              return (
                <tr className="bg-slate-50 text-slate-900 font-bold border-t-2 border-slate-300">
                  <td className="px-2 py-2 text-[10px] border-r border-slate-200">Total</td>
                  <td className="px-2 py-2 border-r border-slate-200"></td>
                  <td className="px-2 py-2 border-r border-slate-200"></td>
                  <td className="px-2 py-2 text-[10px] text-center border-r border-slate-200">{totals.actuel}</td>
                  <td className="px-2 py-2 text-[10px] text-center border-r border-slate-200">{totals.calcule}</td>
                  <td className={`px-2 py-2 text-[10px] text-center border-r border-slate-200 ${getIndexColor(idxCalc)}`}>
                    {idxCalc > 0 ? `${idxCalc}%` : "-"}
                  </td>
                  <td className="px-2 py-2 text-[10px] text-center border-r border-slate-200">{totals.recommande}</td>
                  <td className={`px-2 py-2 text-[10px] text-center border-r border-slate-200 ${getIndexColor(idxReco)}`}>
                    {idxReco > 0 ? `${idxReco}%` : "-"}
                  </td>
                  <td className="px-2 py-2 text-[10px] text-center border-r border-slate-200">{Math.round(totals.recommande * 1.1)}</td>
                  <td className={`px-2 py-2 text-[10px] text-center ${getIndexColor(idxOpti)}`}>
                    {idxOpti > 0 ? `${idxOpti}%` : "-"}
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LegendCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4">Légende des Couleurs</h3>
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500"></div>
          <span className="text-sm text-slate-700">Optimal (95-105%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500"></div>
          <span className="text-sm text-slate-700">Acceptable (90-95% ou 105-110%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-rose-500"></div>
          <span className="text-sm text-slate-700">Critique (&lt;90% ou &gt;110%)</span>
        </div>
      </div>
    </div>
  );
}

function IndiceModal({ indices, onClose, getBadgeColor }) {
  const chartData = {
    labels: ["Calculé vs Actuel", "Recommandé vs Actuel", "Recommandé vs Calculé"],
    datasets: [
      {
        label: "Indice (%)",
        data: [indices.calc_vs_actuel, indices.reco_vs_actuel, indices.reco_vs_calc],
        backgroundColor: [
          getBadgeColor(indices.calc_vs_actuel) === "green" ? "rgba(16, 185, 129, 0.6)" :
            getBadgeColor(indices.calc_vs_actuel) === "orange" ? "rgba(245, 158, 11, 0.6)" :
              "rgba(244, 63, 94, 0.6)",
          getBadgeColor(indices.reco_vs_actuel) === "green" ? "rgba(16, 185, 129, 0.6)" :
            getBadgeColor(indices.reco_vs_actuel) === "orange" ? "rgba(245, 158, 11, 0.6)" :
              "rgba(244, 63, 94, 0.6)",
          getBadgeColor(indices.reco_vs_calc) === "green" ? "rgba(16, 185, 129, 0.6)" :
            getBadgeColor(indices.reco_vs_calc) === "orange" ? "rgba(245, 158, 11, 0.6)" :
              "rgba(244, 63, 94, 0.6)",
        ],
        borderColor: [
          getBadgeColor(indices.calc_vs_actuel) === "green" ? "rgb(16, 185, 129)" :
            getBadgeColor(indices.calc_vs_actuel) === "orange" ? "rgb(245, 158, 11)" :
              "rgb(244, 63, 94)",
          getBadgeColor(indices.reco_vs_actuel) === "green" ? "rgb(16, 185, 129)" :
            getBadgeColor(indices.reco_vs_actuel) === "orange" ? "rgb(245, 158, 11)" :
              "rgb(244, 63, 94)",
          getBadgeColor(indices.reco_vs_calc) === "green" ? "rgb(16, 185, 129)" :
            getBadgeColor(indices.reco_vs_calc) === "orange" ? "rgb(245, 158, 11)" :
              "rgb(244, 63, 94)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      title: {
        display: true,
        text: "Indices d'Adéquation",
        font: { size: 16, weight: "bold" },
      },
      annotation: {
        annotations: {
          line1: {
            type: "line",
            yMin: 100,
            yMax: 100,
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              content: "Seuil 100%",
              enabled: true,
              position: "end",
            },
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 150,
        ticks: {
          callback: (value) => value + "%",
        },
      },
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Graphique des Indices</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <span className="text-2xl text-slate-600">×</span>
          </button>
        </div>
        <div className="p-6">
          <div style={{ height: "400px" }}>
            <Bar data={chartData} options={options} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartModal({ type, positions, onClose }) {
  const getChartData = () => {
    const labels = positions.map((p) => p.poste);
    let actuelData, recommandeData, title, yLabel;

    const safeDiv = (num, denom) => (denom > 0 ? num / denom : 0);

    switch (type) {
      case "mois":
        actuelData = positions.map((p) => safeDiv(p.dossiers_mois, p.effectif_actuel));
        recommandeData = positions.map((p) => safeDiv(p.dossiers_mois, p.effectif_recommande));
        title = "Volume Moyen / Mois";
        yLabel = "Dossiers/Mois";
        break;
      case "jour":
        actuelData = positions.map((p) => safeDiv(p.dossiers_par_jour, p.effectif_actuel));
        recommandeData = positions.map((p) => safeDiv(p.dossiers_par_jour, p.effectif_recommande));
        title = "Volume Moyen / Jour";
        yLabel = "Dossiers/Jour";
        break;
      case "heure":
        actuelData = positions.map((p) => safeDiv(p.volume_activites_par_heure_total, p.effectif_actuel));
        recommandeData = positions.map((p) => safeDiv(p.volume_activites_par_heure_total, p.effectif_recommande));
        title = "Volume Moyen / Heure";
        yLabel = "Volume/Heure";
        break;
      default:
        return null;
    }

    return {
      labels,
      datasets: [
        {
          label: "Actuel",
          data: actuelData,
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderColor: "rgb(59, 130, 246)",
          borderWidth: 2,
        },
        {
          label: "Recommandé",
          data: recommandeData,
          backgroundColor: "rgba(16, 185, 129, 0.6)",
          borderColor: "rgb(16, 185, 129)",
          borderWidth: 2,
        },
      ],
      title,
      yLabel,
    };
  };

  const chartData = getChartData();
  if (!chartData) return null;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      title: {
        display: true,
        text: chartData.title,
        font: { size: 16, weight: "bold" },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: chartData.yLabel,
        },
      },
    },
  };

  const exportChart = () => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.download = `chart_${type}_${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{chartData.title}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={exportChart}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export PNG
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <span className="text-2xl text-slate-600">×</span>
            </button>
          </div>
        </div>
        <div className="p-6">
          <div style={{ height: "500px" }}>
            <Bar data={chartData} options={options} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock data for development
const mockData = {
  positions: [
    {
      poste: "Agent Opérations",
      effectif_actuel: 10,
      effectif_calcule: 12,
      effectif_recommande: 11,
      dossiers_mois: 5000,
      dossiers_par_jour: 250,
      volume_activites_par_heure_total: 800,
    },
    {
      poste: "Contrôleur",
      effectif_actuel: 5,
      effectif_calcule: 6,
      effectif_recommande: 5,
      dossiers_mois: 2000,
      dossiers_par_jour: 100,
      volume_activites_par_heure_total: 320,
    },
    {
      poste: "Superviseur",
      effectif_actuel: 2,
      effectif_calcule: 2,
      effectif_recommande: 2,
      dossiers_mois: 800,
      dossiers_par_jour: 40,
      volume_activites_par_heure_total: 128,
    },
  ],
};
