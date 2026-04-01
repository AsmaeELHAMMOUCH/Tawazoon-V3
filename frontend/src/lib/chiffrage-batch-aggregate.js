/** Normalisation libellé poste (agrégation multi-centres). */
export function normChiffrageKey(l) {
  return String(l || "").trim().toUpperCase();
}

/**
 * Fusionne les `postes_chiffrage` des 3 modes comparatif par centre.
 * @param {object} actuelPayload — réponse batch { par_centre }
 * @param {object} recPayload
 * @param {object} optPayload
 */
export function mergeParCentreForComparatif(actuelPayload, recPayload, optPayload) {
  const parA = actuelPayload?.par_centre || [];
  const mapRec = new Map((recPayload?.par_centre || []).map((c) => [c.centre_id, c]));
  const mapOpt = new Map((optPayload?.par_centre || []).map((c) => [c.centre_id, c]));
  return parA.map((c) => {
    const pr = mapRec.get(c.centre_id)?.postes_chiffrage || [];
    const po = mapOpt.get(c.centre_id)?.postes_chiffrage || [];
    const idxR = new Map(pr.map((p) => [normChiffrageKey(p.label), p.simule_etp]));
    const idxO = new Map(po.map((p) => [normChiffrageKey(p.label), p.simule_etp]));
    const merged = (c.postes_chiffrage || []).map((p) => {
      const k = normChiffrageKey(p.label);
      return {
        ...p,
        simule_etp_calc: Number(p.simule_etp) || 0,
        simule_etp_cons: Number(idxR.get(k) ?? 0),
        simule_etp_opt: Number(idxO.get(k) ?? 0),
      };
    });
    return { ...c, postes_chiffrage: merged };
  });
}

export function centrePosteBudgetsRow(r, mode) {
  const sal = Number(r.charge_salaire) || 0;
  const ba = Number(r.actuel_etp) * sal;
  if (mode === "comparatif") {
    return {
      ba,
      bc: Number(r.simule_etp_calc) * sal,
      bcons: Number(r.simule_etp_cons) * sal,
      bopt: Number(r.simule_etp_opt) * sal,
    };
  }
  return { ba, bs: Number(r.simule_etp) * sal };
}

export function centreBudgetTotals(centre, mode) {
  const rows = centre.postes_chiffrage || [];
  let budgetActuel = 0;
  let budgetSimule = 0;
  let budgetCalc = 0;
  let budgetCons = 0;
  let budgetOpt = 0;
  for (const r of rows) {
    const b = centrePosteBudgetsRow(r, mode);
    budgetActuel += b.ba;
    if (mode === "comparatif") {
      budgetCalc += b.bc;
      budgetCons += b.bcons;
      budgetOpt += b.bopt;
    } else {
      budgetSimule += b.bs;
    }
  }
  if (mode === "comparatif") {
    return { budgetActuel, budgetCalc, budgetCons, budgetOpt };
  }
  return { budgetActuel, budgetSimule, impact: budgetActuel - budgetSimule };
}

export function nationalTotals(par_centre, mode) {
  let budgetActuel = 0;
  let budgetSimule = 0;
  let budgetCalc = 0;
  let budgetCons = 0;
  let budgetOpt = 0;
  for (const c of par_centre || []) {
    const t = centreBudgetTotals(c, mode);
    budgetActuel += t.budgetActuel;
    if (mode === "comparatif") {
      budgetCalc += t.budgetCalc;
      budgetCons += t.budgetCons;
      budgetOpt += t.budgetOpt;
    } else {
      budgetSimule += t.budgetSimule;
    }
  }
  if (mode === "comparatif") {
    return { budgetActuel, budgetCalc, budgetCons, budgetOpt };
  }
  return { budgetActuel, budgetSimule, impact: budgetActuel - budgetSimule };
}

export function aggregateRegions(par_centre, mode) {
  const m = new Map();
  for (const c of par_centre || []) {
    const rid = c.region_id ?? "_";
    const t = centreBudgetTotals(c, mode);
    let cur = m.get(rid);
    if (!cur) {
      cur = {
        region_id: rid,
        region_label: c.region_label || String(rid),
        budgetActuel: 0,
        budgetSimule: 0,
        budgetCalc: 0,
        budgetCons: 0,
        budgetOpt: 0,
        centres: [],
      };
      m.set(rid, cur);
    }
    cur.budgetActuel += t.budgetActuel;
    if (mode === "comparatif") {
      cur.budgetCalc += t.budgetCalc;
      cur.budgetCons += t.budgetCons;
      cur.budgetOpt += t.budgetOpt;
    } else {
      cur.budgetSimule += t.budgetSimule;
    }
    cur.centres.push({
      centre_id: c.centre_id,
      centre_label: c.centre_label,
      ...t,
    });
  }
  return [...m.values()].sort((a, b) =>
    String(a.region_label).localeCompare(String(b.region_label), "fr")
  );
}

/** Agrégation nationale par libellé de poste (somme des ETP puis × salaire représentatif). */
export function aggregatePostesNetwork(par_centre, mode) {
  const acc = new Map();
  for (const c of par_centre || []) {
    for (const r of c.postes_chiffrage || []) {
      const k = normChiffrageKey(r.label);
      if (!k) continue;
      let cur = acc.get(k);
      if (!cur) {
        cur = {
          label: r.label,
          charge_salaire: Number(r.charge_salaire) || 0,
          actuel_etp: 0,
          simule_etp: 0,
          simule_etp_calc: 0,
          simule_etp_cons: 0,
          simule_etp_opt: 0,
        };
        acc.set(k, cur);
      }
      if (!cur.charge_salaire && r.charge_salaire) cur.charge_salaire = Number(r.charge_salaire) || 0;
      cur.actuel_etp += Number(r.actuel_etp) || 0;
      if (mode === "comparatif") {
        cur.simule_etp_calc += Number(r.simule_etp_calc ?? r.simule_etp) || 0;
        cur.simule_etp_cons += Number(r.simule_etp_cons) || 0;
        cur.simule_etp_opt += Number(r.simule_etp_opt) || 0;
      } else {
        cur.simule_etp += Number(r.simule_etp) || 0;
      }
    }
  }
  const salaire = (x) => Number(x.charge_salaire) || 0;
  const out = [...acc.values()].map((x) => {
    const sal = salaire(x);
    if (mode === "comparatif") {
      return {
        label: x.label,
        charge_salaire: sal,
        actuel_etp: x.actuel_etp,
        simule_etp_calc: x.simule_etp_calc,
        simule_etp_cons: x.simule_etp_cons,
        simule_etp_opt: x.simule_etp_opt,
        budgetActuel: x.actuel_etp * sal,
        budgetCalc: x.simule_etp_calc * sal,
        budgetCons: x.simule_etp_cons * sal,
        budgetOpt: x.simule_etp_opt * sal,
      };
    }
    return {
      label: x.label,
      charge_salaire: sal,
      actuel_etp: x.actuel_etp,
      simule_etp: x.simule_etp,
      budgetActuel: x.actuel_etp * sal,
      budgetSimule: x.simule_etp * sal,
    };
  });
  return out.sort((a, b) => b.budgetActuel - a.budgetActuel);
}

export function hasChiffrageData(par_centre) {
  return (par_centre || []).some((c) => Array.isArray(c.postes_chiffrage) && c.postes_chiffrage.length > 0);
}

/** Filtre les centres du batch par région ; `regionKey === "all"` = tout le fichier. */
export function filterParCentreByRegion(par_centre, regionKey) {
  const list = par_centre || [];
  if (regionKey == null || regionKey === "" || regionKey === "all") return [...list];
  return list.filter(
    (c) => c.region_id === regionKey || String(c.region_id) === String(regionKey)
  );
}

export function uniqueRegionsFromParCentre(par_centre) {
  const m = new Map();
  for (const c of par_centre || []) {
    const rid = c.region_id ?? "_";
    if (!m.has(rid)) m.set(rid, { region_id: rid, region_label: c.region_label || String(rid) });
  }
  return [...m.values()].sort((a, b) =>
    String(a.region_label).localeCompare(String(b.region_label), "fr")
  );
}

/** Lignes tableau détail poste pour un centre (budgets par ligne). */
/** Sommes ETP (postes MOD du centre) pour bandeaux / tableaux centres. */
export function centreEtpSums(centre, mode) {
  const rows = centre?.postes_chiffrage || [];
  let etpAct = 0;
  let etpSim = 0;
  let etpCalc = 0;
  let etpCons = 0;
  let etpOpt = 0;
  for (const r of rows) {
    etpAct += Number(r.actuel_etp) || 0;
    if (mode === "comparatif") {
      etpCalc += Number(r.simule_etp_calc ?? r.simule_etp) || 0;
      etpCons += Number(r.simule_etp_cons) || 0;
      etpOpt += Number(r.simule_etp_opt) || 0;
    } else {
      etpSim += Number(r.simule_etp) || 0;
    }
  }
  if (mode === "comparatif") {
    return { etpAct, etpCalc, etpCons, etpOpt, etpGap: etpAct - etpCalc };
  }
  return { etpAct, etpSim, etpGap: etpAct - etpSim };
}

export function nationalEtpTotals(par_centre, mode) {
  let etpAct = 0;
  let etpSim = 0;
  let etpCalc = 0;
  let etpCons = 0;
  let etpOpt = 0;
  for (const c of par_centre || []) {
    const e = centreEtpSums(c, mode);
    etpAct += e.etpAct;
    if (mode === "comparatif") {
      etpCalc += e.etpCalc;
      etpCons += e.etpCons;
      etpOpt += e.etpOpt;
    } else {
      etpSim += e.etpSim;
    }
  }
  if (mode === "comparatif") {
    return { etpAct, etpCalc, etpCons, etpOpt };
  }
  return { etpAct, etpSim, etpGap: etpAct - etpSim };
}

export function posteDetailRowsForCentre(centre, mode) {
  const rows = centre?.postes_chiffrage || [];
  return rows.map((r) => {
    const b = centrePosteBudgetsRow(r, mode);
    if (mode === "comparatif") {
      return {
        label: r.label,
        type_poste: r.type_poste,
        actuel_etp: r.actuel_etp,
        simule_etp_calc: r.simule_etp_calc,
        simule_etp_cons: r.simule_etp_cons,
        simule_etp_opt: r.simule_etp_opt,
        charge_salaire: r.charge_salaire,
        budgetActuel: b.ba,
        budgetCalc: b.bc,
        budgetCons: b.bcons,
        budgetOpt: b.bopt,
      };
    }
    return {
      label: r.label,
      type_poste: r.type_poste,
      actuel_etp: r.actuel_etp,
      simule_etp: r.simule_etp,
      charge_salaire: r.charge_salaire,
      budgetActuel: b.ba,
      budgetSimule: b.bs,
      impact: b.ba - b.bs,
    };
  });
}
