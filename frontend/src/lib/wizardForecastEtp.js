/**
 * ETP affiché en prévision : même formule que la carte « ETP Final » (Step4Results, vue globale),
 * sans filtres famille/prestation du tableau — toutes les tâches du snapshot simulation.
 */

function lookupMap(map, label) {
    if (!map || !label) return undefined;
    return map[label.trim().toUpperCase()];
}

function isMoiPoste(p) {
    if (!p) return false;
    const type = (p.type_poste || "").toUpperCase();
    return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || !!p.is_moi;
}

function buildFilteredPostes(postes, simulationResults, mode) {
    const tasks = simulationResults?.tasks || [];
    const activeResponsibles = new Set(tasks.map((t) => (t.responsable || "").toUpperCase().trim()));

    const existingActive = (postes || []).filter((p) => {
        const label = (p.label || p.nom || "").toUpperCase().trim();
        return activeResponsibles.has(label);
    });

    const processedLabels = new Set(existingActive.map((p) => (p.label || p.nom || "").toUpperCase().trim()));

    const newRoles = Array.from(activeResponsibles)
        .filter((label) => label && !processedLabels.has(label))
        .map((label) => ({
            id: "mapped-" + label,
            label,
            nom: label,
            isNew: true,
        }));

    const result = [...existingActive, ...newRoles];

    if (result.length === 0 && (mode === "actuel" || !simulationResults)) {
        return postes || [];
    }

    return result.sort((a, b) => (a.label || a.nom || "").localeCompare(b.label || b.nom || ""));
}

function findSelectedPosteObj(filteredPostes, selectedPosteId) {
    if (!selectedPosteId || selectedPosteId === "all") return null;
    return filteredPostes.find((p) => String(p.id) === String(selectedPosteId)) || null;
}

/**
 * @returns {{ totalFinal: number, totalLoad: number }}
 */
export function computeForecastDisplayKpi({
    simulationResults,
    centreDetails,
    wizardData = {},
    postes = [],
    selectedPosteId = "all",
}) {
    if (!simulationResults) {
        return { totalFinal: 0, totalLoad: 0 };
    }

    const mode = wizardData.mode;
    const filteredPostes = buildFilteredPostes(postes, simulationResults, mode);
    const selectedPosteObj = findSelectedPosteObj(filteredPostes, selectedPosteId);
    const isGlobalView = !selectedPosteObj;

    const allTasks = simulationResults.tasks || [];
    let filteredTasks = allTasks;

    if (selectedPosteObj) {
        const respName = (selectedPosteObj.label || selectedPosteObj.nom || "").trim().toUpperCase();
        filteredTasks = filteredTasks.filter((t) => (t.responsable || "").toUpperCase().trim() === respName);
    }
    // Pas de filtre famille / prestation ici (calcul prévision = périmètre complet des tâches)

    const totalLoad = filteredTasks.reduce((acc, t) => acc + (t.heures_calculees || 0), 0);

    let actualMOI = 0;

    if (isGlobalView && centreDetails && !wizardData.isVirtual) {
        actualMOI = Number(centreDetails.moi_global || 0);
    } else if (selectedPosteObj && !wizardData.isVirtual) {
        const posteLabel = (selectedPosteObj.label || selectedPosteObj.nom || "").trim();
        const val = Number(
            lookupMap(simulationResults.ressources_actuelles_par_poste, posteLabel) ??
                (selectedPosteObj.effectif_actuel || 0)
        );
        if (isMoiPoste(selectedPosteObj)) {
            actualMOI = val;
        }
    }

    const isMOD = selectedPosteObj ? !isMoiPoste(selectedPosteObj) : false;
    const posteLabel = selectedPosteObj ? (selectedPosteObj.label || selectedPosteObj.nom || "").trim() : "";
    const individualCalculated = lookupMap(simulationResults.ressources_par_poste, posteLabel) || 0;

    const targetCalculatedMOD = isGlobalView ? (simulationResults.fte_calcule || 0) : isMOD ? individualCalculated : 0;
    const targetCalculatedMOI = isGlobalView
        ? actualMOI
        : isMoiPoste(selectedPosteObj)
          ? individualCalculated || actualMOI
          : 0;
    const totalCalculated = targetCalculatedMOD + targetCalculatedMOI;

    const activeResponsiblesByFilters = new Set(
        filteredTasks.map((t) => (t.responsable || "").toUpperCase().trim())
    );

    const roundedCalculatedMODByPoste = isGlobalView
        ? filteredPostes
              .filter((p) => {
                  const label = (p.label || p.nom || "").trim().toUpperCase();
                  return label && activeResponsiblesByFilters.has(label) && !isMoiPoste(p);
              })
              .reduce((acc, p) => {
                  const label = (p.label || p.nom || "").trim();
                  const fteCalc = lookupMap(simulationResults.ressources_par_poste, label) || 0;
                  return acc + Math.round(fteCalc);
              }, 0)
        : 0;

    const targetFinalMOD = isGlobalView ? roundedCalculatedMODByPoste : isMOD ? Math.round(individualCalculated) : 0;
    const targetFinalMOI = isGlobalView
        ? Math.round(actualMOI)
        : isMoiPoste(selectedPosteObj)
          ? Math.round(individualCalculated || actualMOI)
          : 0;

    const totalFinalStatutaire = targetFinalMOD + targetFinalMOI;
    const totalFinal = isGlobalView ? Math.round(totalFinalStatutaire) : Math.round(totalCalculated);

    return { totalFinal, totalLoad };
}
