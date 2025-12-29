export const SCORING_UTILS = {
    // Determine the Tier for a given value
    findPalier: (value, tiers) => {
        const v = Number(value || 0);
        // Ensure sorted tiers
        const sorted = [...tiers].sort((a, b) => a.min - b.min);
        // Find matching range
        const match = sorted.find(t => v >= t.min && v <= t.max);
        // Fallback to max tier if above
        if (!match && v > sorted[sorted.length - 1].max) return sorted[sorted.length - 1];
        // Fallback to min tier if below or not found
        return match || sorted[0];
    },

    // Compute score for a single indicator
    computeIndicatorScore: (value, configItem) => {
        const tier = SCORING_UTILS.findPalier(value, configItem.tiers);
        const points = tier.points;
        const weightedScore = points * configItem.weight;
        return {
            points,
            weight: configItem.weight,
            score: weightedScore,
            tier
        };
    },

    // Compute global score for a Centre
    computeCentreScore: (centreData, fullConfig) => {
        let globalScore = 0;
        const details = fullConfig.map(item => {
            const val = centreData[item.key] || 0;
            const res = SCORING_UTILS.computeIndicatorScore(val, item);
            globalScore += res.score;
            return {
                key: item.key,
                label: item.label,
                value: val,
                ...res
            };
        });
        return { globalScore, details };
    },

    // Map global score to Class A/B/C/D
    mapScoreToClasse: (score, thresholds) => {
        if (score >= thresholds.A.min) return "Classe A";
        if (score >= thresholds.B.min) return "Classe B";
        if (score >= thresholds.C.min) return "Classe C";
        return "Classe D";
    },

    // Determine Impact (Promotion, etc.)
    computeImpact: (currentLabel, simulatedLabel) => {
        const rankMap = { "Classe D": 1, "Classe C": 2, "Classe B": 3, "Classe A": 4 };
        // Normalize current label
        let currentKey = "Classe D"; // Default base
        if (currentLabel?.includes("A")) currentKey = "Classe A";
        else if (currentLabel?.includes("B")) currentKey = "Classe B";
        else if (currentLabel?.includes("C")) currentKey = "Classe C";
        
        const rCurr = rankMap[currentKey] || 1;
        const rSim = rankMap[simulatedLabel] || 1;

        if (rSim > rCurr) return "Promotion";
        if (rSim < rCurr) return "Reclassement";
        return "Stable";
    }
};
