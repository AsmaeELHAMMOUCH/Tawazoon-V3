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
  LayoutDashboard, Settings2, Play, AlertTriangle, Building2,
  FileText, BarChart3, Share2, Mail, MessageCircle, Gauge, Clock, MapPin, Sliders, ChevronDown,
  UploadCloud, FileSpreadsheet
} from "lucide-react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import * as XLSX from "xlsx";

// Components
import IndicateursDirection from "../direction/IndicateursDirection";
import DirectionVolumesCard, { ImportModal } from "../direction/DirectionVolumesCard";
import DirectionCentresTable from "../direction/DirectionCentresTable";
import DirectionDonutsRow from "../direction/DirectionDonutsRow";
import DirectionConsolideTable from "../direction/DirectionConsolideTable";
import DirectionPostesModal from "../direction/DirectionPostesModal";
import DirectionOverviewChart from "../direction/DirectionOverviewChart";
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
    idleMinutes: 0,
    tauxComplexite: 0,
    natureGeo: 0
  });

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [centrePostes, setCentrePostes] = useState([]);
  const [loadingPostes, setLoadingPostes] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const initializedRef = useRef(false);

  // Persistence State
  const [lastVolumes, setLastVolumes] = useState([]);
  const [simMode, setSimMode] = useState("database");

  // 3. Handlers
  const handleDownloadTemplate = () => {
    try {
      // Debug: Vérifier les centres disponibles
      console.log("Centres disponibles:", centres);
      console.log("Nombre de centres:", centres?.length || 0);

      // Créer un nouveau workbook
      const wb = XLSX.utils.book_new();

      // Préparer les données du template avec les centres de la direction
      const templateData = [
        // Titre
        ["IMPORT VOLUMES - CENTRES DE LA DIRECTION"],
        ["Remplissez les volumes pour chaque centre ci-dessous"],
        ["Les centres sont pré-remplis avec les centres de votre direction"],
        [],
      ];

      // Ajouter chaque centre
      centres.forEach((centre, index) => {
        console.log(`Centre ${index + 1}:`, centre.label || centre.nom);
        if (index > 0) {
          templateData.push([]);
          templateData.push([]);
        }

        templateData.push([`=== CENTRE ${index + 1} ===`]);
        templateData.push(["Nom du Centre:", centre.label || centre.nom || ""]);
        templateData.push([]);

        // SECTION A : FLUX ARRIVÉE
        templateData.push(["A) FLUX ARRIVÉE"]);
        templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
        templateData.push(["Amana", "", "", "", "", ""]);
        templateData.push(["CO", "", "", "", "", ""]);
        templateData.push(["CR", "", "", "", "", ""]);
        templateData.push(["E-Barkia", "", "", "", "", ""]);
        templateData.push(["LRH", "", "", "", "", ""]);
        templateData.push([]);

        // SECTION B : GUICHET
        templateData.push(["B) GUICHET"]);
        templateData.push(["OPÉRATION", "DÉPÔT", "RÉCUP."]);
        templateData.push(["Volume", "", ""]);
        templateData.push([]);

        // SECTION C : FLUX DÉPART
        templateData.push(["C) FLUX DÉPART"]);
        templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
        templateData.push(["Amana", "", "", "", "", ""]);
        templateData.push(["CO", "", "", "", "", ""]);
        templateData.push(["CR", "", "", "", "", ""]);
        templateData.push(["E-Barkia", "", "", "", "", ""]);
        templateData.push(["LRH", "", "", "", "", ""]);
      });

      // Si aucun centre, ajouter un exemple
      if (centres.length === 0) {
        templateData.push(["=== CENTRE EXEMPLE ==="]);
        templateData.push(["Nom du Centre:", "Centre Exemple"]);
        templateData.push([]);
        templateData.push(["A) FLUX ARRIVÉE"]);
        templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
        templateData.push(["Amana", "", "", "", "", ""]);
        templateData.push(["CO", "", "", "", "", ""]);
        templateData.push(["CR", "", "", "", "", ""]);
        templateData.push(["E-Barkia", "", "", "", "", ""]);
        templateData.push(["LRH", "", "", "", "", ""]);
        templateData.push([]);
        templateData.push(["B) GUICHET"]);
        templateData.push(["OPÉRATION", "DÉPÔT", "RÉCUP."]);
        templateData.push(["Volume", "", ""]);
        templateData.push([]);
        templateData.push(["C) FLUX DÉPART"]);
        templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
        templateData.push(["Amana", "", "", "", "", ""]);
        templateData.push(["CO", "", "", "", "", ""]);
        templateData.push(["CR", "", "", "", "", ""]);
        templateData.push(["E-Barkia", "", "", "", "", ""]);
        templateData.push(["LRH", "", "", "", "", ""]);
      }

      // Créer la feuille
      const ws = XLSX.utils.aoa_to_sheet(templateData);

      // Définir les largeurs de colonnes
      ws['!cols'] = [
        { wch: 20 },  // A
        { wch: 12 },  // B
        { wch: 12 },  // C
        { wch: 12 },  // D
        { wch: 12 },  // E
        { wch: 12 },  // F
      ];

      // Ajouter la feuille au workbook
      XLSX.utils.book_append_sheet(wb, ws, "Import Volumes");

      // Créer la feuille "Guide"
      const guideData = [
        ["GUIDE DE REMPLISSAGE"],
        [],
        ["1. CENTRES PRÉ-REMPLIS"],
        ["", "Les centres de votre direction sont déjà listés."],
        ["", "Vous n'avez qu'à remplir les volumes pour chaque centre."],
        [],
        ["2. STRUCTURE DES DONNÉES"],
        ["", "Pour chaque centre, 3 sections :"],
        [],
        ["A) FLUX ARRIVÉE", "Matrice 5 flux × 5 segments"],
        ["", "  Flux : Amana, CO, CR, E-Barkia, LRH"],
        ["", "  Segments : GLOBAL, PART., PRO, DIST., AXES"],
        [],
        ["B) GUICHET", "2 opérations uniquement"],
        ["", "  - DÉPÔT : Volume des dépôts"],
        ["", "  - RÉCUP. : Volume des récupérations"],
        [],
        ["C) FLUX DÉPART", "Même matrice que Flux Arrivée"],
        ["", "  Flux : Amana, CO, CR, E-Barkia, LRH"],
        ["", "  Segments : GLOBAL, PART., PRO, DIST., AXES"],
        [],
        ["3. RÈGLES DE SAISIE"],
        ["", "✓ NE PAS modifier les noms de centres"],
        ["", "✓ Saisir uniquement des nombres entiers ou décimaux"],
        ["", "✓ Laisser vide si volume = 0"],
        ["", "✓ Ne pas modifier la structure du tableau"],
        [],
        ["4. MAPPING DES SEGMENTS"],
        ["GLOBAL", "Volume global non segmenté"],
        ["PART.", "Segment Particuliers"],
        ["PRO", "Segment Professionnels"],
        ["DIST.", "Segment Distribution"],
        ["AXES", "Segment Axes stratégiques"],
      ];

      const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
      wsGuide['!cols'] = [
        { wch: 25 },
        { wch: 50 },
      ];
      XLSX.utils.book_append_sheet(wb, wsGuide, "Guide");

      // Télécharger le fichier
      const directionLabel = selectedDirection ? directions.find(d => d.id === selectedDirection)?.label || "Direction" : "Direction";
      XLSX.writeFile(wb, `Template_Volumes_${directionLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
      console.error('Erreur lors de la génération du template:', error);
    }
  };

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
        idle_minutes: toNumber(params.idleMinutes, 0),
        taux_complexite: toNumber(params.tauxComplexite, 0),
        nature_geo: toNumber(params.natureGeo, 0)
      },
      // Utiliser volumes_matriciels si les données ont flux_id/sens_id/segment_id
      // Sinon utiliser volumes (ancien format)
      ...(activeVolumes.length > 0 && activeVolumes[0].flux_id !== undefined
        ? { volumes_matriciels: activeVolumes }
        : { volumes: activeVolumes })
    };

    console.log("Payload envoyé au backend:", payload);

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
          amana: 0,
          // Paramètres de conversion avec valeurs par défaut
          colis_amana_par_sac: 5,
          courriers_par_sac: 4500,
          colis_par_collecte: 1
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

          // Volumes
          if (key.includes("sac") && !key.includes("colis") && !key.includes("courrier")) {
            v.sacs = toNumber(val, 0);
          } else if (key.includes("colis") && !key.includes("amana") && !key.includes("sac") && !key.includes("collecte")) {
            v.colis = toNumber(val, 0);
          } else if (key.includes("ordinaire")) {
            v.courrier_ordinaire = toNumber(val, 0);
          } else if (key.includes("recommande")) {
            v.courrier_recommande = toNumber(val, 0);
          } else if (key.includes("ebarkia") || key.includes("e-barkia")) {
            v.ebarkia = toNumber(val, 0);
          } else if (key.includes("lrh") || key.includes("24")) {
            v.lrh = toNumber(val, 0);
          } else if (key.includes("amana") && !key.includes("sac")) {
            v.amana = toNumber(val, 0);
          }
          // Paramètres de conversion
          else if (key.includes("colis") && key.includes("amana") && key.includes("sac")) {
            v.colis_amana_par_sac = toNumber(val, 5);
          } else if (key.includes("courrier") && key.includes("sac")) {
            v.courriers_par_sac = toNumber(val, 4500);
          } else if (key.includes("colis") && key.includes("collecte")) {
            v.colis_par_collecte = toNumber(val, 1);
          }
        });

        if (!v.centre_label && row?.label) v.centre_label = String(row.label).trim();

        // --- IMPROVED MATCHING LOGIC ---
        // Try to find the centre_id from the existing centres list if not already present
        if (!v.centre_id && v.centre_label && centres && centres.length > 0) {
          const normalizedImport = String(v.centre_label).toLowerCase().replace(/\s+/g, "");
          const match = centres.find(c => {
            const normalizedDb = String(c.label).toLowerCase().replace(/\s+/g, "");
            // Exact match after normalization or "includes" if significant length
            return normalizedDb === normalizedImport || (normalizedDb.includes(normalizedImport) && normalizedImport.length > 5);
          });
          if (match) {
            v.centre_id = match.id;
          }
        }

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

    // CAS 1: Résultat de simulation disponible (prioritaire)
    if (centre.details_postes && centre.details_postes.length > 0) {
      // On utilise directement les données calculées
      setCentrePostes(centre.details_postes);
      setLoadingPostes(false);
      return;
    }

    // CAS 2: Données statiques BDD (si pas de sim)
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

  // Force local computation to ensure consistency (Delta = Target - Actual)
  const computedFte = centres ? centres.reduce((a, b) => a + (b.fte_actuel || 0), 0) : 0;
  const computedEtp = centres ? centres.reduce((a, b) => a + (b.etp_calcule || 0), 0) : 0;

  const kpis = {
    centers: centres ? centres.length : 0,
    fte: computedFte,
    etp: computedEtp,
    delta: computedEtp - computedFte // Consistent math
  };

  // --- NEW SCENARIO HANDLER ---
  const handleScenarioApply = async (factor) => {
    if (!lastVolumes || lastVolumes.length === 0) {
      alert("Veuillez d'abord importer des volumes ou sélectionner une direction pour activer la projection.");
      return;
    }

    // Create a scenario projection
    const projectedVolumes = lastVolumes.map(v => ({
      ...v,
      sacs: Math.round(v.sacs * factor),
      colis: Math.round(v.colis * factor),
      courrier_ordinaire: Math.round(v.courrier_ordinaire * factor),
      courrier_recommande: Math.round(v.courrier_recommande * factor),
      ebarkia: Math.round(v.ebarkia * factor),
      lrh: Math.round(v.lrh * factor),
      amana: Math.round(v.amana * factor)
    }));

    // Run simulation with scenario
    await runSim("scenario", projectedVolumes);
  };
  // -----------------------------

  const handleShare = (type) => {
    // 1. WhatsApp Executive Format (Decision Oriented)
    if (type === 'whatsapp') {
      const gap = kpis.delta;
      const ratio = kpis.fte > 0 ? (kpis.etp / kpis.fte) : 1;

      // Icons generated via code points to prevent encoding issues
      const ICONS = {
        MEGA: String.fromCodePoint(0x1F4E2), // 📢
        PIN: String.fromCodePoint(0x1F4CD),  // 📍
        CAL: String.fromCodePoint(0x1F4C5),  // 📅
        STAT: String.fromCodePoint(0x1F4CA), // 📊
        RED: String.fromCodePoint(0x1F534),  // 🔴
        GREEN: String.fromCodePoint(0x1F7E2),// 🟢
        ORANGE: String.fromCodePoint(0x1F7E0),// 🟠
        BLUE: String.fromCodePoint(0x1F535), // 🔵
        TEAM: String.fromCodePoint(0x1F465), // 👥
        TARGET: String.fromCodePoint(0x1F3AF),// 🎯
        DOWN: String.fromCodePoint(0x1F4C9), // 📉
        FIRE: String.fromCodePoint(0x1F525), // 🔥
        IDEA: String.fromCodePoint(0x1F4A1), // 💡
        LINK: String.fromCodePoint(0x1F517)  // 🔗
      };

      // Diagnostic Global
      let statusEmoji = ICONS.GREEN;
      let statusText = "Stabilité";
      if (ratio > 1.10) { statusEmoji = ICONS.RED; statusText = "CRITIQUE"; }
      else if (ratio > 1.02) { statusEmoji = ICONS.ORANGE; statusText = "Tension"; }
      else if (ratio < 0.85) { statusEmoji = ICONS.BLUE; statusText = "Surplus"; }

      // Top 3 Priorités
      const topActions = [...centres]
        .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
        .slice(0, 3)
        .map(c => {
          const icon = c.ecart > 0 ? ICONS.RED : ICONS.BLUE;
          const type = c.ecart > 0 ? 'Manque' : 'Trop';
          return `• *${c.label.substring(0, 15).trim()}..* : ${icon} ${type} ${Math.abs(Number(c.ecart).toFixed(1))} ETP`;
        });

      const whatsappText = `${ICONS.MEGA} *FLASH DECISION RH*
${ICONS.PIN} *${currentDirLabel || 'Direction'}* | ${ICONS.CAL} ${new Date().toLocaleDateString().slice(0, 5)}

${ICONS.STAT} *Macro-Vision*
${statusEmoji} Situation : *${statusText}*
${ICONS.TEAM} Actuel : *${fmt(kpis.fte)}* | ${ICONS.TARGET} Cible : *${fmt(kpis.etp)}*
${ICONS.DOWN} Écart Net : *${gap > 0 ? '+' : ''}${fmt(gap)} ETP*

${ICONS.FIRE} *Top 3 Priorités (Action Requise)*
${topActions.join('\n')}

${ICONS.IDEA} _Recommandation IA :_ ${ratio > 1 ? "Recrutement/Renfort prioritaire sur les sites listés." : "Optimisation et redéploiement recommandés."}

${ICONS.LINK} _Détails sur Tawazoon_`;

      window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank');
      setShareOpen(false);
      return;
    }

    // 2. Email Format (Clean & Professional)
    const emailBody = `Rapport de Simulation RH
Direction : ${currentDirLabel || 'N/A'}
Date : ${new Date().toLocaleDateString()}

SYNTHÈSE EXÉCUTIVE :
--------------------------------
- Nombre de Centres : ${kpis.centers}
- Effectif Actuel : ${fmt(kpis.fte)}
- Effectif Cible : ${fmt(kpis.etp)}
- Écart Global : ${kpis.delta > 0 ? '+' : ''}${fmt(kpis.delta)}

Veuillez trouver ci-joint le rapport détaillé pour arbitrage.

Cordialement,
Application Tawazoon RH`;

    const subject = encodeURIComponent(`Arbitrage RH : ${currentDirLabel || 'Direction'}`);
    window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(emailBody)}`);
    setShareOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-8 animate-in fade-in duration-300 font-sans" style={{ zoom: "90%" }}>

      {/* --- 1. PRO NAVBAR --- */}
      {/* 1. COMPACT NAVBAR (V2 Style Harmonized) */}
      {/* 1. TOP HEADER (Context & Actions) */}


      <main className="px-4 xl:px-8 py-2 w-full mx-auto space-y-1">

        {/* Error State */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!selectedDirection ? (
          /* --- HERO EMPTY STATE --- */
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-in zoom-in-95 duration-500 mt-8">

            {/* Icon Block */}
            <div className="relative group">
              <div className="absolute -inset-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
              <div className="relative bg-white p-6 rounded-2xl shadow-xl border border-slate-100 transform group-hover:scale-105 transition-transform duration-300">
                <Building2 size={48} className="text-[#005EA8]" strokeWidth={1.5} />
              </div>
            </div>

            {/* Content Block */}
            <div className="max-w-md space-y-6 w-full px-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Simulation par Direction Régionale</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Pour accéder au tableau de bord et aux simulations, veuillez sélectionner votre <strong>Direction Régionale</strong>.
                </p>
              </div>

              {/* MAIN SELECTOR (Central) */}
              <div className="relative max-w-sm mx-auto group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-200"></div>
                <div className="relative flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-4 shadow-lg hover:shadow-xl transition-all cursor-pointer">
                  <div className="p-1.5 bg-blue-50 text-[#005EA8] rounded-lg">
                    <Building2 size={20} strokeWidth={2.5} />
                  </div>
                  <select
                    className="w-full bg-transparent font-bold text-lg text-slate-800 outline-none cursor-pointer placeholder-slate-400"
                    value=""
                    onChange={(e) => handleSelectDirection(e.target.value)}
                  >
                    <option value="" disabled className="text-slate-400">Choisir une Direction...</option>
                    {directions.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                  <ChevronDown size={20} className="text-slate-400 group-hover:text-[#005EA8] transition-colors" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* --- DASHBOARD CONTENT --- */
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">


            {/* 2. CRITICAL SECTION : SELECTOR + PARAMS GRID (50/50 Layout like VueCentre) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 sticky top-[60px] z-30">

              {/* LEFT: PERIMETER SELECTOR */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] p-2 flex flex-col justify-center h-full animate-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-50 pb-2">
                  <div className="p-1.5 bg-blue-50 text-[#005EA8] rounded-lg">
                    <Building2 size={16} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Périmètre / Direction</h3>
                </div>

                <div className="flex items-center gap-2 w-full">
                  <div className="relative group flex-1">
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 shadow-inner group-hover:bg-white group-hover:shadow-md group-hover:border-blue-300 transition-all">
                      <select
                        className="appearance-none bg-transparent font-bold text-slate-800 text-sm xl:text-base w-full outline-none cursor-pointer"
                        value={selectedDirection || ""}
                        onChange={(e) => handleSelectDirection(e.target.value)}
                      >
                        {directions.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                      </select>
                      <ChevronDown size={18} className="text-slate-400 pointer-events-none group-hover:text-[#005EA8] transition-colors" />
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-[#005EA8] hover:border-blue-300 hover:bg-white transition-all shadow-sm"
                    title="Télécharger le modèle Excel"
                  >
                    <FileSpreadsheet size={16} strokeWidth={2} />
                    <span className="text-xs font-bold">Modèle</span>
                  </button>

                  <button
                    onClick={() => setImportModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#005EA8] border border-[#005EA8] rounded-lg text-white hover:bg-[#004e8a] transition-all shadow-md active:scale-95"
                    title="Importer un fichier de volumes"
                  >
                    <UploadCloud size={16} strokeWidth={2} />
                    <span className="text-xs font-bold">Importer</span>
                  </button>
                </div>
              </div>

              {/* RIGHT: SIMULATION PARAMS */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] p-2 h-full flex flex-col justify-center animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-[#005EA8] rounded-lg">
                      <Sliders size={16} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Simulation</h3>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded text-[#005EA8]">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Capacité Nette</span>
                    <span className="font-mono text-sm font-bold">
                      {(() => {
                        const h = 8;
                        const idleH = (params.idleMinutes || 0) / 60;
                        const prod = (params.productivite || 100) / 100;
                        const net = Math.max(0, (h - idleH) * prod);
                        return net.toFixed(2).replace('.', ',');
                      })()} h
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                    {/* Prod */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 overflow-hidden">
                      <span className="text-[10px] font-bold text-slate-400">PROD</span>
                      <input type="number" className="w-full bg-transparent font-mono text-xs font-bold text-center outline-none" value={params.productivite} onChange={e => setParams(p => ({ ...p, productivite: parseFloat(e.target.value) }))} />
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>
                    {/* Tps Mort */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 overflow-hidden">
                      <span className="text-[10px] font-bold text-slate-400">MORT</span>
                      <input type="number" className="w-full bg-transparent font-mono text-xs font-bold text-center outline-none" value={params.idleMinutes} onChange={e => setParams(p => ({ ...p, idleMinutes: parseFloat(e.target.value) }))} />
                      <span className="text-[10px] text-slate-400">m</span>
                    </div>
                    {/* Circ */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 overflow-hidden">
                      <span className="text-[10px] font-bold text-slate-400">CIRC</span>
                      <input type="number" step="0.1" className="w-full bg-transparent font-mono text-xs font-bold text-center outline-none" value={params.tauxComplexite} onChange={e => setParams(p => ({ ...p, tauxComplexite: parseFloat(e.target.value) }))} />
                    </div>
                    {/* Geo */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 overflow-hidden">
                      <span className="text-[10px] font-bold text-slate-400">GEO</span>
                      <input type="number" step="0.1" className="w-full bg-transparent font-mono text-xs font-bold text-center outline-none" value={params.natureGeo} onChange={e => setParams(p => ({ ...p, natureGeo: parseFloat(e.target.value) }))} />
                    </div>
                  </div>

                  <button
                    onClick={() => runSim()}
                    className="bg-[#005EA8] hover:bg-[#004e8a] text-white p-2.5 rounded-lg shadow-sm transition-all active:scale-95 group shrink-0"
                    title="Lancer la simulation"
                  >
                    <Play size={18} fill="currentColor" className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

            </div>

            {/* KPI Section */}
            <div className="-mt-2">
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
                  headerActions={
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportPDF}
                        className="px-2 py-1 text-[10px] font-bold rounded border border-slate-200 text-slate-600 bg-slate-50 hover:bg-white hover:text-red-700 hover:border-red-200 flex items-center gap-1.5 transition-all"
                      >
                        <FileText size={12} /> Export PDF
                      </button>

                      {/* Share Button & Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShareOpen(!shareOpen)}
                          className={`px-2 py-1 text-[10px] font-bold rounded border transition-all flex items-center gap-1.5 ${shareOpen ? 'bg-[#005EA8] text-white border-[#005EA8]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:text-[#005EA8]'}`}
                        >
                          <Share2 size={12} />
                        </button>
                        {shareOpen && (
                          <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 animate-in fade-in slide-in-from-top-2 z-[9999]">
                            <div className="px-3 py-1.5 border-b border-slate-50 mb-1">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Partager</span>
                            </div>
                            <button onClick={() => handleShare('email')} className="w-full text-left px-3 py-2 text-[10px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Mail size={12} className="text-blue-600" /> Par Email
                            </button>
                            <button onClick={() => handleShare('whatsapp')} className="w-full text-left px-3 py-2 text-[10px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <MessageCircle size={12} className="text-green-600" /> Par WhatsApp
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  }
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
                {/* 1. AI Smart Panel (Wow Effect) */}
                <DirectionOverviewChart centres={centres} />



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
                <div className="text-[10px] uppercase text-slate-500">Effectif Calculé</div>
              </div>
              <div className="p-4 rounded text-center border border-slate-200">
                <div className="text-2xl font-bold text-slate-800">{fmt(kpis.delta)}</div>
                <div className="text-[10px] uppercase text-slate-400">Écart</div>
              </div>
            </div>
            {/* Tables... */}
            <table className="w-full text-xs text-left border-collapse mb-8">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300"><th className="p-2">Centre</th><th className="p-2 text-right">Actuel</th><th className="p-2 text-right">Effectif Calculé</th><th className="p-2 text-right">Écart</th></tr>
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

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onValidate={(parsedCentres) => {
          console.log("Données importées:", parsedCentres);

          // parsedCentres est un array de centres avec leurs volumes
          // Format: [{ nom_centre: "...", volumes: [{flux_id, sens_id, segment_id, volume}] }]

          // Transformer les données pour l'API de simulation
          // On doit envoyer les volumes au format attendu par le backend

          // Pour chaque centre, on va créer une entrée avec ses volumes
          const volumesData = parsedCentres.flatMap(centreData => {
            // Trouver le centre correspondant dans la liste des centres
            const centre = centres.find(c =>
              c.label === centreData.nom_centre ||
              c.nom === centreData.nom_centre
            );

            if (!centre) {
              console.warn(`Centre non trouvé: ${centreData.nom_centre}`);
              return [];
            }

            // Retourner les volumes avec l'ID du centre
            return centreData.volumes.map(vol => ({
              centre_id: centre.id,
              centre_label: centre.label || centre.nom,
              flux_id: vol.flux_id,
              sens_id: vol.sens_id,
              segment_id: vol.segment_id,
              volume: vol.volume
            }));
          });

          console.log("Volumes transformés pour simulation:", volumesData);

          // Lancer la simulation avec les volumes importés
          if (volumesData.length > 0) {
            runSim("data_driven", volumesData);
          } else {
            console.error("Aucun volume valide trouvé pour la simulation");
          }

          setImportModalOpen(false);
        }}
      />
    </div >
  );
}
