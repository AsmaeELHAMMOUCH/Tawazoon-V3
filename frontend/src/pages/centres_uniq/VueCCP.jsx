import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDebouncedValue } from "../../hooks/useDebounce";
import {
  User,
  Gauge,
  Clock,
  Table as TableIcon,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  UserRound,
  Calculator,
  Package,
  Play,
  Mail,
  Archive,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Sliders,
  Layers,
  MapPin,
  AlertCircle,
  Globe,
} from "lucide-react";
import SimulationHeader from "@/components/centres_uniq/SimulationHeader";

import { EmptyStateFirstRun } from "@/components/states/EmptyStateFirstRun";
import { EmptyStateDirty } from "@/components/states/EmptyStateDirty";

import GraphReferentiel from "@/components/charts/GraphReferentiel";
import GraphResultats from "@/components/charts/GraphResultats";
import EnterpriseTable from "@/components/tables/EnterpriseTable";
import "@/components/tables/EnterpriseTable.css";
import "@/styles/tooltips.css";


/* ===================== HELPERS ===================== */
const normalizeString = (str) => {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
};

/* ===================== UI COMPONENTS ===================== */
const Card = ({ title, children, actions, bodyClassName = "" }) => (
  <section className="bg-white rounded-2xl border border-slate-200 shadow-lg">
    {title && (
      <header className="h-10 px-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {actions}
      </header>
    )}
    <div className={`p-2.5 ${bodyClassName}`}>{children}</div>
  </section>
);

const Field = ({ label, icon: Icon, children }) => (
  <label className="flex flex-col gap-1 min-w-0">
    <span className="text-[11px] font-medium text-slate-600 tracking-wide flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-[#005EA8]" />}
      <span className="truncate">{label}</span>
    </span>
    {children}
  </label>
);

const Input = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`h-9 w-full rounded-md border border-slate-300 px-2 text-[12.5px] text-center bg-white disabled:bg-slate-50 focus:ring-2 focus:ring-[#005EA8] focus:border-[#005EA8] ${className}`}
  />
);

const Select = ({ className = "", ...props }) => (
  <select
    {...props}
    className={`h-9 w-full rounded-md border border-slate-300 px-2 text-[12px] bg-white disabled:bg-slate-50 focus:ring-2 focus:ring-[#005EA8] focus:border-[#005EA8] ${className}`}
  />
);

const Segmented = ({ options, value, onChange }) => (
  <div className="flex rounded-lg border border-slate-300 overflow-hidden shadow-sm">
    {options.map((opt) => (
      <button
        key={opt.value}
        className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1.5 ${value === opt.value
          ? "bg-[#005EA8] text-white"
          : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        onClick={() => onChange(opt.value)}
      >
        {opt.icon && <opt.icon className="w-3 h-3" />}
        {opt.label}
      </button>
    ))}
  </div>
);

/* ===================== KPI COMPONENTS ===================== */
const KPICardGlass = ({
  label, MOD, MOI, extraLabel, extraValue, total, icon: Icon, tone = "blue",
  emphasize = false, leftLabel = "MOD", rightLabel = "MOI", children,
  customFooter, toggleable = false, isOpen = false, onToggle,
}) => {
  const T = {
    blue: { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" },
    amber: { ring: "ring-amber-300/60", halo: "from-amber-400/25", text: "text-amber-600", dot: "bg-amber-500" },
    green: { ring: "ring-emerald-300/60", halo: "from-emerald-400/25", text: "text-emerald-600", dot: "bg-emerald-500" },
    slate: { ring: "ring-slate-300/60", halo: "from-slate-400/20", text: "text-slate-700", dot: "bg-slate-500" },
    red: { ring: "ring-rose-300/60", halo: "from-rose-400/25", text: "text-rose-600", dot: "bg-rose-500" },
  }[tone] || { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/50 bg-white/55 backdrop-blur-xl p-2.5 min-h-[90px] pb-3 ring-1 ${T.ring} shadow-[0_18px_55px_-18px_rgba(2,6,23,0.20)] transition-all duration-300`}>
      <div aria-hidden className={`pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${T.halo} to-transparent`} />
      {Icon && <Icon aria-hidden className="pointer-events-none absolute right-3 bottom-1 w-7 h-7 opacity-15 text-slate-700" />}

      <div className="text-[11px] font-semibold text-center text-slate-700 px-4">{label}</div>
      <div className="mt-0.5 text-center text-lg font-extrabold text-slate-900">
        <span className={emphasize ? T.text : ""}>{total}</span>
      </div>

      {customFooter ? (
        <div className="mt-1.5 border-t border-slate-100 pt-1">{customFooter}</div>
      ) : children ? (
        <div className="mt-1.5 border-t border-slate-100 pt-1">{children}</div>
      ) : ((MOD !== undefined || MOI !== undefined || extraValue !== undefined) && (
        <div className="flex justify-center gap-3 mt-0.5 text-[10px] font-medium text-slate-600">
          {MOD !== undefined && <div>{leftLabel}: {MOD}</div>}
          {MOI !== undefined && <div>{rightLabel}: {MOI}</div>}
          {extraValue !== undefined && extraLabel && <div>{extraLabel}: {extraValue}</div>}
        </div>
      ))}
    </div>
  );
};

const EffectifFooter = ({ totalLabel, totalValue, modValue, moiValue, apsLabel, apsValue }) => (
  <div className="text-[10px] text-slate-600 space-y-1.5">
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-50 px-2 py-1">
      <span className="font-semibold text-slate-700">{totalLabel}</span>
      <span className="px-2 py-0.5 rounded-full bg-white text-slate-800 font-semibold shadow-sm">Total : {totalValue}</span>
    </div>
    <div className="flex items-center justify-center gap-2">
      <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#005EA8]">MOD : {modValue}</span>
      {moiValue !== undefined && moiValue !== null && (
        <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">MOI : {moiValue}</span>
      )}
    </div>
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-emerald-50/70 px-2 py-1">
      <span className="font-semibold text-emerald-800">{apsLabel}</span>
      <span className="px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 font-semibold shadow-sm">Total APS : {apsValue}</span>
    </div>
  </div>
);

const JOURS_OUVRES_AN = 264;
const CCP_CENTRE_ID = "1962";

// Helper for thousands separator
const formatThousands = (val) => {
  if (val === undefined || val === null || val === "") return "0";
  return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// Ensure parseNonNeg is available (if not imported)
const parseNonNeg = (val) => {
  if (val === undefined || val === null || val === "") return 0;
  // Handle spaces (thousands separator) and commas (decimal)
  const clean = String(val).replace(/\s/g, '').replace(/,/g, '.');
  const n = Number(clean);
  return isNaN(n) || n < 0 ? 0 : n;
};

export default function VueCCP() {
  // ============ STATE MANAGEMENT ============
  const [loading, setLoading] = useState({});
  const [poste, setPoste] = useState("");
  const [postesOptions, setPostesOptions] = useState([]);

  // Volumes
  const [courrierOrdinaire, setCourrierOrdinaire] = useState(""); // Used as CO MED (Dépôt)
  const [courrierRecommande, setCourrierRecommande] = useState(""); // Used as CR MED (Dépôt)
  // New Volume Global Inputs
  const [volumeGlobalDepot, setVolumeGlobalDepot] = useState("");
  const [volumeGlobalArrive, setVolumeGlobalArrive] = useState("");
  // New split states for Arrivée
  const [coArrive, setCoArrive] = useState("");
  const [crArrive, setCrArrive] = useState("");
  const [ebarkia, setEbarkia] = useState("");
  const [lrh, setLrh] = useState("");
  const [amana, setAmana] = useState("");
  const [pctRetour, setPctRetour] = useState(5);
  const [colis, setColis] = useState("");

  // Parameters
  const [productivite, setProductivite] = useState(100);
  const [idleMinutes, setIdleMinutes] = useState(0);
  const [heuresNet, setHeuresNet] = useState(8.0);
  const [colisParCollecte, setColisParCollecte] = useState(10);
  const [colisAmanaParSac, setColisAmanaParSac] = useState(10);
  const [courriersParSac, setCourriersParSac] = useState(4500);

  // CCP-specific
  const [volumesFluxGrid, setVolumesFluxGrid] = useState(null);
  const [axesPercent, setAxesPercent] = useState(30);
  const [pctInternational, setPctInternational] = useState(0); // Default 0%
  const [shiftParam, setShiftParam] = useState(1); // Default Shift 1
  const [nbrCoSac, setNbrCoSac] = useState(0);
  const [nbrCrSac, setNbrCrSac] = useState(0);
  const [pctAxesArrivee, setPctAxesArrivee] = useState({});
  const [pctAxesDepart, setPctAxesDepart] = useState({});

  // Results
  const [referentiel, setReferentiel] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [totaux, setTotaux] = useState(null);
  const [hasSimulated, setHasSimulated] = useState(false);
  const [simDirty, setSimDirty] = useState(false);

  // Display
  const [display, setDisplay] = useState("tableau");
  const [refDisplay, setRefDisplay] = useState("tableau");

  // ============ API CALLS ============
  useEffect(() => {
    loadPositions();
    loadReferentiel();
  }, []);

  useEffect(() => {
    if (poste) loadReferentiel();
  }, [poste]);

  async function loadPositions() {
    try {
      setLoading(prev => ({ ...prev, postes: true }));
      const response = await fetch(`/api/ccp/postes?centre_id=${CCP_CENTRE_ID}`);
      const data = await response.json();
      setPostesOptions(data.postes || []);
    } catch (err) {
      console.error("Error loading positions:", err);
    } finally {
      setLoading(prev => ({ ...prev, postes: false }));
    }
  }

  async function loadReferentiel() {
    try {
      const url = `/api/ccp/referentiel?centre_id=${CCP_CENTRE_ID}${poste ? `&poste_id=${poste}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();
      setReferentiel(data.referentiel || []);
    } catch (err) {
      console.error("Error loading referentiel:", err);
    }
  }

  const onSimuler = useCallback(async (overrides = {}) => {
    try {
      setLoading(prev => ({ ...prev, simulation: true }));

      const payload = {
        centre_id: parseInt(CCP_CENTRE_ID),
        poste_id: (poste && poste !== "__ALL__") ? parseInt(poste) : null,
        volumes: {
          courrier_ordinaire: parseFloat(courrierOrdinaire || 0),
          courrier_recommande: parseFloat(courrierRecommande || 0),
          ebarkia: parseFloat(ebarkia || 0),
          lrh: parseFloat(lrh || 0),
          amana: parseFloat(amana || 0),
          // Amana specific volumes from overrides
          volume_global_amana_depot: overrides.volume_global_amana_depot || 0,
          volume_global_amana_recu: overrides.volume_global_amana_recu || 0,
          sac_input: overrides.sac_input,
          caisson_input: overrides.caisson_input,
          courrier_input: overrides.courrier_input,
          // Standard Arrive/Depot Split
          co_arrive: overrides.co_arrive || 0,
          cr_arrive: overrides.cr_arrive || 0,
        },
        params: {
          productivite: parseFloat(productivite || 100),
          heures_net: parseFloat(heuresNet || 8.0),
          heures_net: parseFloat(heuresNet || 8.0),
          idle_minutes: parseFloat(idleMinutes || 0),
          pct_retour: parseFloat(pctRetour || 0),
          ...overrides
        }
      };

      const response = await fetch("/api/ccp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      setResultats(result.details_taches || []);
      setTotaux({
        total_heures: result.total_heures,
        fte_calcule: result.fte_calcule,
        fte_arrondi: result.fte_arrondi,
        heures_net_jour: result.heures_net_jour,
        total_moi: result.total_moi || 0,
        total_aps: result.total_aps || 0,
        total_mod_actuel: result.total_mod_actuel || 0,
        total_moi_actuel: result.total_moi_actuel || 0,
        total_aps_actuel: result.total_aps_actuel || 0,
        // Target / Arrondi
        total_mod_target: result.total_mod_target || 0,
        total_moi_target: result.total_moi_target || 0,
        total_aps_target: result.total_aps_target || 0,
        total_mod_calcule: result.total_mod_calcule || 0,
      });
      setHasSimulated(true);
      setSimDirty(false);

    } catch (err) {
      console.error("Simulation error:", err);
      alert("Erreur: " + err.message);
    } finally {
      setLoading(prev => ({ ...prev, simulation: false }));
    }
  }, [poste, courrierOrdinaire, courrierRecommande, ebarkia, lrh, amana, productivite, heuresNet, idleMinutes, pctInternational, shiftParam]);

  // Mark dirty on changes
  useEffect(() => {
    if (hasSimulated) setSimDirty(true);
  }, [courrierOrdinaire, courrierRecommande, ebarkia, lrh, amana, productivite, idleMinutes, pctInternational, shiftParam]);

  // ============ COMPONENT LOGIC (from original) ============
  const centre = CCP_CENTRE_ID;
  const centreCategorie = "CENTRE UNIQUE";
  const hasPhase = false;

  const posteValue = poste == null ? "" : String(poste);
  const ALL_ID = "__ALL__";
  const intervenantOptions = useMemo(() => {
    const base = Array.isArray(postesOptions) ? postesOptions : [];
    const cleaned = base
      .filter((p) => p && p.id !== ALL_ID && (p.label ?? p.name) !== "Tous")
      .map((p) => ({
        id: p.id,
        label: p.label ?? p.name,
      }))
      .filter((p) => p.label);
    cleaned.sort((a, b) => String(a.label).localeCompare(String(b.label), "fr", { sensitivity: "base" }));
    return [...cleaned, { id: ALL_ID, label: "Tous" }];
  }, [postesOptions]);

  const [partParticuliers, setPartParticuliers] = useState(75);
  const partProfessionnels = 100 - partParticuliers;

  // Display states
  const [showDetails, setShowDetails] = useState(true);
  const [filterFamille, setFilterFamille] = useState("");

  // CCI params
  const [tauxComplexite, setTauxComplexite] = useState(1);
  const [natureGeo, setNatureGeo] = useState(1);
  const [pctCollecte, setPctCollecte] = useState(5.0);
  const [nbrCourrierLiasse, setNbrCourrierLiasse] = useState(0);
  const [annotes, setAnnotes] = useState(0);
  const [pctReclamation, setPctReclamation] = useState(0);

  // CO/CR-specific CCI params (1952 advanced mode)
  const [courriersCoParSac, setCourriersCoParSac] = useState(2500);
  const [courriersCrParSac, setCourriersCrParSac] = useState(500);
  const [nbrCourrierLiasseCo, setNbrCourrierLiasseCo] = useState(500);
  const [nbrCourrierLiasseCr, setNbrCourrierLiasseCr] = useState(500);
  const [pctRetourCo, setPctRetourCo] = useState(1);
  const [pctRetourCr, setPctRetourCr] = useState(1);
  const [annotesCo, setAnnotesCo] = useState(0);
  const [annotesCr, setAnnotesCr] = useState(0);
  const [pctReclamCo, setPctReclamCo] = useState(0);
  const [pctReclamCr, setPctReclamCr] = useState(0);

  // Debounced values
  const debouncedCourrierOrdinaire = useDebouncedValue(courrierOrdinaire, 300);
  const debouncedCourrierRecommande = useDebouncedValue(courrierRecommande, 300);
  const debouncedEbarkia = useDebouncedValue(ebarkia, 300);
  const debouncedLrh = useDebouncedValue(lrh, 300);
  const debouncedAmana = useDebouncedValue(amana, 300);
  const debouncedProductivite = useDebouncedValue(productivite, 500);
  const debouncedIdleMinutes = useDebouncedValue(idleMinutes, 500);
  const debouncedColis = useDebouncedValue(colis, 300);

  // Helpers
  // Removed inner sanitize and parseNonNeg to use the robust outer versions
  const toInput = (v) => (v === 0 || v === null || v === undefined ? "" : String(v));

  const formatUnit = (x) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(x || 0));

  const formatSmallNumber = (v, d = 2) => Number(v || 0).toFixed(d).replace('.', ',');

  const monthly = (valNumOrText) => {
    const n = typeof valNumOrText === "number" ? valNumOrText : parseNonNeg(valNumOrText);
    if (n === undefined) return undefined;
    return n / 12;
  };

  const formatInt = (x) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(x || 0));

  const splitFlux = useCallback(
    (total) => {
      const v = Number(total ?? 0);
      const ratioPart = partParticuliers / 100;
      const ratioProf = 1 - ratioPart;
      return { part: v * ratioPart, prof: v * ratioProf };
    },
    [partParticuliers]
  );

  // Calculate heures nettes
  useEffect(() => {
    const heuresBase = 8.0;
    const prodFactor = Number(debouncedProductivite ?? 100) / 100;
    const idleH = Number(debouncedIdleMinutes || 0) / 60;

    // Formula: (8 * Prod) - Idle
    const heuresNettes = Math.max(0, (heuresBase * prodFactor) - idleH);
    setHeuresNet?.(heuresNettes.toFixed(2));
  }, [debouncedIdleMinutes, debouncedProductivite, setHeuresNet]);

  const baseHeuresNet = useMemo(() => Number(heuresNet || 0), [heuresNet]);

  // Get effective flux mode
  const getEffectiveFluxMode = (categorie, key) => {
    const cat = String(categorie || "").trim().toUpperCase();
    if (cat === "CM") return key === "amana" ? "input" : "na";
    if (cat === "CTD - CENTRE DE TRAITEMENT ET DISTRIBUTION") return "input";
    if (cat === "CD") return "input";
    if (cat === "CCC") return "input";
    if (cat === "CENTRE UNIQUE") return "input";
    if (cat === "AM- AGENCE MESSAGERIE") return key === "amana" ? "input" : "na";
    if (key === "amana") return "input";
    return "na";
  };

  // Annual values
  const annualValues = useMemo(() => ({
    courrierOrdinaire: parseNonNeg(debouncedCourrierOrdinaire) ?? 0,
    courrierRecommande: parseNonNeg(debouncedCourrierRecommande) ?? 0,
    ebarkia: parseNonNeg(debouncedEbarkia) ?? 0,
    lrh: parseNonNeg(debouncedLrh) ?? 0,
    amana: parseNonNeg(debouncedAmana) ?? 0,
  }), [debouncedCourrierOrdinaire, debouncedCourrierRecommande, debouncedEbarkia, debouncedLrh, debouncedAmana]);

  const annualIfAllowed = (key) => {
    const mode = getEffectiveFluxMode(centreCategorie, key);
    const value = annualValues[key] ?? 0;
    if (mode !== "input") return 0;
    return value;
  };

  const hasAnyVolume =
    annualIfAllowed("courrierOrdinaire") > 0 ||
    annualIfAllowed("courrierRecommande") > 0 ||
    annualIfAllowed("ebarkia") > 0 ||
    annualIfAllowed("lrh") > 0 ||
    annualIfAllowed("amana") > 0 ||
    (parseNonNeg(colis) ?? 0) > 0;

  // Unique families
  const uniqueFamilles = useMemo(() => {
    const s = new Set((referentiel || []).map(r => r.famille).filter(Boolean));
    return Array.from(s).sort();
  }, [referentiel]);

  // Filter referentiel
  const referentielFiltered = useMemo(() => {
    return (referentiel || []).filter((row) => {
      const hasMin = Number(row.m ?? 0) > 0;
      const matchFamille = !filterFamille || row.famille === filterFamille;
      return hasMin && matchFamille;
    });
  }, [referentiel, filterFamille]);

  // Results index with robust normalization
  const resIndex = useMemo(() => {
    return new Map(
      (resultats || []).map((r) => {
        const taskName = normalizeString(r.task || r.nom_tache);
        const familleUo = normalizeString(r.famille_uo);
        const phase = normalizeString(r.phase);
        const compositeKey = `${taskName}|${familleUo}|${phase}`;
        return [compositeKey, r];
      })
    );
  }, [resultats]);

  // Minutes adjusted
  const minutesAjustees = (min) => {
    const p = Number(debouncedProductivite ?? 100);
    return p > 0 ? min / (p / 100) : min;
  };

  // Calculate nombreUniteParUnite
  function nombreUniteParUnite(unite, taskName, taskData = {}) {
    if (!hasAnyVolume) return 0;

    const uRaw = String(unite || "").trim().toLowerCase();
    const typeFlux = String(taskData.type_flux || "").toLowerCase();
    const nom = String(taskName || "").toLowerCase();

    const annualCO = annualIfAllowed("courrierOrdinaire");
    const annualCR = annualIfAllowed("courrierRecommande");
    const annualEB = annualIfAllowed("ebarkia");
    const annualLRH = annualIfAllowed("lrh");
    const annualAmana = annualIfAllowed("amana");

    const dailyAmanaColis = annualAmana / JOURS_OUVRES_AN;
    const dailyAmanaSacs = dailyAmanaColis / (colisAmanaParSac || 5);

    const isCollecteColis = nom.includes("collecte") && nom.includes("colis");

    if (isCollecteColis) {
      const colisInput = parseNonNeg(debouncedColis) ?? 0;
      if (colisInput <= 0) return 0;
      const ratioCollecteBrut = parseNonNeg(taskData.colis_par_collecte) ?? parseNonNeg(colisParCollecte);
      const ratioCollecte = Math.max(1, ratioCollecteBrut ?? 1);
      return colisInput / ratioCollecte;
    }

    if (uRaw.includes("colis") || uRaw === "amana") {
      if (dailyAmanaColis > 0) return dailyAmanaColis;
      return parseNonNeg(debouncedColis) ?? 0;
    }

    if (uRaw.includes("sac")) {
      const isAmanaTask = nom.includes("amana") || typeFlux === "amana" || uRaw.includes("amana");
      if (isAmanaTask) return dailyAmanaSacs;

      if (uRaw.includes("courrier")) {
        let annualCourrier = 0;
        if (typeFlux === "ordinaire") annualCourrier = annualCO;
        else if (typeFlux === "recommande" || typeFlux === "recommandé") annualCourrier = annualCR;
        else if (typeFlux === "ebarkia") annualCourrier = annualEB;
        else if (typeFlux === "lrh") annualCourrier = annualLRH;
        else annualCourrier = annualCO + annualCR + annualEB + annualLRH;

        return annualCourrier / JOURS_OUVRES_AN / (courriersParSac || 4500);
      }

      const sacsInput = parseNonNeg(taskData.sacs) ?? 0;
      if (sacsInput > 0) return sacsInput;
      if (dailyAmanaColis > 0) return dailyAmanaSacs;

      const colisInput = parseNonNeg(debouncedColis) ?? 0;
      if (colisInput > 0) {
        const tauxSac = (axesPercent ?? 100) / 100;
        return (colisInput * tauxSac) / (colisAmanaParSac || 5);
      }
      return 0;
    }

    if (uRaw === "courrier" || uRaw === "courriers" || uRaw === "courrier_recommande" || uRaw === "courrier recommandé") {
      let annualCourrier = 0;
      if (typeFlux === "ordinaire") annualCourrier = annualCO;
      else if (typeFlux === "recommande" || typeFlux === "recommandé") annualCourrier = annualCR;
      else if (typeFlux === "ebarkia") annualCourrier = annualEB;
      else if (typeFlux === "lrh") annualCourrier = annualLRH;
      else annualCourrier = annualCO + annualCR;
      return annualCourrier / JOURS_OUVRES_AN;
    }

    return 0;
  }

  // Merged results
  const mergedResults = useMemo(() => {
    const res = referentielFiltered.map((row, i) => {
      const taskName = String(row.t || "").trim();
      const familleUo = String(row.famille || "").trim();

      const normTask = normalizeString(taskName);
      const normFamille = normalizeString(familleUo);
      const normPhase = normalizeString(row.ph); // lookup from referentiel row

      const compositeKey = `${normTask}|${normFamille}|${normPhase}`;
      const fromBack = resIndex.get(compositeKey);
      const moyenneMin = Number(row.m ?? 0);

      const hasBackResults = fromBack && (fromBack.heures !== undefined);
      const isActive = String(row.etat || "A").trim().toUpperCase() !== "NA";

      const nbJour = isActive
        ? (fromBack?.nombre_unite ?? fromBack?.nombre_Unite ?? nombreUniteParUnite(row.u, taskName, row))
        : 0;

      let heuresLoc;
      if (!isActive) {
        heuresLoc = 0;
      } else if (hasBackResults) {
        heuresLoc = Number(fromBack.heures || 0);
      } else if (hasSimulated && (resultats || []).length > 0) {
        heuresLoc = 0;
      } else {
        heuresLoc = +(
          Number(nbJour || 0) *
          (minutesAjustees(moyenneMin) / 60)
        ).toFixed(2);
      }

      return {
        seq: i + 1,
        task: taskName || "N/A",
        formule: fromBack?.formule || "N/A",
        nombre_Unite: Number(nbJour || 0),
        heures: heuresLoc,
        _u: row.u,
        _type_flux: row.type_flux,
        _fromBack: fromBack,
      };
    });

    if (hasSimulated && (resultats || []).length > 0) {
      const referentielCompositeKeys = new Set(
        referentielFiltered.map(row => {
          const taskName = normalizeString(row.t);
          const familleUo = normalizeString(row.famille);
          return `${taskName}|${familleUo}`;
        })
      );

      (resultats || []).forEach((backTask) => {
        const backTaskName = normalizeString(backTask.task || backTask.nom_tache);
        const backFamilleUo = normalizeString(backTask.famille_uo);
        const backCompositeKey = `${backTaskName}|${backFamilleUo}`;

        if (!referentielCompositeKeys.has(backCompositeKey)) {
          res.push({
            seq: res.length + 1,
            task: backTask.task || backTask.nom_tache || "N/A",
            formule: backTask.formule || "N/A",
            nombre_Unite: Number(backTask.nombre_unite || backTask.nombre_Unite || 0),
            heures: Number(backTask.heures || 0),
            _u: backTask.unit || "N/A",
            _type_flux: "Backend",
            _fromBack: backTask,
          });
        }
      });
    }

    if (res.length === 0 && hasSimulated && poste) {
      const pObj = (postesOptions || []).find(p => String(p.id) === String(poste));
      const isMoi = pObj?.type_poste === 'MOI' || pObj?.is_moi;
      if (isMoi) {
        return [{
          seq: 1,
          task: "Activité Structurelle (MOI)",
          formule: "Poste Forfaitaire (Non piloté par le volume)",
          nombre_Unite: 1,
          heures: Number(heuresNet || 7.33),
          _u: "Jour",
          _type_flux: "Structurel",
          _fromBack: null
        }];
      }
    }

    return res;
  }, [referentielFiltered, resIndex, annualValues, debouncedColis, debouncedProductivite, colisAmanaParSac, courriersParSac, colisParCollecte, hasSimulated, poste, postesOptions, heuresNet, hasAnyVolume, centreCategorie]);

  // Total heures
  const totalHeuresAffichees = useMemo(() => {
    return mergedResults.reduce((acc, r) => acc + Number(r.heures || 0), 0);
  }, [mergedResults]);

  const totalHeuresFinal = useMemo(() => {
    if (totaux && typeof totaux.total_heures === 'number') {
      return totaux.total_heures;
    }
    return totalHeuresAffichees;
  }, [totalHeuresAffichees, totaux]);

  // FTE calculations
  const fteCalcAffiche = useMemo(() => {
    if (totaux && typeof totaux.fte_calcule === 'number') {
      return totaux.fte_calcule;
    }
    return baseHeuresNet > 0 ? totalHeuresFinal / baseHeuresNet : 0;
  }, [totalHeuresFinal, baseHeuresNet, totaux]);

  const fteArrondiAffiche = useMemo(() => {
    return fteCalcAffiche <= 0.1 ? 0 : Math.round(fteCalcAffiche);
  }, [fteCalcAffiche]);

  // Selected poste object
  const selectedPosteObj = useMemo(() => {
    if (!poste) return null;
    return (postesOptions || []).find(p => String(p.id) === String(poste));
  }, [postesOptions, poste]);

  const effectifActuel = selectedPosteObj?.effectif_actuel ? Number(selectedPosteObj.effectif_actuel) : 0;
  const ecart = effectifActuel - fteCalcAffiche;

  // Typologie
  const isMoiPoste = (p) => {
    if (!p) return false;
    const type = (p.type_poste || "").toUpperCase();
    const label = (p.poste_label || p.label || "").toUpperCase();
    const isKeyword = label.includes("RECEVEUR") ||
      label.includes("CHEF DE CENTRE") ||
      label.includes("CHEF ETABLISSEMENT") ||
      label.includes("DIRECTEUR") ||
      label.includes("GERANT") ||
      label.includes("RESPONSABLE");
    return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || isKeyword || !!p.is_moi;
  };

  const isApsPoste = (p) => {
    if (!p) return false;
    const label = (p.label || "").toUpperCase();
    const type = (p.type_poste || "").toUpperCase();
    return label.includes("APS") || label.includes("SECURITE") || type === "APS";
  };

  const flagMoi = isMoiPoste(selectedPosteObj);
  const isMOD = !flagMoi;

  // Total MOI Global (Actual)
  const totalMoiGlobal = useMemo(() => {
    if (!postesOptions) return 0;
    return postesOptions.reduce((acc, p) => {
      return acc + (isMoiPoste(p) ? Number(p.effectif_actuel || 0) : 0);
    }, 0);
  }, [postesOptions]);

  // Total APS Global (Actual)
  const totalApsGlobal = useMemo(() => {
    if (!postesOptions) return 0;
    return postesOptions.reduce((acc, p) => {
      return acc + (isApsPoste(p) ? Number(p.effectif_actuel || 0) : 0);
    }, 0);
  }, [postesOptions]);

  // Calculate Actual Staffing (Real Data)
  const isAll = (!poste || String(poste) === "__ALL__"); // Check for global selection
  const totalModActuelBackend = Number(totaux?.total_mod_actuel ?? 0);
  const totalMoiBackend = Number(totaux?.total_moi ?? totalMoiGlobal); // Target MOI
  const totalApsBackend = Number(totaux?.total_aps ?? totalApsGlobal); // Target APS

  const effActuelMOD = !poste || poste === "__ALL__" ? Number(totaux?.total_mod_actuel ?? 0) : (isMOD ? effectifActuel : 0);
  const effActuelMOI = !poste || poste === "__ALL__" ? Number(totaux?.total_moi_actuel ?? 0) : (isMoiPoste(selectedPosteObj) ? effectifActuel : 0);
  const effActuelAPS = !poste || poste === "__ALL__" ? Number(totaux?.total_aps_actuel ?? 0) : (isApsPoste(selectedPosteObj) ? effectifActuel : 0);

  // Total Actuel = Sum of components
  const effActuelTotal = effActuelMOD + effActuelMOI + effActuelAPS;

  const etpCalcMOD = isMOD || isAll ? fteCalcAffiche : 0;

  // Only include MOI/APS targets if Global OR if looking at that specific post type
  const targetMOI = isAll ? totalMoiBackend : (isMoiPoste(selectedPosteObj) ? (totalMoiBackend > 0 ? totalMoiBackend : 0) : 0);
  const targetAPS = isAll ? totalApsBackend : (isApsPoste(selectedPosteObj) ? (totalApsBackend > 0 ? totalApsBackend : 0) : 0);

  const etpCalcTotal = etpCalcMOD + targetMOI + targetAPS;

  const etpArrMOD = isMOD || isAll ? fteArrondiAffiche : 0;
  const etpArrTotal = Math.round(etpCalcTotal);

  // Ecarts - Cascading Allocation Logic
  // MOI always preserves database value
  // Positive ecart: if MOD exists -> add to APS, if no MOD -> add to MOD
  // Negative ecart: deduct from APS first, then MOD if needed
  const ecartTotal = etpArrTotal - effActuelTotal;

  // Start with actual database values
  let displayMOD = effActuelMOD;
  let displayMOI = effActuelMOI;  // Always preserve MOI
  let displayAPS = effActuelAPS;

  if (ecartTotal > 0) {
    // Positive ecart - need to add people
    if (effActuelMOD > 0) {
      // MOD exists, add ecart to APS
      displayAPS = effActuelAPS + ecartTotal;
    } else {
      // No MOD, add ecart to MOD
      displayMOD = ecartTotal;
    }
  } else if (ecartTotal < 0) {
    // Negative ecart - need to reduce people
    const absEcart = Math.abs(ecartTotal);

    if (effActuelAPS >= absEcart) {
      // APS can absorb all the reduction
      displayAPS = effActuelAPS - absEcart;
    } else {
      // APS can't absorb all, deduct what we can from APS, rest from MOD
      const remainder = absEcart - effActuelAPS;
      displayAPS = 0;
      displayMOD = Math.max(0, effActuelMOD - remainder);
    }
  }

  // Calculate individual ecarts for display
  const ecartMOD = displayMOD - effActuelMOD;
  const ecartMOI = displayMOI - effActuelMOI;  // Always 0
  const ecartAPS = displayAPS - effActuelAPS;

  const handleSimuler = useCallback((overrides = {}) => {
    const ratioCollecte = Math.max(1, parseNonNeg(colisParCollecte) ?? 1);
    // Construct Volumes UI manually from split inputs
    const volumesUI = [
      // Dépôt (EXPORT)
      { flux: "CO", sens: "EXPORT", segment: "GLOBAL", volume: parseNonNeg(courrierOrdinaire) ?? 0 },
      { flux: "CR", sens: "EXPORT", segment: "GLOBAL", volume: parseNonNeg(courrierRecommande) ?? 0 },
      // Arrivé (IMPORT)
      { flux: "CO", sens: "IMPORT", segment: "GLOBAL", volume: parseNonNeg(coArrive) ?? 0 },
      { flux: "CR", sens: "IMPORT", segment: "GLOBAL", volume: parseNonNeg(crArrive) ?? 0 },
    ];

    onSimuler({
      // Split Volumes
      co_depot: parseNonNeg(courrierOrdinaire) ?? 0,
      cr_depot: parseNonNeg(courrierRecommande) ?? 0,
      co_arrive: parseNonNeg(coArrive) ?? 0,
      co_arrive: parseNonNeg(coArrive) ?? 0,
      cr_arrive: parseNonNeg(crArrive) ?? 0,

      // Amana Specific Volumes
      volume_global_amana_depot: parseNonNeg(volumeGlobalDepot) ?? 0,
      volume_global_amana_recu: parseNonNeg(volumeGlobalArrive) ?? 0,

      // Parameters
      colis_amana_par_sac: parseNonNeg(colisAmanaParSac) ?? 5,
      courriers_par_sac: parseNonNeg(courriersParSac) ?? 4500,
      courriers_co_par_sac: parseNonNeg(courriersParSac) ?? 4500, // Use main var
      courriers_cr_par_sac: parseNonNeg(courriersCrParSac) ?? 500,
      pct_international: parseNonNeg(pctInternational) ?? 0, // NEW: International Rate
      shift_param: parseNonNeg(shiftParam) ?? 1, // NEW: Shift Parameter
      cr_par_caisson: parseNonNeg(courriersCrParSac) ?? 500,

      // Amana Unit Inputs
      sac_input: parseNonNeg(colisAmanaParSac) ?? 5,
      caisson_input: parseNonNeg(courriersCrParSac) ?? 500, // Using CR/Caisson as proxy or default
      courrier_input: 1,

      colis_par_collecte: ratioCollecte,
      taux_complexite: Number(tauxComplexite || 1),
      nature_geo: Number(natureGeo || 0),
      axes_percent: Number(axesPercent || 0),
      pct_collecte: Number(pctCollecte || 0),
      productivite: Number(productivite || 100),
      temps_mort: Number(idleMinutes || 0),
      // Other params
      nbr_courrier_liasse: Number(nbrCourrierLiasse || 0),
      pct_retour: Number(pctRetour || 0),

      // Duplicates/Extras for backward compatibility if needed
      nb_courrier_liasse_co: Number(nbrCourrierLiasseCo || 500),
      nb_courrier_liasse_cr: Number(nbrCourrierLiasseCr || 500),
      pct_retour_co: Number(pctRetourCo || 1),
      pct_retour_cr: Number(pctRetourCr || 1),
      annotes_co: Number(annotesCo || 0),
      annotes_cr: Number(annotesCr || 0),
      pct_reclam_co: Number(pctReclamCo || 0),
      pct_reclam_cr: Number(pctReclamCr || 0),
      volumes_ui: volumesUI,
      ...overrides
    });
  }, [onSimuler, colisParCollecte, colisAmanaParSac, courriersParSac, tauxComplexite, natureGeo, axesPercent, pctCollecte, productivite, idleMinutes, nbrCourrierLiasse, pctRetour, courriersCrParSac, nbrCourrierLiasseCo, nbrCourrierLiasseCr, pctRetourCo, pctRetourCr, annotesCo, annotesCr, pctReclamCo, pctReclamCr, volumesFluxGrid, courrierOrdinaire, courrierRecommande, coArrive, crArrive, volumeGlobalDepot, volumeGlobalArrive, pctInternational, shiftParam]);

  return (
    <div className="w-full flex flex-col gap-5 pb-16" style={{ zoom: "90%" }}>
      {/* 🔹 TITRE & HEADER (Sticky) */}
      <div className="sticky top-[57px] z-30 flex flex-col gap-2">
        <SimulationHeader
          title="Centre Colis Postaux (CCP)"
          region="Region Casa"
          subtitle="Code 1962 - Simulation"
        >
          <div className="flex items-center gap-2 min-w-[280px] flex-1">
            <div className="flex flex-col flex-1 relative group">
              <label className="absolute -top-1.5 left-2 px-1 text-[8px] font-bold text-[#005EA8] uppercase tracking-wider bg-white/50 backdrop-blur z-10 transition-colors group-hover:text-[#0A6BBC]">
                Poste de Travail
              </label>
              <div className="relative">
                <select
                  className="appearance-none bg-white/50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg pl-3 pr-8 py-1 focus:outline-none focus:ring-1 focus:ring-[#005EA8]/20 focus:border-[#005EA8]/30 w-full cursor-pointer transition-all hover:bg-white hover:border-blue-300 h-7"
                  value={posteValue}
                  onChange={(e) => setPoste?.(e.target.value)}
                  disabled={!centre || loading?.postes}
                >
                  <option value="">Sélectionner un poste...</option>
                  {intervenantOptions.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Sliders className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </SimulationHeader>

        {/* 🔹 BARRES DE CONFIGURATION (Sticky secondary) */}
        <div className="flex flex-col gap-2 w-full">

          {/* Configuration & Performance */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Productivité */}
              <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                  <Gauge className="w-3 h-3" />
                </div>
                <div className="flex flex-col w-full">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Productivité
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={toInput(productivite)}
                      placeholder="100"
                      onChange={(e) =>
                        setProductivite(parseNonNeg(e.target.value) ?? 100)
                      }
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-6 text-center"
                    />
                    <span className="absolute right-0 top-0 text-[9px] text-slate-400 font-bold pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-px h-6 bg-slate-200 hidden md:block" />

              {/* Temps mort */}
              <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
                <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <div className="flex flex-col w-full">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Temps mort
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={idleMinutes}
                      onChange={(e) =>
                        setIdleMinutes(Number(e.target.value || 0))
                      }
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-8 text-center"
                    />
                    <span className="absolute right-0 top-0 text-[9px] text-slate-400 font-bold pointer-events-none">
                      min
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-px h-6 bg-slate-200 hidden md:block" />

              {/* Complexité Circulation */}
              <div className="flex items-center gap-1.5 min-w-[90px] flex-1">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                  <Sliders className="w-3 h-3" />
                </div>
                <div className="flex flex-col w-full">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Compl. Circ.
                  </label>
                  <select
                    value={tauxComplexite}
                    onChange={(e) =>
                      setTauxComplexite(Number(e.target.value))
                    }
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center cursor-pointer"
                  >
                    <option value="1">1</option>
                    <option value="1.25">1.25</option>
                    <option value="1.5">1.5</option>
                  </select>
                </div>
              </div>

              <div className="w-px h-6 bg-slate-200 hidden md:block" />

              {/* Complexité Géo */}
              <div className="flex items-center gap-1.5 min-w-[90px] flex-1">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                  <MapPin className="w-3 h-3" />
                </div>
                <div className="flex flex-col w-full">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Compl. Géo
                  </label>
                  <select
                    value={natureGeo}
                    onChange={(e) => setNatureGeo(Number(e.target.value))}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center cursor-pointer"
                  >
                    <option value="1">1</option>
                    <option value="1.5">1.5</option>
                  </select>
                </div>
              </div>

              <div className="w-px h-6 bg-slate-200 hidden md:block" />

              {/* Capacité Nette - Résultat */}
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-[#005EA8] uppercase tracking-wider">
                    Capacité Nette
                  </label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-extrabold text-slate-800 tracking-tight">
                      {Number(baseHeuresNet || 0).toFixed(2)}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-500">h/j</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Parameters - Exact VolumeParamsCard Design for CCP */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg p-2 flex justify-center">
        <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden min-w-[350px]">
          <div
            className="bg-gradient-to-r from-blue-50 to-white py-2 border-b border-slate-100 flex items-center justify-center gap-2"
            title="Vue CCP"
          >
            <div className="p-1 rounded bg-indigo-100 text-indigo-600 shadow-sm">
              <Package className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Flux Amana
            </span>
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium tracking-wide">
                <th className="px-2 py-2 text-left font-normal uppercase text-[9px]">Flux & Type</th>
                <th className="px-2 py-2 text-center font-normal uppercase text-[9px] text-slate-600">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {/* SECTION AMANA DÉPÔT */}
              <tr className="bg-amber-50/30">
                <td colSpan="2" className="px-3 py-1.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider text-left border-l-2 border-amber-400">
                  Amana Dépôt
                </td>
              </tr>
              {/* Volume Global Dépôt (Read-only) */}
              <tr className="bg-amber-50/10">
                <td className="px-3 py-1.5 font-bold text-[10px] text-slate-700 pl-6">
                  Volume Global
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={volumeGlobalDepot}
                    onChange={(e) => setVolumeGlobalDepot(e.target.value)}
                    className="text-xs text-center !px-1.5 !py-1 leading-none h-8 font-extrabold text-[#005EA8] bg-amber-50/50 border border-amber-200 rounded focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all w-full"
                    placeholder="0"
                  />
                </td>
              </tr>
              {/* CO MED (Dépôt) */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-3 py-1.5 font-semibold text-[10px] text-slate-600 pl-6">
                  CO MED
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={courrierOrdinaire}
                    onChange={(e) => setCourrierOrdinaire(e.target.value)}
                    className="text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all font-bold text-slate-900 border-amber-200 w-full"
                  />
                </td>
              </tr>
              {/* CR MED (Dépôt) */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-3 py-1.5 font-semibold text-[10px] text-slate-600 pl-6">
                  CR MED
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={courrierRecommande}
                    onChange={(e) => setCourrierRecommande(e.target.value)}
                    className="text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all font-bold text-slate-900 border-amber-200 w-full"
                  />
                </td>
              </tr>

              {/* SECTION AMANA REÇU */}
              <tr className="bg-blue-50/30 border-t border-slate-100">
                <td colSpan="2" className="px-3 py-1.5 text-[10px] font-bold text-[#005EA8] uppercase tracking-wider text-left border-l-2 border-[#005EA8]">
                  Amana Reçu
                </td>
              </tr>
              {/* Volume Global Reçu (Read-only) */}
              <tr className="bg-blue-50/10">
                <td className="px-3 py-1.5 font-bold text-[10px] text-slate-700 pl-6">
                  Volume Global
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={volumeGlobalArrive}
                    onChange={(e) => setVolumeGlobalArrive(e.target.value)}
                    className="text-xs text-center !px-1.5 !py-1 leading-none h-8 font-extrabold text-[#005EA8] bg-blue-50/50 border border-blue-200 rounded focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all w-full"
                    placeholder="0"
                  />
                </td>
              </tr>
              {/* CO Arrivé */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-3 py-1.5 font-semibold text-[10px] text-slate-600 pl-6">
                  CO Arrivé
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={coArrive}
                    onChange={(e) => setCoArrive(e.target.value)}
                    className="text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-900 border-blue-200 w-full"
                  />
                </td>
              </tr>
              {/* CR Arrivé */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-3 py-1.5 font-semibold text-[10px] text-slate-600 pl-6">
                  CR Arrivé
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={crArrive}
                    onChange={(e) => setCrArrive(e.target.value)}
                    className="text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-900 border-blue-200 w-full"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Parameters Bar - Authentic VolumeParamsCard "Transparent" Layout */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2 mt-3">
        <div className="flex flex-wrap items-center gap-2">

          {/* NB COURRIER/SAC */}
          <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <Mail className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                NB CR/SAC
              </label>
              <input
                type="number"
                value={courriersParSac}
                onChange={(e) => setCourriersParSac(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* CR/CAISSON */}
          <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
            <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Archive className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                NB CR/CAISSON
              </label>
              <input
                type="number"
                value={courriersCrParSac}
                onChange={(e) => setCourriersCrParSac(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* NB COLIS/SAC */}
          <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Package className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                NB COLIS/SAC
              </label>
              <input
                type="number"
                value={colisAmanaParSac}
                onChange={(e) => setColisAmanaParSac(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* RATIO SAC OU CAISSON */}
          <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
            <div className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                RATIO SAC/CAISSON
              </label>
              <input
                type="number"
                value={colisParCollecte}
                onChange={(e) => setColisParCollecte(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* % RETOUR */}
          <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
            <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Percent className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                % RETOUR
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={pctRetour}
                  onChange={(e) => setPctRetour(Number(e.target.value))}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-3 text-center"
                />
                <span className="absolute right-0 top-0 text-[8px] text-slate-400 font-bold pointer-events-none">%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* % COLLECTE */}
          <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
            <div className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Package className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                % COLLECTE
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={pctCollecte}
                  onChange={(e) => setPctCollecte(Number(e.target.value))}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-3 text-center"
                />
                <span className="absolute right-0 top-0 text-[8px] text-slate-400 font-bold pointer-events-none">%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* % EN DEHORS (AXES) */}
          <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
            <div className="w-6 h-6 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                % AXES
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={axesPercent}
                  onChange={(e) => setAxesPercent(Number(e.target.value))}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-3 text-center"
                />
                <span className="absolute right-0 top-0 text-[8px] text-slate-400 font-bold pointer-events-none">%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* % INTERNATIONAL */}
          <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Globe className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                % INTER
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={pctInternational}
                  onChange={(e) => setPctInternational(Number(e.target.value))}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-3 text-center"
                />
                <span className="absolute right-0 top-0 text-[8px] text-slate-400 font-bold pointer-events-none">%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* SHIFT PARAMETER */}
          <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Layers className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                SHIFT
              </label>
              <div className="relative">
                <select
                  value={shiftParam}
                  onChange={(e) => setShiftParam(Number(e.target.value))}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-3 text-center appearance-none cursor-pointer"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
                <div className="absolute right-0 top-0 pointer-events-none">
                  <span className="text-[10px] text-slate-400">▼</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* Button */}
          <div className="flex items-center ml-auto pl-2">
            <button
              onClick={() => handleSimuler()}
              disabled={!poste}
              className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none
                ${!poste ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-gradient-to-r from-[#005EA8] to-blue-600 text-white hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"}
              `}
            >
              <Gauge className="w-3.5 h-3.5" />
              {loading?.simulation ? "Calcul..." : "Lancer Simulation"}
            </button>
          </div>

        </div>
      </div>
      {/* Référentiel & Résultats - Sophisticated layout */}
      {
        showDetails && (
          <div className="flex flex-col gap-3">
            {/* Filtre Famille */}
            {uniqueFamilles.length > 0 && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-slate-50/90 to-slate-50/70 backdrop-blur-sm p-2 rounded-xl border border-slate-200/60 self-start shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filtre Famille:</span>
                <select
                  className="bg-white border border-slate-200/80 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#005EA8]/20 focus:border-[#005EA8] w-full max-w-[240px] transition-all"
                  value={filterFamille}
                  onChange={e => setFilterFamille(e.target.value)}
                >
                  <option value="">Toutes les familles ({uniqueFamilles.length})</option>
                  {uniqueFamilles.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                {filterFamille && (
                  <button
                    onClick={() => setFilterFamille("")}
                    className="text-[10px] text-red-500 hover:text-red-700 font-medium px-2.5 py-1 bg-red-50 rounded-lg border border-red-100 transition-colors hover:bg-red-100"
                    title="Effacer le filtre"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Grid: Référentiel | Arrow | Résultats */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] gap-5 min-h-0 items-start">
              {/* Référentiel */}
              {refDisplay === "tableau" ? (
                <div className="flex flex-col gap-2 w-full">
                  <EnterpriseTable
                    title="Référentiel Temps"
                    subtitle={filterFamille ? `Filtre: ${filterFamille}` : "Base de calcul"}
                    tooltip="Temps moyen nécessaire pour traiter une unité (colis, sac…)"
                    icon={Clock}
                    columns={[
                      { key: 'f', label: 'Famille', align: 'left', width: '120px', ellipsis: true },
                      { key: 't', label: 'Tâche', align: 'left', ellipsis: true },
                      ...(hasPhase ? [{ key: 'ph', label: 'Phase', align: 'left', width: '100px', ellipsis: true }] : []),
                      { key: 'u', label: 'Unité', align: 'left', width: '140px', ellipsis: true },
                      { key: 'm', label: 'Moy. (min)', align: 'right', width: '80px', render: (val) => Number(val || 0).toFixed(5) }
                    ]}
                    data={referentielFiltered.map((r, i) => ({
                      seq: i + 1,
                      f: r.famille || "",
                      t: r.t,
                      ph: r.ph && String(r.ph).trim().toLowerCase() !== "n/a" ? r.ph : "",
                      u: r.u,
                      m: r.m
                    }))}
                    currentView="table"
                    onViewChange={(view) => setRefDisplay(view === 'table' ? 'tableau' : 'graphe')}
                    showViewToggle={true}
                    height={380}
                  />
                </div>
              ) : (
                <Card
                  title={<span className="text-[11px] font-semibold">Référentiel Temps</span>}
                  actions={
                    <div className="flex rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                      <button
                        className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1.5 ${refDisplay === "tableau" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                        onClick={() => setRefDisplay("tableau")}
                      >
                        <TableIcon className="w-3 h-3" /> Tableau
                      </button>
                      <button
                        className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1.5 border-l border-slate-300 ${refDisplay === "graphe" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                        onClick={() => setRefDisplay("graphe")}
                      >
                        <BarChart3 className="w-3 h-3" /> Graphe
                      </button>
                    </div>
                  }
                  bodyClassName="!p-1"
                >
                  <div className="p-1.5 h-[380px]">
                    <GraphReferentielComponent
                      referentiel={referentielFiltered}
                      loading={loading?.referentiel}
                      hasPhase={hasPhase}
                    />
                  </div>
                </Card>
              )}

              {/* Arrow separator */}
              <div className="hidden xl:flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm ring-1 ring-blue-100">
                  <ArrowRight className="w-5 h-5 text-[#005EA8]" />
                </div>
                <span className="text-[10px] font-semibold text-[#005EA8] mt-2 uppercase tracking-wider">
                  Calcul
                </span>
              </div>

              {/* Résultats */}
              {display === "tableau" ? (
                loading?.simulation ? (
                  <Card
                    title={<span className="text-[11px] font-semibold">Résultats de Simulation</span>}
                    bodyClassName="!p-1"
                  >
                    <div className="px-2 py-1 text-slate-500 text-[10px]">
                      Calcul en cours…
                    </div>
                  </Card>
                ) : !hasSimulated ? (
                  <Card
                    title={<span className="text-[11px] font-semibold">Résultats de Simulation</span>}
                    bodyClassName="!p-1"
                  >
                    <EmptyStateFirstRun
                      onSimuler={handleSimuler}
                      disabled={!centre}
                    />
                  </Card>
                ) : simDirty ? (
                  <Card
                    title={<span className="text-[11px] font-semibold">Résultats de Simulation</span>}
                    bodyClassName="!p-1"
                  >
                    <EmptyStateDirty onSimuler={handleSimuler} disabled={!centre} />
                  </Card>
                ) : (mergedResults?.length ?? 0) === 0 ? (
                  <Card
                    title={<span className="text-[11px] font-semibold">Résultats de Simulation</span>}
                    bodyClassName="!p-1"
                  >
                    <div className="px-2 py-1 text-slate-500 text-[10px]">
                      Aucune donnée.
                    </div>
                  </Card>
                ) : (
                  <EnterpriseTable
                    title="Résultats de Simulation"
                    subtitle="Données calculées"
                    tooltip="Volumes × temps → heures nécessaires"
                    icon={CheckCircle2}
                    columns={[
                      { key: 'task', label: 'Tâche', align: 'left', ellipsis: true },
                      { key: 'formule', label: 'Formule', align: 'left', ellipsis: true, width: '250px', render: (val) => <span className="text-[10px] text-slate-500 font-mono">{val || '-'}</span> },
                      { key: 'nombre_Unite', label: 'Unit. (/jour)', align: 'right', width: '100px', render: (val) => formatUnit(val) },
                      { key: 'heures', label: 'Heures', align: 'right', width: '80px', bold: true, render: (val) => Number(val || 0).toFixed(2) }
                    ]}
                    data={mergedResults}
                    footer={null}
                    height={380}
                    currentView="table"
                    onViewChange={(view) => setDisplay(view === 'table' ? 'tableau' : 'graphe')}
                    showViewToggle={true}
                  />
                )
              ) : (
                <Card
                  title={<span className="text-[11px] font-semibold">Résultats de Simulation</span>}
                  actions={
                    <div className="flex rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                      <button
                        className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1.5 ${display === "tableau" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                        onClick={() => setDisplay("tableau")}
                      >
                        <TableIcon className="w-3 h-3" /> Tableau
                      </button>
                      <button
                        className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1.5 border-l border-slate-300 ${display === "graphe" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                        onClick={() => setDisplay("graphe")}
                      >
                        <BarChart3 className="w-3 h-3" /> Graphe
                      </button>
                    </div>
                  }
                  bodyClassName="!p-1"
                >
                  <div className="p-1.5 h-[380px]">
                    {loading?.simulation ? (
                      <div className="px-2 py-1 text-slate-500 text-[10px]">
                        Calcul en cours…
                      </div>
                    ) : !hasSimulated ? (
                      <EmptyStateFirstRun
                        onSimuler={handleSimuler}
                        disabled={!centre}
                      />
                    ) : simDirty ? (
                      <EmptyStateDirty
                        onSimuler={handleSimuler}
                        disabled={!centre}
                      />
                    ) : (
                      <GraphResultatsComponent
                        resultats={mergedResults}
                        totaux={
                          totaux ?? {
                            total_heures: totalHeuresAffichees,
                            heures_net: heuresNet,
                          }
                        }
                        loading={loading?.simulation}
                      />
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )
      }

      {/* Synthèse des Résultats - Sophisticated design */}
      {
        showDetails && hasSimulated && (
          <div className="bg-gradient-to-br from-blue-50/60 via-blue-50/40 to-slate-50/60 border border-blue-100/80 rounded-2xl p-4 mt-2 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#005EA8] to-blue-600 flex items-center justify-center shadow-md">
                <Gauge className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base font-bold text-[#005EA8] tracking-tight">
                Synthèse des Résultats
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 1. Charge Totale */}
              <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-3 min-h-[100px] ring-1 ring-slate-200/60 shadow-md flex flex-col items-center justify-center transition-all hover:ring-blue-200 hover:shadow-lg">
                <div className="text-[11px] font-semibold text-slate-600 mb-1.5">Charge Totale</div>
                <div className="text-2xl font-extrabold text-slate-900">{Number(totalHeuresFinal || 0).toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full mt-1.5 font-medium">heures / jour</div>
              </div>

              {/* 2. Effectif Actuel */}
              {/* 2. Effectif Actuel */}
              <KPICardGlass
                label="Effectif Actuel"
                icon={UserRound}
                tone="slate"
                emphasize
                total={formatSmallNumber((totaux?.total_mod_actuel || 0) + (totaux?.total_moi_actuel || 0) + ((!poste || poste === "__ALL__") ? (totaux?.total_aps_actuel || 0) : 0), 2)}
                toggleable={false}
                customFooter={
                  <div className="flex flex-col w-full px-2 mt-1 gap-1">
                    {/* Statutaire Centered Above */}
                    <div className="flex justify-center border-b border-slate-100 pb-1 mb-0.5">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-fuchsia-600 font-bold uppercase tracking-wide">Statutaire</span>
                        <span className="text-[11px] font-extrabold text-slate-800">{formatSmallNumber((totaux?.total_mod_actuel || 0) + (totaux?.total_moi_actuel || 0), 0)}</span>
                      </div>
                    </div>

                    {/* Breakdown Below */}
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">MOD</span>
                        <span className="text-[10px] font-bold text-slate-700">{formatSmallNumber(totaux?.total_mod_actuel, 0)}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">MOI</span>
                        <span className="text-[10px] font-bold text-slate-700">{formatSmallNumber(totaux?.total_moi_actuel, 0)}</span>
                      </div>
                      {(!poste || poste === "__ALL__") && (
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">APS</span>
                          <span className="text-[10px] font-bold text-slate-700">{formatSmallNumber(totaux?.total_aps_actuel, 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                }
              />

              {/* 3. Effectif Calculé (NO APS/STATUTAIRE) */}
              <KPICardGlass
                label="Effectif Calculé"
                icon={Calculator}
                tone="blue"
                emphasize
                total={formatSmallNumber((totaux?.total_mod_calcule || 0) + (totaux?.total_moi_target || totaux?.total_moi || 0), 2)}
                toggleable={false}
                customFooter={
                  <div className="flex justify-evenly items-center w-full px-2 mt-1">
                    {/* SHOW ONLY MOD AND MOI */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-blue-400 font-bold uppercase">MOD</span>
                      <span className="text-[10px] font-bold text-slate-700">{formatSmallNumber(totaux?.total_mod_calcule, 2)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-blue-400 font-bold uppercase">MOI</span>
                      <span className="text-[10px] font-bold text-slate-700">{formatSmallNumber(totaux?.total_moi_target || totaux?.total_moi, 0)}</span>
                    </div>
                  </div>
                }
              />

              {/* 4. Effectif Arrondi (PROPOSED OPTIMIZED) */}
              <KPICardGlass
                label="Effectif Arrondi"
                icon={CheckCircle2}
                tone="amber"
                emphasize
                total={formatSmallNumber((totaux?.total_mod_target || 0) + (totaux?.total_moi_target || 0) + ((!poste || poste === "__ALL__") ? (totaux?.total_aps_target || 0) : 0), 0)}
                toggleable={false}
                customFooter={
                  <div className="flex justify-between items-center w-full px-2 mt-1">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-amber-500 font-bold uppercase">MOD</span>
                      <span className="text-[10px] font-bold text-slate-800">{formatSmallNumber(totaux?.total_mod_target, 0)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-amber-500 font-bold uppercase">MOI</span>
                      <span className="text-[10px] font-bold text-slate-800">{formatSmallNumber(totaux?.total_moi_target, 0)}</span>
                    </div>
                    {(!poste || poste === "__ALL__") && (
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-amber-500 font-bold uppercase">APS</span>
                        <span className="text-[10px] font-bold text-slate-800">{formatSmallNumber(totaux?.total_aps_target, 0)}</span>
                      </div>
                    )}
                  </div>
                }
              />

              {/* 5. Ecart Total */}
              {(() => {
                const showAPS = (!poste || poste === "__ALL__");

                const targetMOD = totaux?.total_mod_target || 0;
                const targetMOI = totaux?.total_moi_target || 0;
                const targetAPS = totaux?.total_aps_target || 0;

                const actuelMOD = totaux?.total_mod_actuel || 0;
                const actuelMOI = totaux?.total_moi_actuel || 0;
                const actuelAPS = totaux?.total_aps_actuel || 0;

                const targetTotal = targetMOD + targetMOI + (showAPS ? targetAPS : 0);
                const actuelTotal = actuelMOD + actuelMOI + (showAPS ? actuelAPS : 0);

                const ecartVal = targetTotal - actuelTotal;

                const ecartMOD = targetMOD - actuelMOD;
                const ecartMOI = targetMOI - actuelMOI;
                const ecartAPS = targetAPS - actuelAPS;

                const isPositive = ecartVal > 0;

                return (
                  <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl p-3 min-h-[100px] shadow-md flex flex-col items-center justify-between
                    ${isPositive ? "bg-emerald-50/60 border-emerald-100 ring-1 ring-emerald-200" : ecartVal < 0 ? "bg-red-50/60 border-red-100 ring-1 ring-red-200" : "bg-white/70 border-white/60"}
                 `}>
                    <div className="text-[11px] font-semibold text-slate-600 mb-0.5 flex items-center gap-1.5 w-full justify-center">
                      <TrendingUp className="w-3 h-3" /> Ecart Total
                    </div>

                    <div className={`text-2xl font-extrabold -mt-1 ${isPositive ? "text-emerald-600" : ecartVal < 0 ? "text-red-500" : "text-slate-400"}`}>
                      {ecartVal > 0 ? "+" : ""}{formatSmallNumber(ecartVal, 2)}
                    </div>

                    {/* Detailed Breakdown Footer */}
                    <div className="flex justify-between items-center w-full px-1 mt-1 border-t border-slate-200/50 pt-1">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">MOD</span>
                        <span className={`text-[9px] font-bold ${ecartMOD > 0 ? "text-emerald-600" : ecartMOD < 0 ? "text-red-500" : "text-slate-600"}`}>
                          {ecartMOD > 0 ? "+" : ""}{formatSmallNumber(ecartMOD, 1)}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">MOI</span>
                        <span className={`text-[9px] font-bold ${ecartMOI > 0 ? "text-emerald-600" : ecartMOI < 0 ? "text-red-500" : "text-slate-600"}`}>
                          {ecartMOI > 0 ? "+" : ""}{formatSmallNumber(ecartMOI, 1)}
                        </span>
                      </div>
                      {showAPS && (
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] text-slate-500 font-bold uppercase">APS</span>
                          <span className={`text-[9px] font-bold ${ecartAPS > 0 ? "text-emerald-600" : ecartAPS < 0 ? "text-red-500" : "text-slate-600"}`}>
                            {ecartAPS > 0 ? "+" : ""}{formatSmallNumber(ecartAPS, 1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )
      }
    </div>
  );
}

