"use client";
import React, { useState, useEffect } from "react";
import {
  Mail,
  Archive,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Clock,
  Gauge,
  MapPin,
  Lock,
  FileUp,
  Download,
  Building, // 🆕 Import Building icon
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// 5 lignes : Amana, CO, CR, E-Barkia, LRH
const fluxRows = [
  { key: "amana", label: "Amana", icon: Package },
  { key: "co", label: "CO", icon: Mail },
  { key: "cr", label: "CR", icon: Mail },
  { key: "eb", label: "E-Barkia", icon: Mail },
  { key: "lrh", label: "LRH", icon: Archive },
];

// 🔢 Formatage milliers : 1000000 -> "1 000 000"
const formatThousands = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const str = String(value).replace(/\s+/g, "");
  if (str === "" || isNaN(Number(str))) return "";
  return Number(str)
    .toLocaleString("fr-FR")
    .replace(/\u202F/g, " "); // espace insécable -> espace normal
};

const unformat = (str) => str.replace(/\s+/g, "");

export default function VolumeParamsCard({
  // UI
  Card,
  Field,
  Input,

  // Data / state
  centre,
  centreCategorie,
  loading = {},

  // volumes globaux (Arrivée – Global)
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

  // params sacs
  colisAmanaParSac,
  setColisAmanaParSac,
  courriersParSac,
  setCourriersParSac,
  nbrCoSac,
  setNbrCoSac,
  nbrCrSac,
  setNbrCrSac,
  crParCaisson,
  setCrParCaisson,

  // collecte colis (gardé pour compat)
  colis,
  setColis,
  colisParCollecte,
  setColisParCollecte,

  // helpers
  parseNonNeg,
  toInput,
  monthly,
  formatInt,
  splitFlux,
  partParticuliers,
  setPartParticuliers,
  partProfessionnels,

  // rules
  getEffectiveFluxMode = () => "input", // Default to "input" mode func if missing

  // ➕ pour calcul heures nettes
  heures, // en heures
  tempsMortMinutes, // en minutes

  // action
  onSimuler,

  // état simulation
  simDirty,

  // 🆕 ED Props
  edPercent,
  setEdPercent,

  // 🆕 Synchro Grille Flux
  volumesFluxGrid,
  setVolumesFluxGrid,

  // 🆕 Axes
  pctAxesArrivee,
  setPctAxesArrivee,
  pctAxesDepart,
  setPctAxesDepart,

  // 🆕 Collecte
  pctCollecte,
  setPctCollecte,

  // 🆕 Retour
  pctRetour,
  setPctRetour,

  // 🆕 International
  pctInternational,
  setPctInternational,

  // 🆕 National (nouveau paramètre)
  pctNational,
  setPctNational,

  // 🆕 Marche Ordinaire
  pctMarcheOrdinaire,
  setPctMarcheOrdinaire,


  // 🆕 Disable Axes
  disabledAxes = false,
}) {
  // ✅ style commun PROFESSIONAL DASHBOARD
  const baseInputClass =
    "text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300 disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed";

  // 👉 largeur UNIQUE pour tous les champs des 3 tableaux
  const CELL_WIDTH_PX = 85;
  const tableInputStyle = { height: "30px", width: `${CELL_WIDTH_PX}px` };

  // Arrivée (hors Global)
  const [arriveeState, setArriveeState] = useState(() =>
    volumesFluxGrid?.arrivee && Object.keys(volumesFluxGrid.arrivee).length > 0
      ? volumesFluxGrid.arrivee
      : Object.fromEntries(
        fluxRows.map((r) => [r.key, { part: "", pro: "", dist: "", axes: "" }])
      )
  );

  // Départ
  const [departState, setDepartState] = useState(() =>
    volumesFluxGrid?.depart && Object.keys(volumesFluxGrid.depart).length > 0
      ? volumesFluxGrid.depart
      : Object.fromEntries(
        fluxRows.map((r) => [
          r.key,
          { global: "", part: "", pro: "", dist: "", axes: "" },
        ])
      )
  );

  // Dépôt / Récupération
  const [depotRecupState, setDepotRecupState] = useState(() =>
    volumesFluxGrid?.depotRecup && Object.keys(volumesFluxGrid.depotRecup).length > 0
      ? volumesFluxGrid.depotRecup
      : Object.fromEntries(fluxRows.map((r) => [r.key, { depot: "", recup: "" }]))
  );

  // 🔢 Heures nettes (premier output)
  const [heuresNet, setHeuresNet] = useState(null);

  // 🆕 CR par caisson (pour règle CR Arrivé)
  // const [crParCaisson, setCrParCaisson] = useState(500); // 🗑️ Moved to global state

  // 🔄 Synchro ascendante : dès qu'un state local change, on met à jour la grille globale persistée
  useEffect(() => {
    if (setVolumesFluxGrid) {
      setVolumesFluxGrid({
        arrivee: arriveeState,
        depart: departState,
        depotRecup: depotRecupState,
      });
    }
  }, [arriveeState, departState, depotRecupState, setVolumesFluxGrid]);

  const updateArrivee = (fluxKey, field, value) => {
    setArriveeState((prev) => ({
      ...prev,
      [fluxKey]: {
        ...prev[fluxKey],
        [field]: value,
      },
    }));
  };

  const updateDepart = (fluxKey, field, value) => {
    setDepartState((prev) => ({
      ...prev,
      [fluxKey]: {
        ...prev[fluxKey],
        [field]: value,
      },
    }));
  };

  const updateDepotRecup = (fluxKey, field, value) => {
    setDepotRecupState((prev) => ({
      ...prev,
      [fluxKey]: {
        ...prev[fluxKey],
        [field]: value,
      },
    }));
  };

  /* -------------------------------------------------------------------------- */
  /* ⚡ AUTOCALCUL : AXES & GLOBAL SELON % (Arrivée) */
  /* -------------------------------------------------------------------------- */
  // helpers pour récupérer / setter le Global Arrivée suivant le flux
  const getGlobalArrivee = (key) => {
    switch (key) {
      case "amana":
        return amana;
      case "co":
        return courrierOrdinaire;
      case "cr":
        return courrierRecommande;
      case "eb":
        return ebarkia;
      case "lrh":
        return lrh;
      default:
        return undefined;
    }
  };

  const setGlobalArrivee = (key, v) => {
    switch (key) {
      case "amana":
        return setAmana(v);
      case "co":
        return setCourrierOrdinaire(v);
      case "cr":
        return setCourrierRecommande(v);
      case "eb":
        return setEbarkia(v);
      case "lrh":
        return setLrh(v);
      default:
        return;
    }
  };

  /* -------------------------------------------------------------------------- */
  /* ⚡ AUTOCALCUL : AXES & GLOBAL SELON % (Arrivée) */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    // Si % Axes Arrivée est renseigné (> 0), on force le calcul de la colonne Axes et du Global
    const pct = parseFloat(pctAxesArrivee);
    if (!isNaN(pct) && pct > 0 && pct < 100) {
      const factor = pct / 100.0;
      let stateChanged = false;
      const newState = { ...arriveeState };

      fluxRows.forEach((row) => {
        const key = row.key;
        const current = newState[key] || {};

        // On récupère Part + Pro (Base du % ?)
        const part = parseFloat(current.part) || 0;
        const pro = parseFloat(current.pro) || 0;
        const dist = parseFloat(current.dist) || 0;

        // SAFEGUARD: Si Part et Pro sont vides (0), ne pas écraser un Global existant (ex: Import)
        // MAIS seulement si on n'a pas déjà de valeur calculée pour Axes (ce qui signifierait qu'on est en mode édition)
        const currentGlobal = parseFloat(getGlobalArrivee(key)) || 0;
        const currentAxesVal = parseFloat(current.axes) || 0;
        if ((part + pro) === 0 && currentGlobal > 0 && currentAxesVal === 0) {
          return; // On saute ce flux pour ne pas le réinitialiser
        }

        // Formule simplifiée demandée : Axes = (Part + Pro) * %Axes
        const computedAxes = Math.round((part + pro) * factor);

        // Calcul automatique de Dist (le reste après Axes)
        const computedDist = (part + pro) - computedAxes;

        // Update Axes and Dist if different
        const currentAxes = parseFloat(current.axes) || 0;
        const currentDist = parseFloat(current.dist) || 0;

        if (computedAxes !== currentAxes || computedDist !== currentDist) {
          newState[key] = {
            ...current,
            axes: computedAxes,
            dist: computedDist
          };
          stateChanged = true;
        }

        // 🛑 MODIF : On ne met PLUS à jour le Global automatiquement
        // Le calcul reste purement INDICATIF ("Juste pour affichage")
        /*
        // Update Global (Column B) = Part + Pro + Dist + Axes
        const computedGlobal = part + pro + dist + computedAxes;

        if (computedGlobal !== currentGlobal) {
          setGlobalArrivee(key, computedGlobal);
        }
        */
      });

      if (stateChanged) {
        setArriveeState(newState);
      }
    }
  }, [pctAxesArrivee, arriveeState]); // Depend on arriveeState to react to Part/Pro changes

  /* -------------------------------------------------------------------------- */
  /* ⚡ AUTOCALCUL : AXES & GLOBAL SELON % (Départ) */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const pct = parseFloat(pctAxesDepart);
    if (!isNaN(pct) && pct > 0 && pct < 100) {
      const factor = pct / 100.0;
      let stateChanged = false;
      const newState = { ...departState };

      fluxRows.forEach((row) => {
        const key = row.key;
        const current = newState[key] || {};

        const part = parseFloat(current.part) || 0;
        const pro = parseFloat(current.pro) || 0;
        const dist = parseFloat(current.dist) || 0;
        const currentGlobal = parseFloat(current.global) || 0;
        const currentAxesVal = parseFloat(current.axes) || 0;

        // SAFEGUARD: Idem pour le départ
        if ((part + pro) === 0 && currentGlobal > 0 && currentAxesVal === 0) {
          return;
        }

        // Formule simplifiée demandée : Axes = (Part + Pro) * %Axes
        const computedAxes = Math.round((part + pro) * factor);

        // Calcul automatique de Dist (le reste après Axes)
        const computedDist = (part + pro) - computedAxes;

        const currentAxes = parseFloat(current.axes) || 0;
        const currentDist = parseFloat(current.dist) || 0;

        // 🛑 MODIF : On ne met PLUS à jour le Global (ni Axes dans le global)
        /*
        // Calcul du nouveau Global (Départ a sa propre colonne Global dans state)
        const computedGlobal = part + pro + dist + computedAxes;
        */

        if (computedAxes !== currentAxes || computedDist !== currentDist /* || computedGlobal !== currentGlobal */) {
          newState[key] = {
            ...current,
            axes: computedAxes,
            dist: computedDist,
            // global: computedGlobal // Disabled
          };
          stateChanged = true;
        }
      });

      if (stateChanged) {
        setDepartState(newState);
      }
    }
  }, [pctAxesDepart, departState]);



  // 🔍 Détection des champs non applicables
  const hasNonApplicable = fluxRows.some(
    (row) => getEffectiveFluxMode(centreCategorie, row.key) !== "input"
  );

  // 🔢 Calcul heures nettes
  // ⚠️ IMPORTANT: 'heures' reçu en props est déjà baseHeuresNet (heures - idle time)
  // Ne PAS soustraire à nouveau tempsMortMinutes pour éviter une double application
  const computeHeuresNet = () => {
    const h = typeof heures === "number" ? heures : 0;
    return h; // Retourne directement les heures nettes déjà calculées
  };

  // buildVolumesFlux helper for onSimuler
  const buildVolumesFlux = () => {
    const list = [];
    const segmentsMap = {
      part: "PARTICULIER",
      pro: "PROFESSIONNEL",
      dist: "DISTRIBUTION",
      axes: "AXES",
      global: "GLOBAL"
    };

    fluxRows.forEach(row => {
      const fluxCode = row.key.toUpperCase();

      // Arrivée
      const arr = arriveeState[row.key] || {};

      // 1. Ajouter GLOBAL Arrivée (stocké séparément)
      const globalArrVal = Number(getGlobalArrivee(row.key) || 0);
      if (globalArrVal > 0) {
        list.push({ flux: fluxCode, sens: "ARRIVEE", segment: "GLOBAL", volume: globalArrVal });
      }

      // 2. Ajouter les segments détaillés (Part, Pro, Dist, Axes)
      Object.keys(arr).forEach(field => {
        // 🛑 MODIF : On EXCLUT 'axes' et 'dist' du payload envoyé au backend (calculs automatiques, affichage uniquement)
        if (field === 'axes' || field === 'dist') return;

        const val = Number(arr[field] || 0);
        if (val > 0 && segmentsMap[field]) {
          list.push({ flux: fluxCode, sens: "ARRIVEE", segment: segmentsMap[field], volume: val });
        }
      });

      // Départ
      const dep = departState[row.key] || {};
      Object.keys(dep).forEach(field => {
        // 🛑 MODIF : On EXCLUT 'axes' et 'dist' du payload
        if (field === 'axes' || field === 'dist') return;

        const val = Number(dep[field] || 0);
        if (val > 0 && segmentsMap[field]) {
          list.push({ flux: fluxCode, sens: "DEPART", segment: segmentsMap[field], volume: val });
        }
      });

      // Dépôt / Récup
      const dr = depotRecupState[row.key] || {};
      if (Number(dr.depot || 0) > 0) list.push({ flux: fluxCode, sens: "DEPOT", segment: "GLOBAL", volume: Number(dr.depot) });
      if (Number(dr.recup || 0) > 0) list.push({ flux: fluxCode, sens: "RECUPERATION", segment: "GLOBAL", volume: Number(dr.recup) });
    });
    console.log("🚀 [VolumeParamsCard] Payload volumes_flux construit:", list);
    return list;
  };

  // 🔢 Calcul des totaux pour ED%
  const totalAmanaArrivee = Number(amana || 0);
  const totalAmanaDepart = Number(departState.amana?.global || 0);
  const totalColisLegacy = Number(colis || 0);
  // On considère que le total colis pour le calcul des sacs est la somme de tout ce qui est déclaré "colis/amana"
  const colisTotal = totalAmanaArrivee + totalAmanaDepart + totalColisLegacy;

  const edVal = Number(edPercent ?? 0);
  const pourcSac = Math.max(0, 100 - edVal);
  const colisEnSac = colisTotal * (pourcSac / 100);
  const ratioSac = Number(colisAmanaParSac || 1);
  // Arrondi supérieur par défaut pour les sacs
  const nbSacsCalculated = Math.ceil(colisEnSac / (ratioSac > 0 ? ratioSac : 1));

  const handleSimuler = () => {
    const hn = computeHeuresNet();
    setHeuresNet(hn);

    onSimuler({
      colis_amana_par_sac: Number(colisAmanaParSac || 0),
      courriers_par_sac: Number(courriersParSac || 0),
      courriers_co_par_sac: Number(nbrCoSac || 0), // 🆕 Envoi spécifique CO
      courriers_cr_par_sac: Number(nbrCrSac || 0), // 🆕 Envoi spécifique CR
      colis_par_collecte: Number(colisParCollecte || 1),
      cr_par_caisson: Number(crParCaisson || 500), // 🆕 CR par caisson
      pct_retour: Number(pctRetour || 0), // 🆕 Paramètre % Retour
      pct_international: Number(pctInternational || 0), // 🆕 International
      pct_national: Number(pctNational || 0), // 🆕 National

      heures_net: hn,
      volumes_flux: buildVolumesFlux(), // Use the helper

      // 🆕 Injection du nombre de sacs calculé (remplace le calcul backend)
      sacs: nbSacsCalculated,
    });
  };

  /* ========= Input avec séparateur d'espaces pour milliers ========= */
  function ThousandInput({
    value,
    onChange,
    disabled,
    className,
    style,
    ...rest
  }) {
    const [local, setLocal] = useState(() =>
      value === undefined || value === null || value === ""
        ? ""
        : formatThousands(value)
    );

    // sync quand la valeur parent change
    useEffect(() => {
      if (value === undefined || value === null || value === "") {
        setLocal("");
      } else {
        setLocal(formatThousands(value));
      }
    }, [value]);

    const handleChange = (e) => {
      const raw = e.target.value;
      // on laisse l'utilisateur taper librement, on nettoie un minimum
      setLocal(raw.replace(/[^\d\s]/g, ""));
    };

    const handleBlur = () => {
      const cleaned = unformat(local);
      const num =
        cleaned === ""
          ? undefined
          : parseNonNeg
            ? parseNonNeg(cleaned)
            : Number(cleaned);

      onChange && onChange(num);
      setLocal(num === undefined ? "" : formatThousands(num));
    };

    return (
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        className={className}
        style={{ ...style, width: `${CELL_WIDTH_PX}px` }} // 👉 largeur forcée
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        {...rest}
      />
    );
  }

  // 🆕 Règle métier : Tous les centres ont la main
  const paramsDisabled = false;

  return (
    <div className="space-y-3">
      {/* 📥 Barre d'outils Import / Export */}
      <div className="flex justify-end gap-2 mb-2">
        <button
          onClick={async () => {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Volumes");

            // --- Définition des colonnes ---
            // A=Flux, B=GlobalArr, C=PartArr, D=ProArr, E=DistArr, F=AxesArr, G=(vide), H=Depot, I=Recu, J=(vide), K=GlobalDep, L=PartDep, M=ProDep, N=DistDep, O=AxesDep

            // Ligne 1 : En-têtes Mergés
            worksheet.mergeCells('B1:F1'); // Flux Arrivée
            worksheet.getCell('B1').value = 'Flux Arrivée';
            worksheet.getCell('B1').alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell('B1').font = { bold: true };

            worksheet.mergeCells('H1:I1'); // Guichet
            worksheet.getCell('H1').value = 'Guichet';
            worksheet.getCell('H1').alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell('H1').font = { bold: true };

            worksheet.mergeCells('K1:O1'); // Flux Départ
            worksheet.getCell('K1').value = 'Flux Départ';
            worksheet.getCell('K1').alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell('K1').font = { bold: true };

            // Ligne 2 : Sous-titres
            const headerRow = worksheet.getRow(2);
            headerRow.values = [
              "Flux", // A
              "Global", "Part.", "PRO", "Distr.", "Axes", // B-F (Arrivée)
              "", // G
              "Dépôt", "Reçu", // H-I (Guichet)
              "", // J
              "Global", "Part.", "PRO", "Distr.", "Axes" // K-O (Départ)
            ];
            headerRow.font = { bold: true };
            headerRow.alignment = { horizontal: 'center' };

            // Données (Lignes 3+)
            const fluxList = ["Amana", "CO", "CR", "E-Barkia", "LRH"];
            // Mapping des clés pour récupérer les valeurs actuelles
            const fluxKeys = { "Amana": "amana", "CO": "co", "CR": "cr", "E-Barkia": "eb", "LRH": "lrh" };

            fluxList.forEach(fluxLabel => {
              const key = fluxKeys[fluxLabel];
              // Récupérer valeurs actuelles (si dispos)
              const arr = arriveeState[key] || {};
              const dep = departState[key] || {};
              const gui = depotRecupState[key] || {};

              // Récupération Global Arrivée
              let arrGlobal = 0;
              switch (key) {
                case "co": arrGlobal = courrierOrdinaire; break;
                case "cr": arrGlobal = courrierRecommande; break;
                case "amana": arrGlobal = amana; break;
                case "eb": arrGlobal = ebarkia; break;
                case "lrh": arrGlobal = lrh; break;
              }

              worksheet.addRow([
                fluxLabel,         // A
                arrGlobal || "",   // B
                arr.part || "",    // C
                arr.pro || "",     // D
                arr.dist || "",    // E
                arr.axes || "",    // F
                "",                // G
                gui.depot || "",   // H
                gui.recup || "",   // I
                "",                // J
                dep.global || "",  // K
                dep.part || "",    // L
                dep.pro || "",     // M
                dep.dist || "",    // N
                dep.axes || ""     // O
              ]);
            });

            // Styling borders
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber >= 1) {
                row.eachCell((cell) => {
                  cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                  };
                });
              }
            });

            // Largeurs colonnes
            worksheet.getColumn(1).width = 15;
            [2, 3, 4, 5, 6, 8, 9, 11, 12, 13, 14, 15].forEach(i => worksheet.getColumn(i).width = 12);

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), "Modele_Volumes_Grid.xlsx");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 hover:text-slate-800 transition-colors text-xs font-medium shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Modèle Excel
        </button>

        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded hover:bg-emerald-100 transition-colors text-xs font-semibold shadow-sm cursor-pointer">
          <FileUp className="w-3.5 h-3.5" />
          Importer Volumes
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;

              try {
                const arrayBuffer = await file.arrayBuffer();
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(arrayBuffer);
                const worksheet = workbook.getWorksheet(1);

                if (!worksheet) {
                  alert("Fichier vide ou illisible.");
                  return;
                }

                // 🆕 RESET TOTAL : On repart d'objets vides pour écraser l'existant
                const newArrivee = Object.fromEntries(
                  fluxRows.map((r) => [r.key, { part: "", pro: "", dist: "", axes: "" }])
                );
                const newDepart = Object.fromEntries(
                  fluxRows.map((r) => [
                    r.key,
                    { global: "", part: "", pro: "", dist: "", axes: "" },
                  ])
                );
                const newDepotRecup = Object.fromEntries(
                  fluxRows.map((r) => [r.key, { depot: "", recup: "" }])
                );

                // Réinitialiser aussi les globaux Arrivée (State React)
                // On va tout remettre à 0 avant de lire le fichier
                setCourrierOrdinaire("");
                setCourrierRecommande("");
                setEbarkia("");
                setLrh("");
                setAmana("");

                let linesRead = 0;

                const fluxMap = {
                  "AMANA": "amana",
                  "CO": "co",
                  "CR": "cr",
                  "E-BARKIA": "eb",
                  "LRH": "lrh"
                };

                worksheet.eachRow((row, rowNumber) => {
                  if (rowNumber < 3) return;

                  const rawFlux = row.getCell(1).value;
                  const fluxLabel = rawFlux ? String(rawFlux).trim().toUpperCase() : "";
                  const key = fluxMap[fluxLabel];

                  if (key) {
                    linesRead++;

                    // Helper Conversion ULTIME
                    const getVal = (colIndex) => {
                      const cell = row.getCell(colIndex);
                      let v = cell.value;

                      // 1. Gérer formules (objet { result, formula })
                      if (v && typeof v === 'object') {
                        if (v.result !== undefined && v.result !== null) {
                          v = v.result;
                        } else if (v.sharedFormula) {
                          v = 0;
                        }
                      }

                      // 2. Nettoyage agressif
                      if (typeof v === 'string') {
                        v = v.replace(/,/g, '.');
                        // Supprime TOUT ce qui n'est pas Chiffre, Point ou Moins
                        v = v.replace(/[^0-9.-]/g, "");
                      }

                      // 3. Conversion
                      if (v === "" || v === null || v === undefined) return "";
                      const n = parseFloat(v);
                      return !isNaN(n) ? n : "";
                    };

                    // Arrivée Global -> Props
                    const arrGlobal = getVal(2);
                    if (arrGlobal !== "" && typeof setGlobalArrivee === 'function') {
                      setGlobalArrivee(key, arrGlobal);
                    }

                    // Arrivée Détail -> State
                    if (!newArrivee[key]) newArrivee[key] = {};
                    const arrPart = getVal(3); if (arrPart !== "") newArrivee[key].part = arrPart;
                    const arrPro = getVal(4); if (arrPro !== "") newArrivee[key].pro = arrPro;
                    const arrDist = getVal(5); if (arrDist !== "") newArrivee[key].dist = arrDist;
                    const arrAxes = getVal(6); if (arrAxes !== "") newArrivee[key].axes = arrAxes;

                    // Guichet
                    if (!newDepotRecup[key]) newDepotRecup[key] = {};
                    const guiDepot = getVal(8); if (guiDepot !== "") newDepotRecup[key].depot = guiDepot;
                    const guiRecu = getVal(9); if (guiRecu !== "") newDepotRecup[key].recup = guiRecu;

                    // Départ
                    if (!newDepart[key]) newDepart[key] = {};
                    const depGlobal = getVal(11); if (depGlobal !== "") newDepart[key].global = depGlobal;
                    const depPart = getVal(12); if (depPart !== "") newDepart[key].part = depPart;
                    const depPro = getVal(13); if (depPro !== "") newDepart[key].pro = depPro;
                    const depDist = getVal(14); if (depDist !== "") newDepart[key].dist = depDist;
                    const depAxes = getVal(15); if (depAxes !== "") newDepart[key].axes = depAxes;
                  }
                });

                // Batch updates
                setArriveeState(newArrivee);
                setDepartState(newDepart);
                setDepotRecupState(newDepotRecup);

                alert(`${linesRead} lignes de flux traitées.\nLes valeurs devraient s'afficher dans la grille.`);
                e.target.value = '';

              } catch (err) {
                console.error("Erreur import Excel:", err);
                alert("Erreur technique lors de l'import.");
              }
            }}
          />
        </label>
      </div>

      {/* 2️⃣ Les 3 tableaux : Arrivée / Dépôt–Récupération / Départ */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg p-2">
        <div className="flex flex-col xl:flex-row gap-2 justify-center items-start">

          {/* ───── Arrivée ───── */}
          <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden flex-1">
            <div
              className="bg-gradient-to-r from-slate-50 to-white py-2 border-b border-slate-100 flex items-center justify-center gap-2"
              title="Volume journalier moyen"
            >
              <div className="p-1 rounded bg-blue-100 text-[#005EA8] shadow-sm">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Flux Arrivée
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium tracking-wide">
                    <th className="px-2 py-1 text-left font-normal uppercase text-[9px]">Flux</th>
                    <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Global</th>
                    <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Part.</th>
                    <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Pro</th>
                    <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Dist.</th>
                    <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Axes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fluxRows.map((row) => {
                    const mode = getEffectiveFluxMode(centreCategorie, row.key);
                    const disabled = mode !== "input";
                    const st = arriveeState[row.key] || {};
                    const Icon = row.icon || Package;
                    const globalVal = getGlobalArrivee(row.key);

                    return (
                      <tr key={row.key} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="px-2 py-0.5 font-semibold text-[10px] text-slate-600">
                          <div className="flex items-center gap-1">
                            <Icon className="w-3 h-3 text-slate-400 group-hover:text-[#005EA8] transition-colors" />
                            <span>{row.label}</span>
                          </div>
                        </td>
                        <td className="px-0.5 py-0.5 bg-blue-50/30"><ThousandInput disabled={disabled} value={globalVal} onChange={(v) => setGlobalArrivee(row.key, v)} className={`${baseInputClass} !font-bold !text-slate-900`} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.part} onChange={(v) => updateArrivee(row.key, "part", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.pro} onChange={(v) => updateArrivee(row.key, "pro", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={true} value={st.dist} onChange={(v) => updateArrivee(row.key, "dist", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={true} value={st.axes} onChange={(v) => updateArrivee(row.key, "axes", v)} className={baseInputClass} style={tableInputStyle} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ───── Dépôt / Récupération ───── */}
          <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden shrink-0">
            <div
              className="bg-gradient-to-r from-slate-50 to-white py-2 border-b border-slate-100 flex items-center justify-center gap-2"
              title="Opérations de guichet"
            >
              <div className="p-1 rounded bg-blue-100 text-[#005EA8] shadow-sm">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Guichet
              </span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium tracking-wide">
                  <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Dépôt</th>
                  <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Reçu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {fluxRows.filter((r) => r.key !== "eb" && r.key !== "lrh").map((row) => {
                  const mode = getEffectiveFluxMode(centreCategorie, row.key);
                  const disabled = mode !== "input";
                  const st = depotRecupState[row.key] || {};
                  return (
                    <tr key={row.key} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.depot} onChange={(v) => updateDepotRecup(row.key, "depot", v)} className={baseInputClass} style={tableInputStyle} /></td>
                      <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.recup} onChange={(v) => updateDepotRecup(row.key, "recup", v)} className={baseInputClass} style={tableInputStyle} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ───── Départ ───── */}
          <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden flex-1">
            <div
              className="bg-gradient-to-r from-slate-50 to-white py-2 border-b border-slate-100 flex items-center justify-center gap-2"
              title="Volume journalier moyen"
            >
              <div className="p-1 rounded bg-amber-100 text-amber-600 shadow-sm">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Flux Départ
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium tracking-wide">
                    <th className="px-1 py-2 text-center font-normal uppercase text-[10px]">Global</th>
                    <th className="px-1 py-2 text-center font-normal uppercase text-[10px]">Part.</th>
                    <th className="px-1 py-2 text-center font-normal uppercase text-[10px]">Pro</th>
                    <th className="px-1 py-2 text-center font-normal uppercase text-[10px]">Dist.</th>
                    <th className="px-1 py-2 text-center font-normal uppercase text-[10px]">Axes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fluxRows.map((row) => {
                    const mode = getEffectiveFluxMode(centreCategorie, row.key);
                    const disabled = mode !== "input";
                    const st = departState[row.key] || {};
                    return (
                      <tr key={row.key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-0.5 py-0.5 bg-blue-50/30"><ThousandInput disabled={disabled} value={st.global} onChange={(v) => updateDepart(row.key, "global", v)} className={`${baseInputClass} !font-bold !text-slate-900`} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.part} onChange={(v) => updateDepart(row.key, "part", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.pro} onChange={(v) => updateDepart(row.key, "pro", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={true} value={st.dist} onChange={(v) => updateDepart(row.key, "dist", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={true} value={st.axes} onChange={(v) => updateDepart(row.key, "axes", v)} className={baseInputClass} style={tableInputStyle} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* 🔔 MESSAGE NON APPLICABLE */}
        {hasNonApplicable && (
          <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-[9px] text-slate-500 italic text-center">
            Certains champs sont{" "}
            <span className="font-semibold">non applicables</span> pour{" "}
            <span className="font-semibold">
              {centreCategorie || "?"}
            </span>{" "}
            et sont désactivés.
          </div>
        )}
      </div>



      {/* 🟦 Paramètres Unités + État + Bouton - STICKY EN BAS */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-lg rounded-lg px-3 py-2 mt-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* 1. Nb Colis/sac (AMANA) */}
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${paramsDisabled ? "bg-slate-100 text-slate-400" : "bg-orange-50 text-orange-600"}`}>
              <Package className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Nb Colis/sac
              </label>
              <input
                type="number"
                min={1}
                disabled={paramsDisabled}
                value={colisAmanaParSac}
                onChange={(e) =>
                  setColisAmanaParSac(
                    e.target.value === "" ? 0 : Number(e.target.value)
                  )
                }
                className={`text-xs font-semibold focus:outline-none w-full text-center ${paramsDisabled ? "bg-transparent text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 2. Nb CO/sac */}
          <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${paramsDisabled ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-[#005EA8]"}`}>
              <Mail className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Nb CO/sac
              </label>
              <input
                type="number"
                min={0}
                disabled={paramsDisabled}
                value={nbrCoSac}
                onChange={(e) => {
                  const val = e.target.value;
                  setNbrCoSac(val);
                  const co = parseNonNeg(val) ?? 0;
                  const cr = parseNonNeg(nbrCrSac) ?? 0;
                  setCourriersParSac(co + cr);
                }}
                className={`text-xs font-semibold focus:outline-none w-full text-center ${paramsDisabled ? "bg-transparent text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 3. Nb CR/sac */}
          <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${paramsDisabled ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-[#005EA8]"}`}>
              <Mail className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Nb CR/sac
              </label>
              <input
                type="number"
                min={0}
                disabled={paramsDisabled}
                value={nbrCrSac}
                onChange={(e) => {
                  const val = e.target.value;
                  setNbrCrSac(val);
                  const co = parseNonNeg(nbrCoSac) ?? 0;
                  const cr = parseNonNeg(val) ?? 0;
                  setCourriersParSac(co + cr);
                }}
                className={`text-xs font-semibold focus:outline-none w-full text-center ${paramsDisabled ? "bg-transparent text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 4. CR/caisson */}
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${paramsDisabled ? "bg-slate-100 text-slate-400" : "bg-purple-50 text-purple-600"}`}>
              <Archive className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                CR/caisson
              </label>
              <input
                type="number"
                min={1}
                disabled={paramsDisabled}
                value={crParCaisson}
                onChange={(e) =>
                  setCrParCaisson(
                    e.target.value === "" ? 500 : Number(e.target.value)
                  )
                }
                className={`text-xs font-semibold focus:outline-none w-full text-center ${paramsDisabled ? "bg-transparent text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 5. % En dehors (ED) */}
          <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${paramsDisabled ? "bg-slate-100 text-slate-400" : "bg-red-50 text-red-600"}`} title="Pourcentage de colis traités hors sacs.">
              <Archive className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                % ED
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={paramsDisabled}
                  value={edPercent}
                  onChange={(e) => {
                    const v = Math.min(100, Math.max(0, Number(e.target.value)));
                    setEdPercent && setEdPercent(v);
                  }}
                  className={`text-xs font-semibold focus:outline-none w-full text-center ${paramsDisabled ? "bg-transparent text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
                />
                <span className="text-[10px] text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 6. % Axes Arrivée */}
          <div className={`flex items-center gap-1.5 min-w-[120px] flex-1 transition-opacity ${disabledAxes ? "opacity-60 grayscale" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${(paramsDisabled || disabledAxes) ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600"}`}>
              <ArrowDownRight className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                % Axes Arrivée
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={paramsDisabled || disabledAxes}
                  value={pctAxesArrivee}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value)));
                    setPctAxesArrivee && setPctAxesArrivee(v);
                  }}
                  className={`text-xs font-semibold focus:outline-none w-full text-center rounded ${(paramsDisabled || disabledAxes) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
                />
                <span className="text-[10px] text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>


          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 7. % Axes Départ */}
          <div className={`flex items-center gap-1.5 min-w-[120px] flex-1 transition-opacity ${disabledAxes ? "opacity-60 grayscale" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${(paramsDisabled || disabledAxes) ? "bg-slate-100 text-slate-400" : "bg-purple-50 text-purple-600"}`}>
              <ArrowUpRight className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                % Axes Départ
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={paramsDisabled || disabledAxes}
                  value={pctAxesDepart}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value)));
                    setPctAxesDepart && setPctAxesDepart(v);
                  }}
                  className={`text-xs font-semibold focus:outline-none w-full text-center rounded ${(paramsDisabled || disabledAxes) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
                />
                <span className="text-[10px] text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 8. International % */}
          <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${paramsDisabled ? "bg-slate-100 text-slate-400" : "bg-cyan-50 text-cyan-600"}`}>
              <FileUp className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                International (%)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={paramsDisabled}
                  value={pctInternational}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value)));
                    setPctInternational && setPctInternational(v);
                  }}
                  className={`text-xs font-semibold focus:outline-none w-full text-center rounded ${paramsDisabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
                />
                <span className="text-[10px] text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 9. % National */}
          <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${paramsDisabled ? "bg-slate-100 text-slate-400" : "bg-teal-50 text-teal-600"}`}>
              <MapPin className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                % National
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={paramsDisabled}
                  value={pctNational}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value)));
                    setPctNational && setPctNational(v);
                  }}
                  className={`text-xs font-semibold focus:outline-none w-full text-center rounded ${paramsDisabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-transparent text-teal-700"}`}
                />
                <span className="text-[10px] text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 10. % Marche Ordinaire (Seulement si NON AM) */}
          {!disabledAxes && ( // disabledAxes vaut true si AM -> Donc on affiche si !disabledAxes
            <>
              <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${paramsDisabled ? "bg-slate-100 text-slate-400" : "bg-orange-50 text-orange-600"}`}>
                  <Building className="w-3 h-3" />
                </div>
                <div className="flex flex-col w-full">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    % Marché Ord.
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={paramsDisabled}
                      value={pctMarcheOrdinaire}
                      onChange={(e) => {
                        const v = e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value)));
                        setPctMarcheOrdinaire && setPctMarcheOrdinaire(v);
                      }}
                      className={`text-xs font-semibold focus:outline-none w-full text-center rounded ${paramsDisabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
                    />
                    <span className="text-[10px] text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
              <div className="w-px h-6 bg-slate-200 hidden md:block" />
            </>
          )}

          {/* 11. % Collecte */}
          <div className={`flex items-center gap-1.5 min-w-[120px] flex-1 transition-opacity ${disabledAxes ? "opacity-60 grayscale" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${(paramsDisabled || disabledAxes) ? "bg-slate-100 text-slate-400" : "bg-green-50 text-green-600"}`}>
              <Package className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                % Collecte
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={paramsDisabled || disabledAxes}
                  value={pctCollecte}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value)));
                    setPctCollecte && setPctCollecte(v);
                  }}
                  className={`text-xs font-semibold focus:outline-none w-full text-center rounded ${(paramsDisabled || disabledAxes) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
                />
                <span className="text-[10px] text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* 12. % Retour */}
          <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${paramsDisabled ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600"}`}>
              <ArrowLeftRight className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                % Retour
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={paramsDisabled}
                  value={pctRetour}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value)));
                    setPctRetour && setPctRetour(v);
                  }}
                  className={`text-xs font-semibold focus:outline-none w-full text-center ${paramsDisabled ? "bg-transparent text-slate-400 cursor-not-allowed" : "bg-transparent text-slate-800"}`}
                />
                <span className="text-[10px] text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* État de la simulation */}
          <div className="flex items-center gap-1.5 min-w-[120px]">
            <div className="flex flex-col">
              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">État</span>
              <span className="text-xs font-semibold text-slate-700">
                {loading?.simulation ? "Simulation en cours..." : (simDirty ? "Paramètres modifiés" : "Données à jour")}
              </span>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* Bouton Lancer Simulation */}
          <div className="flex items-center">
            <button
              onClick={handleSimuler}
              disabled={!centre || loading?.simulation}
              className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none
                ${!centre ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-gradient-to-r from-[#005EA8] to-blue-600 text-white hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"}
              `}
            >
              <Gauge className="w-3.5 h-3.5" />
              {loading?.simulation ? "Calcul..." : "Lancer Simulation"}
            </button>
          </div>
        </div>

        {/* 🆕 Résumé Calcul Sacs (Read-only) - MASQUÉ */}
        {false && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600">
            <div className="flex items-center gap-3">
              {Math.round(colisEnSac) > 0 && (
                <>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider">Impact ED% :</span>
                  <span>Colis en sac ({pourcSac}%) : <strong className="text-slate-800">{formatThousands(Math.round(colisEnSac))}</strong></span>
                </>
              )}
            </div>
            {ratioSac <= 0 && <span className="text-red-500 font-bold flex items-center gap-1"><Lock className="w-3 h-3" /> Config invalide (NB/SAC ≤ 0)</span>}
          </div>
        )}
      </div>
    </div>
  );
}
