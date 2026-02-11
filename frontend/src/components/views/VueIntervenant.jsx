/* VueIntervenant.jsx - normalisation /jour + productivité + formatage */
"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as XLSX from 'xlsx';
import { useDebouncedValue } from "../../hooks/useDebounce";
import {
  MapPin,
  Building,
  Tag,
  User,
  Gauge,
  Clock,
  Table as TableIcon,
  BarChart3,
  Sliders,
  Package,
  Mail,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  UserRound,
  Calculator,
  TrendingUp,
  TrendingDown,
  Users, // 🆕 Add Users
  Eye,
  EyeOff,
  Upload,
  Download,
  Box,
  Play,
  CalendarDays
} from "lucide-react";

import { api } from "../../lib/api";

import { EmptyStateFirstRun } from "../states/EmptyStateFirstRun";
import { EmptyStateDirty } from "../states/EmptyStateDirty";

import GraphReferentiel from "@/components/charts/GraphReferentiel";
import GraphResultats from "@/components/charts/GraphResultats";
import VolumeParamsCard from "../intervenant/VolumeParamsCard";
import VirtualizedResultsTable from "../VirtualizedResultsTable";
import ResultHeroCardCompact from "../results/ResultHeroCardCompact";
import EnterpriseTable from "../tables/EnterpriseTable";
import OrganizationalChart from "@/components/centres_uniq/OrganizationalChart"; // 🆕 Import Organigramme
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // 🆕 Import Dialog
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import BandoengGrid from "@/components/centres_uniq/BandoengGrid";
import BandoengAdditionalParams from "@/components/centres_uniq/BandoengAdditionalParams";
import BandoengParameters from "@/components/centres_uniq/BandoengParameters";
import SeasonalityModule from "@/components/centres_uniq/SeasonalityModule";


const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

/* ===================== KPI COMPONENTS (COPIED FROM VUECENTRE) ===================== */
const KPICardGlass = ({
  label, MOD, MOI, extraLabel, extraValue, total, icon: Icon, tone = "blue",
  emphasize = false, leftLabel = "MOD", rightLabel = "MOI", children,
  customFooter, toggleable = false, isOpen = false, onToggle, casValue
}) => {
  const T = {
    blue: { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" },
    cyan: { ring: "ring-cyan-300/60", halo: "from-cyan-400/25", text: "text-cyan-600", dot: "bg-cyan-500" },
    amber: { ring: "ring-amber-300/60", halo: "from-amber-400/25", text: "text-amber-600", dot: "bg-amber-500" },
    green: { ring: "ring-emerald-300/60", halo: "from-emerald-400/25", text: "text-emerald-600", dot: "bg-emerald-500" },
    emerald: { ring: "ring-emerald-300/60", halo: "from-emerald-400/25", text: "text-emerald-600", dot: "bg-emerald-500" },
    rose: { ring: "ring-rose-300/60", halo: "from-rose-400/25", text: "text-rose-600", dot: "bg-rose-500" },
    slate: { ring: "ring-slate-300/60", halo: "from-slate-400/20", text: "text-slate-700", dot: "bg-slate-500" },
    red: { ring: "ring-rose-300/60", halo: "from-rose-400/25", text: "text-rose-600", dot: "bg-rose-500" },
  }[tone] || { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/50 bg-white/55 backdrop-blur-xl p-2.5 min-h-[90px] pb-3 ring-1 ${T.ring} shadow-[0_18px_55px_-18px_rgba(2,6,23,0.20)] transition-all duration-300`}>
      <div aria-hidden className={`pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${T.halo} to-transparent`} />
      {Icon && <Icon aria-hidden className="pointer-events-none absolute right-3 bottom-1 w-7 h-7 opacity-15 text-slate-700" />}

      {toggleable && onToggle && (
        <button type="button" onClick={onToggle} className="absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-full border border-white/70 bg-white/80 p-1 shadow-sm hover:bg-slate-50">
          {isOpen ? <EyeOff className="w-3 h-3 text-slate-500" /> : <Eye className="w-3 h-3 text-slate-500" />}
        </button>
      )}

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
          {/* Tag Cas Spécial ajouté */}
          {casValue && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold mr-2">
              Cas Spécial : {casValue}
            </span>
          )}
          {MOD !== undefined && <div>{leftLabel}: {MOD}</div>}
          {MOI !== undefined && <div>{rightLabel}: {MOI}</div>}
          {extraValue !== undefined && extraLabel && <div>{extraLabel}: {extraValue}</div>}
        </div>
      ))}
    </div>
  );
};

const formatSigned = (v) => {
  if (!v) return "0";
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return n > 0 ? `+${n}` : `${n}`;
};

const EffectifFooter = ({ totalLabel, totalValue, modValue, moiValue, apsLabel, apsValue }) => (
  <div className="text-[10px] text-slate-600 space-y-1.5">
    {totalValue !== undefined && (
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-50 px-2 py-1">
        {totalLabel && <span className="font-semibold text-slate-700">{totalLabel}</span>}
        <span className="px-2 py-0.5 rounded-full bg-white text-slate-800 font-semibold shadow-sm">Total : {totalValue}</span>
      </div>
    )}
    <div className="flex items-center justify-center gap-2">
      <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#005EA8]">MOD : {modValue}</span>
      {moiValue !== undefined && moiValue !== null && (
        <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">MOI : {moiValue}</span>
      )}
    </div>
    {(apsValue !== undefined && apsValue !== null) && (
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-emerald-50/70 px-2 py-1">
        <span className="font-semibold text-emerald-800">{apsLabel || "APS"}</span>
        <span className="px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 font-semibold shadow-sm">Total APS : {apsValue}</span>
      </div>
    )}
  </div>
);
import Tooltip from "../ui/Tooltip";
import "../tables/EnterpriseTable.css";
import "../../styles/tooltips.css";
import { CardContent } from "../card";

// 🆕 Helper pour catégoriser les postes (Généralisation Bandoeng)
const getCategory = (poste) => {
  // 1. API Category (from HierarchiePostes)
  if (poste.category) return poste.category;

  // 2. Keyword Mapping Fallback
  const label = (poste.label || poste.nom_poste || "").toUpperCase();
  if (label.includes("GUICHET") || label.includes("GAB")) return "GUICHET";
  if (label.includes("FACTEUR") || label.includes("DISTRIBUTION")) return "TERRAIN";
  if (label.includes("CHAUFFEUR")) return "CHAUFFEUR / COURSIER";
  if (label.includes("TRI") || label.includes("ACHEMINEMENT") || label.includes("OPERATIONS") || label.includes("BRIGADE") || label.includes("CTD")) return "OPERATION CTD";
  if (label.includes("ACCUEIL") || label.includes("CLIENTELE") || label.includes("ADMIN") || label.includes("RH") || label.includes("MOYENS")) return "OPERATION ADMIN";
  if (label.includes("MANUTENTION")) return "MANUTENTION";

  // Default
  return "AUTRES";
};


export default function VueIntervenant({
  regions = [],
  centres = [],
  postesOptions = [],
  loading = {},
  region,
  setRegion,
  centre,
  setCentre,
  centreCategorie,
  poste,
  setPoste,
  colis,
  setColis,
  colisParCollecte,
  setColisParCollecte,
  courrierOrdinaire,
  setCourrierOrdinaire,
  courrierRecommande,
  setCourrierRecommande,
  ebarkia,
  setEbarkia,
  lrh,
  setLrh,
  amana,
  setAmana,
  pctAxesArrivee, setPctAxesArrivee,
  pctAxesDepart, setPctAxesDepart,
  pctInternational = 0, setPctInternational = () => { },
  pctNational = 100, setPctNational = () => { },
  pctMarcheOrdinaire = 0, setPctMarcheOrdinaire = () => { },
  productivite,
  setProductivite,
  heuresNet,
  setHeuresNet,
  onSimuler,
  onRefresh = () => { },
  display,
  setDisplay,
  refDisplay,
  setRefDisplay,
  hasPhase,
  referentiel = [],
  resultats = [],
  totaux,
  hasSimulated,
  simDirty,
  Card,
  Field,
  Input,
  Select,
  Segmented,
  EmptyStateFirstRun,
  EmptyStateDirty,
  GraphReferentiel,
  GraphResultats,
  // ➕ Nouveaux props pour synchronisation globale
  idleMinutes,
  setIdleMinutes,
  colisAmanaParSac,
  setColisAmanaParSac,
  courriersParSac,
  setCourriersParSac,
  // 🆕 Grille Flux (persistance detailed grid)
  volumesFluxGrid = null,
  setVolumesFluxGrid = () => { },
  // 🆕 Unified Grid Props
  gridValues,
  handleGridChange,
  colisAmanaParCanvaSac,
  setColisAmanaParCanvaSac,
  edPercent = 60,
  setEdPercent = () => { },
  nbrCoSac = 0,
  setNbrCoSac = () => { },
  nbrCrSac = 0,
  setNbrCrSac = () => { },
  crParCaisson = 500,
  setCrParCaisson = () => { },
  pctCollecte = 5.0,
  setPctCollecte = () => { },
  pctRetour = 0.0,
  setPctRetour = () => { },
  tauxComplexite = 1,
  setTauxComplexite = () => { },
  natureGeo = 1,
  setNatureGeo = () => { },
  shift = 1,
  setShift = () => { },
  categories = [],
  selectedTypology = "",
  setSelectedTypology = () => { },
  onImportBandoeng,
  onDownloadTemplate,
}) {
  const fileInputRef = useRef(null);

  // 🆕 État local pour les détails officiels du centre (Alignement Bandoeng)
  const [internalCentreDetails, setInternalCentreDetails] = useState(null);

  // 🆕 Effet pour charger les détails officiels quand le centre change
  useEffect(() => {
    if (!centre) {
      setInternalCentreDetails(null);
      return;
    }

    let cancelled = false;
    const fetchDetails = async () => {
      try {
        // On utilise fetch directement pour éviter de modifier api.js global
        const res = await fetch(`/api/bandoeng/centre-details/${centre}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setInternalCentreDetails(data);
        }
      } catch (e) {
        console.warn("Erreur chargement détails centre:", e);
      }
    };

    fetchDetails();

    return () => { cancelled = true; };
  }, [centre]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onImportBandoeng) {
      onImportBandoeng(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const JOURS_OUVRES_AN = 264;
  const PAGE_SCALE = 0.8;

  // 🗑️ États locaux supprimés car maintenant globaux (via props)
  // const [colisAmanaParSac, setColisAmanaParSac] = useState(5);
  // const [courriersParSac, setCourriersParSac] = useState(4500);
  // 🗑️ États locaux supprimés car maintenant globaux (via props)
  // const [colisAmanaParSac, setColisAmanaParSac] = useState(5);
  // const [courriersParSac, setCourriersParSac] = useState(4500);
  // const [nbrCoSac, setNbrCoSac] = useState(0);
  // const [nbrCrSac, setNbrCrSac] = useState(0);
  // const [edPercent, setEdPercent] = useState(0); // 🆕 % En dehors (ED)

  const [partParticuliers, setPartParticuliers] = useState(75);
  const partProfessionnels = 100 - partParticuliers;

  // 🗑️ idleMinutes maintenant global
  // const [idleMinutes, setIdleMinutes] = useState(0);
  // const [tauxComplexite, setTauxComplexite] = useState(1);
  // const [natureGeo, setNatureGeo] = useState(1);
  const [heuresBrutes, setHeuresBrutes] = useState(8.0); // avant temps mort

  // 🎨 UX : État pour afficher/masquer les détails
  const [showDetails, setShowDetails] = useState(true);

  // 🆕 Filtre famille
  const [filterFamille, setFilterFamille] = useState("");

  // 🆕 State local pour Bandoeng UI (si non géré par parent)
  const [pctSac, setPctSac] = useState(60);

  // 🆕 Liste des familles uniques
  const uniqueFamilles = useMemo(() => {
    const s = new Set((referentiel || []).map(r => r.famille).filter(Boolean));
    return Array.from(s).sort();
  }, [referentiel]);

  // 🆕 Paramètre Collecte (Local -> Global)
  // const [pctCollecte, setPctCollecte] = useState(5.0);
  // 🆕 Paramètre Retour (Local -> Global)
  // const [pctRetour, setPctRetour] = useState(0.0);

  // State for Import
  const [isImporting, setIsImporting] = useState(false);

  const handleImportCanva = async () => {
    if (!centre) return;

    // Determine file based on Typology
    const cat = String(centreCategorie || "").toUpperCase();
    const isAmType = cat.includes("AM") || cat.includes("MESSAGERIE");
    const fileName = isAmType ? "canva_CM_FES.xlsx" : "Canvas.xlsx";

    if (!confirm(`Voulez-vous importer les tâches par défaut depuis le fichier ${fileName} ?\nCela ajoutera les tâches par défaut à ce centre.`)) return;

    try {
      setIsImporting(true);
      // 1. Fetch from public folder
      const response = await fetch(`/${fileName}`);
      if (!response.ok) throw new Error(`Le fichier modèle '${fileName}' est introuvable sur le serveur.`);

      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      // 2. Import via API
      console.log(`Importing ${fileName} for centre:`, centre);
      const res = await api.importTaches(centre, file);

      if (res.status === 'imported') {
        // alert(`Import réussi : ${res.count} tâches importées.`);
        if (onRefresh) onRefresh();
      } else {
        throw new Error(res.message || "Erreur lors de l'import");
      }

    } catch (err) {
      console.error(err);
      alert("Erreur: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // ✅ OPTIMISATION : Debounce des valeurs pour éviter les recalculs excessifs
  const debouncedColis = useDebouncedValue(colis, 300);
  const debouncedCourrierOrdinaire = useDebouncedValue(courrierOrdinaire, 300);
  const debouncedCourrierRecommande = useDebouncedValue(courrierRecommande, 300);
  const debouncedEbarkia = useDebouncedValue(ebarkia, 300);
  const debouncedLrh = useDebouncedValue(lrh, 300);
  const debouncedAmana = useDebouncedValue(amana, 300);
  const debouncedProductivite = useDebouncedValue(productivite, 500);
  const debouncedIdleMinutes = useDebouncedValue(idleMinutes, 500);

  // 🔍 LOG TEMPORAIRE : Pour voir le debounce en action
  React.useEffect(() => {
    console.log('✅ OPTIMISATION ACTIVE : Valeur immédiate (colis):', colis);
    console.log('⏱️ DEBOUNCE : Valeur debouncée (300ms après):', debouncedColis);
  }, [debouncedColis, colis]);

  // ✍️ Synchronisation des facteurs de conversion (locaux -> globaux)
  const updateColisAmanaParSac = (v) => setColisAmanaParSac(v);
  const updateCourriersParSac = (v) => setCourriersParSac(v);

  const sanitize = (val) =>
    String(val ?? "")
      .replace(/\s|[\u00A0\u202F]/g, "")
      .replace(/[^0-9.,-]/g, "")
      .replace(/,/g, ".");

  const parseNonNeg = (val) => {
    const s = sanitize(val);
    if (s === "") return undefined;
    const n = parseFloat(s);
    if (!Number.isFinite(n)) return undefined;
    return n < 0 ? 0 : n;
  };

  const toInput = (v) =>
    v === 0 || v === null || v === undefined ? "" : String(v);

  const formatUnit = (x) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(
      Number(x || 0)
    );

  const monthly = (valNumOrText) => {
    const n =
      typeof valNumOrText === "number"
        ? valNumOrText
        : parseNonNeg(valNumOrText);
    if (n === undefined) return undefined;
    return n / 12;
  };

  const ratioPart = partParticuliers / 100;
  const ratioProf = partProfessionnels / 100;

  const splitFlux = (total) => {
    const v = Number(total ?? 0);
    return { part: v * ratioPart, prof: v * ratioProf };
  };

  // 🔹 Productivité + temps mort → heures nettes
  // ✅ OPTIMISATION : Utilise les valeurs debouncées pour éviter les recalculs excessifs
  // 🔹 Capacité Nette (SANS REDUCTION PAR PRODUCTIVITE car déjà intégrée dans les charges tâches)
  useEffect(() => {
    const heuresBase = 8.0;
    const p = Number(debouncedProductivite ?? 100) / 100; // 0..infinity
    const idleH = Number(debouncedIdleMinutes || 0) / 60;

    // Formule demandée : La productivité augmente la capacité horaire apparente
    // (8h * 120%) - 30min = 9.6h - 0.5h = 9.1h
    const heuresProductives = heuresBase * (p > 0 ? p : 1);

    const heuresNettes = Math.max(0, heuresProductives - idleH);

    setHeuresBrutes(heuresBase);
    setHeuresNet(heuresNettes.toFixed(2));
  }, [debouncedIdleMinutes, debouncedProductivite, setHeuresNet]);

  // 🆕 AUTO-BALANCE LOGIC for Bandoeng Parameters
  // Wrapper functions to auto-balance complementary percentages
  // Using useCallback to prevent recreation on each render (fixes input focus loss)
  const handlePctAxesArriveeChange = React.useCallback((val) => {
    const axes = Math.max(0, Math.min(100, Number(val || 0)));
    setPctAxesArrivee(axes);
    setPctAxesDepart(100 - axes); // Auto-balance Local
  }, [setPctAxesArrivee, setPctAxesDepart]);

  const handlePctAxesDepartChange = React.useCallback((val) => {
    const local = Math.max(0, Math.min(100, Number(val || 0)));
    setPctAxesDepart(local);
    setPctAxesArrivee(100 - local); // Auto-balance Axes
  }, [setPctAxesDepart, setPctAxesArrivee]);

  const handlePctInternationalChange = React.useCallback((val) => {
    const inter = Math.max(0, Math.min(100, Number(val || 0)));
    setPctInternational(inter);
    setPctNational(100 - inter); // Auto-balance National
  }, [setPctInternational, setPctNational]);

  const handlePctNationalChange = React.useCallback((val) => {
    const nat = Math.max(0, Math.min(100, Number(val || 0)));
    setPctNational(nat);
    setPctInternational(100 - nat); // Auto-balance International
  }, [setPctNational, setPctInternational]);

  const posteValue = poste == null ? "" : String(poste);

  // 🆕 Détection Typologie AM (Agence Messagerie) pour désactivation
  const isAM = useMemo(() => {
    const c = String(centreCategorie || "").toUpperCase();
    return c.includes("AM") || c.includes("MESSAGERIE");
  }, [centreCategorie]);


  const getEffectiveFluxMode = (categorie, key) => {
    return "input";
  };

  // ✅ Vérifie si un poste spécifique est sélectionné (pas "__ALL__" ou vide)
  const isPosteSpecifique = Boolean(poste && String(poste) !== "__ALL__");

  const minutesAjustees = (min) => {
    const p = Number(debouncedProductivite ?? 100);
    return p > 0 ? min / (p / 100) : min;
  };

  // ✅ OPTIMISATION : Memoization des valeurs annuelles
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

  // ✅ Normalisation robuste pour le matching des noms de tâches
  const normalizeKey = (str) => String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

  const resIndex = new Map();
  (resultats || []).forEach((r) => {
    if (r.id) resIndex.set(String(r.id), r);
    // Indexer aussi par nom normalisé pour le fallback
    resIndex.set(normalizeKey(r.task || r.nom_tache), r);
  });


  function nombreUniteParUnite(unite, taskName, taskData = {}) {
    if (!hasAnyVolume) {
      const u0 = String(unite || "")
        .trim()
        .toLowerCase();
      if (u0 === "machine") return 0;
      return 0;
    }

    const uRaw = String(unite || "")
      .trim()
      .toLowerCase();
    const typeFlux = String(taskData.type_flux || "").toLowerCase();
    const nom = String(taskName || "").toLowerCase();

    const annualCO = annualIfAllowed("courrierOrdinaire");
    const annualCR = annualIfAllowed("courrierRecommande");
    const annualEB = annualIfAllowed("ebarkia");
    const annualLRH = annualIfAllowed("lrh");
    const annualAmana = annualIfAllowed("amana");

    const dailyAmanaColis = annualAmana / JOURS_OUVRES_AN;
    const dailyAmanaSacs = dailyAmanaColis / colisAmanaParSac;

    const isCollecteColis = nom.includes("collecte") && nom.includes("colis");

    if (isCollecteColis) {
      const colisInput = parseNonNeg(debouncedColis) ?? 0;
      if (colisInput <= 0) return 0;

      const ratioCollecteBrut =
        parseNonNeg(taskData.colis_par_collecte) ??
        parseNonNeg(colisParCollecte);
      const ratioCollecte = Math.max(1, ratioCollecteBrut ?? 1);

      return colisInput / ratioCollecte;
    }

    if (uRaw.includes("colis") || uRaw === "amana") {
      if (dailyAmanaColis > 0) return dailyAmanaColis;
      return parseNonNeg(debouncedColis) ?? 0;
    }

    if (uRaw.includes("sac")) {
      const isAmanaTask =
        nom.includes("amana") || typeFlux === "amana" || uRaw.includes("amana");

      if (isAmanaTask) return dailyAmanaSacs;

      if (uRaw.includes("courrier")) {
        let annualCourrier = 0;
        if (typeFlux === "ordinaire") annualCourrier = annualCO;
        else if (typeFlux === "recommande" || typeFlux === "recommandé")
          annualCourrier = annualCR;
        else if (typeFlux === "ebarkia") annualCourrier = annualEB;
        else if (typeFlux === "lrh") annualCourrier = annualLRH;
        else annualCourrier = annualCO + annualCR + annualEB + annualLRH;

        return annualCourrier / JOURS_OUVRES_AN / courriersParSac;
      }

      const sacsInput = parseNonNeg(taskData.sacs) ?? 0;
      if (sacsInput > 0) return sacsInput;

      if (dailyAmanaColis > 0) return dailyAmanaSacs;

      const colisInput = parseNonNeg(debouncedColis) ?? 0;
      if (colisInput > 0) {
        // 🆕 Estimation Frontend : Appliquer le taux de mise en sac (edPercent)
        // edPercent est par convention le % SAC (selon demande récente)
        const tauxSac = (edPercent ?? 100) / 100;
        return (colisInput * tauxSac) / colisAmanaParSac;
      }

      return 0;
    }

    if (
      uRaw === "courrier" ||
      uRaw === "courriers" ||
      uRaw === "courrier_recommande" ||
      uRaw === "courrier recommandé"
    ) {
      let annualCourrier = 0;

      if (typeFlux === "ordinaire") annualCourrier = annualCO;
      else if (typeFlux === "recommande" || typeFlux === "recommandé")
        annualCourrier = annualCR;
      else if (typeFlux === "ebarkia") annualCourrier = annualEB;
      else if (typeFlux === "lrh") annualCourrier = annualLRH;
      else annualCourrier = annualCO + annualCR;

      return annualCourrier / JOURS_OUVRES_AN;
    }

    if (uRaw === "machine") return 0;
    return 0;
  }

  // 🔹 Filtrer le référentiel pour exclure les tâches avec moyenne_min = 0 ET filtrer par famille
  const referentielFiltered = useMemo(() => {
    return (referentiel || []).filter((row) => {
      // const hasMin = Number(row.m ?? 0) > 0; // 🗑️ On garde meme si 0 selon demande
      const matchFamille = !filterFamille || row.famille === filterFamille;
      return matchFamille;
    });
  }, [referentiel, filterFamille]);

  const referentielDisplayData = useMemo(() => {
    // DEBUG: Check order values
    if (referentielFiltered.length > 0) {
      console.log("🔍 [VueIntervenant] Referentiel Sample:", referentielFiltered.slice(0, 3).map(r => ({ t: r.t, ordre: r.ordre })));
    }
    const groups = new Map();
    referentielFiltered.forEach((r) => {
      // Clé de regroupement : Nom Tâche + Famille + Phase + Unité
      // On groupe pour fusionner les responsables
      const key = `${(r.t || "").trim()}|${r.famille || ""}|${r.ph || ""}|${r.u || ""}`;

      if (!groups.has(key)) {
        groups.set(key, { ...r, responsibles: [] });
      }
      const g = groups.get(key);
      const resp = r.nom_poste || r.poste_label || r.poste || "-";

      // Ajout unique du responsable
      if (resp !== "-" && !g.responsibles.includes(resp)) {
        g.responsibles.push(resp);
      }
    });

    // DEBUG: Vérifier l'ordre AVANT le tri
    const beforeSort = Array.from(groups.values());
    console.log("🔍 [AVANT TRI] Premières tâches:", beforeSort.slice(0, 5).map(r => ({ t: r.t, ordre: r.ordre })));

    // Trier par ordre croissant
    const sorted = beforeSort.sort((a, b) => {
      const orderA = a.ordre !== null && a.ordre !== undefined ? Number(a.ordre) : 999999;
      const orderB = b.ordre !== null && b.ordre !== undefined ? Number(b.ordre) : 999999;
      console.log(`Comparing: "${a.t?.substring(0, 20)}" (${orderA}) vs "${b.t?.substring(0, 20)}" (${orderB}) = ${orderA - orderB}`);
      return orderA - orderB;
    });

    console.log("🔍 [APRÈS TRI] Premières tâches:", sorted.slice(0, 10).map(r => ({ t: r.t, ordre: r.ordre })));
    return sorted;
  }, [referentielFiltered]);

  // ✅ OPTIMISATION : Memoization des résultats fusionnés ET du total brut
  const [mergedResults, totalHeuresAffichees] = useMemo(() => {
    const raw = referentielFiltered.map((row, i) => {
      const taskName = String(row.t || row.task || "").trim();
      const fromBack = (row.id && resIndex.get(String(row.id))) || resIndex.get(normalizeKey(taskName));
      const moyenneMin = Number(row.m ?? 0);

      // Si le backend a déjà calculé les heures, on les préfère !
      const hasBackResults = fromBack && (fromBack.heures !== undefined);
      const isActive = String(row.etat || "A").trim().toUpperCase() !== "NA";

      const nbJour = isActive
        ? (fromBack?.nombre_unite ??
          fromBack?.nombre_Unite ??
          nombreUniteParUnite(row.u, taskName, row))
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
        task: (taskName || "").replace(/\s*\([^)]*\)/g, "").trim(),
        formule: fromBack?.formule || "N/A",
        nombre_Unite: Number(nbJour || 0),
        heures: heuresLoc,
        produit: (row.p || row.produit || "").replace(/Arrivé|Arrive|Reçu|Recu|Dépôt|Dépot|Depot|MED/gi, "").trim(),
        moyenne_min: moyenneMin,
        unite_mesure: row.u,
        _u: row.u,
        _type_flux: row.type_flux,
        _fromBack: fromBack,
      };
    });

    // ✅ CALCUL DU TOTAL BRUT (Avant filtrage 0.005h) pour alignement avec le backend
    const totalBrut = raw.reduce((acc, r) => acc + Number(r.heures || 0), 0);

    // ✅ FILTRAGE POUR L'AFFICHAGE DU TABLEAU
    let res = raw.filter(r => Number(r.heures || 0) > 0.005);

    // 🆕 Fallback pour postes MOI (Structurels)
    if (res.length === 0 && hasSimulated && poste) {
      const pObj = (postesOptions || []).find(p => String(p.id) === String(poste));
      const isMoi = pObj?.type_poste === 'MOI' || pObj?.is_moi;

      if (isMoi) {
        const hMoi = Number(heuresNet || 7.33);
        const moiTask = {
          seq: 1,
          task: "Activité Structurelle (MOI)",
          formule: "Poste Forfaitaire (Non piloté par le volume)",
          nombre_Unite: 1,
          heures: hMoi,
          _u: "Jour",
          _type_flux: "Structurel",
          _fromBack: null
        };
        return [[moiTask], hMoi];
      }
    }

    return [res, totalBrut];
  }, [referentielFiltered, resIndex, annualValues, debouncedColis, debouncedProductivite, colisAmanaParSac, courriersParSac, colisParCollecte, hasSimulated, poste, postesOptions, heuresNet]);

  // ✅ SECURITÉ : Utiliser le total heures du backend s'il est disponible (Data-Driven)
  const totalHeuresFinal = useMemo(() => {
    if (totaux && typeof totaux.total_heures === 'number') {
      return totaux.total_heures;
    }
    return totalHeuresAffichees;
  }, [totalHeuresAffichees, totaux]);

  // 🆕 Calcul du suffixe de titre (Poste ou Centre)
  const titleSuffix = useMemo(() => {
    // Recalcul local pour éviter ReferenceError sur selectedPosteObj
    const locPoste = (postesOptions || []).find(p => String(p.id) === String(poste));

    // Cas 1: Poste sélectionné (et pas "Tous")
    // Note: "__ALL__" est often l'ID pour "Tous"
    if (locPoste && String(locPoste.id) !== "__ALL__" && locPoste.label !== "Tous") {
      return ` - ${locPoste.label || locPoste.name}`;
    }
    // Cas 2: "Tous" ou pas de poste -> Afficher le nom du centre
    if (centres && centres.length > 0 && centre) {
      const c = centres.find(ct => String(ct.id) === String(centre));
      if (c) return ` - ${c.nom || c.label || c.name || "Centre"}`;
    }
    return "";
  }, [postesOptions, poste, centres, centre]);

  // 🆕 Détection Mode Test
  const isTestMode = useMemo(() => String(titleSuffix || "").toLowerCase().includes("test"), [titleSuffix]);

  const baseHeuresNet = Number(heuresNet || 0);

  // ✅ OPTIMISATION : Memoization du calcul FTE
  const fteCalcAffiche = useMemo(() => {
    // Si le backend fournit le total calculé (Data-Driven), on l'utilise pour garantir la cohérence
    if (totaux && typeof totaux.fte_calcule === 'number') {
      return totaux.fte_calcule;
    }
    return baseHeuresNet > 0 ? totalHeuresFinal / baseHeuresNet : 0;
  }, [totalHeuresFinal, baseHeuresNet, totaux]);



  const roundHalfUp = (n, decimals = 0) => {
    const f = 10 ** decimals;
    return Math.floor(n * f + 0.5) / f;
  };

  // ✅ OPTIMISATION : Memoization du handler de simulation
  const fteArrondiAffiche = useMemo(() => {
    // Force l'arrondi mathématique standard (cohérent avec VueCentre)
    return fteCalcAffiche <= 0.1 ? 0 : Math.round(fteCalcAffiche);
  }, [fteCalcAffiche]);

  // 🆕 Calcul de l'écart
  const selectedPosteObj = useMemo(() => {
    if (!poste) return null;
    return (postesOptions || []).find(p => String(p.id) === String(poste));
  }, [postesOptions, poste]);

  const effectifActuel = selectedPosteObj?.effectif_actuel ? Number(selectedPosteObj.effectif_actuel) : 0;
  const ecart = effectifActuel - fteCalcAffiche;

  // 🆕 Typologie et Décomposition (pour KPICardGlass) - ALIGNEMENT VUE CENTRE (Détection Agressive)
  const isMoiPoste = (p) => {
    if (!p) return false;
    const type = (p.type_poste || "").toUpperCase();
    const label = (p.poste_label || p.label || "").toUpperCase();
    const isKeyword = label.includes("RECEVEUR") ||
      label.includes("CHEF") ||
      label.includes("DIRECTEUR") ||
      label.includes("GERANT") ||
      label.includes("RESPONSABLE") ||
      label.includes("ADJOINT") ||
      label.includes("ASSISTANT") ||
      label.includes("ADMIN") ||
      label.includes("RH") ||
      label.includes("RESSOURCES") ||
      label.includes("SECRETAIRE") ||
      label.includes("SUPPORT") ||
      label.includes("QUALITE") ||
      label.includes("PILOTE") ||
      label.includes("COORDINATEUR") ||
      label.includes("ENCADR") ||
      label.includes("SUPERVISEUR");

    return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || isKeyword || !!p.is_moi;
  };

  const flagMoi = isMoiPoste(selectedPosteObj);
  const isMOD = !flagMoi;

  // 🆕 Calcul du MOI Global (Centre) - Demande Utilisateur : Afficher MOI comme page centre
  const totalMoiGlobal = useMemo(() => {
    if (!postesOptions || postesOptions.length === 0) return 0;

    const total = postesOptions.reduce((acc, p) => {
      const isM = isMoiPoste(p);
      return acc + (isM ? Number(p.effectif_actuel || 0) : 0);
    }, 0);

    // 🚨 ALIGNEMENT VUE CENTRE : Si le total est 0 (même si des postes MOI existent mais vides), on force 1
    return total;
  }, [postesOptions]);

  // 🆕 Calcul des totaux globaux du centre (pour affichage quand "Tous" est sélectionné)
  const totalEffectifCentreStats = useMemo(() => {
    if (!postesOptions || postesOptions.length === 0) return { total: 0, mod: 0, moi: 0 };
    return postesOptions.reduce((acc, p) => {
      const eff = Number(p.effectif_actuel || 0);
      acc.total += eff;
      if (isMoiPoste(p)) {
        acc.moi += eff;
      } else {
        acc.mod += eff;
      }
      return acc;
    }, { total: 0, mod: 0, moi: 0 });
  }, [postesOptions]);

  const isGlobalView = !poste || String(poste) === "__ALL__" || (selectedPosteObj && selectedPosteObj.label === "Tous");

  const effAPS = Number(selectedPosteObj?.effectif_aps || selectedPosteObj?.eff_aps || 0);
  const selectedCentreWithAPS = centres ? centres.find(c => String(c.id) === String(centre)) : null;
  // ✅ APS : Priorité à la valeur globale T_APS du centre (Database)
  // ✅ APS : Valeur globale APS du centre (Database)
  const apsGlobalCentre = selectedCentreWithAPS?.aps ? Number(selectedCentreWithAPS.aps) : 0;

  // 🆕 Récupération du Cas Spécial
  const casValue = selectedCentreWithAPS?.cas;

  // 🆕 Helper pour formater petits nombres
  const formatSmallNumber = (v) => Number(v || 0).toFixed(2).replace('.', ',');

  const formatSigned = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "0";
    return num > 0 ? `+${num}` : `${num}`;
  };

  // 🆕 Logique d'affichage KPI alignée sur Bandoeng
  const kpiData = useMemo(() => {

    const etpCalcValue = isGlobalView
      ? (totaux?.total_heures ? totaux.fte_calcule : 0)
      : fteCalcAffiche;

    let actualMOD = 0;
    let actualMOI = 0;
    let actualAPS = 0;
    let actualStatutaire = 0;
    let actualTotal = 0;

    // ✅ Priorité aux données officielles de la base (Logique BandoengSimulation)
    if (isGlobalView && internalCentreDetails) {
      actualMOD = Number(internalCentreDetails.mod_global || 0);
      actualMOI = Number(internalCentreDetails.moi_global || 0);
      actualAPS = Number(internalCentreDetails.aps || 0);
      // Total Statutaire = MOD + MOI (sans APS)
      actualStatutaire = actualMOD + actualMOI;
      // Total Général = Statutaire + APS
      actualTotal = actualStatutaire + actualAPS;
    } else {
      // 🔄 Fallback Standard ou Calcul par poste
      if (selectedPosteObj) {
        // Vue Individuelle
        const val = Number(selectedPosteObj.effectif_actuel || 0);
        if (isMoiPoste(selectedPosteObj)) {
          actualMOI = val;
          actualMOD = 0;
        } else {
          actualMOD = val;
          actualMOI = 0;
        }
        actualStatutaire = actualMOD + actualMOI;
        actualTotal = actualStatutaire; // APS ignorés en vue individuelle
        actualAPS = 0;
      } else {
        // Vue Globale (Fallback si pas de détails chargés)
        actualMOD = totalEffectifCentreStats.mod;
        actualMOI = totalMoiGlobal;
        actualAPS = apsGlobalCentre;
        actualStatutaire = actualMOD + actualMOI;
        actualTotal = actualStatutaire + actualAPS;
      }
    }

    const targetCalculatedMOD = isGlobalView ? etpCalcValue : (isMOD ? fteCalcAffiche : 0);
    const targetCalculatedMOI = isGlobalView ? totalMoiGlobal : (isMoiPoste(selectedPosteObj) ? effectifActuel : 0);
    const totalCalculated = targetCalculatedMOD + targetCalculatedMOI;

    const targetFinalMOD = isGlobalView ? Math.round(etpCalcValue) : (isMOD ? fteArrondiAffiche : 0);
    // Pour MOI, si vue globale et details dispos, on prend la valeur officielle aussi pour la cible (souvent identique)
    // Mais attention, la CIBLE MOI est généralement l'existant.
    const targetFinalMOI = isGlobalView
      ? (internalCentreDetails ? internalCentreDetails.moi_global : totalMoiGlobal)
      : (isMoiPoste(selectedPosteObj) ? effectifActuel : 0);

    const totalFinal = targetFinalMOD + targetFinalMOI;

    // Logique APS
    const statutaireCible = totalFinal;
    const ecartCible = statutaireCible - actualStatutaire;
    const apsCalculeDisplay = ecartCible > 0 ? ecartCible : 0;

    // Ecarts
    const apsActual = actualAPS;
    const apsDelta = apsCalculeDisplay - apsActual;

    const diffMOD = targetFinalMOD - actualMOD;
    const diffMOI = targetFinalMOI - actualMOI;
    const diffStatutaire = statutaireCible - actualStatutaire;

    const isIndividual = !isGlobalView;
    const valToDisplay = isIndividual ? diffStatutaire : (apsDelta > 0 ? apsDelta : 0);
    const tone = valToDisplay > 0 ? "rose" : "emerald";
    const totalDisplay = isIndividual ? formatSigned(Math.round(valToDisplay)) : (valToDisplay > 0 ? `+${Math.round(valToDisplay)}` : "0");

    return {
      actualMOD, actualMOI, actualAPS, actualStatutaire, actualTotal,
      targetCalculatedMOD, targetCalculatedMOI, totalCalculated,
      targetFinalMOD, targetFinalMOI, totalFinal,
      apsCalculeDisplay, valToDisplay, apsDelta,
      diffMOD, diffMOI, diffStatutaire,
      isIndividual, tone, totalDisplay
    };
  }, [selectedPosteObj, totalEffectifCentreStats, totalMoiGlobal, apsGlobalCentre, isGlobalView, totaux, isMOD, fteCalcAffiche, effectifActuel, fteArrondiAffiche, internalCentreDetails]);

  const handleSimuler = useCallback((overrides = {}) => {
    console.log("🖱️ [VueIntervenant] Click Simuler. State Taux:", tauxComplexite, "NatureGeo:", natureGeo);

    onSimuler({
      taux_complexite: Number(tauxComplexite || 1),
      nature_geo: Number(natureGeo || 1),
      pct_axes_arrivee: Number(pctAxesArrivee || 0),
      pct_axes_depart: Number(pctAxesDepart || 0),
      pct_national: Number(pctNational || 100),
      pct_marche_ordinaire: Number(pctMarcheOrdinaire || 0),
      pct_international: Number(pctInternational || 0),
      colis_amana_par_canva_sac: Number(colisAmanaParCanvaSac || 35),
      nbr_co_sac: Number(nbrCoSac || 350),
      nbr_cr_sac: Number(nbrCrSac || 400),
      productivite: Number(productivite ?? 100),
      idle_minutes: Number(idleMinutes || 0),
      shift: Number(shift || 1),
      pct_collecte: Number(pctCollecte || 0),
      pct_retour: Number(pctRetour || 0),
      ...overrides
    });
  }, [
    onSimuler,
    tauxComplexite,
    natureGeo,
    pctAxesArrivee,
    pctAxesDepart,
    pctNational,
    pctMarcheOrdinaire,
    pctInternational,
    colisAmanaParCanvaSac,
    nbrCoSac,
    nbrCrSac,
    productivite,
    idleMinutes,
    shift,
    pctCollecte,
    pctRetour
  ]);

  const handleSimulateAnnual = async (monthlyPcts) => {
    if (!centre) {
      toast.error("Veuillez sélectionner un centre");
      return null;
    }

    // On utilise la même logique que handleSimulate mais dans une boucle
    // Note: on utilise simulateBandoeng directement pour récupérer les résultats
    const monthsData = [];
    try {
      for (let i = 0; i < 12; i++) {
        const pct = monthlyPcts[i];

        const payload = {
          centre_id: centre,
          poste_code: null, // Force full center simulation for seasonality (ignores page filter)
          grid_values: JSON.parse(JSON.stringify(gridValues)),
          parameters: {
            taux_complexite: Number(tauxComplexite || 1),
            nature_geo: Number(natureGeo || 1),
            pct_axes_arrivee: Number(pctAxesArrivee || 0),
            pct_axes_depart: Number(pctAxesDepart || 0),
            pct_national: Number(pctNational || 100),
            pct_marche_ordinaire: Number(pctMarcheOrdinaire || 0),
            pct_international: Number(pctInternational || 0),
            colis_amana_par_canva_sac: Number(colisAmanaParCanvaSac || 35),
            nbr_co_sac: Number(nbrCoSac || 350),
            nbr_cr_sac: Number(nbrCrSac || 400),
            productivite: Number(productivite ?? 100),
            idle_minutes: Number(idleMinutes || 0),
            shift: Number(shift || 1),
            pct_collecte: Number(pctCollecte || 0),
            pct_retour: Number(pctRetour || 0),
            ed_percent: Number(edPercent || 0),
            pct_mois: pct // Passé au backend pour calcul (Vol * pct/100) / 22
          }
        };

        const data = await api.simulateBandoengDirect(payload);
        monthsData.push({
          month: i,
          totalEtp: data.total_ressources_humaines,
          intervenants: data.ressources_par_poste || {}
        });
      }
      return { months: monthsData };
    } catch (error) {
      console.error("Simulation annuelle error:", error);
      return null;
    }
  };

  const handleExportExcel = () => {
    if (!mergedResults || mergedResults.length === 0) return;

    const data = mergedResults.map(r => ({
      "Tâche": r.task,
      "Produit": r.produit,
      "Unit. (/jour)": Number(r.nombre_Unite?.toFixed(2)),
      "Unité": r.unite_mesure,
      "Moy (min)": Number(r.moyenne_min?.toFixed(2)),
      "Heures": Number(r.heures?.toFixed(4)),
      "Formule": r.formule
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Résultats Simulation");
    const safeCentre = (centre || "Bandoeng").replace(/[^a-z0-9]/gi, '_');
    XLSX.writeFile(wb, `Simulation_Bandoeng_${safeCentre}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ---------------------------------------------------------------------------
  // 🆕 ADAPTERS POUR COMPOSANTS UNIFIÉS (BandoengParameters / BandoengGrid)
  // ---------------------------------------------------------------------------

  const paramsBandoeng = {
    productivite: productivite,
    idle_minutes: idleMinutes,
    shift: shift,
    ed_percent: edPercent,
    pct_sac: pctSac,
    colis_amana_par_canva_sac: colisAmanaParCanvaSac,
    nbr_co_sac: nbrCoSac,
    nbr_cr_sac: nbrCrSac,
  };

  const handleParamChangeBandoeng = (key, value) => {
    const v = Number(value);
    switch (key) {
      case "productivite": setProductivite(v); break;
      case "idle_minutes": setIdleMinutes(v); break;
      case "shift": setShift(v); break;
      case "ed_percent": setEdPercent(v); break;
      case "pct_sac": setPctSac(v); break;
      case "colis_amana_par_canva_sac": setColisAmanaParCanvaSac(v); break;
      case "nbr_co_sac": setNbrCoSac(v); break;
      case "nbr_cr_sac": setNbrCrSac(v); break;
      default: console.warn("Unknown Bandoeng param:", key);
    }
  };

  // Calcul Capacité Nette Formattée
  const netCapacityStr = useMemo(() => {
    const val = Number(heuresNet || 0); // Note: prop is heuresNet, previous code used baseHeuresNet? Checks needed.
    // Checking props: heuresNet is passed.
    const h = Math.floor(val);
    const m = Math.round((val - h) * 60);
    return `${h}h ${String(m).padStart(2, "0")}`;
  }, [heuresNet]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-20" style={{ zoom: "90%" }}>
      {/* 🔹 BARRES STICKY EN HAUT - Sélection + Productivité côte à côte */}
      <div className="sticky top-[57px] z-20 grid grid-cols-1 xl:grid-cols-2 gap-2">
        {/* Barre de sélection */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2 flex flex-wrap items-center gap-3 transition-all duration-300">
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <MapPin className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">

              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Région
              </label>
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate text-left"
                value={region ?? ""}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 🆕 Sélecteur Typologie */}
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <Tag className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Typologie
              </label>
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate text-left disabled:opacity-50"
                value={selectedTypology ?? ""}
                onChange={(e) => setSelectedTypology(e.target.value)}
                disabled={!region}
              >
                <option value="">Toutes</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <Building className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Centre
              </label>
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate disabled:opacity-50 text-left"
                value={centre ?? ""}
                onChange={(e) => setCentre(e.target.value)}
                disabled={!region}
              >
                <option value="">
                  {loading.centres ? "Chargement..." : "Sélectionner..."}
                </option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label ?? c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <User className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Intervenant
              </label>
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate disabled:opacity-50 text-left"
                value={posteValue}
                onChange={(e) => setPoste(e.target.value)}
                disabled={!centre || loading.postes}
              >
                <option value="">Sélectionner...</option>
                {postesOptions.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.label ?? p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>



          <div className="flex items-center gap-1.5">

          </div>
        </div>

        {/* 🆕 Calculate formatted net capacity for BandoengParameters */}
        {(() => {
          const p = Number(productivite ?? 100) / 100;
          const idleH = Number(idleMinutes || 0) / 60;
          const base = 8;
          const productive = base * p;
          const net = Math.max(0, productive - idleH);
          const h = Math.floor(net);
          const m = Math.round((net - h) * 60);
          const netCapacityFormatted = `${h}h ${String(m).padStart(2, "0")}`;

          return (
            <>
              {/* 🆕 Unified Parameters Component */}
              <BandoengParameters
                params={{
                  shift: shift,
                  productivite: productivite,
                  idle_minutes: idleMinutes,
                }}
                handleParamChange={(key, value) => {
                  if (key === "shift") setShift(Number(value));
                  else if (key === "productivite") setProductivite(Number(value));
                  else if (key === "idle_minutes") setIdleMinutes(Number(value));
                }}
                netCapacity={netCapacityFormatted}
                className="w-full"
              />
            </>
          );
        })()}
      </div>

      <div className="w-full space-y-1">

        <Card className="bg-white border-slate-200 shadow-sm shrink-0">
          {/* Paramètres de volume */}
          <div className="flex items-center justify-between px-4 py-0 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-[#005EA8]" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Saisie des Volumes</span>
            </div>
            <div className="flex gap-2 items-center justify-end">
              <Button
                size="sm"
                onClick={handleSimuler}
                disabled={loading.simulation || !gridValues}
                className="h-8 text-xs gap-2 bg-[#005EA8] hover:bg-[#004E8A] text-white"
              >
                {loading.simulation ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Calcul...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Lancer Simulation</span>
                  </>
                )}
              </Button>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadTemplate}
                disabled={!onDownloadTemplate}
                className="h-8 text-xs gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Modèle Import
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!onImportBandoeng}
                  className="h-8 text-xs gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importer Volumes
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-1">
            <BandoengGrid
              gridValues={gridValues}
              handleGridChange={handleGridChange}
              disabled={!region || !centre}
            />
          </CardContent>
        </Card>


        {/* 🆕 GRILLE UNIFIÉE BANDOENG */}


        {/* 🆕 PARAMÈTRES ADDITIONNELS BANDOENG */}
        <BandoengAdditionalParams
          colisAmanaParCanvaSac={colisAmanaParCanvaSac}
          setColisAmanaParCanvaSac={setColisAmanaParCanvaSac}
          nbrCoSac={nbrCoSac}
          setNbrCoSac={setNbrCoSac}
          nbrCrSac={nbrCrSac}
          setNbrCrSac={setNbrCrSac}
          pctCollecte={pctCollecte}
          setPctCollecte={setPctCollecte}
          pctRetour={pctRetour}
          setPctRetour={setPctRetour}
          tauxComplexite={tauxComplexite}
          setTauxComplexite={setTauxComplexite}
          natureGeo={natureGeo}
          setNatureGeo={setNatureGeo}
          pctAxesArrivee={pctAxesArrivee}
          setPctAxesArrivee={handlePctAxesArriveeChange}
          pctAxesDepart={pctAxesDepart}
          setPctAxesDepart={handlePctAxesDepartChange}
          pctMarcheOrdinaire={pctMarcheOrdinaire}
          setPctMarcheOrdinaire={setPctMarcheOrdinaire}
          pctInternational={pctInternational}
          setPctInternational={handlePctInternationalChange}
          pctNational={pctNational}
          setPctNational={handlePctNationalChange}
          edPercent={edPercent}
          setEdPercent={setEdPercent}
        />

        {/* Module de Saisonnalité en Dialogue */}
        <div className="mt-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 border-dashed border-slate-300 hover:border-[#005EA8] hover:bg-blue-50/50 group transition-all"
              >
                <CalendarDays className="w-5 h-5 mr-3 text-slate-400 group-hover:text-[#005EA8]" />
                <div className="text-left">
                  <div className="text-sm font-bold text-slate-700">Analyse de Saisonnalité</div>
                  <div className="text-[10px] text-slate-400 font-medium">Visualiser la distribution mensuelle et l'évolution des effectifs</div>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[95vh] h-fit p-0 overflow-hidden border-none shadow-2xl">
              <SeasonalityModule
                onSimulateAnnual={handleSimulateAnnual}
                loading={loading.simulation}
                intervenants={postesOptions.map(p => ({ id: p.id, label: p.label || p.name }))}
                className="border-none shadow-none"
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Référentiel & résultats - Masquable */}
        {showDetails && (
          <div className="flex flex-col gap-2">
            {/* 🆕 Filtre Famille (Déplacé ici pour ne pas décaler les tableaux) */}
            <div className="flex items-center gap-2 bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 self-start">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Filtre Famille:</span>
              <select
                className="bg-white border border-slate-200 text-xs text-slate-700 rounded px-2 py-1 focus:outline-none focus:border-blue-500 w-full max-w-[240px]"
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
                  className="text-[10px] text-red-500 hover:text-red-700 font-medium px-2 py-1 bg-red-50 rounded border border-red-100 transition-colors"
                  title="Effacer le filtre"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative items-start">
              {/* Référentiel */}
              {refDisplay === "tableau" ? (
                referentiel.length === 0 && centre && !loading?.referentiel ? (
                  <div className="bg-white rounded-l-lg p-6 min-h-[460px] flex flex-col items-center justify-center text-center border border-slate-200">
                    <div className="mb-4 p-4 bg-slate-50 rounded-full">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Aucune tâche définie</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                      Ce centre ne contient aucune tâche dans la base de données.
                    </p>
                    <button
                      onClick={handleImportCanva}
                      disabled={isImporting}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-colors bg-[#005EA8] border border-transparent rounded-md shadow-sm hover:bg-[#004E8A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                    >
                      {isImporting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Importation...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Importer {isAM ? "Canva CM FES" : "Canvas"}
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-400 mt-4">
                      Charge le fichier '{isAM ? "canva_CM_FES.xlsx" : "Canvas.xlsx"}' depuis le dossier public
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-l-lg p-1.5 min-h-[460px]">
                    <EnterpriseTable
                      title="Référentiel Temps"
                      subtitle={
                        <div className="flex items-center gap-2">
                          <span>{filterFamille ? `Filtre: ${filterFamille}` : "Base de calcul"}</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            {referentielDisplayData.length} tâche{referentielDisplayData.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      }
                      tooltip="Temps moyen nécessaire pour traiter une unité (colis, sac…)"
                      icon={Clock}
                      columns={[
                        { key: 'p', label: 'Produit', align: 'left', width: '110px', ellipsis: true }, // ✅ Ajout colonne Produit
                        { key: 'f', label: 'Famille', align: 'left', width: '120px', ellipsis: true },
                        { key: 't', label: 'Tâche', align: 'left', ellipsis: true },

                        { key: 'resp', label: 'Responsable 1', align: 'left', width: '130px', ellipsis: true }, // ✅ Nom du poste responsable (1)
                        { key: 'resp2', label: 'Responsable 2', align: 'left', width: '130px', ellipsis: true }, // ✅ Responsable 2 (Placeholder)
                        { key: 'u', label: 'Unité', align: 'left', width: '100px', ellipsis: true },
                        { key: 's', label: 'Sec', align: 'right', width: '80px', render: (val) => Number(val || 0).toFixed(0) },
                        { key: 'm', label: 'Min', align: 'right', width: '80px', render: (val) => Number(val || 0).toFixed(2) }
                      ]}
                      data={referentielDisplayData.map((r, i) => ({
                        seq: r.ordre || i + 1, // Utiliser l'ordre DB ou fallback sur séquentiel
                        p: (r.produit || "").replace(/Arrivé|Arrive|Reçu|Recu|Dépôt|Dépot|Depot|MED/gi, "").trim(), // ✅ Clean Produit (sans Arrivé/Reçu/Dépôt/MED)
                        f: r.famille || "",
                        t: (r.t || "").replace(/\s*\([^)]*\)/g, "").trim(),
                        ph: r.ph && String(r.ph).trim().toLowerCase() !== "n/a" ? r.ph : "",
                        resp: (r.responsibles?.[0] || "-").replace(/\s*\([^)]*\)/g, "").trim(), // ✅ Responsable 1
                        resp2: (r.responsibles?.[1] || "-").replace(/\s*\([^)]*\)/g, "").trim(), // ✅ Responsable 2
                        u: r.u,
                        m: r.m,
                        s: (Number(r.m) || 0) * 60
                      }))}
                      currentView="table"
                      onViewChange={(view) => setRefDisplay(view === 'table' ? 'tableau' : 'graphe')}
                      showViewToggle={true}
                      enableExport={true} // ✅ Activation Export
                      height={450}
                    />
                  </div>
                )) : (
                <Card
                  title={<span className="text-[11px] font-semibold">Référentiel Temps</span>}
                  actions={
                    <div className="flex rounded border border-slate-300 overflow-hidden">
                      <button
                        className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center gap-1 ${refDisplay === "tableau" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                        onClick={() => setRefDisplay("tableau")}
                      >
                        <TableIcon className="w-3 h-3" /> Tableau
                      </button>
                      <button
                        className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center gap-1 border-l border-slate-300 ${refDisplay === "graphe" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                        onClick={() => setRefDisplay("graphe")}
                      >
                        <BarChart3 className="w-3 h-3" /> Graphe
                      </button>
                    </div>
                  }
                  bodyClassName="!p-1"
                >
                  <div className="p-1.5 h-[450px]">
                    <GraphReferentiel
                      referentiel={referentielFiltered}
                      loading={loading?.referentiel}
                      hasPhase={hasPhase}
                    />
                  </div>
                </Card>
              )}

              {/* Flèche de séparation - Visible uniquement sur grand écran */}
              <div className="hidden lg:flex flex-col items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <ArrowRight className="w-6 h-6 text-[#005EA8]" />
                <span className="text-[10px] font-medium text-[#005EA8] mt-2 bg-white/80 backdrop-blur px-1 rounded">
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
                    subtitle={
                      <div className="flex items-center gap-3">
                        <span>Données calculées</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExportExcel(); }}
                          className="h-5 px-1.5 text-[9px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 rounded flex items-center gap-1 transition-colors"
                          title="Exporter en Excel"
                        >
                          <Download className="w-2.5 h-2.5" /> Exporter Excel
                        </button>
                      </div>
                    }
                    tooltip="Volumes × temps → heures nécessaires"
                    icon={CheckCircle2}
                    columns={[
                      { key: 'task', label: 'Tâche', align: 'left', ellipsis: true },

                      { key: 'nombre_Unite', label: 'Unit. (/jour)', align: 'right', width: '100px', render: (val) => formatUnit(val) },
                      { key: 'heures', label: 'Heures', align: 'right', width: '80px', bold: true, render: (val) => Number(val || 0).toFixed(2) }
                    ]}
                    data={mergedResults}
                    footer={null}
                    height={450}
                    currentView="table"
                    onViewChange={(view) => setDisplay(view === 'table' ? 'tableau' : 'graphe')}
                    showViewToggle={true}
                  />
                )
              ) : (
                <Card
                  title={<span className="text-[11px] font-semibold">Résultats de Simulation</span>}
                  actions={
                    <div className="flex rounded border border-slate-300 overflow-hidden">
                      <button
                        className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center gap-1 ${display === "tableau" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                        onClick={() => setDisplay("tableau")}
                      >
                        <TableIcon className="w-3 h-3" /> Tableau
                      </button>
                      <button
                        className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center gap-1 border-l border-slate-300 ${display === "graphe" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                        onClick={() => setDisplay("graphe")}
                      >
                        <BarChart3 className="w-3 h-3" /> Graphe
                      </button>
                    </div>
                  }
                  bodyClassName="!p-1"
                >
                  <div className="p-1.5 h-[450px]">
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
                      <GraphResultats
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
        )}

        {/* Zone de Synthèse des Résultats */}
        {showDetails && hasSimulated && (
          <div className="bg-gradient-to-r from-blue-50/50 to-blue-50 border border-blue-100 rounded-lg p-2 mt-2 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-[#005EA8]" />
              <h3 className="text-sm font-semibold text-[#005EA8]">
                Synthèse des Résultats {titleSuffix}
              </h3>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {/* Charge Totale */}
              <div className="relative overflow-hidden rounded-xl border border-white/50 bg-white/55 backdrop-blur-xl p-2 min-h-[70px] pb-2 ring-1 ring-slate-200 shadow-sm flex flex-col items-center justify-center transition-all hover:ring-blue-200 hover:scale-[1.02] duration-300">
                <div className="text-[10px] font-semibold text-slate-600 mb-0.5">Charge Totale</div>
                <div className="text-lg font-bold text-slate-800">{Number(totalHeuresFinal || 0).toFixed(2)}</div>
                <div className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-0.5">heures / jour</div>
              </div>

              {/* Effectif Actuel */}
              <KPICardGlass
                label="Effectif Actuel"
                icon={User}
                tone="cyan"
                emphasize
                total={Math.round(kpiData.actualTotal)}
              >
                {(!poste || poste === "") && (
                  <EffectifFooter
                    totalLabel="Statutaire"
                    totalValue={Math.round(kpiData.actualStatutaire)}
                    modValue={Math.round(kpiData.actualMOD)}
                    moiValue={Math.round(kpiData.actualMOI)}
                    apsLabel="APS"
                    apsValue={Math.round(kpiData.actualAPS)}
                  />
                )}
              </KPICardGlass>

              {/* ETP Calculé */}
              <KPICardGlass
                label="ETP Calculé"
                icon={Calculator}
                tone="blue"
                emphasize
                total={formatSmallNumber(kpiData.totalCalculated)}
              >
                {(!poste || poste === "") && (
                  <EffectifFooter
                    modValue={formatSmallNumber(kpiData.targetCalculatedMOD)}
                    moiValue={formatSmallNumber(kpiData.targetCalculatedMOI)}
                  />
                )}
              </KPICardGlass>

              {/* ETP Final */}
              <KPICardGlass
                label="ETP Final"
                icon={CheckCircle2}
                tone="amber"
                emphasize
                total={Math.round(kpiData.totalFinal)}
              >
                {(!poste || poste === "") && (
                  <EffectifFooter
                    totalLabel="Statutaire"
                    totalValue={Math.round(kpiData.actualStatutaire)}
                    modValue={kpiData.targetFinalMOD}
                    moiValue={formatSmallNumber(kpiData.targetFinalMOI)}
                    apsLabel="APS"
                    apsValue={Math.round(kpiData.apsCalculeDisplay)}
                  />
                )}
              </KPICardGlass>

              {/* Besoin */}
              <KPICardGlass
                label="Besoin"
                icon={kpiData.valToDisplay > 0 ? TrendingUp : CheckCircle2}
                tone={kpiData.tone}
                emphasize
                total={kpiData.totalDisplay}
              >
                {(!poste || poste === "") && (
                  <EffectifFooter
                    totalLabel="Ecart Statutaire"
                    totalValue={formatSigned(Math.round(kpiData.diffStatutaire))}
                    modValue={formatSigned(kpiData.diffMOD)}
                    moiValue={formatSigned(kpiData.diffMOI)}
                    apsLabel="Var. APS"
                    apsValue={formatSigned(Math.round(kpiData.apsDelta))}
                  />
                )}
              </KPICardGlass>
            </div>
          </div>
        )}

        {/* 🆕 Organigramme Button & Dialog */}
        {showDetails && hasSimulated && !poste && (
          <div className="flex justify-center mt-2">
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#005EA8] transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Afficher l'Organigramme
                </button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-[95vw] h-[75vh] flex flex-col overflow-hidden p-0 gap-0">
                <DialogHeader className="p-6 pb-2 shrink-0">
                  <DialogTitle className="flex items-center justify-between gap-2 pr-6">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#005EA8]" />
                      Organigramme du Centre {titleSuffix}
                    </div>
                    {/* Total ETP Badge */}
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Centre</span>
                      <span className="text-sm font-bold text-slate-900">
                        {Math.round(kpiData.totalFinal)} ETP
                      </span>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 w-full min-h-0 relative bg-slate-50/30">
                  <OrganizationalChart
                    chefCentre={(() => {
                      const chef = (postesOptions || []).find(p => (p.label || "").toUpperCase().includes("CHEF"))?.label || "Chef de Centre";
                      return { name: chef, effectif: 1 };
                    })()}
                    moiStaff={(() => {
                      return (postesOptions || []).filter(p => isMoiPoste(p) && !(p.label || "").toUpperCase().includes("CHEF")).map(p => ({
                        name: p.label || p.nom_poste,
                        effectif: Math.round(Number(p.effectif_actuel || 0)),
                        type: p.type_poste,
                        category: getCategory(p)
                      }));
                    })()}
                    modStaff={(() => {
                      // 🟢 LOGIQUE BANDOENG STRICTE : Basée sur les tâches simulées
                      if (!resultats || !Array.isArray(resultats)) return [];

                      const modMap = new Map();
                      const totalHeures = (totaux?.total_heures) || 1;
                      const targetMOD = (totaux?.fte_calcule) || kpiData.targetFinalMOD || 0;

                      resultats.forEach(task => {
                        // On cherche le responsable (Nom du poste)
                        // Priorité : responsable (back) > nom_poste (api)
                        const responsable = (task.responsable || task.nom_poste || "").trim();

                        // Filtres Bandoeng
                        if (!responsable || responsable === "0" || responsable === "." || responsable.toUpperCase().includes("NON DÉFINI")) return;

                        // Exclure Chef et MOI (déjà traités)
                        if (responsable.toUpperCase().includes("CHEF") || responsable.toUpperCase().includes("DIRECTEUR") || responsable.toUpperCase().includes("RESPONSABLE DE CENTRE")) return;

                        // Check if MOI based on postesOptions
                        const isMoi = (postesOptions || []).some(p => (p.label === responsable || p.nom_poste === responsable) && isMoiPoste(p));
                        if (isMoi) return;

                        if (!modMap.has(responsable)) {
                          // Retrouver le poste pour la catégorie
                          const posteOrigine = (postesOptions || []).find(p => (p.label || p.nom_poste || "").trim().toUpperCase() === responsable.toUpperCase());

                          modMap.set(responsable, {
                            name: responsable,
                            heures: 0,
                            category: posteOrigine ? getCategory(posteOrigine) : "AUTRES"
                          });
                        }

                        const entry = modMap.get(responsable);
                        // resultats (api.js) : heures via 'heures' (mapped from heures_calculees)
                        entry.heures += (task.heures || 0);
                      });

                      // Calcul final ETP
                      const staff = Array.from(modMap.values())
                        .filter(s => s.heures > 0)
                        .map(s => {
                          // Règle de 3 sur l'objectif MOD (Bandoeng Logic)
                          // Effectif = (Heures Tache / Total Heures) * ETP Cible
                          const part = totalHeures > 0 ? (s.heures / totalHeures) * targetMOD : 0;
                          const roundedPart = Math.round(part);
                          const isSmall = roundedPart === 0 && s.heures > 0;

                          return {
                            ...s,
                            effectif: Math.round(part * 100) / 100, // Numeric for correct summation (2 decimals)
                            displayEffectif: String(Math.round(part)) // Always integer (0 if <0.5)
                          };
                        });

                      console.log("DEBUG ORG - MOD Staff Bandoeng Style:", staff);
                      return staff;
                    })()}

                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
