/** Sentinelle : aucun centre sélectionné (liste / agrégat). */
export const SEL_LIST = "__list__";

/** Onglets hiérarchie (batch chiffrage). */
export const HIERARCHY_TAB = {
  regions: "regions",
  centres: "centres",
  postes: "postes",
};

/** Colonnes alignées sur l’onglet Postes (mode single). */
export const CHIFFRAGE_SINGLE_GEO_COLS = 9;
/** Libellé + info + ETP×4 + écarts ETP×3 + budget×4 + écarts budg.×3 (comparatif géo). */
export const CHIFFRAGE_CMP_GEO_COLS = 16;

export function fmtSingle(v) {
  const val = Number(v || 0);
  const fixed = Math.round(val).toString();
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function fmtCmp(v) {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "—";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}
