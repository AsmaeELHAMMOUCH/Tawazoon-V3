import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import {
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Chart as ChartJS,
} from "chart.js";
import {
  LayoutGrid,
  BarChart2,
  ArrowLeft,
  Settings,
  Activity,
  Users,
  Download,
  ChevronLeft,
  Play,
} from "lucide-react";
import { simulerComparaison, exportComparaisonXlsx } from "../api/comparaison";
import EsignLayout from "./EsignLayout";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const fmtVol = (value) => {
  if (value === "" || value === null || value === undefined) return "—";
  return Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
};

const fmtDecimal = (value) => {
  if (value === "" || value === null || value === undefined) return "—";
  return Number(value).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ComparaisonEffectifPage() {
  const navigate = useNavigate();
  const [inputs, setInputs] = useState({
    sacs_jour: 50,
    dossiers_mois: 6500,
    productivite_pct: 100,
  });
  const [outputs, setOutputs] = useState({
    dossiers_jour: "",
    heures_net_jour: "",
  });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const chartRef = useRef(null);

  const buildPayload = () => ({
    sacs_jour: Number(inputs.sacs_jour || 0),
    dossiers_mois: Number(inputs.dossiers_mois || 0),
    productivite_pct: Number(inputs.productivite_pct || 0),
  });

  const handleChange = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const lancerSimulation = async () => {
    setLoading(true);
    setStatus("");
    try {
      const payload = buildPayload();
      const data = await simulerComparaison(payload);
      setOutputs({ dossiers_jour: data.dossiers_jour, heures_net_jour: data.heures_net_jour });
      setRows(data.rows || []);
      setTotal(data.total || null);
      setShowGraph(false);
      if (!data.rows?.length) {
        setStatus("Simulation effectuée mais aucune ligne n'a été retournée.");
      }
    } catch (error) {
      console.error(error);
      setRows([]);
      setTotal(null);
      setStatus(error.response?.data?.detail || error.message || "Erreur lors de la simulation.");
    } finally {
      setLoading(false);
    }
  };

  const resetSimulation = () => {
    setTotal(null);
    setRows([]);
    setStatus("");
  };

  const handleExport = async () => {
    if (!rows.length) {
      setStatus("Aucune donnée à exporter.");
      return;
    }
    try {
      const payload = buildPayload();
      const res = await exportComparaisonXlsx(payload);
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "comparaison_effectif.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Le fichier Excel a été téléchargé.");
    } catch (error) {
      console.error(error);
      setStatus("Erreur lors de l'export Excel.");
    }
  };

  const handleGraph = () => {
    if (!rows.length) {
      setStatus("Aucune donnée à afficher.");
      return;
    }
    setShowGraph(true);
  };

  const graphData = useMemo(() => {
    if (!rows.length) return { labels: [], datasets: [] };
    const labels = rows.map((row) => row.position);
    const needs = rows.map((row) => row.fte_arrondi);
    const actual = rows.map((row) => row.effectif_actuel);
    if (total) {
      labels.push("TOTAL");
      needs.push(total.fte_arrondi);
      actual.push(total.effectif_actuel);
    }
    return {
      labels,
      datasets: [
        { label: "Besoin Effectifs (arrondi)", data: needs, backgroundColor: "#1e3a8a", borderRadius: 6 },
        { label: "Effectif Actuel", data: actual, backgroundColor: "#2563eb", borderRadius: 6 },
      ],
    };
  }, [rows, total]);

  const downloadPng = () => {
    if (!chartRef.current) return;
    try {
      const link = document.createElement("a");
      link.download = "comparaison-effectif.png";
      link.href = chartRef.current.toBase64Image();
      link.click();
      setStatus("Graphique exporté en PNG.");
    } catch (error) {
      console.error("Erreur export PNG", error);
      setStatus("Impossible d'exporter le graphique en PNG.");
    }
  };

  return (
    <EsignLayout activeKey="Comparatif Positions">
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
                  Comparatif Effectif
                </h1>
                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                  Analysez rapidement la différence entre vos effectifs actuels et ceux calculés.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/app/effectif-global")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm text-xs group"
              >
                <ArrowLeft size={14} className="text-slate-400 group-hover:text-blue-600" />
                Simulation Globale
              </button>
            </div>
          </div>
        </div>

        <div className="relative py-2">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 rounded-full" />
          <div className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 rounded-full transition-all duration-700 ease-out" style={{ width: total ? "100%" : "33%" }} />
          <div className="relative z-10 flex justify-between max-w-sm mx-auto w-full">
            <div
              className={`flex flex-col items-center gap-2 transition-transform duration-300 ${!total ? "scale-105" : "scale-95 opacity-70"}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-colors duration-500 ${!total ? "bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-100" : "bg-slate-100 text-slate-400"}`}>
                <Settings size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                1. Paramètres
              </span>
            </div>
            <div
              className={`flex flex-col items-center gap-2 transition-all duration-500 ${total ? "scale-110 opacity-100" : "scale-95 opacity-40 grayscale"}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-colors duration-500 ${total ? "bg-green-500 text-white shadow-green-500/25 ring-2 ring-green-100" : "bg-slate-100 text-slate-400"}`}>
                <Activity size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                2. Résultats
              </span>
            </div>
          </div>
        </div>

        {!total && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden ring-1 ring-slate-900/5 transition-all duration-500">
            <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Paramètres de simulation</h2>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Field label="Sacs / jour" name="sacs_jour" value={inputs.sacs_jour} onChange={handleChange} />
              <Field label="Dossiers / mois" name="dossiers_mois" value={inputs.dossiers_mois} onChange={handleChange} />
              <Field label="Productivité (%)" name="productivite_pct" value={inputs.productivite_pct} onChange={handleChange} suffix="%" />
              <Stat label="Dossiers / jour" value={fmtVol(outputs.dossiers_jour)} />
              <Stat label="Heures net / jour" value={fmtDecimal(outputs.heures_net_jour)} />
            </div>

            <div className="bg-slate-50/80 px-4 py-2 flex items-center justify-end border-t border-slate-100 gap-3 backdrop-blur-sm">
              <button
                onClick={lancerSimulation}
                disabled={loading}
                className="group relative inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                {loading ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-white" />
                )}
                <span className="relative">{loading ? "Calcul..." : "Lancer"}</span>
              </button>
            </div>
          </div>
        )}

        {total && (
          <div className="space-y-6">
            <div className="flex justify-between items-center animate-in fade-in slide-in-from-left-4 duration-300">
              <button
                onClick={resetSimulation}
                className="group flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm hover:translate-x-[-2px]"
              >
                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Retour aux paramètres
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleGraph}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Mode graphique
                </button>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-500/20 border border-emerald-500 hover:border-emerald-600"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exporter Excel
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-slate-200 flex flex-col min-h-[520px] overflow-visible ring-1 ring-blue-500/10 relative animate-in slide-in-from-bottom-8 fade-in duration-700 ease-out fill-mode-backwards">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 z-30" />
              <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                    <Users size={14} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Résultats par position</h3>
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
                      <th className="px-4 py-2 text-right border-b border-slate-100">Effectif actuel</th>
                      <th className="px-4 py-2 text-right border-b border-slate-100">FTE calculé</th>
                      <th className="px-4 py-2 text-right border-b border-slate-100">Arrondi</th>
                      <th className="px-4 py-2 text-right border-b border-slate-100">Écart (FTE)</th>
                      <th className="px-4 py-2 text-right border-b border-slate-100">Écart arrondi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {rows.map((row, idx) => (
                      <tr key={idx} className={`group transition-colors ${row.fte_arrondi > 0 ? "bg-blue-50/20 hover:bg-blue-50/40" : "hover:bg-slate-50"}`}>
                        <td className="px-4 py-2 font-medium text-slate-700">{row.position}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600">{fmtVol(row.effectif_actuel)}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600">{fmtDecimal(row.fte_calcule)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-mono font-bold text-blue-600">{row.fte_arrondi}</span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600">{fmtDecimal(row.ecart_fte)}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-700">{row.ecart_arrondi}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">Aucun résultat</td>
                      </tr>
                    )}
                    {/* Ligne TOTAL */}
                    {total && (
                      <tr className="bg-blue-50/80 border-t-2 border-blue-100 text-blue-900 font-black sticky bottom-0 backdrop-blur-md">
                        <td className="px-4 py-3 text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          TOTAL GÉNÉRAL
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{fmtVol(total.effectif_actuel)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{fmtDecimal(total.fte_calcule)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-blue-700">{total.fte_arrondi}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{fmtDecimal(total.ecart_fte)}</td>
                        <td className={`px-4 py-3 text-right font-mono text-sm ${total.ecart_arrondi < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {total.ecart_arrondi >= 0 ? `+${total.ecart_arrondi}` : total.ecart_arrondi}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {status && (
          <div className="text-sm text-slate-600 bg-white/80 border border-slate-200 rounded-2xl py-3 px-4 shadow-sm">
            {status}
          </div>
        )}
      </div>

      {showGraph && rows.length > 0 && (
        <GraphModal ref={chartRef} data={graphData} inputs={inputs} onClose={() => setShowGraph(false)} onExport={downloadPng} />
      )}
    </EsignLayout>
  );
}

const GraphModal = React.forwardRef(({ data, inputs, onClose, onExport }, ref) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-white/20 animate-in zoom-in-95 duration-300">
      <div className="flex flex-col items-center gap-4 px-6 py-4 border-b border-slate-100 bg-white md:flex-row md:justify-between md:items-center">
        <div className="flex-1 min-w-[220px] text-center">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <BarChart2 size={18} />
            </div>
            Analyse graphique
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 uppercase tracking-[0.3em] md:flex-nowrap md:gap-3">
            <span className="whitespace-nowrap">Comparatif des effectifs</span>
            <div className="flex flex-wrap items-center gap-2 justify-center md:flex-nowrap">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-700 shadow-sm">
                Sacs/Jour : <span className="text-blue-600">{fmtVol(inputs.sacs_jour)}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-700 shadow-sm">
                Dossiers/Mois : <span className="text-blue-600">{fmtVol(inputs.dossiers_mois)}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-700 shadow-sm">
                Productivité : <span className="text-blue-600">{inputs.productivite_pct}%</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExport}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
          >
            Exporter PNG
          </button>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
          >
            Fermer
          </button>
        </div>
      </div>
      <div className="flex-1 p-6 bg-slate-50/40">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full h-[420px]">
          <Bar
            ref={ref}
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: "top" },
                tooltip: {
                  backgroundColor: "#0f172a",
                  padding: 12,
                  cornerRadius: 10,
                  displayColors: false,
                  titleFont: { size: 12 },
                  bodyFont: { size: 12 },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: "#e2e8f0" },
                  ticks: { font: { size: 10 } },
                },
                x: {
                  grid: { display: false },
                  ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  </div>
));

function Field({ label, name, value, onChange, suffix = "" }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 block text-center">{label}</label>
      <div className="relative">
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner h-[34px] text-center"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="space-y-1 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">{label}</p>
      <p className="text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}
