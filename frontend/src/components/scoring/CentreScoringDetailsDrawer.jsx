import React from 'react';
import ScoreCard from "@/components/scoring/ScoreCard";
import IndicatorsTable from "@/components/scoring/IndicatorsTable";
import { Info, Building2, Tag, X, Download, RotateCcw } from 'lucide-react';

export default function CentreScoringDetailsDrawer({ center, onClose }) {
    if (!center) return null;

    // Prep Data
    const scoreData = {
        globalScore: center.global_score,
        classInfo: {
            key: center.simulated_classe.replace("Classe ", ""),
            label: center.simulated_classe,
            description: "Catégorie Simulée",
            color: center.simulated_classe === "Classe A" ? "emerald" : center.simulated_classe === "Classe B" ? "blue" : center.simulated_classe === "Classe C" ? "amber" : "rose"
        },
        details: center.details,
        topContributors: center.top_contributors
    };

    const campaignId = `SCORING-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" style={{ zoom: "90%" }}>

                {/* 1) Header Sticky */}
                <div className="bg-white px-5 py-4 border-b border-slate-200 flex justify-between items-start sticky top-0 z-20 shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-[#005EA8]" />
                                {center.centre_label}
                            </h2>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">
                                <Tag className="w-3 h-3" />
                                Campagne {campaignId}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 pl-7 font-mono">
                            Typologie: <span className="text-slate-700 font-semibold">{center.categorieLabel || "N/A"}</span> |
                            Région: <span className="text-slate-700 font-semibold">{center.regionLabel || center.region_id || "N/A"}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-5 overflow-y-auto space-y-6 bg-slate-50/50 flex-1">

                    {/* 2) Zone KPI (2 colonnes) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                        {/* Colonne Gauche: Carte Principale */}
                        <div className="md:col-span-1">
                            <ScoreCard scoreData={scoreData} />
                        </div>

                        {/* Colonne Droite: Synthèse */}
                        <div className="md:col-span-2 flex flex-col gap-3">
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm h-full flex flex-col">
                                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-[#005EA8]" />
                                    Synthèse
                                </h3>

                                <p className="text-base font-medium text-slate-700 mb-4">
                                    Score de <strong className="text-[#005EA8]">{center.global_score.toFixed(2)} pts</strong> classant le centre en <strong className={`px-1.5 py-0.5 rounded ${scoreData.classInfo.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' : scoreData.classInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' : scoreData.classInfo.color === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{center.simulated_classe}</strong>.
                                </p>

                                <div className="mb-4">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">Top Contributeurs</span>
                                    <div className="flex flex-wrap gap-2">
                                        {center.top_contributors.map((c, i) => (
                                            <div key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                                                <span>{c.label}</span>
                                                <span className="bg-white px-1.5 rounded text-[#005EA8] font-bold border border-slate-100">{c.score.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                                        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Catégorie Actuelle</div>
                                        <div className="text-sm font-bold text-slate-700">{center.current_classe || "N/A"}</div>
                                    </div>
                                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-8 h-8 bg-blue-100 rounded-bl-full -mr-2 -mt-2"></div>
                                        <div className="text-[10px] text-[#005EA8] uppercase font-bold mb-1">Catégorie Simulée</div>
                                        <div className="text-sm font-bold text-[#005EA8]">{center.simulated_classe}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3) Section Détails (Table) */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                Détail du calcul par indicateur
                            </h3>
                            <span className="text-xs text-slate-400 italic">Trié par impact décroissant</span>
                        </div>
                        <IndicatorsTable details={center.details} />
                    </div>

                </div>

                {/* 4) Footer Sticky */}
                <div className="bg-white px-5 py-4 border-t border-slate-200 flex items-center justify-between sticky bottom-0 z-20 shrink-0">
                    <div className="text-xs text-slate-400 font-medium">
                        Dernière mise à jour: {new Date().toLocaleString()}
                    </div>
                    <div className="flex gap-3">
                        {/* Optionnel: Bouton Exporter */}
                        <button className="hidden md:flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                            Exporter
                        </button>

                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 shadow-md transition-colors"
                        >
                            Fermer
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
