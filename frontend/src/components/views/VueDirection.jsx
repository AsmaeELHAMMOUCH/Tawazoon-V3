/**
 * VueDirection
 * ---------------------
 * Page de pilotage Direction (niveau macro)
 * Design "Pro & Clean" - Tawazoon RH
 */
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useDirectionData } from "../../hooks/useDirectionData";
import { useSimulation } from "../../context/SimulationContext";
import {
  Building2, Settings2, Play, AlertTriangle,
  FileText, RefreshCw, LayoutDashboard, ChevronDown
} from "lucide-react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

// Components
import IndicateursDirection from "../direction/IndicateursDirection";
import DirectionVolumesCard from "../direction/DirectionVolumesCard";
import DirectionCentresTable from "../direction/DirectionCentresTable";
import DirectionDonutsRow from "../direction/DirectionDonutsRow";
import DirectionConsolideTable from "../direction/DirectionConsolideTable";
import DirectionPostesModal from "../direction/DirectionPostesModal";
import { normalizePoste, fmt } from "../../utils/formatters";

// ---------- Helpers ----------
const toNumber = (v, fallback = 0) => {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
};

const normKey = (k) => String(k || "").toLowerCase().trim();

// --- Internal Components ---

const ParamInput = ({ label, value, onChange, placeholder, suffix }) => (
  <div className="flex flex-col">
    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</span>
    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-[#005EA8]/20 focus-within:border-[#005EA8] transition-all">
      <input
        type="number"
        className="w-10 text-[11px] font-bold text-slate-700 bg-transparent outline-none text-center"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {suffix && <span className="text-[10px] text-slate-400 ml-1 font-medium">{suffix}</span>}
    </div>
  </div>
);

export default function VueDirection({ api }) {
  // 1. Data Hook
  const {
    directions,
    selectedDirection,
    centres,
    consolidation,
    loading,
    error,
    actions
  } = useDirectionData(api);

  // 2. Global Param State
  const [params, setParams] = useState({
    productivite: 100,
    heuresParJour: 8,
    idleMinutes: 0
  });

  // 3. Local State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [centrePostes, setCentrePostes] = useState([]);
  const [loadingPostes, setLoadingPostes] = useState(false);
  const initializedRef = useRef(false);

  // Persistence State
  const [lastVolumes, setLastVolumes] = useState([]);
  const [simMode, setSimMode] = useState("database");

  // 4. Handlers
  const handleSelectDirection = (id) => {
    actions.selectDirection(id);
    initializedRef.current = false;
    setLastVolumes([]);
    setSimMode("database");
  };

  const runSim = async (modeOverride = null, volumesOverride = null) => {
    if (!selectedDirection) return;

    const activeMode = modeOverride || simMode;
    const activeVolumes = volumesOverride || lastVolumes;

    setSimMode(activeMode);
    if (volumesOverride) setLastVolumes(activeVolumes);

    const payload = {
      direction_id: Number(selectedDirection),
      mode: activeMode,
      global_params: {
        productivite: toNumber(params.productivite, 100),
        heures_par_jour: toNumber(params.heuresParJour, 7.5),
        idle_minutes: toNumber(params.idleMinutes, 0)
      },
      volumes: activeVolumes
    };

    await actions.runSimulation(payload);
  };

  // Reset init flag
  useEffect(() => {
    initializedRef.current = false;
  }, [selectedDirection]);

  // Auto-Simulate (Database)
  useEffect(() => {
    if (selectedDirection && !loading.centres && !initializedRef.current) {
      runSim("database", []);
      initializedRef.current = true;
    }
  }, [selectedDirection, loading.centres]);

  // Auto-calc hours based on Prod change (User Request: "Calculé depuis productivité")
  useEffect(() => {
    // Classic rule: H = 8 * (Prod / 100)
    const h = (8 * (parseFloat(params.productivite) || 0) / 100);
    setParams(prev => ({ ...prev, heuresParJour: parseFloat(h.toFixed(2)) }));
  }, [params.productivite]);

  const handleManualSimulate = async (importedData) => {
    if (!selectedDirection) {
      alert("Sélectionnez d'abord une Direction.");
      return;
    }

    const volumes = Array.isArray(importedData)
      ? importedData.map((row) => {
        const v = {
          centre_id: undefined, centre_label: undefined,
          sacs: 0, colis: 0, courrier_ordinaire: 0, courrier_recommande: 0,
          ebarkia: 0, lrh: 0, amana: 0
        };
        Object.keys(row || {}).forEach((k) => {
          const key = normKey(k);
          const val = row[k];
          if (key.includes("nom") && key.includes("centre")) { v.centre_label = String(val ?? "").trim(); return; }
          if (key === "id" || key === "centre_id") { v.centre_id = toNumber(val, undefined); return; }
          if (key.includes("sac")) v.sacs = toNumber(val, 0);
          else if (key.includes("colis") && !key.includes("amana")) v.colis = toNumber(val, 0);
          else if (key.includes("ordinaire")) v.courrier_ordinaire = toNumber(val, 0);
          else if (key.includes("recommande")) v.courrier_recommande = toNumber(val, 0);
          else if (key.includes("ebarkia")) v.ebarkia = toNumber(val, 0);
          else if (key.includes("lrh")) v.lrh = toNumber(val, 0);
          else if (key.includes("amana")) v.amana = toNumber(val, 0);
        });
        if (!v.centre_label && row?.label) v.centre_label = String(row.label).trim();
        return v;
      })
      : [];

    await runSim("actuel", volumes);
    initializedRef.current = true;
  };

  const openDetail = async (centre) => {
    setSelectedCentre(centre);
    setDetailModalOpen(true);
    setCentrePostes([]);
    setLoadingPostes(true);
    try {
      if (typeof api.postesByCentre === "function") {
        const res = await api.postesByCentre(centre.id);
        setCentrePostes((Array.isArray(res) ? res : []).map(normalizePoste));
      }
    } catch (err) {
      console.error("Error fetching postes", err);
    } finally {
      setLoadingPostes(false);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("official-report-area");
    if (!element) return;
    const originalPos = element.style.position;
    const originalZ = element.style.zIndex;
    try {
      element.style.position = "absolute";
      element.style.zIndex = "99999";
      element.style.top = "0px";
      const imgData = await toPng(element, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: true });
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`Rapport_Direction_${selectedDirection || "Sim"}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      // alert("Erreur export PDF.");
    } finally {
      element.style.position = originalPos;
      element.style.zIndex = originalZ;
    }
  };

  // KPIs
  const backendKPIs = consolidation?.kpis || {};
  const kpis = {
    centers: backendKPIs.nb_centres || (centres ? centres.length : 0),
    fte: backendKPIs.etp_actuel || (centres ? centres.reduce((a, b) => a + (b.fte_actuel || 0), 0) : 0),
    etp: backendKPIs.etp_calcule || (centres ? centres.reduce((a, b) => a + (b.etp_calcule || 0), 0) : 0),
    delta: backendKPIs.ecart_global || (centres ? centres.reduce((a, b) => a + (b.ecart || 0), 0) : 0)
  };
  const currentDirLabel = directions.find(d => String(d.id) === String(selectedDirection))?.label;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-8 font-sans animate-in fade-in duration-300">

      {/* 1. PROFESSIONAL HEADER */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-2">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Left: Brand & Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#005EA8] text-white p-1.5 rounded-lg shadow-sm">
                <LayoutDashboard size={18} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Pilotage Dimensionnement</h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">VUE DIRECTION</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

            <div className="relative group">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-[#005EA8] transition-colors" size={14} />
              <select
                className="pl-8 pr-8 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-white border border-slate-200 hover:border-[#005EA8] rounded-lg outline-none cursor-pointer min-w-[240px] appearance-none transition-all shadow-sm focus:ring-2 focus:ring-[#005EA8]/20"
                value={selectedDirection || ""}
                onChange={(e) => handleSelectDirection(e.target.value)}
                disabled={loading.dirs}
              >
                <option value="">-- Sélectionner une Direction --</option>
                {directions.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
            </div>
          </div>

          {/* Right: Params & Actions */}
          {selectedDirection && (
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                <ParamInput
                  label="Productivité"
                  value={params.productivite}
                  onChange={v => setParams(p => ({ ...p, productivite: v }))}
                  suffix="%"
                />
                <div className="w-px h-6 bg-slate-100"></div>
                <ParamInput
                  label="H. Travail/j"
                  value={params.heuresParJour}
                  onChange={v => setParams(p => ({ ...p, heuresParJour: v }))}
                  suffix="h"
                />
                <div className="w-px h-6 bg-slate-100"></div>
                <ParamInput
                  label="T. Attente"
                  value={params.idleMinutes}
                  onChange={v => setParams(p => ({ ...p, idleMinutes: v }))}
                  suffix="min"
                />
                <button
                  onClick={() => runSim()}
                  className="ml-2 p-1.5 bg-blue-50 text-[#005EA8] rounded-lg hover:bg-[#005EA8] hover:text-white transition-all active:scale-95"
                  title="Relancer la simulation"
                >
                  <RefreshCw size={14} className={loading.sim ? "animate-spin" : ""} />
                </button>
              </div>

              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 bg-[#005EA8] hover:bg-[#004e8a] text-white px-3 py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-900/10 transition-all active:scale-95"
              >
                <FileText size={14} />
                <span className="hidden sm:inline">Exporter PDF</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="max-w-[1600px] mx-auto p-4 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div id="dashboard-screen">
          {selectedDirection ? (
            <div className="space-y-4">

              {/* KPIs Row */}
              <div className="mb-2">
                <IndicateursDirection
                  currentDir={{ label: currentDirLabel || "Direction" }}
                  kpis={kpis}
                  fmt={fmt}
                />
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

                {/* Left Column: MAIN TABLE (66%) */}
                <div className="xl:col-span-8 flex flex-col gap-4">
                  {kpis.etp === 0 && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl flex items-start gap-3 shadow-sm">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-bold">Données insuffisantes</p>
                        <span className="opacity-90">
                          L'ETP Calculé est de 0. Veuillez importer un fichier de volumes pour générer une simulation pertinente.
                        </span>
                      </div>
                    </div>
                  )}

                  <DirectionCentresTable
                    centres={centres}
                    loading={loading.centres || loading.sim}
                    onOpenDetail={openDetail}
                  />

                  {consolidation.rows && consolidation.rows.length > 0 && (
                    <DirectionConsolideTable
                      rows={consolidation.rows}
                      totals={consolidation.totals}
                      loading={loading.consolide}
                    />
                  )}
                </div>

                {/* Right Column: TOOLS & CHARTS (33%) */}
                <div className="xl:col-span-4 space-y-4">
                  {/* Imports Card */}
                  <div className="h-auto">
                    <DirectionVolumesCard onSimulate={handleManualSimulate} loading={loading.sim} />
                  </div>

                  {/* Charts */}
                  <DirectionDonutsRow centres={centres} charts={consolidation.charts} />
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
              <div className="bg-white p-6 rounded-full shadow-lg mb-4 border border-slate-100">
                <Building2 size={48} className="text-[#005EA8]/40" />
              </div>
              <h2 className="text-lg font-bold text-slate-700">Aucune Direction sélectionnée</h2>
              <p className="text-sm text-slate-500 mt-2 max-w-sm text-center">
                Utilisez le sélecteur ci-dessus pour choisir un périmètre et afficher le tableau de bord.
              </p>
            </div>
          )}
        </div>

        {/* --- HIDDEN REPORT AREA --- */}
        {selectedDirection && (
          <div
            id="official-report-area"
            className="fixed top-0 left-0 -z-50 w-[210mm] bg-white text-slate-900 p-[10mm] shadow-none"
            style={{
              minHeight: '297mm', fontFamily: 'Arial, sans-serif', visibility: 'visible',
            }}
          >
            {/* Header Report */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-8">
              <img src="/BaridLogo.png" alt="Barid Al Maghrib" className="h-12 object-contain" />
              <div className="text-center">
                <h1 className="text-2xl font-bold uppercase tracking-widest text-[#005EA8]">Rapport de Simulation</h1>
                <h2 className="text-lg font-semibold text-slate-600 mt-1">{currentDirLabel || "Direction"}</h2>
                <p className="text-xs text-slate-400 mt-1">Généré le {new Date().toLocaleDateString()} à {new Date().toLocaleTimeString()}</p>
              </div>
              <img src="/almav.png" alt="Almav" className="h-10 object-contain" />
            </div>

            {/* Params Report */}
            <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Paramètres de Simulation</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col"><span className="text-slate-400 text-xs">Productivité</span><span className="font-bold">{params.productivite}%</span></div>
                <div className="flex flex-col"><span className="text-slate-400 text-xs">Temps de travail</span><span className="font-bold">{params.heuresParJour} h/j</span></div>
                <div className="flex flex-col"><span className="text-slate-400 text-xs">Temps d'attente</span><span className="font-bold">{params.idleMinutes} min</span></div>
              </div>
            </div>

            {/* KPIs Report */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-[#005EA8] text-white p-4 rounded-lg text-center"><div className="text-2xl font-bold">{kpis.centers}</div><div className="text-[10px] uppercase opacity-80">Centres</div></div>
              <div className="bg-slate-100 p-4 rounded-lg text-center border border-slate-200"><div className="text-2xl font-bold text-slate-700">{fmt(kpis.fte)}</div><div className="text-[10px] uppercase text-slate-500">ETP Actuel</div></div>
              <div className="bg-slate-100 p-4 rounded-lg text-center border border-slate-200"><div className="text-2xl font-bold text-slate-700">{fmt(kpis.etp)}</div><div className="text-[10px] uppercase text-slate-500">ETP Cible</div></div>
              <div className={`p-4 rounded-lg text-center border ${kpis.delta > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}><div className="text-2xl font-bold">{kpis.delta > 0 ? '+' : ''}{fmt(kpis.delta)}</div><div className="text-[10px] uppercase opacity-80">Écart</div></div>
            </div>

            {/* Tables Report */}
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-bold border-l-4 border-[#005EA8] pl-2 mb-4 text-slate-800">Détail par Centre</h3>
                <table className="w-full text-xs text-left border-collapse">
                  <thead><tr className="bg-slate-100 text-slate-600 uppercase border-b border-slate-300"><th className="p-2">Centre</th><th className="p-2">Catégorie</th><th className="p-2 text-right">Actuel</th><th className="p-2 text-right">Cible</th><th className="p-2 text-right">Écart</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {centres.map((c, idx) => (
                      <tr key={c.centre_id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2 font-medium">{c.label || c.centre_label}</td><td className="p-2 text-slate-500">{c.categorie}</td><td className="p-2 text-right">{fmt(c.etp_actuel)}</td><td className="p-2 text-right font-bold">{fmt(c.etp_calcule)}</td>
                        <td className={`p-2 text-right font-bold ${c.ecart > 0 ? 'text-red-600' : c.ecart < 0 ? 'text-green-600' : 'text-slate-400'}`}>{c.ecart > 0 ? '+' : ''}{fmt(c.ecart)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="absolute bottom-10 left-0 w-full text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4">Document généré automatiquement par la plateforme Tawazoon RH - Confidentiel</div>
          </div>
        )}

        <DirectionPostesModal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          centre={selectedCentre}
          postes={centrePostes}
        />
      </main>
    </div>
  );
}
