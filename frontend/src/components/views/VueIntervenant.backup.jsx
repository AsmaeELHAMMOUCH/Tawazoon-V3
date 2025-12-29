/* VueIntervenant.jsx - normalisation /jour + productivité + formatage */
"use client";
import React, { useState, useEffect } from "react";
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
} from "lucide-react";

import { EmptyStateFirstRun } from "../states/EmptyStateFirstRun";
import { EmptyStateDirty } from "../states/EmptyStateDirty";

import GraphReferentiel from "@/components/charts/GraphReferentiel";
import GraphResultats from "@/components/charts/GraphResultats";
import VolumeParamsCard from "../intervenant/VolumeParamsCard";

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
  useEffect(() => {
    const productiviteNum = Number(productivite ?? 100);
    const heuresBase = 8.0;

    const heuresCalculees =
      productiviteNum > 0 ? heuresBase * (productiviteNum / 100) : heuresBase;

    const heuresApresIdle = Math.max(
      0,
      heuresCalculees - Number(idleMinutes || 0) / 60
    );

    setHeuresBrutes(heuresCalculees);
    setHeuresNet(heuresApresIdle.toFixed(2));
  }, [productivite, idleMinutes, setHeuresNet]);

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
    const p = Number(productivite ?? 100);
    return p > 0 ? min / (p / 100) : min;
  };

  const annualValues = {
    courrierOrdinaire: parseNonNeg(courrierOrdinaire) ?? 0,
    courrierRecommande: parseNonNeg(courrierRecommande) ?? 0,
    ebarkia: parseNonNeg(ebarkia) ?? 0,
    lrh: parseNonNeg(lrh) ?? 0,
    amana: parseNonNeg(amana) ?? 0,
  };

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
      const colisInput = parseNonNeg(colis) ?? 0;
      if (colisInput <= 0) return 0;

      const ratioCollecteBrut =
        parseNonNeg(taskData.colis_par_collecte) ??
        parseNonNeg(colisParCollecte);
      const ratioCollecte = Math.max(1, ratioCollecteBrut ?? 1);

      return colisInput / ratioCollecte;
    }

    if (uRaw.includes("colis") || uRaw === "amana") {
      if (dailyAmanaColis > 0) return dailyAmanaColis;
      return parseNonNeg(colis) ?? 0;
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

      const colisInput = parseNonNeg(colis) ?? 0;
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

  const mergedResults = (referentiel || []).map((row, i) => {
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

  const totalHeuresAffichees = mergedResults.reduce(
    (acc, r) => acc + Number(r.heures || 0),
    0
  );

  const baseHeuresNet = Number(heuresNet || 0);
  const fteCalcAffiche =
    baseHeuresNet > 0 ? totalHeuresAffichees / baseHeuresNet : 0;

  const roundHalfUp = (n, decimals = 0) => {
    const f = 10 ** decimals;
    return Math.floor(n * f + 0.5) / f;
  };

  const fteArrondiAffiche =
    fteCalcAffiche <= 0.1 ? 0 : roundHalfUp(fteCalcAffiche, 0);

  const handleSimuler = () => {
    const ratioCollecte = Math.max(1, parseNonNeg(colisParCollecte) ?? 1);

    onSimuler({
      colis_amana_par_sac: parseNonNeg(colisAmanaParSac) ?? 5,
      courriers_par_sac: parseNonNeg(courriersParSac) ?? 4500,
      colis_par_collecte: ratioCollecte,
      part_particuliers: partParticuliers,
      taux_complexite: Number(tauxComplexite || 0),
      nature_geo: Number(natureGeo || 0),
    });
  };

  return (
    <div className="w-full flex flex-col gap-3 pb-16">
      {/* 🔹 BARRES STICKY EN HAUT - Sélection + Productivité côte à côte */}
      <div className="sticky top-[57px] z-20 grid grid-cols-1 xl:grid-cols-2 gap-2">
        {/* Barre de sélection */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2 flex flex-wrap items-center gap-3 transition-all duration-300">
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <MapPin className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Région
              </label>
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate text-center"
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
            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Centre
              </label>
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate disabled:opacity-50 text-center"
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
            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <User className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Intervenant
              </label>
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate disabled:opacity-50 text-center"
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
              <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
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
              <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
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
              <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
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
              <div className="w-6 h-6 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Clock className="w-3 h-3" />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-sky-600 uppercase tracking-wider">
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

        {/* Référentiel & résultats */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 min-h-0">
          {/* Référentiel */}
          <Card
            title={
              <span className="text-[11px] font-semibold">Référentiel Temps</span>
            }
            actions={
              <div className="toggle-group text-[8px]">
                <button
                  className={`toggle-btn ${refDisplay === "tableau" ? "active" : ""
                    }`}
                  onClick={() => setRefDisplay("tableau")}
                >
                  <TableIcon className="w-2.5 h-2.5" /> Tableau
                </button>
                <button
                  className={`toggle-btn ${refDisplay === "graphe" ? "active" : ""
                    }`}
                  onClick={() => setRefDisplay("graphe")}
                >
                  <BarChart3 className="w-2.5 h-2.5" /> Graphe
                </button>
              </div>
            }
            bodyClassName="!p-1"
          >
            {refDisplay === "tableau" ? (
              <div className="h-[380px] overflow-auto">
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-1.5 py-0.5 text-[8px] font-semibold">
                        Seq
                      </th>
                      <th className="text-left px-1.5 py-0.5 text-[8px] font-semibold">
                        Tâche
                      </th>
                      {hasPhase && (
                        <th className="text-left px-1.5 py-0.5 text-[8px] font-semibold">
                          Phase
                        </th>
                      )}
                      <th className="text-left px-1.5 py-0.5 text-[8px] font-semibold">
                        Unité
                      </th>
                      <th className="text-center px-1.5 py-0.5 text-[8px] font-semibold">
                        Moy. (min)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading?.referentiel ? (
                      <tr>
                        <td
                          colSpan={hasPhase ? 5 : 4}
                          className="px-2 py-0.5 text-left text-slate-500"
                        >
                          Chargement…
                        </td>
                      </tr>
                    ) : (referentiel?.length ?? 0) === 0 ? (
                      <tr className="bg-white">
                        <td
                          colSpan={hasPhase ? 5 : 4}
                          className="px-2 py-0.5 text-left text-slate-500"
                        >
                          Aucune donnée.
                        </td>
                      </tr>
                    ) : (
                      referentiel.map((r, i) => (
                        <tr
                          key={i}
                          className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                        >
                          <td className="px-1.5 py-0.5 text-[9px]">{i + 1}</td>
                          <td className="px-1.5 py-0.5 text-[9px]">{r.t}</td>
                          {hasPhase && (
                            <td className="px-1.5 py-0.5 text-[9px]">
                              {r.ph &&
                                String(r.ph).trim().toLowerCase() !== "n/a"
                                ? r.ph
                                : ""}
                            </td>
                          )}
                          <td className="px-1.5 py-0.5 text-[9px]">{r.u}</td>
                          <td className="px-1.5 py-0.5 text-center text-[9px]">
                            {Number(r.m ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-1.5 h-[380px]">
                <GraphReferentiel
                  referentiel={referentiel}
                  loading={loading?.referentiel}
                  hasPhase={hasPhase}
                />
              </div>
            )}
          </Card>

          {/* Résultats */}
          <Card
            title={
              <span className="text-[11px] font-semibold">Résultats de Simulation</span>
            }
            bodyClassName="!p-1"
            actions={
              <div className="toggle-group text-[8px]">
                <button
                  className={`toggle-btn ${display === "tableau" ? "active" : ""
                    }`}
                  onClick={() => setDisplay("tableau")}
                >
                  <TableIcon className="w-2.5 h-2.5" /> Tableau
                </button>
                <button
                  className={`toggle-btn ${display === "graphe" ? "active" : ""
                    }`}
                  onClick={() => setDisplay("graphe")}
                >
                  <BarChart3 className="w-2.5 h-2.5" /> Graphe
                </button>
              </div>
            }
          >
            {display === "tableau" ? (
              loading?.simulation ? (
                <div className="px-2 py-1 text-slate-500 text-[10px]">
                  Calcul en cours…
                </div>
              ) : !hasSimulated ? (
                <EmptyStateFirstRun
                  onSimuler={handleSimuler}
                  disabled={!centre}
                />
              ) : simDirty ? (
                <EmptyStateDirty onSimuler={handleSimuler} disabled={!centre} />
              ) : (mergedResults?.length ?? 0) === 0 ? (
                <div className="px-2 py-1 text-slate-500 text-[10px]">
                  Aucune donnée.
                </div>
              ) : (
                <div className="h-[380px] flex flex-col">
                  <div className="flex-1 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-[10px]">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                        <tr>
                          <th className="text-left px-1.5 py-0.5 text-[8px] font-semibold">
                            Seq
                          </th>
                          <th className="text-left px-1.5 py-0.5 text-[8px] font-semibold">
                            Tâche
                          </th>
                          <th className="text-center px-1.5 py-0.5 text-[8px] font-semibold">
                            Unit. (/jour)
                          </th>
                          <th className="text-center px-1.5 py-0.5 text-[8px] font-semibold">
                            Heures
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mergedResults.map((r, i) => (
                          <tr
                            key={i}
                            className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                          >
                            <td className="px-1.5 py-0.5 text-[9px]">{i + 1}</td>
                            <td className="px-1.5 py-0.5 text-[9px]">{r.task}</td>
                            <td className="px-1.5 py-0.5 text-center text-[9px]">
                              {formatUnit(r.nombre_Unite)}
                            </td>
                            <td className="px-1.5 py-0.5 text-center text-[9px]">
                              {Number(r.heures ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot className="bg-blue-50 font-medium text-slate-800 text-[9px]">
                        <tr>
                          <td
                            colSpan={4}
                            className="px-1.5 py-0.5 text-left font-bold"
                          >
                            <span className="text-slate-700">
                              Total heures nécessaires :{" "}
                            </span>
                            <span className="text-[#005EA8]">
                              {totalHeuresAffichees.toFixed(2)} h
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan={4}
                            className="px-1.5 py-0.5 text-left font-bold"
                          >
                            <span className="text-slate-700">
                              Effectif nécessaire (base{" "}
                              {baseHeuresNet.toFixed(2)} h/j) :{" "}
                            </span>
                            <span className="text-[#005EA8]">
                              {fteCalcAffiche.toFixed(2)} ETP
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan={4}
                            className="px-1.5 py-0.5 text-left font-bold"
                          >
                            <span className="text-[#005EA8]">
                              {fteArrondiAffiche} ETP
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            ) : (
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
            )}
          </Card>
        </div>
      </div>
    </div >
  );
}
