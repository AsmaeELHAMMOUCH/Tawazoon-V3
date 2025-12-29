import React, { useState } from 'react';
import { Calculator, Play, Eye, Info } from 'lucide-react';
import { api } from "../../lib/api";
import CentreScoringDetailsDrawer from "@/components/scoring/CentreScoringDetailsDrawer";
import { calculateGlobalScore } from "@/lib/scoring"; // Fallback

export default function ScoringSection({
    centreId,
    centreLabel,
    code,
    regionId,
    regionLabel,
    typologie,
    volumes,
    effectifGlobal,
    currentCategoryLabel
}) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const handleRunScoring = async () => {
        setLoading(true);
        try {
            // Prepare payload
            const payload = {
                centre_id: Number(centreId),
                type_site: "Standard", // Default or passed prop
                indicators: {
                    ...volumes,
                    // If you had structural indicators in VueCentre, pass them here
                },
                effectif_global: Number(effectifGlobal)
            };

            // 1. Try Backend
            try {
                const res = await api.scoring.runCentre(payload);
                if (res) {
                    setResult({
                        ...res,
                        centre_label: centreLabel,
                        code: code,
                        region_id: regionId,
                        regionLabel: regionLabel,
                        categorieLabel: typologie,
                        current_classe: currentCategoryLabel,
                        simulated_classe: res.simulated_class, // Backend returns 'simulated_class'
                        top_contributors: res.details?.slice(0, 3) || [] // Mock top contributors logic if missing
                    });
                    setLoading(false);
                    return;
                }
            } catch (e) { console.warn("Backend Scoring API failed", e); }

            // 2. Fallback Client Side
            const scoreRes = calculateGlobalScore({ ...volumes, effectif: effectifGlobal });

            // Map Impact
            const rankMap = { "Classe D": 1, "Classe C": 2, "Classe B": 3, "Classe A": 4, "SANS": 0 };
            let currKey = "SANS";
            const curr = (currentCategoryLabel || "").toUpperCase();
            if (curr.includes("A")) currKey = "Classe A";
            else if (curr.includes("B")) currKey = "Classe B";
            else if (curr.includes("C")) currKey = "Classe C";
            else if (curr.includes("D")) currKey = "Classe D";

            const rCurr = rankMap[currKey] || 0;
            const rSim = rankMap[scoreRes.classInfo.label] || 1;

            let impact = "Stable";
            if (rSim > rCurr) impact = "Promotion";
            if (rSim < rCurr) impact = "Reclassement";

            setResult({
                global_score: scoreRes.globalScore,
                simulated_classe: scoreRes.classInfo.label,
                impact: impact,
                current_classe: currentCategoryLabel,
                details: scoreRes.details,
                top_contributors: scoreRes.topContributors,
                centre_label: centreLabel,
                code: code,
                code: code,
                regionId: regionId,
                regionLabel: regionLabel,
                categorieLabel: typologie
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!result) {
        return (
            <div className="bg-white/60 rounded-xl p-4 border border-blue-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-[#005EA8]">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Scoring & Catégorisation</h3>
                        <p className="text-xs text-slate-500 mb-1">Calculer la complexité basée sur l'ETP simulé.</p>
                        {currentCategoryLabel && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Catégorie actuelle : <span className="font-bold ml-1">{currentCategoryLabel}</span>
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleRunScoring}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none bg-gradient-to-r from-[#005EA8] to-blue-600 text-white hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                >
                    {loading ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Calcul...
                        </>
                    ) : (
                        <>
                            <Play className="w-3 h-3 fill-current" />
                            Calculer le Score
                        </>
                    )}
                </button>
            </div>
        );
    }

    // Result View
    const colorMap = {
        "Classe A": "emerald",
        "Classe B": "blue",
        "Classe C": "amber",
        "Classe D": "slate"
    };
    const color = colorMap[result.simulated_classe] || "slate";

    return (
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className={`bg-${color}-50/50 px-4 py-3 border-b border-${color}-100 flex justify-between items-center`}>
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 bg-${color}-100 text-${color}-700 rounded-lg`}>
                        <Calculator className="w-4 h-4" />
                    </div>
                    <span className={`text-sm font-bold text-${color}-900`}>Résultat Scoring</span>
                </div>
                <button
                    onClick={() => setShowDetails(true)}
                    className="text-xs font-semibold text-[#005EA8] hover:text-[#005191] flex items-center gap-1"
                >
                    <Eye className="w-3 h-3" />
                    Voir détails
                </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Score */}
                <div className="text-center md:text-left border-r border-slate-100 pr-4">
                    <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Score Global</div>
                    <div className="text-2xl font-black text-slate-800">{result.global_score?.toFixed(2)}</div>
                </div>

                {/* Actuelle */}
                <div className="text-center border-r border-slate-100 px-4">
                    <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Categorie Actuelle</div>
                    <div className="text-sm font-bold text-slate-600">
                        {currentCategoryLabel || "N/A"}
                    </div>
                </div>

                {/* Class */}
                <div className="text-center border-r border-slate-100 px-4">
                    <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Categorie Simulée</div>
                    <div className={`inline-block px-3 py-1 rounded-lg bg-${color}-100 text-${color}-700 font-bold text-sm shadow-sm`}>
                        {result.simulated_classe}
                    </div>
                </div>

                {/* Impact */}
                <div className="text-center md:text-right pl-4">
                    <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Impact</div>
                    <span className={`
                        font-bold text-sm
                        ${result.impact === 'Promotion' ? 'text-emerald-600' :
                            result.impact === 'Reclassement' ? 'text-rose-600' : 'text-slate-600'}
                     `}>
                        {result.impact}
                    </span>
                </div>
            </div>

            <CentreScoringDetailsDrawer
                center={showDetails ? result : null}
                onClose={() => setShowDetails(false)}
            />
        </div>
    );
}
