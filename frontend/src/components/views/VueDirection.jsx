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

  // 2. Global Context (or local parameters state)
  // We prioritize local state for this view to allow "What-If" scenarios without polluting global context immediately
  const [params, setParams] = useState({
    productivite: 100,
    heuresParJour: 8,
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
    const element = document.getElementById("official-report-area");
    if (!element) return;

    // Temporarily make visible for capture if needed, or rely on off-screen rendering
    // element.style.display = 'block'; 

    try {
      const imgData = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff', // Force white bg
        cacheBust: true,
        filter: (node) => !node.classList?.contains('no-print') // Optional filter
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();

      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);
      pdf.save(`Rapport_Direction_${selectedDirection || "Sim"}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Erreur lors de l'export PDF (voir console)");
    }
  };

  // 5. KPIs Construction
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

        {/* ... (Header and Settings - kept same) ... */}
        {/* --- HEADER SELECTOR & SETTINGS --- */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          {/* ... (Same as before) ... */}
          {/* Re-implementing simplified header for context of replacement */}
          <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-xl border border-slate-200 shadow-sm">
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
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                title="Exporter en PDF"
              >
                <span className="text-red-600">PDF</span>
              </button>
              {/* ... (Settings Toggle - kept same) ... */}
              <div className={`
                        flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm transition-all
                        ${showParams ? 'ring-2 ring-[#005EA8]/20' : ''}
                   `}>
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

        {/* --- SCREEN DASHBOARD ONLY --- */}
        <div id="dashboard-screen">
          {selectedDirection && (
            <>
              <div className="mb-8">
                <IndicateursDirection
                  currentDir={{ label: currentDirLabel || "Direction" }}
                  kpis={kpis}
                  fmt={fmt}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 flex flex-col gap-6">
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

                <div className="xl:col-span-4 space-y-6">
                  <DirectionVolumesCard onSimulate={handleManualSimulate} loading={loading.sim} />
                  <DirectionDonutsRow centres={centres} charts={consolidation.charts} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* --- HIDDEN REPORT AREA FOR PDF CAPTURE --- */}
        <div
          id="official-report-area"
          className="absolute top-0 left-[-9999px] w-[210mm] bg-white text-slate-900 p-[10mm] shadow-none"
          style={{
            width: '210mm',
            minHeight: '297mm',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {/* Report Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-8">
            <img src="/BaridLogo.png" alt="Barid Al Maghrib" className="h-12 object-contain" />
            <div className="text-center">
              <h1 className="text-2xl font-bold uppercase tracking-widest text-[#005EA8]">Rapport de Simulation</h1>
              <h2 className="text-lg font-semibold text-slate-600 mt-1">{currentDirLabel || "Direction"}</h2>
              <p className="text-xs text-slate-400 mt-1">Généré le {new Date().toLocaleDateString()} à {new Date().toLocaleTimeString()}</p>
            </div>
            <img src="/almav.png" alt="Almav" className="h-10 object-contain" />
          </div>

          {/* Parameters Block */}
          <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Paramètres de Simulation</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs">Productivité</span>
                <span className="font-bold">{params.productivite}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs">Temps de travail</span>
                <span className="font-bold">{params.heuresParJour} h/j</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs">Temps d'attente</span>
                <span className="font-bold">{params.idleMinutes} min</span>
              </div>
            </div>
          </div>

          {/* KPIs Block - Simplified for Print */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#005EA8] text-white p-4 rounded-lg text-center">
              <div className="text-2xl font-bold">{kpis.centers}</div>
              <div className="text-[10px] uppercase opacity-80">Centres</div>
            </div>
            <div className="bg-slate-100 p-4 rounded-lg text-center border border-slate-200">
              <div className="text-2xl font-bold text-slate-700">{fmt(kpis.fte)}</div>
              <div className="text-[10px] uppercase text-slate-500">ETP Actuel</div>
            </div>
            <div className="bg-slate-100 p-4 rounded-lg text-center border border-slate-200">
              <div className="text-2xl font-bold text-slate-700">{fmt(kpis.etp)}</div>
              <div className="text-[10px] uppercase text-slate-500">ETP Cible</div>
            </div>
            <div className={`p-4 rounded-lg text-center border ${kpis.delta > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
              <div className="text-2xl font-bold">{kpis.delta > 0 ? '+' : ''}{fmt(kpis.delta)}</div>
              <div className="text-[10px] uppercase opacity-80">Écart</div>
            </div>
          </div>

          {/* Data Tables */}
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-bold border-l-4 border-[#005EA8] pl-2 mb-4 text-slate-800">Détail par Centre</h3>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase border-b border-slate-300">
                    <th className="p-2">Centre</th>
                    <th className="p-2">Catégorie</th>
                    <th className="p-2 text-right">Actuel</th>
                    <th className="p-2 text-right">Cible</th>
                    <th className="p-2 text-right">Écart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {centres.map((c, idx) => (
                    <tr key={c.centre_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2 font-medium">{c.centre_label}</td>
                      <td className="p-2 text-slate-500">{c.categorie}</td>
                      <td className="p-2 text-right">{fmt(c.etp_actuel)}</td>
                      <td className="p-2 text-right font-bold">{fmt(c.etp_calcule)}</td>
                      <td className={`p-2 text-right font-bold ${c.ecart > 0 ? 'text-red-600' : c.ecart < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {c.ecart > 0 ? '+' : ''}{fmt(c.ecart)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {consolidation.rows && consolidation.rows.length > 0 && (
              <div>
                <h3 className="text-sm font-bold border-l-4 border-purple-600 pl-2 mb-4 text-slate-800">Consolidé par Poste</h3>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase border-b border-slate-300">
                      <th className="p-2">Poste</th>
                      <th className="p-2 text-center">Type</th>
                      <th className="p-2 text-right">Total Cible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consolidation.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{row.label}</td>
                        <td className="p-2 text-center text-[10px] font-bold text-slate-400">{row.type_poste}</td>
                        <td className="p-2 text-right font-bold">{fmt(row.total_etp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="absolute bottom-10 left-0 w-full text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4">
            Document généré automatiquement par la plateforme Tawazoon RH - Confidentiel
          </div>
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
