/**
 * CONFIGURATION DU SCORING
 * Définition des indicateurs, poids et paliers pour la catégorisation des centres.
 */

export const SCORING_CONFIG = {
  // Seuils pour la classe finale (A/B/C/D) basés sur le SCORE GLOBAL PONDÉRÉ
  // Exemple: Score total possible ~10.
  THRESHOLDS: {
    A: { min: 8.5, label: "Classe A", color: "emerald", description: "Centre d'Excellence / HUB" },
    B: { min: 6.0, label: "Classe B", color: "blue", description: "Centre Standard Supérieur" },
    C: { min: 3.5, label: "Classe C", color: "amber", description: "Centre de Proximité" },
    D: { min: 0.0, label: "Classe D", color: "rose", description: "Point de Contact / Satellite" }, // D if < 3.5
  },

  INDICATORS: [
    {
      key: "courrier_ordinaire",
      label: "Courrier Ordinaire",
      unit: "objets/an",
      weight: 0.20,
      tiers: [
        { min: 0, max: 50000, points: 1 },
        { min: 50001, max: 200000, points: 3 },
        { min: 200001, max: 1000000, points: 6 },
        { min: 1000001, max: Infinity, points: 10 },
      ],
    },
    {
      key: "courrier_recommande",
      label: "Courrier Recommandé",
      unit: "objets/an",
      weight: 0.15,
      tiers: [
        { min: 0, max: 10000, points: 1 },
        { min: 10001, max: 50000, points: 3 },
        { min: 50001, max: 100000, points: 7 },
        { min: 100001, max: Infinity, points: 10 },
      ],
    },
    {
      key: "colis",
      label: "Colis",
      unit: "objets/an",
      weight: 0.25,
      tiers: [
        { min: 0, max: 2000, points: 1 },
        { min: 2001, max: 10000, points: 4 },
        { min: 10001, max: 50000, points: 8 },
        { min: 50001, max: Infinity, points: 10 },
      ],
    },
    {
      key: "amana",
      label: "Amana",
      unit: "objets/an",
      weight: 0.15,
      tiers: [
        { min: 0, max: 1000, points: 1 },
        { min: 1001, max: 5000, points: 4 },
        { min: 5001, max: 20000, points: 7 },
        { min: 20001, max: Infinity, points: 10 },
      ],
    },
    {
      key: "ebarkia",
      label: "E-Barkia",
      unit: "objets/an",
      weight: 0.10,
      tiers: [
        { min: 0, max: 500, points: 1 },
        { min: 501, max: 2000, points: 5 },
        { min: 2001, max: Infinity, points: 10 },
      ],
    },
    {
      key: "lrh",
      label: "LRH (Logistique)",
      unit: "unites/an",
      weight: 0.15,
      tiers: [
        { min: 0, max: 100, points: 1 },
        { min: 101, max: 1000, points: 5 },
        { min: 1001, max: Infinity, points: 10 },
      ],
    },
    // Ajout d'indicateurs structurels factices pour la démo
    // Dans la réalité, ces données viendraient de la DB
    {
      key: "effectif",
      label: "Effectif Global",
      unit: "ETP",
      weight: 0.20, // (Note: Total weights > 1.0 is possible, scoring is absolute)
      tiers: [
        { min: 0, max: 2, points: 1 },
        { min: 3, max: 10, points: 4 },
        { min: 11, max: 50, points: 7 },
        { min: 51, max: Infinity, points: 10 },
      ],
    }
  ],
};

/**
 * MOTEUR DE CALCUL
 */

export function getTier(value, tiers) {
  // Trouve le palier correspondant
  const v = Number(value || 0);
  // Trie par min croissant pour être sûr
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  
  const match = sorted.find(t => v >= t.min && v <= t.max);
  return match || sorted[0]; // Fallback au premier palier si hors range (ex: négatif ?)
}

export function calculateIndicatorDetails(indicatorConfig, value) {
  const tier = getTier(value, indicatorConfig.tiers);
  const points = tier.points;
  const weightedScore = points * indicatorConfig.weight;

  return {
    key: indicatorConfig.key,
    label: indicatorConfig.label,
    value: value,
    unit: indicatorConfig.unit,
    tierRange: `[${tier.min.toLocaleString()} - ${tier.max === Infinity ? '+' : tier.max.toLocaleString()}]`,
    points: points,
    weight: indicatorConfig.weight,
    score: weightedScore,
  };
}

export function calculateGlobalScore(centreData) {
  // centreData doit contenir les clés correspondant à INDICATORS (ex: centreData.colis)
  // On suppose que centreData.volumes contient les volumes si structure complexe,
  // ou centreData directement. On adapte.
  
  // Extraction sécurisée des valeurs
  const getValue = (key) => {
    // 1. Chercher à la racine
    if (centreData[key] !== undefined) return centreData[key];
    // 2. Chercher dans 'metrics' ou 'volumes'
    if (centreData.metrics?.[key] !== undefined) return centreData.metrics[key];
    if (centreData.volumes?.[key] !== undefined) return centreData.volumes[key];
    return 0; 
  };

  const details = SCORING_CONFIG.INDICATORS.map(ind => {
    const val = getValue(ind.key);
    return calculateIndicatorDetails(ind, val);
  });

  const globalScore = details.reduce((sum, d) => sum + d.score, 0);

  // Détermination de la classe
  const { THRESHOLDS } = SCORING_CONFIG;
  let finalClassKey = "D"; // Default

  // Check A
  if (globalScore >= THRESHOLDS.A.min) finalClassKey = "A";
  else if (globalScore >= THRESHOLDS.B.min) finalClassKey = "B";
  else if (globalScore >= THRESHOLDS.C.min) finalClassKey = "C";
  
  const classInfo = { ...THRESHOLDS[finalClassKey], key: finalClassKey };

  // Facteurs principaux (Top 3 contributeurs au score)
  const topContributors = [...details]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    globalScore,
    classInfo,
    details,
    topContributors,
  };
}
