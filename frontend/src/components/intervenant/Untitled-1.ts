"use client";
import React, { useState, useEffect, useMemo } from "react";
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
  FileDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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

  // 🔹 Marge d’inactivité (minutes par jour)
  const [idleMinutes, setIdleMinutes] = useState(0);

  const [colisAmanaParSac, setColisAmanaParSac] = useState("");
  const [courriersParSac, setCourriersParSac] = useState("");

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

  // 🔹 Heures nettes théoriques (avant idle) en fonction de la productivité
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

  // 🔴 Détection des doublons de tâches (par nom)
  const doublonMap = useMemo(() => {
    const map = new Map();
    (referentiel || []).forEach((row) => {
      const key = String(row.t || "").trim().toLowerCase();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [referentiel]);

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
  // -> on considère que l'unité est la collecte, et on convertit le volume colis
  // en nombre de collectes par jour : Colis / ColisParCollecte
  const isCollecteColis =
    nom.includes("collecte") && nom.includes("colis");

  if (isCollecteColis) {
    const colisInput = parseNonNeg(colis) ?? 0;
    if (colisInput <= 0) return 0;

    // Si tu as une valeur spécifique dans le référentiel pour cette tâche :
    // ex: colonne "colis_par_collecte"
    const colisParCollecte =
      parseNonNeg(taskData.colis_par_collecte) ?? colisAmanaParSac;

    if (!colisParCollecte || colisParCollecte <= 0) {
      // fallback : pas de division, on retourne le volume brut
      return colisInput;
    }

    // 👉 nombre de collectes / jour
    return colisInput / colisParCollecte;
  }

  // 🔹 Logique standard colis / amana
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

  // 🔹 Heures nettes après déduction de l'idle time (comme au backend)
  const heuresNetBrut = Number(heuresNet || 0);         // calculé via productivité
  const idleHeures = Number(idleMinutes || 0) / 60;     // conversion min -> h
  const baseHeuresNet = Math.max(0, heuresNetBrut - idleHeures);

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

  // Trouver le nom du Centre
  const centreLabel =
    centres.find((c) => Number(c.id) === Number(centre))?.label || "N/A";

  // Trouver le nom du Poste
  const posteLabel =
    postesOptions.find((p) => Number(p.id) === Number(poste))?.label || "N/A";

  // Export Excel (résumé + tâches) avec un bandeau coloré simulant un logo
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      // 1️⃣ Logos
      const baridImg = await fetch("/BaridLogo.png").then((r) =>
        r.arrayBuffer()
      );
      const almavImg = await fetch("/almavlogo.png").then((r) =>
        r.arrayBuffer()
      );

      const baridLogoId = workbook.addImage({
        buffer: baridImg,
        extension: "png",
      });

      const almavLogoId = workbook.addImage({
        buffer: almavImg,
        extension: "png",
      });

      // 2️⃣ Feuille Résumé
      const ws1 = workbook.addWorksheet("Résumé", {
        properties: { defaultRowHeight: 22 },
      });

      ws1.columns = [
        { width: 22 },
        { width: 35 },
        { width: 30 },
        { width: 22 },
        { width: 22 },
      ];

      ws1.addImage(baridLogoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 120, height: 60 },
      });

      ws1.addImage(almavLogoId, {
        tl: { col: 4, row: 0 },
        ext: { width: 120, height: 60 },
      });

      ws1.mergeCells("B1:D2");
      const title = ws1.getCell("B1");
      title.value = "SIMULATION RH - VUE INTERVENANT";
      title.alignment = { horizontal: "center", vertical: "middle" };
      title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      title.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0EA5E9" },
      };

      const resumeData = [
        ["Centre", centreLabel],
        ["Poste", posteLabel],
        ["Heures net / jour (après idle)", baseHeuresNet],
        ["Marge d’inactivité (min/jour)", Number(idleMinutes || 0)],
        ["Total heures", totalHeuresAffichees],
        ["ETP calculé", fteCalcAffiche],
        ["ETP arrondi", fteArrondiAffiche],
      ];

      let rowStart = 4;
      resumeData.forEach(([label, value]) => {
        const r = ws1.getRow(rowStart++);
        r.getCell(1).value = label;
        r.getCell(1).font = { bold: true };
        r.getCell(2).value = value;
      });

      // 3️⃣ Feuille Tâches
      const ws2 = workbook.addWorksheet("Tâches", {
        properties: { defaultRowHeight: 20 },
      });

      ws2.columns = [
        { header: "Seq", width: 8 },
        { header: "Tâche", width: 40 },
        { header: "Unit./jour", width: 15 },
        { header: "Heures", width: 12 },
        { header: "Phase", width: 15 },
        { header: "Flux", width: 15 },
      ];

      ws2.addImage(baridLogoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 120, height: 60 },
      });
      ws2.addImage(almavLogoId, {
        tl: { col: 5, row: 0 },
        ext: { width: 120, height: 60 },
      });

      ws2.mergeCells("B1:E2");
      const title2 = ws2.getCell("B1");
      title2.value = "DÉTAIL DES TÂCHES";
      title2.alignment = { horizontal: "center", vertical: "middle" };
      title2.font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
      title2.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0EA5E9" },
      };

      let detailsRowIndex = 4;

      const header = ws2.getRow(detailsRowIndex++);
      header.values = ["Seq", "Tâche", "Unit./jour", "Heures", "Phase", "Flux"];
      header.font = { bold: true, color: { argb: "FF0F172A" } };
      header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0F2FE" },
      };
      header.alignment = { horizontal: "center" };

      mergedResults.forEach((r) => {
        ws2.addRow([
          r.seq,
          r.task,
          r.nombre_Unite,
          r.heures,
          r._fromBack?.phase || "",
          r._fromBack?._type_flux || r._type_flux || "",
        ]);
      });

      ws2.eachRow((row, rowNumber) => {
        if (rowNumber >= 4) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFCBD5E1" } },
              bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
              left: { style: "thin", color: { argb: "FFCBD5E1" } },
              right: { style: "thin", color: { argb: "FFCBD5E1" } },
            };
          });
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "vue_intervenant.xlsx");
    } catch (err) {
      console.error("❌ Export Excel échoué :", err);
    }
  };

  const handleSimuler = () => {
    onSimuler({
      colis_amana_par_sac: colisAmanaParSac,
      courriers_par_sac: courriersParSac,
      part_particuliers: partParticuliers,
      idle_minutes: idleMinutes ?? 0, // 🔹 on envoie la marge d’inactivité au backend
      
    });
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
                  <span className="font-semibold text-slate-8
00 text-xs">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2">
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
                  value={baseHeuresNet
                    .toFixed(2)
                    .replace(".", ",")}
                  className="h-8 text-[12px] bg-slate-50 border-slate-200 text-center cursor-not-allowed w-full"
                  title="Heures nettes après déduction de l'Idle (calquées sur le backend)"
                />
              </Field>

              {/* Idle time (min/jour) */}
              <Field label="Idle (min)" icon={Clock}>
                <Input
                  type="number"
                  min={0}
                  value={toInput(idleMinutes)}
                  placeholder="0"
                  onChange={(e) =>
                    setIdleMinutes(parseNonNeg(e.target.value) ?? 0)
                  }
                  className="h-8 text-[12px] text-center px-2 w-full"
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
          colis={colis}
         setColis={setColis}
        />

        {/* Référentiel & résultats */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-h-0">
          {/* ---------------- Référentiel ---------------- */}
          <Card
            title="Référentiel des Tâches (Intervenant)"
            actions={
              <div className="flex items-center gap-2">
                <div className="toggle-group text-[11px]">
                  <button
                    className={`toggle-btn ${
                      refDisplay === "tableau" ? "active" : ""
                    }`}
                    onClick={() => setRefDisplay("tableau")}
                  >
                    <TableIcon className="w-3.5 h-3.5" /> Tableau
                  </button>
                  <button
                    className={`toggle-btn ${
                      refDisplay === "graphe" ? "active" : ""
                    }`}
                    onClick={() => setRefDisplay("graphe")}
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> Graphe
                  </button>
                </div>
                <button
                  onClick={handleExportExcel}
                  disabled={!hasSimulated}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 text-white px-2.5 py-1 text-[11px] disabled:opacity-50"
                  title="Exporter en Excel"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Export
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
                      ) : (referentiel?.length ?? 0) === 0 ? (
                        <tr className="bg-white">
                          <td
                            colSpan={hasPhase ? 5 : 4}
                            className="px-2 py-1.5 text-left text-slate-500"
                          >
                            Aucune donnée.
                          </td>
                        </tr>
                      ) : (
                        referentiel.map((r, i) => {
                          const key = String(r.t || "")
                            .trim()
                            .toLowerCase();
                          const isDoublon =
                            key && (doublonMap.get(key) || 0) > 1;

                          return (
                            <tr
                              key={i}
                              className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"} ${
                                isDoublon ? "text-red-700" : ""
                              }`}
                            >
                              <td className="px-2 py-1.5">{i + 1}</td>
                              <td className="px-2 py-1.5">
                                <span>{r.t}</span>
                                {isDoublon && (
                                  <span className="ml-2 inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 uppercase tracking-wide">
                                    Doublon
                                  </span>
                                )}
                              </td>
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
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-2">
                <GraphReferentiel
                  referentiel={referentiel}
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
                <EmptyStateDirty
                  onSimuler={handleSimuler}
                  disabled={!centre}
                />
              ) : (mergedResults?.length ?? 0) === 0 ? (
                <div className="px-2 py-1.5 text-slate-500">
                  Aucune donnée.
                </div>
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
                        heures_net: baseHeuresNet,
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
