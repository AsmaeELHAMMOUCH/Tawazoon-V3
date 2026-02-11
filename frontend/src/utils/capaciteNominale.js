// Utilitaire commun pour calculer les positions de Capacité Nominale
// Partagé entre VueIntervenant et CapaciteNominale (page centre)

export function computeCapaciteNominalePositions({
  hasSimulated,
  postesOptions = [],
  poste = null,
  idleMinutes = 0,
  productivite = 100,
  mergedResults = [],
  backendResults = [],
  gridValues = {},
  getGroupeProduit = (p) => p || "AUTRE",
  getEff = () => 0,
  heuresNet = 0,
}) {
  if (!hasSimulated || !postesOptions || postesOptions.length === 0) return [];

  const heuresNetParJour = (() => {
    const base = 8 * (Number(productivite ?? 100) / 100);
    const idleH = Number(idleMinutes || 0) / 60;
    return Math.max(0, base - idleH);
  })();

  const safeDiv = (num, den) => {
    const n = Number(num) || 0;
    const d = Number(den) || 0;
    return d > 0 ? n / d : 0;
  };

  const safeNum = (val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/\s+/g, "").replace(",", ".");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };
  const safeEff = safeNum;

  const volumesFromGrid = (() => {
    const g = gridValues || {};
    const normalizeKey = (k) =>
      String(k || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    // Somme récursive : local+axes pour la plupart, global pour EBARKIA / LRH
    const sumByRule = (node, key = "", useGlobal) => {
      if (node === null || node === undefined) return 0;
      const k = (key || "").toLowerCase();
      if (typeof node === "number" || typeof node === "string") {
        if (useGlobal) {
          return k === "global" ? safeNum(node) : 0;
        }
        return (k === "local" || k === "axes") ? safeNum(node) : 0;
      }
      if (typeof node !== "object") return 0;
      return Object.entries(node).reduce((s, [childKey, childVal]) => s + sumByRule(childVal, childKey, useGlobal), 0);
    };

    const annualByProductNorm = {};
      Object.entries(g).forEach(([prodKey, obj]) => {
        const pk = normalizeKey(prodKey);
        const useGlobal = pk === "EBARKIA" || pk === "LRH";
        const dep = sumByRule(obj.depot, "", useGlobal) + sumByRule(obj.med, "", useGlobal);
        const arr = sumByRule(obj.recu, "", useGlobal) + sumByRule(obj.arrive, "", useGlobal);
        annualByProductNorm[pk] = Math.max(dep, arr);
      });

    const annualRaw = { ...annualByProductNorm };
    const annualNorm = { ...annualByProductNorm };
    return { annualNorm, annualByProductNorm, annualRaw, normalizeKey };
  })();

  let targetPostes = postesOptions;
  if (poste && String(poste) !== "__ALL__") {
    const p = postesOptions.find(opt => String(opt.id) === String(poste));
    if (p) targetPostes = [p];
  }
  const validPostes = targetPostes.filter(
    p => p.id && String(p.id) !== "__ALL__" && String(p.id) !== "new" && p.label !== "Tous"
  );

  const positions = [];

  validPostes.forEach(posteDef => {
    const posteIds = [posteDef.id, posteDef.poste_id, posteDef.centre_poste_id].filter(Boolean).map(String);
    const posteIdStr = posteIds[0] || "";
    const posteLabel = posteDef.label || posteDef.nom_poste || "Poste " + posteIdStr;
    const effectifActuel = getEff(posteDef);
    const hRef = heuresNetParJour || 0;

    let taskRows =
      (backendResults || []).filter(row => {
        const rowPosteId =
          row.poste_id ||
          row.centre_poste_id ||
          row.id_poste ||
          row.posteId ||
          row.id_centre_poste ||
          row.centrePosteId ||
          row.centrePoste_id ||
          row.poste?.id ||
          row.poste?.poste_id;
        return rowPosteId && posteIds.includes(String(rowPosteId));
      }) || [];

    if (taskRows.length === 0) {
      taskRows = mergedResults.filter(row => {
        const rowPosteId =
          row._fromBack?.poste_id ||
          row._fromBack?.id_poste ||
          row._fromBack?.centre_poste_id ||
          row._fromBack?.posteId ||
          row._fromBack?.centre_posteId ||
          row._fromBack?.centrePosteId ||
          row._fromBack?.centrePoste_id ||
          row._fromBack?.poste?.id ||
          row._fromBack?.poste?.poste_id ||
          row._fromBack?.id_centre_poste ||
          row.poste_id ||
          row.centre_poste_id ||
          row.centrePosteId ||
          row.centrePoste_id;
        return rowPosteId && posteIds.includes(String(rowPosteId));
      });
    }

    const productsMap = new Map();

    taskRows.forEach(row => {
      const rawProd = row.produit || row.famille_produit || row.famille || row.service || row._fromBack?.produit || "Sans Produit";
      const group = getGroupeProduit(rawProd);
      const prodKey = group === "AUTRE" ? rawProd : group;

      if (!productsMap.has(prodKey)) productsMap.set(prodKey, { volAn: 0, volJourTask: 0, heures: 0, etpCalcData: 0 });
      const entry = productsMap.get(prodKey);

      const fluxVolAn = volumesFromGrid.annualByProductNorm?.[volumesFromGrid.normalizeKey(prodKey)] ??
        volumesFromGrid.annualNorm[volumesFromGrid.normalizeKey(prodKey)] ?? 0;
      entry.volAn = fluxVolAn;

      const etpRow =
        safeEff(row.effectif_calcule ?? row.fte_calcule ?? row.etp_calcule ?? row._fromBack?.effectif_calcule ?? row._fromBack?.fte_calcule ?? row._fromBack?.etp_calcule ?? 0);
      if (etpRow > 0) {
        entry.etpCalcData = etpRow;
      }

      const volJourTask = Number(
        row.nombre_Unite ??
        row.nombre_unite ??
        row._fromBack?.nombre_unite ??
        row._fromBack?.nombre_Unite ??
        0
      );
      if (Number.isFinite(volJourTask)) {
        entry.volJourTask += volJourTask;
      }

      entry.heures += Number(row.heures || row.heures_calculees || row._fromBack?.heures || 0);
    });

    Object.entries(volumesFromGrid.annualRaw).forEach(([prodKey, vol]) => {
      if (vol > 0 && !productsMap.has(prodKey)) {
        productsMap.set(prodKey, { volAn: vol, volJourTask: 0, heures: 0, etpCalcData: 0 });
      }
    });

    productsMap.forEach((stats, prodName) => {
      const volAnFromGrid = Number(stats.volAn) || 0;
      const volAn = volAnFromGrid;

      const volMois = volAn / 12;              // d'abord mensuel
      const volJour = volMois / 22;            // puis journalier
      const volumeHoraire = hRef > 0 ? volJour / hRef : 0;
      const heuresTot = stats.heures || 0;

      const etpCalcData = safeEff(
        stats.etpCalcData ??
        posteDef.effectif_calcule ??
        posteDef.fte_calcule ??
        posteDef.etp_calcule ??
        posteDef.effectif_calcule_total ??
        0
      );
      const etpCalc = etpCalcData > 0 ? etpCalcData : (hRef > 0 ? heuresTot / hRef : 0);
      const etpFinal = etpCalc <= 0.1 ? 0 : Math.round(etpCalc);

      const vm_act_mois = effectifActuel > 0 ? (volMois / effectifActuel) / 264 : 0;
      const vm_calc_mois = etpCalc > 0 ? safeDiv(volMois, etpCalc) : 0;
      const vm_reco_mois = "";

      // Ajustement demandé : division par 22 au lieu de 264 pour le VM / Jour
      const vm_act_jour = safeDiv(volMois, effectifActuel * 22);
      const vm_calc_jour = etpCalc > 0 ? safeDiv(volMois, etpCalc * 22) : 0;
      const vm_reco_jour = "";

      const vm_act_heure = hRef > 0 ? vm_act_jour / hRef : 0;
      const vm_calc_heure = hRef > 0 ? vm_calc_jour / hRef : 0;
      const vm_reco_heure = "";

      positions.push({
        poste: posteLabel,
        poste_id: posteDef.id,
        produit: prodName,
        dossiers_an: volAn,
        dossiers_mois: volMois,
        dossiers_par_jour: volJour,
        volume_activites_par_heure_total: volumeHoraire,
        total_heures_calculees: heuresTot,
        effectif_actuel: effectifActuel || "-",
        effectif_calcule: etpCalc.toFixed(2),
        effectif_final: etpFinal,
        effectif_recommande: Math.ceil(etpCalc),
        vm_act_mois,
        vm_calc_mois,
        vm_reco_mois,
        vm_act_jour,
        vm_calc_jour,
        vm_reco_jour,
        vm_act_heure,
        vm_calc_heure,
        vm_reco_heure,
      });
    });
  });

  return positions;
}
