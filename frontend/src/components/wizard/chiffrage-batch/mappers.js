export function mapDetailToSingleRow(p) {
  const actuel = Math.round(Number(p.actuel_etp) || 0);
  const calcule = Math.round(Number(p.simule_etp) || 0);
  return {
    label: p.label,
    type: p.type_poste || "MOD",
    actuel,
    calcule,
    gap: actuel - calcule,
    salaire: Number(p.charge_salaire) || 0,
    coutActuel: p.budgetActuel,
    coutCalcule: p.budgetSimule,
    impact: p.impact,
  };
}

export function mapAggToSingleRow(p) {
  const actuel = Math.round(Number(p.actuel_etp) || 0);
  const calcule = Math.round(Number(p.simule_etp) || 0);
  return {
    label: p.label,
    type: "MOD",
    actuel,
    calcule,
    gap: actuel - calcule,
    salaire: Number(p.charge_salaire) || 0,
    coutActuel: p.budgetActuel,
    coutCalcule: p.budgetSimule,
    impact: (p.budgetActuel || 0) - (p.budgetSimule || 0),
  };
}

export function mapDetailToCmpRow(p) {
  return {
    label: p.label,
    type: p.type_poste || "MOD",
    salaire: Number(p.charge_salaire) || 0,
    actuel: Math.round(Number(p.actuel_etp) || 0),
    calc: Math.round(Number(p.simule_etp_calc) || 0),
    cons: Math.round(Number(p.simule_etp_cons) || 0),
    opt: Math.round(Number(p.simule_etp_opt) || 0),
    coutAct: p.budgetActuel,
    coutCalc: p.budgetCalc,
    coutCons: p.budgetCons,
    coutOpt: p.budgetOpt,
  };
}

export function mapAggToCmpRow(p) {
  return {
    label: p.label,
    type: "MOD",
    salaire: Number(p.charge_salaire) || 0,
    actuel: Math.round(Number(p.actuel_etp) || 0),
    calc: Math.round(Number(p.simule_etp_calc) || 0),
    cons: Math.round(Number(p.simule_etp_cons) || 0),
    opt: Math.round(Number(p.simule_etp_opt) || 0),
    coutAct: p.budgetActuel,
    coutCalc: p.budgetCalc,
    coutCons: p.budgetCons,
    coutOpt: p.budgetOpt,
  };
}
