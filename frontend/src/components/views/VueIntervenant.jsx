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
} from "lucide-react";

import { EmptyStateFirstRun } from "../states/EmptyStateFirstRun";
import { EmptyStateDirty } from "../states/EmptyStateDirty";

import GraphReferentiel from "@/components/charts/GraphReferentiel";
import GraphResultats from "@/components/charts/GraphResultats";
import VolumeParamsCard from "../intervenant/VolumeParamsCard";
import VirtualizedResultsTable from "../VirtualizedResultsTable";
import ResultHeroCardCompact from "../results/ResultHeroCardCompact";
import EnterpriseTable from "../tables/EnterpriseTable";
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
}) {
  const JOURS_OUVRES_AN = 264;
  const PAGE_SCALE = 0.8;

  const [colisAmanaParSac, setColisAmanaParSac] = useState(5);
  const [courriersParSac, setCourriersParSac] = useState(4500);
  const [nbrCoSac, setNbrCoSac] = useState(0);
  const [nbrCrSac, setNbrCrSac] = useState(0);

  const [partParticuliers, setPartParticuliers] = useState(75);
  const partProfessionnels = 100 - partParticuliers;

  const [idleMinutes, setIdleMinutes] = useState(0);
  const [tauxComplexite, setTauxComplexite] = useState(0);
  const [natureGeo, setNatureGeo] = useState(0);
  const [heuresBrutes, setHeuresBrutes] = useState(8.0); // avant temps mort

  // 🎨 UX : État pour afficher/masquer les détails
  const [showDetails, setShowDetails] = useState(true);

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
  useEffect(() => {
    const productiviteNum = Number(debouncedProductivite ?? 100);
    const heuresBase = 8.0;

    const heuresCalculees =
      productiviteNum > 0 ? heuresBase * (productiviteNum / 100) : heuresBase;

    const heuresApresIdle = Math.max(
      0,
      heuresCalculees - Number(debouncedIdleMinutes || 0) / 60
    );

    setHeuresBrutes(heuresCalculees);
    setHeuresNet(heuresApresIdle.toFixed(2));
  }, [debouncedProductivite, debouncedIdleMinutes, setHeuresNet]);

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
    if (cat === "AM- AGENCE MESSAGERIE") {
      return key === "amana" ? "input" : "na";
    }
    if (key === "amana") return "input";
    return "na";
  };

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
      if (colisInput > 0) return colisInput / colisAmanaParSac;

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

  // ✅ OPTIMISATION : Memoization des résultats fusionnés
  const mergedResults = useMemo(() => {
    return (referentiel || []).map((row, i) => {
      const taskName = String(row.t || "").trim();
      const fromBack = resIndex.get(taskName.toLowerCase());
      const moyenneMin = Number(row.m ?? 0);

      const nbJour =
        fromBack?.nombre_unite ??
        fromBack?.nombre_Unite ??
        nombreUniteParUnite(row.u, taskName, row);

      const heuresLoc = +(
        Number(nbJour || 0) *
        (minutesAjustees(moyenneMin) / 60)
      ).toFixed(2);

      return {
        seq: i + 1,
        task: taskName || "N/A",
        nombre_Unite: Number(nbJour || 0),
        heures: heuresLoc,
        _u: row.u,
        _type_flux: row.type_flux,
        _fromBack: fromBack,
      };
    });
  }, [referentiel, resIndex, annualValues, debouncedColis, debouncedProductivite, colisAmanaParSac, courriersParSac, colisParCollecte]);

  // ✅ OPTIMISATION : Memoization du total des heures
  const totalHeuresAffichees = useMemo(() => {
    return mergedResults.reduce(
      (acc, r) => acc + Number(r.heures || 0),
      0
    );
  }, [mergedResults]);

  const baseHeuresNet = Number(heuresNet || 0);

  // ✅ OPTIMISATION : Memoization du calcul FTE
  const fteCalcAffiche = useMemo(() => {
    return baseHeuresNet > 0 ? totalHeuresAffichees / baseHeuresNet : 0;
  }, [totalHeuresAffichees, baseHeuresNet]);

  const roundHalfUp = (n, decimals = 0) => {
    const f = 10 ** decimals;
    return Math.floor(n * f + 0.5) / f;
  };

  // ✅ OPTIMISATION : Memoization du FTE arrondi
  const fteArrondiAffiche = useMemo(() => {
    return fteCalcAffiche <= 0.1 ? 0 : roundHalfUp(fteCalcAffiche, 0);
  }, [fteCalcAffiche]);

  // ✅ OPTIMISATION : Memoization du handler de simulation
  const handleSimuler = useCallback(() => {
    const ratioCollecte = Math.max(1, parseNonNeg(colisParCollecte) ?? 1);

    onSimuler({
      colis_amana_par_sac: parseNonNeg(colisAmanaParSac) ?? 5,
      courriers_par_sac: parseNonNeg(courriersParSac) ?? 4500,
      colis_par_collecte: ratioCollecte,
      part_particuliers: partParticuliers,
      taux_complexite: Number(tauxComplexite || 0),
      nature_geo: Number(natureGeo || 0),
    });
  }, [onSimuler, colisParCollecte, colisAmanaParSac, courriersParSac, partParticuliers, tauxComplexite, natureGeo]);

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

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-1.5">
            {centreCategorie ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <Tag className="w-2.5 h-2.5" />
                {centreCategorie}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 italic px-2">
                -- Typologie --
              </span>
            )}
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
                <input
                  type="number"
                  value={tauxComplexite}
                  onChange={(e) =>
                    setTauxComplexite(Number(e.target.value || 0))
                  }
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
                />
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
                <input
                  type="number"
                  value={natureGeo}
                  onChange={(e) => setNatureGeo(Number(e.target.value || 0))}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
                />
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

      <div className="w-full space-y-3">



        {/* Paramètres de volume */}
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
          onSimuler={handleSimuler}
          simDirty={simDirty}
        />

        {/* Référentiel & résultats - Masquable */}
        {showDetails && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] gap-4 min-h-0 items-start">
            {/* Référentiel */}
            {refDisplay === "tableau" ? (
              <EnterpriseTable
                title="Référentiel Temps"
                subtitle="Base de calcul"
                tooltip="Temps moyen nécessaire pour traiter une unité (colis, sac…)"
                icon={Clock}
                columns={[
                  { key: 'seq', label: 'Seq', align: 'left', width: '50px' },
                  { key: 't', label: 'Tâche', align: 'left', ellipsis: true },
                  ...(hasPhase ? [{ key: 'ph', label: 'Phase', align: 'left', width: '100px', ellipsis: true }] : []),
                  { key: 'u', label: 'Unité', align: 'left', width: '140px', ellipsis: true },
                  { key: 'm', label: 'Moy. (min)', align: 'right', width: '80px', render: (val) => Number(val || 0).toFixed(2) }
                ]}
                data={referentiel.map((r, i) => ({
                  seq: i + 1,
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
                    referentiel={referentiel}
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
                    { key: 'seq', label: 'Seq', align: 'left', width: '50px' },
                    { key: 'task', label: 'Tâche', align: 'left', ellipsis: true },
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
        )}

        {/* Zone de Synthèse des Résultats */}
        {showDetails && (
          <div className="bg-gradient-to-r from-blue-50/50 to-blue-50 border border-blue-100 rounded-lg p-2 mt-2 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-[#005EA8]" />
              <h3 className="text-sm font-semibold text-[#005EA8]">
                Synthèse des Résultats
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Total Heures */}
              <div className="text-center bg-white rounded-lg p-2 border border-blue-50 shadow-sm relative group hover:border-blue-300 transition-colors">
                <Tooltip content="Somme des heures nécessaires pour toutes les tâches">
                  <div className="flex flex-col items-center gap-0.5 cursor-help w-full">
                    <div className="text-lg font-bold text-slate-800">
                      {totalHeuresAffichees.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium bg-slate-50 px-1.5 rounded-full">
                      heures/jour
                    </div>
                  </div>
                </Tooltip>
              </div>

              {/* ETP Calculé */}
              <div className="text-center bg-white rounded-lg p-2 border border-blue-50 shadow-sm relative group hover:border-blue-300 transition-colors">
                <Tooltip content={`Basé sur ${baseHeuresNet.toFixed(2)} h/jour de travail effectif`}>
                  <div className="flex flex-col items-center gap-0.5 cursor-help w-full">
                    <div className="text-lg font-bold text-slate-800">
                      {fteCalcAffiche.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium bg-slate-50 px-1.5 rounded-full">
                      ETP calculé
                    </div>
                  </div>
                </Tooltip>
              </div>

              {/* ETP Arrondi */}
              <div className="text-center bg-white rounded-lg p-2 border border-blue-50 shadow-sm relative group hover:border-blue-300 transition-colors">
                <Tooltip content="Nombre de personnes à recruter (arrondi au supérieur)">
                  <div className="flex flex-col items-center gap-0.5 cursor-help w-full">
                    <div className="text-xl font-bold text-[#005EA8]">
                      {fteArrondiAffiche}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium bg-slate-50 px-1.5 rounded-full">
                      ETP arrondi
                    </div>
                  </div>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
