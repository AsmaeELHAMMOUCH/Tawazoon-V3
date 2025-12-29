import React, { useMemo } from 'react';
import { Lightbulb, AlertTriangle, TrendingUp, ArrowRight, BrainCircuit, Sparkles } from 'lucide-react';

export default function SmartInsightsPanel({ centres, kpis, onScenarioApply }) {

    // 1. Analyse IA - Detection d'Anomalies & Opportunités
    const analysis = useMemo(() => {
        if (!centres || centres.length === 0) return null;

        const criticalUnderstaffed = centres.filter(c => c.ecart > 2).sort((a, b) => b.ecart - a.ecart);
        const criticalOverstaffed = centres.filter(c => c.ecart < -2).sort((a, b) => a.ecart - b.ecart);

        let insights = [];

        // Insight 1: Alerte Critique
        if (criticalUnderstaffed.length > 0) {
            insights.push({
                type: 'critical',
                icon: AlertTriangle,
                title: "Tension Critique Détectée",
                desc: `${criticalUnderstaffed.length} centres sont en sous-effectif majeur (>2 ETP).`,
                action: "Voir les centres",
                highlight: criticalUnderstaffed[0].label
            });
        }

        // Insight 2: Opportunité d'Optimisation
        if (criticalOverstaffed.length > 0) {
            insights.push({
                type: 'opportunity',
                icon: TrendingUp,
                title: "Gisement de Productivité",
                desc: `Potentiel de redéploiement identifié sur ${criticalOverstaffed.length} sites.`,
                action: "Analyser",
                highlight: `${Math.abs(Math.round(criticalOverstaffed.reduce((acc, c) => acc + c.ecart, 0)))} ETP excédentaires`
            });
        }


        // Insight 3: Anticipation Flux (Volume Based)
        if (kpis.etp > 0) {
            insights.push({
                type: 'suggestion',
                icon: TrendingUp,
                title: "Anticipation Croissance",
                desc: "Une hausse d'activité de 10% nécessiterait un renfort de :",
                highlight: `${Math.round(kpis.etp * 0.10)} ETP`,
                action: "Simuler +10%"
            });
        }

        // Insight 4: Pareto Focus (80/20)
        const totalAbsGap = centres.reduce((sum, c) => sum + Math.abs(c.ecart || 0), 0);
        if (totalAbsGap > 5) {
            const sortedByImpact = [...centres].sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));
            let accumulatedGap = 0;
            let count = 0;
            const topContributors = [];

            for (const c of sortedByImpact) {
                accumulatedGap += Math.abs(c.ecart);
                topContributors.push(c);
                count++;
                if (accumulatedGap >= totalAbsGap * 0.6) break; // Focus on 60% impact
            }

            if (count <= 3 && count < centres.length) {
                insights.push({
                    type: 'focus',
                    icon: BrainCircuit,
                    title: "Radar Prioritaire (80/20)",
                    desc: `${count} centres concentrent 60% des écarts. Agir sur eux est prioritaire.`,
                    highlight: topContributors.map(c => c.label.substring(0, 10)).join(', '),
                    action: "Filtrer"
                });
            }
        }

        return insights;
    }, [centres, kpis]);

    if (!analysis) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl shadow-lg border border-indigo-500/30 p-5 text-white overflow-hidden relative">

            {/* Background Decor */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>

            {/* Header */}
            <div className="flex items-center gap-2 mb-6 relative z-10">
                <div className="bg-indigo-500/20 p-1.5 rounded-lg border border-indigo-400/30">
                    <BrainCircuit size={18} className="text-indigo-300" />
                </div>
                <div>
                    <h3 className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                        Smart Insights
                    </h3>
                    <p className="text-[10px] text-indigo-300/70">Analyse temps réel</p>
                </div>
            </div>

            {/* Insights List */}
            <div className="space-y-4 relative z-10 mb-6">
                {analysis.map((insight, idx) => (
                    <div key={idx} className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-400/30 p-3 rounded-lg transition-all duration-300 cursor-pointer">
                        <div className="flex items-start gap-3">
                            <div className={`mt-1 p-1.5 rounded-md ${insight.type === 'critical' ? 'bg-red-500/20 text-red-300' :
                                insight.type === 'opportunity' ? 'bg-emerald-500/20 text-emerald-300' :
                                    insight.type === 'focus' ? 'bg-purple-500/20 text-purple-300' :
                                        'bg-amber-500/20 text-amber-300'
                                }`}>
                                <insight.icon size={14} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xs font-semibold text-slate-100 mb-1">{insight.title}</h4>
                                <p className="text-[10px] text-slate-300 leading-relaxed mb-2">
                                    {insight.desc}
                                </p>
                                {insight.highlight && (
                                    <div className="inline-block px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white border border-white/10">
                                        {insight.highlight}
                                    </div>
                                )}
                            </div>
                            <ArrowRight size={14} className="text-slate-500 group-hover:text-white transition-colors self-center opacity-0 group-hover:opacity-100" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Stress Test Scenarios */}
            <div className="relative z-10 border-t border-white/10 pt-4">
                <h4 className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp size={12} />
                    Stress Test (Projection)
                </h4>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => onScenarioApply && onScenarioApply(1.0)} className="flex flex-col items-center justify-center p-2 rounded bg-white/5 hover:bg-white/10 border border-transparent hover:border-indigo-500/30 transition-all active:scale-95 group">
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white">Normal</span>
                        <span className="text-[9px] text-slate-500 group-hover:text-indigo-300">Actuel</span>
                    </button>
                    <button onClick={() => onScenarioApply && onScenarioApply(1.15)} className="flex flex-col items-center justify-center p-2 rounded bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all active:scale-95 group">
                        <span className="text-xs font-bold text-slate-300 group-hover:text-red-200">Pic</span>
                        <span className="text-[9px] text-slate-500 group-hover:text-red-400">+15%</span>
                    </button>
                    <button onClick={() => onScenarioApply && onScenarioApply(0.90)} className="flex flex-col items-center justify-center p-2 rounded bg-white/5 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-all active:scale-95 group">
                        <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-200">Creux</span>
                        <span className="text-[9px] text-slate-500 group-hover:text-emerald-400">-10%</span>
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-400">
                <span>Tawazoon Intelligence v2.1</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Actif</span>
            </div>
        </div>
    );
}
