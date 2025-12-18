/**
 * VueDirection
 * ---------------------
 * Page de pilotage Direction (niveau macro)
 * - Affiche une simulation consolidée par centres
 * - Permet l’analyse des écarts d’effectifs
 * - Sera étendue avec auto-load, paramètres globaux et drill-down
 *
 * ⚠️ Ne pas casser la logique Vue Centre / Vue Intervenant
 */
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useDirectionData } from "../../hooks/useDirectionData";
import { useSimulation } from "../../context/SimulationContext";
import { Building2, Settings2, Play, AlertTriangle } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

  // 2. Global Context (or local parameters state)
  // We prioritize local state for this view to allow "What-If" scenarios without polluting global context immediately
  const [params, setParams] = useState({
    productivite: 100,
    heuresParJour: 7.5,
    idleMinutes: 0
  });

  // 3. Local State for UI
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [centrePostes, setCentrePostes] = useState([]);
  const [loadingPostes, setLoadingPostes] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const initializedRef = useRef(false);

  // State for data persistence (Re-simulating with new params)
  const [lastVolumes, setLastVolumes] = useState([]);
  const [simMode, setSimMode] = useState("database"); // "database" | "actuel" | "recommande"

  // 4. Handlers
  const handleSelectDirection = (id) => {
    actions.selectDirection(id);
    // Reset on direction change
    initializedRef.current = false;
    setLastVolumes([]);
    setSimMode("database");
  };

  /**
   * Run Simulation Wrapper
   * mode: "actuel" (from Import) | "database" (Auto-load)
   * volumesOverride: optional, otherwise uses lastVolumes state
   */
  const runSim = async (modeOverride = null, volumesOverride = null) => {
    if (!selectedDirection) return;

    const activeMode = modeOverride || simMode;
    const activeVolumes = volumesOverride || lastVolumes;

    // Update state for next time
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

  // Auto-load Logic
  useEffect(() => {
    if (selectedDirection && !initializedRef.current && !loading.sim && !loading.centres) {
      // Trigger generic simulation (mode database)
      // We pass empty volumes to trigger the "database/default" mode in backend
      runSim("database", []);
      initializedRef.current = true;
    }
  }, [selectedDirection, loading.centres]);

  const handleManualSimulate = async (importedData) => {
    if (!selectedDirection) {
      alert("Veuillez sélectionner une Direction d'abord.");
      return;
    }

    // Build volumes[] expected by backend
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

          // centre identity
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

          // volumes
          if (key.includes("sac")) v.sacs = toNumber(val, 0);
          else if (key.includes("colis") && !key.includes("amana") && !key.includes("sac")) v.colis = toNumber(val, 0);
          else if (key.includes("ordinaire")) v.courrier_ordinaire = toNumber(val, 0);
          else if (key.includes("recommande")) v.courrier_recommande = toNumber(val, 0);
          else if (key.includes("ebarkia")) v.ebarkia = toNumber(val, 0);
          else if (key.includes("lrh") || key.includes("24")) v.lrh = toNumber(val, 0);

          // Ratios / Spécifiques
          else if (key.includes("colis_amana") && key.includes("sac")) v.colis_amana_par_sac = toNumber(val, null);
          else if (key.includes("amana")) v.amana = toNumber(val, 0);
          else if (key.includes("courrier") && key.includes("sac")) v.courriers_par_sac = toNumber(val, null);
        });

        // fallback: if you used "label" column in your excel parser
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
        const normalized = (Array.isArray(res) ? res : []).map(normalizePoste);
        // We calculate local gaps based on global 'etp_calcule' which is tricky because 'postesByCentre' might not have simulation data?
        // Actually 'postesByCentre' returns 'cte_actuel' etc but NOT calculated details unless we call 'vue-centre-optimisee'.
        setCentrePostes(normalized);
      } else {
        console.warn("api.postesByCentre is not defined");
        setCentrePostes([]);
      }
    } catch (err) {
      console.error("Error fetching postes", err);
    } finally {
      setLoadingPostes(false);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("dashboard-print-area");
    if (!element) return;

    // Toast or loading state if desired
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Rapport_Direction_${selectedDirection || "Sim"}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Erreur lors de l'export PDF");
    }
  };

  // 5. KPIs Construction
  // Transform DirectionKPIS (backend) to frontend friendly format
  const backendKPIs = consolidation?.kpis || {};
  const kpis = {
    centers: backendKPIs.nb_centres || centersCountFallback(centres),
    fte: backendKPIs.etp_actuel || centersSum(centres, 'fte_actuel'),
    etp: backendKPIs.etp_calcule || centersSum(centres, 'etp_calcule'),
    delta: backendKPIs.ecart_global || centersSum(centres, 'ecart')
  };

  function centersCountFallback(list) { return list ? list.length : 0; }
  function centersSum(list, key) { return list ? list.reduce((a, b) => a + (b[key] || 0), 0) : 0; }

  const currentDirLabel = directions.find(d => String(d.id) === String(selectedDirection))?.label;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-10 space-y-6 animate-in fade-in duration-500" style={{ zoom: 0.9 }}>
      <main className="px-6 max-w-[1900px] mx-auto pt-6">

        {/* --- HEADER SELECTOR & SETTINGS --- */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-xl border border-slate-200 shadow-sm">
            {/* ... existing selector ... */}
            <div className="bg-[#005EA8]/10 p-2.5 rounded-lg">
              <Building2 className="text-[#005EA8]" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Périmètre</span>
              <select
                className="text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer min-w-[200px]"
                value={selectedDirection || ""}
                onChange={(e) => handleSelectDirection(e.target.value)}
              >
                <option value="">-- Sélectionner une direction --</option>
                {directions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedDirection && (
            <div className="flex items-center gap-2">
              {/* PDF Button */}
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                title="Exporter en PDF"
              >
                <span className="text-red-600">PDF</span>
              </button>

              {/* Parameter Toggles */}
              <div className={`
                        flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm transition-all
                        ${showParams ? 'ring-2 ring-[#005EA8]/20' : ''}
                   `}>
                {/* ... existing params toolbar ... */}
                <button
                  onClick={() => setShowParams(!showParams)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#005EA8]"
                >
                  <Settings2 size={14} />
                  Paramètres
                </button>

                {showParams && (
                  <>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-500">Prod %</label>
                      <input
                        type="number"
                        className="w-12 h-6 text-center text-xs border rounded bg-slate-50"
                        value={params.productivite}
                        onChange={e => setParams(p => ({ ...p, productivite: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-500">Heures</label>
                      <input
                        type="number"
                        className="w-12 h-6 text-center text-xs border rounded bg-slate-50"
                        value={params.heuresParJour}
                        onChange={e => setParams(p => ({ ...p, heuresParJour: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <button
                      onClick={() => runSim()}
                      className="ml-2 bg-[#005EA8] text-white p-1 rounded hover:bg-[#004e8a]"
                      title="Relancer simulation avec ces paramètres"
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm mb-4 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div id="dashboard-print-area">
          {selectedDirection && (
            <>
              {/* --- GLASS KPIS --- */}
              <div className="mb-8">
                <IndicateursDirection
                  currentDir={{ label: currentDirLabel || "Direction" }}
                  kpis={kpis}
                  fmt={fmt}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* LEFT COLUMN: TABLE (8 cols) */}
                <div className="xl:col-span-8 flex flex-col gap-6">

                  {/* Result Warning if FTE = 0 (likely no volumes) */}
                  {kpis.etp === 0 && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-center gap-2">
                      <AlertTriangle size={14} />
                      <span>
                        <strong>Attention :</strong> L'ETP Calculé est de 0. Cela signifie probablement qu'aucun volume n'est enregistré pour ces centres.
                        Veuillez importer un fichier de volumes pour obtenir une simulation précise.
                      </span>
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

                {/* RIGHT COLUMN: ACTIONS & CHARTS (4 cols) */}
                <div className="xl:col-span-4 space-y-6">
                  {/* Import Card */}
                  <DirectionVolumesCard onSimulate={handleManualSimulate} loading={loading.sim} />

                  {/* Charts */}
                  <DirectionDonutsRow centres={centres} charts={consolidation.charts} />
                </div>
              </div>
            </>
          )}
        </div>

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
