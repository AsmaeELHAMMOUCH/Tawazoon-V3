/**
 * Formats a number with French locale, max 2 decimals.
 * Returns "—" if null/undefined.
 */
export const fmt = (v) =>
  v === null || v === undefined
    ? "—"
    : Number.isFinite(v)
      ? v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
      : v;

/**
 * Parses a value into a float, or null if invalid.
 * Handles "1 200,50" -> 1200.50
 */
export const numOrNull = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  
  let s = String(val)
    .replace(/\s|[\u00A0\u202F]/g, "") // Remove spaces
    .replace(/[^0-9.,-]/g, ""); // Remove non-numeric chars except . , -

  if (!s) return null;

  // Handle comma vs dot
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  
  if (lastComma !== -1 && lastDot !== -1) {
    // If both present, assume last one is decimal separator
    const decIsComma = lastComma > lastDot;
    s = s.replace(/[.,]/g, ""); // Remove all separators
    if (decIsComma) {
      const decLen = String(val).length - lastComma - 1;
      if (decLen > 0) s = s.slice(0, -decLen) + "." + s.slice(-decLen);
    }
  } else {
    // Standardize comma to dot
    s = s.replace(/,/g, ".");
  }
  
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
};

/**
 * Returns a new object with all keys lowercase.
 */
export const lower = (o) =>
  Object.fromEntries(
    Object.entries(o || {}).map(([k, v]) => [String(k).toLowerCase(), v])
  );

/**
 * Safe number parsing, defaults to 0.
 */
export const n = (v) => Number(v || 0);

export const normalizeCentre = (row) => {
  const r = lower(row);
  const label = r.label ?? r.libelle ?? r.name ?? r.centre_label ?? `Centre`;
  const id = r.id ?? r.centre_id ?? r.cid;
  
  return {
    id: id ? (Number(id) || id) : null,
    label,
    region_id: r.region_id ?? null,
    direction_id: r.direction_id ?? null,
    type: r.type ?? r.categorie ?? "",
    fte_actuel: Number(r.effectif_actuel ?? r.fte_actuel ?? 0),
    etp_calcule: Number(r.etp_calcule ?? r.fte_calcule ?? 0),
    etp_arrondi: Number(r.etp_arrondi ?? 0),
    ecart: Number(r.ecart ?? 0),
    postes: r.postes ?? r.nb_postes ?? 0,
  };
};

export const normalizePoste = (row) => {
  const r = lower(row);
  return {
      label: r.label ?? r.poste_label ?? r.libelle ?? "Poste",
      effectif_actuel: Number(r.effectif_actuel ?? r.fte_actuel ?? 0),
      etp_calcule: Number(r.etp_calcule ?? r.fte_calcule ?? 0),
      etp_arrondi: Number(r.etp_arrondi ?? 0),
      ecart: Number(r.ecart ?? 0),
      type_poste: r.type_poste ?? r.type ?? ""
  };
};
