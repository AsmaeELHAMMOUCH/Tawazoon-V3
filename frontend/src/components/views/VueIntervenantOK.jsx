/* VueIntervenant.jsx - normalisation /jour + productivité + formatage */
"use client";
import React, { useState, useEffect } from "react";
import {
  MapPin,
  Building,
  Tag,
  User,
  Archive,
  Package,
  Mail,
  Gauge,
  Clock,
  Table as TableIcon,
  BarChart3,
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
  const [edPercent, setEdPercent] = useState(0); // Nouveau paramètre ED%

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

  const [partParticuliers, setPartParticuliers] = useState(75);
  const partProfessionnels = 100 - partParticuliers;

  const ratioPart = partParticuliers / 100;
  const ratioProf = partProfessionnels / 100;

  const splitFlux = (total) => {
    const v = Number(total ?? 0);
    return { part: v * ratioPart, prof: v * ratioProf };
  };

  useEffect(() => {
    const productiviteNum = Number(productivite ?? 100);
    const heuresBase = 8.0;

    if (productiviteNum > 0) {
      const heuresCalculees = heuresBase * (productiviteNum / 100);
      setHeuresNet(heuresCalculees.toFixed(2));
    } else {
      setHeuresNet(heuresBase.toFixed(2));
    }
  }, [productivite, setHeuresNet]);

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

  // ✅ Détection si l'utilisateur a réellement saisi un volume
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
    // ✅ si aucun volume saisi → 0 partout
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

    // 🔹 CAS SPÉCIAL : tâche "collecte colis"
    //    -> on convertit le volume colis en nombre de collectes via le ratio du front
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

      if (dailyAmanaColis > 0) {
        const pourcSac = 100 - (edPercent ?? 0);
        const colisEnSac = dailyAmanaColis * (pourcSac / 100);
        return Math.ceil(colisEnSac / colisAmanaParSac);
      }

      const colisInput = parseNonNeg(colis) ?? 0;
      if (colisInput > 0) {
        const pourcSac = 100 - (edPercent ?? 0);
        const colisEnSac = colisInput * (pourcSac / 100);
        return Math.ceil(colisEnSac / colisAmanaParSac);
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

  // 🔹 Filtrer le référentiel pour exclure les tâches avec moyenne_min = 0
  const referentielFiltered = (referentiel || []).filter((row) => Number(row.m ?? 0) > 0);

  const mergedResults = referentielFiltered
    .map((row, i) => {
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

  // ✅ helper arrondi half-up (comme backend)
  const roundHalfUp = (n, decimals = 0) => {
    const f = 10 ** decimals;
    return Math.floor(n * f + 0.5) / f;
  };

  // ✅ ARRONDI CORRIGÉ
  const fteArrondiAffiche =
    fteCalcAffiche <= 0.1 ? 0 : roundHalfUp(fteCalcAffiche, 0);

  // 🔹 ICI : préparation d'un body propre pour un POST backend
  const handleSimuler = (extraParams = {}) => {
    const ratioCollecte = Math.max(1, parseNonNeg(colisParCollecte) ?? 1);

    // 🆕 Calcul des sacs avec ED%
    const colisTotal = parseNonNeg(colis) ?? 0;
    const pourcSac = Math.max(0, 100 - (edPercent ?? 0));
    const colisEnSac = colisTotal * (pourcSac / 100);
    const ratioSac = Math.max(1, parseNonNeg(colisAmanaParSac) ?? 5);
    const nbSacsCalculated = Math.ceil(colisEnSac / ratioSac);

    const body = {
      // identifiants
      centre_id: centre ? Number(centre) : null,
      poste_id: poste ? Number(poste) : null,

      // volumes annuels / globaux
      colis: parseNonNeg(colis) ?? 0,
      courrier_ordinaire: annualValues.courrierOrdinaire,
      courrier_recommande: annualValues.courrierRecommande,
      ebarkia: annualValues.ebarkia,
      lrh: annualValues.lrh,
      amana: annualValues.amana,

      // paramètres de productivité
      productivite: Number(productivite ?? 100),
      heures_net: Number(heuresNet ?? 8),

      // options / paramètres techniques
      colis_amana_par_sac: parseNonNeg(colisAmanaParSac) ?? 5,
      courriers_par_sac: parseNonNeg(courriersParSac) ?? 4500,
      colis_par_collecte: ratioCollecte,
      part_particuliers: partParticuliers,
      part_professionnels: partProfessionnels,

      // 🆕 Paramètres ED% et sacs calculés
      ed_percent: Number(edPercent ?? 0),
      sacs: nbSacsCalculated, // Nombre de sacs après application ED%

      // fusion des paramètres supplémentaires (ex: sacs calculés, volumes_flux)
      ...extraParams,
    };

    // on laisse le parent gérer l'appel POST (axios/fetch)
    onSimuler(body);
  };

  return (
    <div className="w-full">
      <div
        className="w-full space-y-3 text-[12px] leading-tight"
        style={{ zoom: PAGE_SCALE }}
      >
        {/* Paramètres principaux + productivité */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
          <Card title="Paramètres principaux">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 p-2">
              <Field
                label={
                  <span className="font-semibold text-slate-800 text-xs">
                    Région
                  </span>
                }
                icon={MapPin}
              >
                <Select
                  className="h-8 text-[12px] w-full"
                  value={region ?? ""}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="">Sélectionner…</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label={
                  <span className="font-semibold text-slate-800 text-xs">
                    Centre
                  </span>
                }
                icon={Building}
              >
                <Select
                  className="h-8 text-[12px] w-full"
                  value={centre ?? ""}
                  onChange={(e) => setCentre(e.target.value)}
                  disabled={!region}
                >
                  <option value="">
                    {loading.centres ? "Chargement..." : "Sélectionner…"}
                  </option>
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label ?? c.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label={
                  <span className="font-semibold text-slate-800 text-xs">
                    Catégorie
                  </span>
                }
                icon={Tag}
              >
                <Input
                  className="h-8 text-[12px] bg-slate-100 cursor-not-allowed text-slate-700 w-full"
                  value={centreCategorie || "?"}
                  readOnly
                />
              </Field>

              <Field
                label={
                  <span className="font-semibold text-slate-800 text-xs">
                    Intervenant
                  </span>
                }
                icon={User}
              >
                <Select
                  className="h-8 text-[12px] w-full"
                  value={posteValue}
                  onChange={(e) => setPoste(e.target.value)}
                  disabled={!centre || loading.postes}
                >
                  <option value="">Sélectionner…</option>
                  {postesOptions.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.label ?? p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card
            title={
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-900 text-sm">
                  Paramètres de productivité
                </span>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
              <Field label="Productivité (%)" icon={Gauge}>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    value={toInput(productivite)}
                    placeholder="100"
                    onChange={(e) =>
                      setProductivite(parseNonNeg(e.target.value) ?? 100)
                    }
                    className="h-8 text-[12px] pr-7 text-center w-full"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                    %
                  </span>
                </div>
              </Field>

              <Field label="Heures net / Jour" icon={Clock}>
                <Input
                  type="text"
                  readOnly
                  disabled
                  value={Number(heuresNet || 0)
                    .toFixed(2)
                    .replace(".", ",")}
                  className="h-8 text-[12px] bg-slate-50 border-slate-200 text-center cursor-not-allowed w-full"
                  title="Calculé automatiquement à partir de la productivité"
                />
              </Field>
            </div>
          </Card>
        </div>

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
          edPercent={edPercent}
          setEdPercent={setEdPercent}
        />

        {/* Référentiel & résultats */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-h-0">
          {/* ---------------- Référentiel ---------------- */}
          <Card
            title="Référentiel des Tâches (Intervenant)"
            actions={
              <div className="toggle-group text-[11px]">
                <button
                  className={`toggle-btn ${refDisplay === "tableau" ? "active" : ""
                    }`}
                  onClick={() => setRefDisplay("tableau")}
                >
                  <TableIcon className="w-3.5 h-3.5" /> Tableau
                </button>
                <button
                  className={`toggle-btn ${refDisplay === "graphe" ? "active" : ""
                    }`}
                  onClick={() => setRefDisplay("graphe")}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Graphe
                </button>
              </div>
            }
          >
            {refDisplay === "tableau" ? (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="max-h-[50vh] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-2 py-1.5 text-[11px] font-semibold">
                          Seq
                        </th>
                        <th className="text-left px-2 py-1.5 text-[11px] font-semibold">
                          Tâche
                        </th>
                        {hasPhase && (
                          <th className="text-left px-2 py-1.5 text-[11px] font-semibold">
                            Phase
                          </th>
                        )}
                        <th className="text-left px-2 py-1.5 text-[11px] font-semibold">
                          Unité
                        </th>
                        <th className="text-center px-2 py-1.5 text-[11px] font-semibold">
                          Moy. (min)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading?.referentiel ? (
                        <tr>
                          <td
                            colSpan={hasPhase ? 5 : 4}
                            className="px-2 py-1.5 text-left text-slate-500"
                          >
                            Chargement…
                          </td>
                        </tr>
                      ) : (referentielFiltered?.length ?? 0) === 0 ? (
                        <tr className="bg-white">
                          <td
                            colSpan={hasPhase ? 5 : 4}
                            className="px-2 py-1.5 text-left text-slate-500"
                          >
                            Aucune donnée.
                          </td>
                        </tr>
                      ) : (
                        referentielFiltered
                          .map((r, i) => (
                            <tr
                              key={i}
                              className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                            >
                              <td className="px-2 py-1.5">{i + 1}</td>
                              <td className="px-2 py-1.5">{r.t}</td>
                              {hasPhase && (
                                <td className="px-2 py-1.5">
                                  {r.ph &&
                                    String(r.ph).trim().toLowerCase() !== "n/a"
                                    ? r.ph
                                    : ""}
                                </td>
                              )}
                              <td className="px-2 py-1.5">{r.u}</td>
                              <td className="px-2 py-1.5 text-center">
                                {Number(r.m ?? 0).toFixed(2)}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-2">
                <GraphReferentiel
                  referentiel={referentielFiltered}
                  loading={loading?.referentiel}
                  hasPhase={hasPhase}
                />
              </div>
            )}
          </Card>

          {/* ---------------- Résultats ---------------- */}
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                Résultats de Simulation
              </span>
            }
            bodyClassName="p-0"
            actions={
              <Segmented
                value={display}
                onChange={setDisplay}
                items={[
                  { value: "tableau", label: "Tableau", icon: TableIcon },
                  { value: "graphe", label: "Graphe", icon: BarChart3 },
                ]}
              />
            }
          >
            {display === "tableau" ? (
              loading?.simulation ? (
                <div className="px-2 py-1.5 text-slate-500">
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
                <div className="px-2 py-1.5 text-slate-500">Aucune donnée.</div>
              ) : (
                <div className="h-[420px] flex flex-col">
                  {/* zone scrollable */}
                  <div className="flex-1 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-[12px]">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                        <tr>
                          <th className="text-left px-2 py-1.5 text-[11px] font-semibold">
                            Seq
                          </th>
                          <th className="text-left px-2 py-1.5 text-[11px] font-semibold">
                            Tâche
                          </th>
                          <th className="text-center px-2 py-1.5 text-[11px] font-semibold">
                            Unit. (/jour)
                          </th>
                          <th className="text-center px-2 py-1.5 text-[11px] font-semibold">
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
                            <td className="px-2 py-1.5">{i + 1}</td>
                            <td className="px-2 py-1.5">{r.task}</td>
                            <td className="px-2 py-1.5 text-center">
                              {formatUnit(r.nombre_Unite)}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {Number(r.heures ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot className="bg-blue-50 font-medium text-slate-800 text-[12px]">
                        <tr>
                          <td
                            colSpan={4}
                            className="px-2 py-1.5 text-left font-bold"
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
                            className="px-2 py-1.5 text-left font-bold"
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
                            className="px-2 py-1.5 text-left font-bold"
                          >
                            <span className="text-slate-700">
                              Effectif arrondi :{" "}
                            </span>
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
              <div className="p-2 h-[600px]">
                {loading?.simulation ? (
                  <div className="px-2 py-1.5 text-slate-500">
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
    </div>
  );
}
