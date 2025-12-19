/**
 * VueDirection
 * ---------------------
 * Page de pilotage Direction (niveau macro)
 * - Version "Pro" & Refondue
 */
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useDirectionData } from "../../hooks/useDirectionData";
import { useSimulation } from "../../context/SimulationContext";
import {
  Building2, Settings2, Play, AlertTriangle,
  FileText, BarChart3
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

  // 2. Local State
  const [params, setParams] = useState({
    productivite: 100,
    heuresParJour: 8,
    idleMinutes: 0
  });

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [centrePostes, setCentrePostes] = useState([]);
  const [loadingPostes, setLoadingPostes] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const initializedRef = useRef(false);

  // Persistence State
  const [lastVolumes, setLastVolumes] = useState([]);
  const [simMode, setSimMode] = useState("database");

  // 3. Handlers
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

  useEffect(() => {
    if (selectedDirection && !loading.centres && !initializedRef.current) {
      runSim("database", []);
      initializedRef.current = true;
    }
  }, [selectedDirection, loading.centres]);

  useEffect(() => {
    setParams(prev => ({
      ...prev,
      heuresParJour: parseFloat((8 * (prev.productivite / 100)).toFixed(2))
    }));
  }, [params.productivite]);

  const handleManualSimulate = async (importedData) => {
    if (!selectedDirection) {
      alert("Veuillez sélectionner une Direction d'abord.");
      return;
    }

    const volumes = Array.isArray(importedData)
      ? importedData.map((row) => {
        const v = {
          centre_id: undefined,
          centre_label: undefined,
          sacs: 0,
          colis: 0,
          courrier_ordinaire: 0,
          courrier_recommande: 0,
          ebarkia: 0,
          lrh: 0,
          amana: 0
        };

        Object.keys(row || {}).forEach((k) => {
          const key = normKey(k);
          const val = row[k];

          if (
            key.includes("nom du centre") ||
            (key.includes("nom") && key.includes("centre")) ||
            key.includes("centre") ||
            (key.includes("site") && !key.includes("intensite"))
          ) {
            v.centre_label = String(val ?? "").trim();
            return;
          }

          if (key === "id" || key === "centre_id" || key.includes("code")) {
            v.centre_id = toNumber(val, undefined);
            return;
          }

          if (key.includes("sac")) v.sacs = toNumber(val, 0);
          else if (key.includes("colis") && !key.includes("amana") && !key.includes("sac")) v.colis = toNumber(val, 0);
          else if (key.includes("ordinaire")) v.courrier_ordinaire = toNumber(val, 0);
          else if (key.includes("recommande")) v.courrier_recommande = toNumber(val, 0);
          else if (key.includes("ebarkia")) v.ebarkia = toNumber(val, 0);
          else if (key.includes("lrh") || key.includes("24")) v.lrh = toNumber(val, 0);
          else if (key.includes("colis_amana") && key.includes("sac")) v.colis_amana_par_sac = toNumber(val, null);
          else if (key.includes("amana")) v.amana = toNumber(val, 0);
          else if (key.includes("courrier") && key.includes("sac")) v.courriers_par_sac = toNumber(val, null);
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
      const imgData = await toPng(element, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' });
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
      alert("Erreur export PDF.");
    } finally {
      element.style.position = originalPos;
      element.style.zIndex = originalZ;
    }
  };

  const currentDirLabel = directions.find(d => String(d.id) === String(selectedDirection))?.label;

  const kpis = {
    centers: consolidation?.kpis?.nb_centres || (centres ? centres.length : 0),
    fte: consolidation?.kpis?.etp_actuel || (centres ? centres.reduce((a, b) => a + (b.fte_actuel || 0), 0) : 0),
    etp: consolidation?.kpis?.etp_calcule || (centres ? centres.reduce((a, b) => a + (b.etp_calcule || 0), 0) : 0),
    delta: consolidation?.kpis?.ecart_global || (centres ? centres.reduce((a, b) => a + (b.ecart || 0), 0) : 0)
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-8 animate-in fade-in duration-300 font-sans">

      {/* --- 1. PRO NAVBAR --- */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-[1920px] mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-[#005EA8] p-1.5 rounded-lg text-white shadow-sm">
              <BarChart3 size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 uppercase tracking-wide leading-none">Pilotage Direction</h1>
              <p className="text-[10px] text-slate-400 font-medium">Vue Consolidée</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Perimeter Selector */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-[#005EA8]/20 transition-all">
              <Building2 size={14} className="text-slate-400" />
              <div className="w-px h-3 bg-slate-300 mx-1"></div>
              <select
                className="text-xs font-bold text-slate-700 bg-transparent outline-none w-48 cursor-pointer"
                value={selectedDirection || ""}
                onChange={(e) => handleSelectDirection(e.target.value)}
              >
                <option value="">-- Sélectionner une Direction --</option>
                {directions.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Actions Group */}
            {selectedDirection && (
              <div className="flex items-center gap-2">

                {/* Settings Toggle */}
                <button
                  onClick={() => setShowParams(!showParams)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm ${showParams
                    ? "bg-[#005EA8] text-white border-[#005EA8]"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                >
                  <Settings2 size={14} className={showParams ? "animate-spin-slow" : ""} />
                  Paramètres
                </button>

                {/* Export PDF */}
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50 text-xs font-bold transition-all shadow-sm"
                >
                  <FileText size={14} />
                  Export
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- SETTINGS PANEL (Collapsible) --- */}
        {selectedDirection && showParams && (
          <div className="absolute top-14 left-0 w-full bg-slate-50/95 backdrop-blur border-b border-slate-200 shadow-lg z-30 animate-in slide-in-from-top-2">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-8">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm">
                  <Settings2 size={16} className="text-[#005EA8]" />
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configuration de la Simulation</span>
              </div>

              <div className="h-8 w-px bg-slate-300 mx-4"></div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">PRODUCTIVITÉ (%)</label>
                  <input
                    type="number"
                    className="w-16 text-center text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded px-1 py-0.5 focus:ring-2 focus:ring-[#005EA8]"
                    value={params.productivite}
                    onChange={e => setParams(p => ({ ...p, productivite: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">HEURES / JOUR</label>
                  <input
                    type="number"
                    className="w-16 text-center text-sm font-bold text-slate-800 bg-slate-100 border border-slate-300 rounded px-1 py-0.5"
                    value={params.heuresParJour}
                    readOnly
                  />
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">IDLE (MIN)</label>
                  <input
                    type="number"
                    className="w-16 text-center text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded px-1 py-0.5 focus:ring-2 focus:ring-[#005EA8]"
                    value={params.idleMinutes}
                    onChange={e => setParams(p => ({ ...p, idleMinutes: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <button
                onClick={() => runSim()}
                className="ml-4 px-4 py-2 bg-[#005EA8] hover:bg-[#004e8a] text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2 transition-all active:scale-95"
              >
                <Play size={14} fill="currentColor" />
                Appliquer
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="px-4 py-4 max-w-[1920px] mx-auto">

        {/* Error State */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!selectedDirection ? (
          /* --- 2. HERO EMPTY STATE --- */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
                <Building2 size={48} className="text-[#005EA8]" />
              </div>
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">Sélectionnez une Direction</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Pour accéder au tableau de bord, veuillez choisir un périmètre depuis le menu ci-dessus.
                La simulation consolidée se chargera automatiquement.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#005EA8] bg-blue-50 px-4 py-2 rounded-full">
              <Settings2 size={12} />
              <span>Mode Pilotage Activé</span>
            </div>
          </div>
        ) : (
          /* --- 3. DASHBOARD CONTENT --- */
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">

            {/* KPI Section */}
            <div className="mt-2">
              <IndicateursDirection currentDir={{ label: currentDirLabel }} kpis={kpis} fmt={fmt} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

              {/* Main Table Area */}
              <div className="xl:col-span-8 flex flex-col gap-4">
                {kpis.etp === 0 && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2 shadow-sm">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <strong className="block mb-0.5">Données manquantes</strong>
                      L'ETP Calculé est de 0. Veuillez importer un fichier de volumes pour générer une simulation pertinente.
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

              {/* Sidebar / Widgets */}
              <div className="xl:col-span-4 space-y-4">
                <div className="h-[240px]">
                  <DirectionVolumesCard onSimulate={handleManualSimulate} loading={loading.sim} />
                </div>
                <DirectionDonutsRow centres={centres} charts={consolidation.charts} />
              </div>
            </div>
          </div>
        )}

        {/* --- HIDDEN PDF REPORT --- */}
        {selectedDirection && (
          <div
            id="official-report-area"
            className="fixed top-0 left-0 -z-50 bg-white text-slate-900 p-[10mm]"
            style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif', visibility: 'visible' }}
          >
            {/* Printable content kept same as robust version */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-8">
              <img src="/BaridLogo.png" alt="Barid Al Maghrib" className="h-12 object-contain" />
              <div className="text-center">
                <h1 className="text-2xl font-bold uppercase tracking-widest text-[#005EA8]">Rapport de Simulation</h1>
                <h2 className="text-lg font-semibold text-slate-600 mt-1">{currentDirLabel || "Direction"}</h2>
                <p className="text-xs text-slate-400 mt-1">Généré le {new Date().toLocaleDateString()}</p>
              </div>
              <img src="/almav.png" alt="Almav" className="h-10 object-contain" />
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-[#005EA8] text-white p-4 rounded text-center">
                <div className="text-2xl font-bold">{kpis.centers}</div>
                <div className="text-[10px] uppercase">Centres</div>
              </div>
              <div className="bg-slate-100 p-4 rounded text-center border border-slate-200">
                <div className="text-2xl font-bold text-slate-700">{fmt(kpis.fte)}</div>
                <div className="text-[10px] uppercase text-slate-500">Actuel</div>
              </div>
              <div className="bg-slate-100 p-4 rounded text-center border border-slate-200">
                <div className="text-2xl font-bold text-slate-700">{fmt(kpis.etp)}</div>
                <div className="text-[10px] uppercase text-slate-500">Cible</div>
              </div>
              <div className="p-4 rounded text-center border border-slate-200">
                <div className="text-2xl font-bold text-slate-800">{fmt(kpis.delta)}</div>
                <div className="text-[10px] uppercase text-slate-400">Écart</div>
              </div>
            </div>
            {/* Tables... */}
            <table className="w-full text-xs text-left border-collapse mb-8">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300"><th className="p-2">Centre</th><th className="p-2 text-right">Actuel</th><th className="p-2 text-right">Cible</th><th className="p-2 text-right">Écart</th></tr>
              </thead>
              <tbody>
                {centres.map((c, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="p-2">{c.label}</td><td className="p-2 text-right">{fmt(c.etp_actuel)}</td><td className="p-2 text-right font-bold">{fmt(c.etp_calcule)}</td><td className="p-2 text-right">{fmt(c.ecart)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DirectionPostesModal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} centre={selectedCentre} postes={centrePostes} />
      </main>
    </div>
  );
}
