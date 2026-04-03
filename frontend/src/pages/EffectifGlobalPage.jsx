import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { simulerEffectifGlobal, exportEffectifGlobal } from "../api/simulateur";
import EsignLayout from "../components/EsignLayout";
import {
  Calculator,
  BarChart2,
  Download,
  Settings,
  FileText,
  Clock,
  Play,
  Users,
  LayoutGrid,
  ArrowLeftRight,
  Check,
  Activity,
  ChevronLeft
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Utilitaires de formatage
const fmtVol = (n) => {
  if (n === "" || n === null || n === undefined) return "—";
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
};

const fmtNb = (n) => {
  if (n === "" || n === null || n === undefined) return "—";
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function EffectifGlobalPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    sacs_jour: 50,
    dossiers_mois: 6500,
    productivite_pct: 100,
  });
  const [outputs, setOutputs] = useState({
    dossiers_jour: "",
    heures_net_jour: "",
  });
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [status, setStatus] = useState("");
  const [showGraph, setShowGraph] = useState(false);
  const [loading, setLoading] = useState(false);
  const chartInstanceRef = useRef(null);

  const handleInputChange = (e) => {
    setValues((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const simulate = async () => {
    setStatus("");
    setLoading(true);
    try {
      const data = await simulerEffectifGlobal(values);
      setOutputs({
        dossiers_jour: data.dossiers_jour,
        heures_net_jour: data.heures_net_jour,
      });
      setRows(data.rows || []);
      setTotals(data.totaux || null);
      setStatus("");
    } catch (e) {
      console.error(e);
      setStatus("Erreur lors de la simulation.");
    } finally {
      setLoading(false);
    }
  };

  const resetSimulation = () => {
    setTotals(null);
    setRows([]);
  };

  const doExport = async () => {
    if (!rows.length) return;
    try {
      const queryParams = new URLSearchParams(values).toString();
      const exportUrl = `http://localhost:8001/api/effectif-global/export?${queryParams}`;
      window.location.href = exportUrl;
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'export Excel");
    }
  };

  const exportGraphPng = () => {
    const chartElement = chartInstanceRef.current;
    if (!chartElement) return;
    try {
      const imageUrl = chartElement.toBase64Image("image/png", 1);
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = "effectif_global_graph.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erreur export PNG graphique", error);
      alert("Impossible d'exporter le graphique en PNG.");
    }
  };

  return (
    <EsignLayout activeKey="Simulation Globale">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-500">

        {/* Premium Header */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-20 -mt-20 opacity-70" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center flex-col md:flex-row gap-3 text-center md:text-left">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 relative">
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-3">
                  Simulation Globale
                </h1>
                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                  Vision consolidée des effectifs pour l'ensemble des positions.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/comparatif-effectifs")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm text-[11px] group"
            >
              <ArrowLeftRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
              Comparatif Effectif
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="relative py-2">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 rounded-full z-0" />
          {/* Active Line Progress */}
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 rounded-full z-0 transition-all duration-700 ease-out"
            style={{ width: totals ? '100%' : '0%' }}
          />

          <div className="relative z-10 flex justify-between max-w-sm mx-auto w-full">
            {/* Step 1 */}
            <div className={`flex flex-col items-center gap-2 transition-transform duration-300 ${!totals ? 'scale-105 cursor-pointer' : 'scale-95 opacity-80 cursor-pointer hover:opacity-100 group'}`} onClick={totals ? resetSimulation : undefined}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-colors duration-500 ${!totals ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-100' : 'bg-[#005EA8] text-white shadow-blue-500/25 ring-2 ring-blue-50 group-hover:bg-blue-600'}`}>
                {!totals ? <Settings size={18} /> : (
                  <div className="relative">
                    <Check size={18} className="stroke-[3] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 group-hover:opacity-0" />
                    <Settings size={18} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                1. Paramètres
              </span>
            </div>

            {/* Step 2 */}
            <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${totals ? 'scale-110 opacity-100' : 'scale-95 opacity-40 grayscale'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-colors duration-500 ${totals ? 'bg-green-600 text-white shadow-green-500/25 ring-2 ring-green-100' : 'bg-slate-100 text-slate-400'}`}>
                <Activity size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                2. Résultats
              </span>
            </div>
          </div>
        </div>

        {/* Configuration Card - Single Row Layout */}
        {!totals && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden ring-1 ring-slate-900/5 transition-all duration-500 mb-6 animate-in slide-in-from-top-4 fade-in fill-mode-backwards">
            <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Paramètres de Simulation</h2>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Input: Sacs/Jour */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 whitespace-nowrap text-center block">Sacs / Jour</label>
                <input
                  type="number"
                  name="sacs_jour"
                  value={values.sacs_jour}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner h-[34px] text-center"
                />
              </div>

              {/* Input: Dossiers/Mois */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 whitespace-nowrap text-center block">Dossiers / Mois</label>
                <input
                  type="number"
                  name="dossiers_mois"
                  value={values.dossiers_mois}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner h-[34px] text-center"
                />
              </div>

              {/* Input: Productivité */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 whitespace-nowrap text-center block">Productivité (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="productivite_pct"
                    value={values.productivite_pct}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner h-[34px] text-center pr-6"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">%</span>
                </div>
              </div>

              {/* Readonly: Calculated inputs */}
              <div className="space-y-1 opacity-75">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center justify-center gap-1 whitespace-nowrap">
                  <FileText size={10} /> Dossiers / Jour
                </label>
                <div className="w-full px-3 py-2 bg-slate-100 border border-transparent rounded-lg text-xs font-bold text-slate-600 shadow-none h-[34px] flex items-center justify-center truncate">
                  {fmtVol(outputs.dossiers_jour)}
                </div>
              </div>

              <div className="space-y-1 opacity-75">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center justify-center gap-1 whitespace-nowrap">
                  <Clock size={10} /> Heures / Jour
                </label>
                <div className="w-full px-3 py-2 bg-slate-100 border border-transparent rounded-lg text-xs font-bold text-slate-600 shadow-none h-[34px] flex items-center justify-center truncate">
                  {fmtNb(outputs.heures_net_jour)}
                </div>
              </div>
            </div>

            {/* Actions Footer - Compact */}
            <div className="bg-slate-50/80 px-4 py-2 flex items-center justify-end border-t border-slate-100 gap-3 backdrop-blur-sm">
              {status && (
                <div className="flex items-center gap-1.5 text-red-600 bg-red-50 pl-2 pr-3 py-1.5 rounded-md border border-red-100 animate-in fade-in slide-in-from-right-4">
                  <div className="w-1 h-1 rounded-full bg-red-500" />
                  <span className="text-[10px] font-semibold">{status}</span>
                </div>
              )}

              <button
                onClick={simulate}
                disabled={loading}
                className="group relative inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                {loading ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-white" />
                )}
                <span className="relative">{loading ? 'Calcul...' : 'Lancer'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Results Grid (Conditional) */}
        {totals && (
          <div className="space-y-6">
            {/* Back Button & Tools */}
            <div className="flex justify-between items-center animate-in fade-in slide-in-from-left-4 duration-300">
              <button
                onClick={resetSimulation}
                className="group flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm hover:translate-x-[-2px]"
              >
                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Retour Paramètres
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowGraph(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Mode Graphique
                </button>
                <button
                  onClick={doExport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-500/20 border border-emerald-500 hover:border-emerald-600"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exporter Excel
                </button>
              </div>
            </div>

            {/* Card 2: Résultats */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-visible ring-1 ring-blue-500/10 relative animate-in slide-in-from-bottom-8 fade-in duration-700 ease-out fill-mode-backwards">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 z-30" />
              <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                    <Users size={14} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Résultats par Position</h3>
                </div>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wide rounded border border-green-100 flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                  Calculé
                </span>
              </div>

              <div className="flex-1 bg-white">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-10 text-[10px] font-bold text-slate-500 uppercase tracking-wider shadow-sm">
                    <tr>
                      <th className="px-4 py-2 border-b border-slate-100">Position</th>
                      <th className="px-4 py-2 text-right border-b border-slate-100">Heures</th>
                      <th className="px-4 py-2 text-right border-b border-slate-100">Besoin Effectifs</th>
                      <th className="px-4 py-2 text-right border-b border-slate-100">Arrondi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {rows.map((r, idx) => (
                      <tr key={idx} className={`group transition-colors ${r.fte > 0 ? "bg-blue-50/20 hover:bg-blue-50/40" : "hover:bg-slate-50"}`}>
                        <td className="px-4 py-2 font-medium text-slate-700">{r.position}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600">{fmtNb(r.heures)}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600">{fmtNb(r.fte)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-mono font-bold text-blue-600">{r.fte_arrondi}</span>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 text-xs">Aucun résultat</td>
                      </tr>
                    )}
                    {/* Ligne TOTAL */}
                    {totals && (
                      <tr className="bg-blue-50/80 border-t-2 border-blue-100 text-blue-900 font-black sticky bottom-0 backdrop-blur-md">
                        <td className="px-4 py-3 text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          TOTAL GÉNÉRAL
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{fmtNb(totals.total_heures)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-blue-700">{fmtNb(totals.total_fte)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-blue-800">
                          {totals.total_fte_arrondi}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Graph Modal */}
      {showGraph && rows.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-white/20 animate-in zoom-in-95 duration-300"
          >
            <div className="flex flex-col items-center gap-4 px-6 py-4 border-b border-slate-100 bg-white md:flex-row md:justify-between md:items-center">
              <div className="flex-1 min-w-[220px] text-center md:text-left">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2.5 justify-center md:justify-start">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <BarChart2 size={18} />
                  </div>
                  Analyse des Effectifs par Position
                </h2>
                <div className="mt-1 flex flex-col items-center gap-2 text-[11px] text-slate-500 uppercase tracking-[0.3em] md:flex-row md:gap-4">
                  <span>Paramètres de simulation</span>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-sm">
                      Sacs/Jour : <span className="text-blue-600">{fmtVol(values.sacs_jour)}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-sm">
                      Dossiers/Mois : <span className="text-blue-600">{fmtVol(values.dossiers_mois)}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-sm">
                      Productivité : <span className="text-blue-600">{values.productivite_pct}%</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportGraphPng}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                >
                  Exporter PNG
                </button>
                <button
                  onClick={() => setShowGraph(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                >
                  Fermer
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 bg-slate-50/50 min-h-[400px] overflow-y-auto">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full h-[400px]">
                <Bar
                  ref={chartInstanceRef}
                  data={{
                    labels: [...rows.map(r => r.position), "TOTAL"],
                    datasets: [
                      {
                        label: "Effectif Requis",
                        data: [...rows.map(r => r.fte_arrondi), totals?.total_fte_arrondi || 0],
                        backgroundColor: (ctx) => {
                          if (ctx.dataIndex === rows.length) return "#1e40af"; // Total color (Darker blue)
                          return "#3b82f6";
                        },
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: "#1e293b",
                        padding: 12,
                        titleFont: { size: 12, family: "'Inter', sans-serif" },
                        bodyFont: { size: 12, family: "'Inter', sans-serif" },
                        cornerRadius: 8,
                        displayColors: false,
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: "#f1f5f9" },
                        ticks: { font: { size: 10 }, color: "#64748b" },
                      },
                      x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 }, color: "#64748b", maxRotation: 45, minRotation: 45 },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </EsignLayout>
  );
}
