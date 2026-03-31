/**
 * Utility functions for Workforce Comparison and KPI calculations.
 * Centralized for reuse across wizard steps and sub-components.
 */

/**
 * Detects if a poste is of type MOI (Main d'Oeuvre Indirecte).
 */
export const isMoiPoste = (p) => {
  if (!p) return false;
  const type = (p.type_poste || "").toUpperCase();
  return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || !!p.is_moi;
};

/**
 * Formats a number with a +/- sign.
 */
export const formatSigned = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "0";
  return num > 0 ? `+${num}` : `${num}`;
};

/**
 * Safe number formatting for displays.
 */
export const safeNumber = (v) => (v !== undefined && v !== null ? Math.round(v) : "—");

/**
 * Logic to compute Global KPIs (MOD, MOI, APS) for a single simulation result.
 */
export const computeGlobalKpi = ({ simulationResults, centreDetails }) => {
  if (!simulationResults || !centreDetails) return null;

  const tasks = simulationResults.tasks || [];
  const totalLoad = tasks.reduce((acc, t) => acc + (t.heures_calculees || 0), 0);

  const actualMOD = Number(centreDetails.mod_global || 0);
  const actualMOI = Number(centreDetails.moi_global || 0);
  const actualAPS = Number(centreDetails.aps || 0);

  const actualStatutaire = actualMOD + actualMOI;
  const fteCalculated = simulationResults.fte_calcule || 0;
  const totalCalculated = fteCalculated + actualMOI;

  const totalFinal = Math.round(totalCalculated);
  const ecartGlobal = totalCalculated - actualStatutaire;

  let finalAPS = 0;
  if (ecartGlobal > 0) {
    finalAPS = Math.round(ecartGlobal);
  } else {
    const surplusStatutaire = Math.abs(ecartGlobal);
    finalAPS = Math.max(0, Math.round(actualAPS - surplusStatutaire));
  }

  const diffStatutaireReel = Math.round(Math.min(0, totalCalculated - actualStatutaire + actualAPS));
  const apsDiff = Math.round(finalAPS - actualAPS);
  const totalGap = diffStatutaireReel + apsDiff;

  return {
    actualTotal: actualStatutaire + actualAPS,
    totalLoad,
    totalCalculated,
    totalFinal,
    totalGap,
    finalAPS,
    actualStatutaire,
    actualMOD,
    actualMOI,
    actualAPS,
  };
};

/**
 * Logic to compute KPIs for a specific scenario (DB, Actuel, Consolide, Optimise)
 * based on whether we are in Global view or filtered by Intervenant.
 */
export const computeScenarioKpiSelection = ({
  simulationResults,
  actualBaselineResults,
  centreDetails,
  selectedPosteObj,
}) => {
  if (!simulationResults || !centreDetails) return null;

  const isGlobalView = !selectedPosteObj;
  const posteLabel = selectedPosteObj
    ? (selectedPosteObj.label || selectedPosteObj.nom || "").trim()
    : "";

  let actualMOD = 0;
  let actualMOI = 0;
  let actualAPS = 0;

  if (isGlobalView) {
    actualMOD = Number(centreDetails.mod_global || 0);
    actualMOI = Number(centreDetails.moi_global || 0);
    actualAPS = Number(centreDetails.aps || 0);
  } else {
    const val = Number(
      (actualBaselineResults?.ressources_actuelles_par_poste || {})[posteLabel] ??
      selectedPosteObj.effectif_actuel ??
      0
    );
    if (isMoiPoste(selectedPosteObj)) actualMOI = val;
    else actualMOD = val;
  }

  const actualStatutaire = actualMOD + actualMOI;
  const fteCalculated = simulationResults.fte_calcule || 0;
  const individualCalculated =
    selectedPosteObj && posteLabel
      ? (simulationResults.ressources_par_poste || {})[posteLabel] || 0
      : 0;

  const targetCalculatedMOD = isGlobalView
    ? fteCalculated
    : !isMoiPoste(selectedPosteObj) ? individualCalculated : 0;

  const targetCalculatedMOI = isGlobalView
    ? actualMOI
    : isMoiPoste(selectedPosteObj) ? individualCalculated || actualMOI : 0;

  const totalCalculated = targetCalculatedMOD + targetCalculatedMOI;
  const ecartGlobal = totalCalculated - actualStatutaire;

  let finalAPS = 0;
  if (ecartGlobal > 0) {
    finalAPS = Math.round(ecartGlobal);
  } else {
    const surplusStatutaire = Math.abs(ecartGlobal);
    finalAPS = Math.max(0, Math.round(actualAPS - surplusStatutaire));
  }

  const totalGap = Math.round(Math.min(0, totalCalculated - actualStatutaire + actualAPS)) + (Math.round(finalAPS - actualAPS));

  const adequacyIndex =
    actualMOD > 0 ? Math.round((targetCalculatedMOD / actualMOD) * 100) : 100;

  return {
    totalCalculated,
    totalGap,
    finalAPS,
    actualStatutaire,
    actualMOD,
    actualMOI,
    targetCalculatedMOD,
    targetCalculatedMOI,
    adequacyIndex,
  };
};

/**
 * Specifically used for the DB column in the comparison dashboard.
 */
export const computeDbEffectifSelection = ({
  centreDetails,
  simulationResultsActuel,
  selectedPosteObj,
}) => {
  if (!centreDetails) return null;
  const isGlobalView = !selectedPosteObj;

  let actualMOD = 0;
  let actualMOI = 0;
  let actualAPS = 0;

  if (isGlobalView) {
    actualMOD = Number(centreDetails.mod_global || 0);
    actualMOI = Number(centreDetails.moi_global || 0);
    actualAPS = Number(centreDetails.aps || 0);
  } else {
    const label = (selectedPosteObj.label || selectedPosteObj.nom || "").trim();
    const val = Number(
      (simulationResultsActuel?.ressources_actuelles_par_poste || {})[label] ??
      selectedPosteObj.effectif_actuel ??
      0
    );
    if (isMoiPoste(selectedPosteObj)) actualMOI = val;
    else actualMOD = val;
  }

  const actualStatutaire = actualMOD + actualMOI;
  const total = actualStatutaire + actualAPS;

  return { total, actualStatutaire, actualMOD, actualMOI, actualAPS };
};
