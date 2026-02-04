/* VueIntervenant.jsx - normalisation /jour + productivité + formatage */
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Eye,
  EyeOff,
} from "lucide-react";

import { EmptyStateFirstRun } from "../states/EmptyStateFirstRun";
import { EmptyStateDirty } from "../states/EmptyStateDirty";

import GraphReferentiel from "@/components/charts/GraphReferentiel";
import GraphResultats from "@/components/charts/GraphResultats";
import VolumeParamsCard from "../intervenant/VolumeParamsCard";
import VirtualizedResultsTable from "../VirtualizedResultsTable";
import ResultHeroCardCompact from "../results/ResultHeroCardCompact";
import EnterpriseTable from "../tables/EnterpriseTable";
import VolumeParamsCardCustom from "../intervenant/VolumeParamsCardCustom";

/* ===================== KPI COMPONENTS (COPIED FROM VUECENTRE) ===================== */
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
import Tooltip from "../ui/Tooltip";
import "../tables/EnterpriseTable.css";
import "../../styles/tooltips.css";

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
  productivite,
  setProductivite,
  heuresNet,
  setHeuresNet,
  onSimuler,
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
  edPercent = 60,
  setEdPercent = () => { },
  nbrCoSac = 0,
  setNbrCoSac = () => { },
  nbrCrSac = 0,
  setNbrCrSac = () => { },
  pctRetenue, setPctRetenue,
  pctEchantillon, setPctEchantillon,
  pctSac, setPctSac,
}) {
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
  const [tauxComplexite, setTauxComplexite] = useState(1);
  const [natureGeo, setNatureGeo] = useState(1);
  const [heuresBrutes, setHeuresBrutes] = useState(8.0); // avant temps mort

  // 🎨 UX : État pour afficher/masquer les détails
  const [showDetails, setShowDetails] = useState(true);

  // 🆕 Filtre famille
  const [filterFamille, setFilterFamille] = useState("");

  // 🆕 Liste des familles uniques
  const uniqueFamilles = useMemo(() => {
    const s = new Set((referentiel || []).map(r => r.famille).filter(Boolean));
    return Array.from(s).sort();
  }, [referentiel]);

  // 🆕 Paramètre Collecte
  const [pctCollecte, setPctCollecte] = useState(5.0);

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

  // 🔍 LOG PROPS DEBUG (Temporaire)
  useEffect(() => {
    console.log("👀 VueIntervenant Props Recus:", {
      heuresNet,
      productivite,
      idleMinutes,
      typeHeuresNet: typeof heuresNet
    });
  }, [heuresNet, productivite, idleMinutes]);

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
  // 🗑️ ANCIEN CALCUL LOCAL SUPPRIMÉ
  // Le calcul des heures nettes est maintenant géré par le parent (Simulation.jsx)
  // qui applique correctement la formule : (8 - idle) * productivité
  /*
  useEffect(() => {
    const heuresBase = 8.0;
    const idleH = Number(debouncedIdleMinutes || 0) / 60;
    const heuresNettes = Math.max(0, heuresBase - idleH);
    setHeuresBrutes(heuresBase);
    setHeuresNet(heuresNettes.toFixed(2));
  }, [debouncedIdleMinutes, setHeuresNet]);
  */

  const posteValue = poste == null ? "" : String(poste);

  const getEffectiveFluxMode = (categorie, key) => {
    const cat = String(categorie || "")
      .trim()
      .toUpperCase();

    if (cat === "CM") {
      return key === "amana" ? "input" : "na";
    }
    if (cat === "CTD - CENTRE DE TRAITEMENT ET DISTRIBUTION") return "input";
    if (cat === "CD") return "input";
    if (cat === "CCC") return "input"; // ✅ CCC : Tout est saisissable
    if (cat === "CENTRE UNIQUE") return "input"; // 🆕 Centre Unique : Tout est saisissable
    if (cat === "AM- AGENCE MESSAGERIE") {
      return key === "amana" ? "input" : "na";
    }
    if (key === "amana") return "input";
    if (key === "amana") return "input";
    return "na";
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

  const resIndex = new Map(
    (resultats || []).map((r) => [
      String((r.task || r.nom_tache || "").trim().toLowerCase()),
      r,
    ])
  );

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
      // ✅ MODIFICATION: On affiche TOUT si on a des résultats de simulation (data-driven)
      // Cela évite de masquer des tâches valides qui auraient m=0 mais un volume calculé par le backend
      const hasBackResult = resultats && resultats.some(r => r.task === row.t);
      const hasMin = Number(row.m ?? 0) > 0 || hasBackResult;

      const matchFamille = !filterFamille || row.famille === filterFamille;
      return matchFamille; // On lâche le filtre hasMin pour l'instant pour tester, ou on l'améliore
    });
  }, [referentiel, filterFamille, resultats]);

  // ✅ OPTIMISATION : Memoization des résultats fusionnés
  const mergedResults = useMemo(() => {
    const res = referentielFiltered.map((row, i) => {
      const taskName = String(row.t || "").trim();
      const fromBack = resIndex.get(taskName.toLowerCase());
      const moyenneMin = Number(row.m ?? 0);

      // Si le backend a déjà calculé les heures, on les préfère !
      // Le backend retourne maintenant des heures "chargées" (Raw/P)
      const hasBackResults = fromBack && (fromBack.heures !== undefined);

      const isActive = String(row.etat || "A").trim().toUpperCase() !== "NA"; // ✅ Check état

      const nbJour = isActive // ✅ Si NA => 0
        ? (fromBack?.nombre_unite ??
          fromBack?.nombre_Unite ??
          nombreUniteParUnite(row.u, taskName, row))
        : 0;

      let heuresLoc;
      if (!isActive) {
        heuresLoc = 0; // ✅ Si NA => 0
      } else if (hasBackResults) {
        heuresLoc = Number(fromBack.heures || 0);
      } else if (hasSimulated && (resultats || []).length > 0) {
        // ✅ Si la simulation a eu lieu mais que le backend n'a pas renvoyé cette tâche,
        // c'est qu'elle n'est pas applicable au poste (ou filtrée). On met 0.
        heuresLoc = 0;
      } else {
        // Fallback local (uniquement avant la simulation ou si mode hors ligne)
        heuresLoc = +(
          Number(nbJour || 0) *
          (minutesAjustees(moyenneMin) / 60)
        ).toFixed(2);
      }

      return {
        seq: i + 1,
        task: taskName || "N/A",
        formule: fromBack?.formule || "N/A",  // 🆕 Formule de calcul depuis le backend
        nombre_Unite: Number(nbJour || 0),
        heures: heuresLoc,
        _u: row.u,
        _type_flux: row.type_flux,
        _fromBack: fromBack,
      };
    }).filter(r => Number(r.heures || 0) > 0.001);

    // 🆕 Fallback pour postes MOI (Structurels)
    // Si la simulation ne renvoie rien (car pas de tâches data-driven), on affiche un forfait
    if (res.length === 0 && hasSimulated && poste) {
      const pObj = (postesOptions || []).find(p => String(p.id) === String(poste));
      // Détection basée sur le type_poste (si disponible) ou heuristique simple
      const isMoi = pObj?.type_poste === 'MOI' || pObj?.is_moi;

      if (isMoi) {
        return [{
          seq: 1,
          task: "Activité Structurelle (MOI)",
          formule: "Poste Forfaitaire (Non piloté par le volume)",
          nombre_Unite: 1,
          heures: Number(heuresNet || 7.33), // Pour faire 1 ETP
          _u: "Jour",
          _type_flux: "Structurel",
          _fromBack: null
        }];
      }
    }

    return res;
  }, [referentielFiltered, resIndex, annualValues, debouncedColis, debouncedProductivite, colisAmanaParSac, courriersParSac, colisParCollecte, hasSimulated, poste, postesOptions, heuresNet]);

  // 🔍 DEBUG: Inspecter pourquoi les résultats sont vides
  useEffect(() => {
    if (hasSimulated) {
      console.log("🔍 [DEBUG RESULTS] mergedResults length:", mergedResults.length);
      console.log("🔍 [DEBUG RESULTS] simDirty:", simDirty);
      console.log("🔍 [DEBUG RESULTS] poste:", poste);
      console.log("🔍 [DEBUG RESULTS] activite structurelle?", mergedResults.find(r => r.task.includes("Structurelle")));
    }
  }, [mergedResults, hasSimulated, simDirty, poste]);

  // ✅ OPTIMISATION : Memoization du total des heures
  const totalHeuresAffichees = useMemo(() => {
    return mergedResults.reduce(
      (acc, r) => acc + Number(r.heures || 0),
      0
    );
  }, [mergedResults]);

  // ✅ SECURITÉ : Utiliser le total heures du backend s'il est disponible (Data-Driven)
  const totalHeuresFinal = useMemo(() => {
    if (totaux && typeof totaux.total_heures === 'number') {
      return totaux.total_heures;
    }
    return totalHeuresAffichees;
  }, [totalHeuresAffichees, totaux]);

  const baseHeuresNet = Number(heuresNet || 0);

  // ✅ OPTIMISATION : Memoization du calcul FTE
  const fteCalcAffiche = useMemo(() => {
    // Si le backend fournit le total calculé (Data-Driven), on l'utilise pour garantir la cohérence
    if (totaux && typeof totaux.fte_calcule === 'number') {
      return totaux.fte_calcule;
    }
    return baseHeuresNet > 0 ? totalHeuresFinal / baseHeuresNet : 0;
  }, [totalHeuresFinal, baseHeuresNet, totaux]);

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
      label.includes("CHEF DE CENTRE") ||
      label.includes("CHEF ETABLISSEMENT") ||
      label.includes("DIRECTEUR") ||
      label.includes("GERANT") ||
      label.includes("RESPONSABLE");

    return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || isKeyword || !!p.is_moi;
  };

  const flagMoi = isMoiPoste(selectedPosteObj);
  const isMOD = !flagMoi;

  // 🆕 Calcul du MOI Global (Centre) - Demande Utilisateur : Afficher MOI comme page centre
  const totalMoiGlobal = useMemo(() => {
    if (!postesOptions) return 0;
    return postesOptions.reduce((acc, p) => {
      return acc + (isMoiPoste(p) ? Number(p.effectif_actuel || 0) : 0);
    }, 0);
  }, [postesOptions]);

  // Actuel
  const effActuelMOD = isMOD ? effectifActuel : 0;
  const effAPS = Number(selectedPosteObj?.effectif_aps || selectedPosteObj?.eff_aps || 0);

  // Calculé
  const etpCalcMOD = isMOD ? fteCalcAffiche : 0;

  // Arrondi
  const etpArrMOD = isMOD ? fteArrondiAffiche : 0;

  const formatSmallNumber = (v, d = 2) => Number(v || 0).toFixed(d).replace('.', ',');

  const handleSimuler = useCallback((overrides = {}) => {
    console.log("🖱️ [VueIntervenant] Click Simuler. State Taux:", tauxComplexite, "NatureGeo:", natureGeo);
    const ratioCollecte = Math.max(1, parseNonNeg(colisParCollecte) ?? 1);

    onSimuler({
      colis_amana_par_sac: parseNonNeg(colisAmanaParSac) ?? 5,
      courriers_par_sac: parseNonNeg(courriersParSac) ?? 4500,
      colis_par_collecte: ratioCollecte,
      part_particuliers: partParticuliers,
      taux_complexite: Number(tauxComplexite || 0),
      nature_geo: Number(natureGeo || 0),
      ed_percent: Number(edPercent || 0), // 🆕 % En dehors
      pct_collecte: Number(pctCollecte || 0), // 🆕 % Collecte
      ...overrides
    });
  }, [onSimuler, colisParCollecte, colisAmanaParSac, courriersParSac, partParticuliers, tauxComplexite, natureGeo, edPercent, pctCollecte]);

  return (
    <div className="w-full flex flex-col gap-3 pb-16" style={{ zoom: "90%" }}>
      {/* 🔹 BARRES STICKY EN HAUT - Sélection + Productivité côte à côte */}
      <div className="sticky top-[57px] z-20 grid grid-cols-1 xl:grid-cols-2 gap-2">
        {/* Barre de sélection */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2 flex flex-wrap items-center gap-3 transition-all duration-300">
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <MapPin className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">

              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Région
              </label>
              <select
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer w-full truncate transition-colors"
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

          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <Building className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Centre
              </label>
              <select
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer w-full truncate disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Intervenant
              </label>
              <select
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer w-full truncate disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Configuration & Performance */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Productivité */}
            <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                <Gauge className="w-3 h-3" />
              </div>
              <div className="flex flex-col w-full">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  Productivité
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={productivite}
                    placeholder="100"
                    onChange={(e) =>
                      setProductivite(e.target.value === "" ? 0 : Number(e.target.value))
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
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  Temps mort
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={idleMinutes}
                    onChange={(e) =>
                      setIdleMinutes(e.target.value === "" ? 0 : Number(e.target.value))
                    }
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-8 text-center"
                  />
                  <span className="absolute right-0 top-0 text-[9px] text-slate-400 font-bold pointer-events-none">
                    min
                  </span>
                </div>
              </div>
            </div>

            {/* Masquer ces params pour CNDP (centre 1965) */}
            {String(centre) !== '1965' && (
              <>
                <div className="w-px h-6 bg-slate-200 hidden md:block" />

                {/* Complexité Circulation */}
                <div className="flex items-center gap-1.5 min-w-[90px] flex-1">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                    <Sliders className="w-3 h-3" />
                  </div>
                  <div className="flex flex-col w-full">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                      Compl. Circ.
                    </label>
                    <select
                      value={tauxComplexite}
                      onChange={(e) =>
                        setTauxComplexite(Number(e.target.value))
                      }
                      className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 w-full text-center cursor-pointer transition-colors"
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
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                      Compl. Géo
                    </label>
                    <select
                      value={natureGeo}
                      onChange={(e) => setNatureGeo(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 w-full text-center cursor-pointer transition-colors"
                    >
                      <option value="1">1</option>
                      <option value="1.5">1.5</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="w-px h-6 bg-slate-200 hidden md:block" />

            {/* Capacité Nette - Résultat */}
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                <Clock className="w-3 h-3" />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-[#005EA8] uppercase tracking-wider text-center">
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

      <div className="w-full space-y-3">



        {/* Paramètres de volume - CONDITIONAL RENDERING */}
        {/* TODO: Remplacer '1' par l'ID réel du centre de test ou une prop */}
       
          <VolumeParamsCard
            Card={Card}
            Field={Field}
            Input={Input}
            centre={centre}
            centreCategorie={centreCategorie}
            loading={loading}
            courrierOrdinaire={courrierOrdinaire}
            setCourrierOrdinaire={setCourrierOrdinaire}
            courrierRecommande={courrierRecommande}
            setCourrierRecommande={setCourrierRecommande}
            ebarkia={ebarkia}
            setEbarkia={setEbarkia}
            lrh={lrh}
            setLrh={setLrh}
            amana={amana}
            setAmana={setAmana}
            colisAmanaParSac={colisAmanaParSac}
            setColisAmanaParSac={setColisAmanaParSac}
            courriersParSac={courriersParSac}
            setCourriersParSac={setCourriersParSac}
            nbrCoSac={nbrCoSac}
            setNbrCoSac={setNbrCoSac}
            nbrCrSac={nbrCrSac}
            setNbrCrSac={setNbrCrSac}
            colisParCollecte={colisParCollecte}
            setColisParCollecte={setColisParCollecte}
            parseNonNeg={parseNonNeg}
            toInput={toInput}
            monthly={monthly}
            formatInt={formatUnit}
            splitFlux={splitFlux}
            partParticuliers={partParticuliers}
            setPartParticuliers={setPartParticuliers}
            partProfessionnels={partProfessionnels}
            getEffectiveFluxMode={getEffectiveFluxMode}
            // 🆕 Synchro Grille Flux
            volumesFluxGrid={volumesFluxGrid}
            setVolumesFluxGrid={setVolumesFluxGrid}
            onSimuler={handleSimuler}
            simDirty={simDirty}
            edPercent={edPercent}
            setEdPercent={setEdPercent}
            pctAxesArrivee={pctAxesArrivee}
            setPctAxesArrivee={setPctAxesArrivee}
            pctAxesDepart={pctAxesDepart}
            setPctAxesDepart={setPctAxesDepart}
            pctCollecte={pctCollecte}
            setPctCollecte={setPctCollecte}
          />

        {/* Référentiel & résultats - Masquable */}
        {showDetails && (
          <div className="flex flex-col gap-2">
            {/* 🆕 Filtre Famille (Déplacé ici pour ne pas décaler les tableaux) */}
            <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-lg border border-slate-100 self-start">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">Filtre Famille:</span>
              <select
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-md px-2 py-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer w-full max-w-[240px] transition-colors"
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

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] gap-4 min-h-0 items-start">
              {/* Référentiel */}
              {/* Référentiel */}
              {refDisplay === "tableau" ? (
                <div className="flex flex-col gap-2 w-full">
                  {/* 🆕 Filtre Famille */}


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
                      { key: 'm', label: 'Moy. (min)', align: 'right', width: '80px', render: (val) => Number(val || 0).toFixed(2) }
                    ]}
                    data={referentielFiltered.map((r, i) => ({
                      seq: i + 1,
                      f: r.famille || "", // ✅ Mappage Famille
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
                  <div className="p-1.5 h-[380px]">
                    <GraphReferentiel
                      referentiel={referentielFiltered}
                      loading={loading?.referentiel}
                      hasPhase={hasPhase}
                    />
                  </div>
                </Card>
              )}

              {/* Flèche de séparation - Visible uniquement sur grand écran */}
              <div className="hidden xl:flex flex-col items-center justify-center py-12">
                <ArrowRight className="w-6 h-6 text-[#005EA8]" />
                <span className="text-[10px] font-medium text-[#005EA8] mt-2">
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
                Synthèse des Résultats
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Charge Totale */}
              <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/55 backdrop-blur-xl p-2.5 min-h-[90px] pb-3 ring-1 ring-slate-200 shadow-sm flex flex-col items-center justify-center transition-all hover:ring-blue-200">
                <div className="text-[11px] font-semibold text-slate-600 mb-1">Charge Totale</div>
                <div className="text-xl font-bold text-slate-800">{Number(totalHeuresFinal || 0).toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1">heures / jour</div>
              </div>

              {/* 2️⃣ Effectif Calculé (Besoin) */}
              <KPICardGlass
                label="Effectif Calculé"
                icon={Calculator}
                tone="blue"
                emphasize
                total={formatSmallNumber(fteCalcAffiche)}
                toggleable={false}
                customFooter={
                  <EffectifFooter
                    totalLabel="Statutaire"
                    totalValue={formatSmallNumber((isMOD ? fteCalcAffiche : 0) + totalMoiGlobal, 2)}
                    modValue={formatSmallNumber(etpCalcMOD, 2)}
                    moiValue={formatSmallNumber(totalMoiGlobal, 0)}
                    apsLabel="APS"
                    apsValue={"--"}
                  />
                }
              />

              {/* 3️⃣ Effectif Cible (Arrondi) */}
              <KPICardGlass
                label="Effectif Arrondi"
                icon={CheckCircle2}
                tone="amber"
                emphasize
                total={fteArrondiAffiche}
                toggleable={false}
                customFooter={
                  <EffectifFooter
                    totalLabel="Statutaire"
                    totalValue={Math.round((isMOD ? fteArrondiAffiche : 0) + totalMoiGlobal)}
                    modValue={etpArrMOD}
                    moiValue={formatSmallNumber(totalMoiGlobal, 0)}
                    apsLabel="APS"
                    apsValue={"--"}
                  />
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
