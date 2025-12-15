export const FIELD_KEYS = [
"courrierOrdinaire",
"courrierRecommande",
"ebarkia",
"lrh",
"amana",
];
// 1) Normalisation du label DB -> clé de règle
// Exemples de labels (DB):
// - "AM - Agence Messagerie" -> "AM"
// - "CD - Centre de Distribution" -> "CD"
// - "CTD - Centre de Traitement et Distribution" -> "CTD"
// - "CM" -> "CM"
export function getCategoryKeyFromLabel(label) {
if (!label) return "DEFAULT";
const trimmed = String(label).trim();
// Si le label commence par un acronyme + " - ...", récupérer l'acronyme
const m = trimmed.match(/^([A-Za-z]+)\b/);
const key = m ? m[1].toUpperCase() : trimmed.toUpperCase();
// Normaliser les variantes
if (key.startsWith("AM")) return "AM";
if (key.startsWith("CD")) return "CD";
if (key.startsWith("CTD")) return "CTD";
if (key === "CM") return "CM";
return "DEFAULT";
}

// 2) Règles par catégorie (input|zero|na)
// - "input": champ saisissable
// - "zero": affiché en lecture seule "0" + valorisé 0 pour le calcul
// - "na": affiché "N/A" + valorisé 0 pour le calcul
const DEFAULT_RULE = Object.fromEntries(FIELD_KEYS.map((k) => [k, "input"]));

const RULES = {
// AM: tous les flux courrier + AMANA saisissables
AM: {
courrierOrdinaire: "input",
courrierRecommande: "input",
ebarkia: "input",
lrh: "input",
amana: "input",
},
// CTD: uniquement AMANA (les autres inapplicables)
CTD: {
courrierOrdinaire: "N/A",
courrierRecommande: "N/A",
ebarkia: "N/A",
lrh: "N/A",
amana: "input",
},
// CM: uniquement AMANA (les autres inapplicables)
CM: {
courrierOrdinaire: "N/A",
courrierRecommande: "N/A",
ebarkia: "N/A",
lrh: "N/A",
amana: "input",
},
// CD: à adapter selon ton besoin (ex: comme CTD)
CD: {
courrierOrdinaire: "N/A",
courrierRecommande: "N/A",
ebarkia: "N/A",
lrh: "N/A",
amana: "input",
},
DEFAULT: DEFAULT_RULE,
};

// 3) Récupérer le mode d’un champ pour un label DB
export function getFieldModeByLabel(dbLabel, fieldKey) {
const key = getCategoryKeyFromLabel(dbLabel);
const rule = RULES[key] || DEFAULT_RULE;
return rule[fieldKey] || "input";
}