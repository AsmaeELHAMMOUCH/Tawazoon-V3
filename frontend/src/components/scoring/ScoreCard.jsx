import React from "react";
import { Trophy, TrendingUp, Info } from "lucide-react";

/**
 * Composant carte affichant le score global et la classe
 * Props:
 *  - scoreData: Objet retourné par calculateGlobalScore()
 *  - compact: boolean (pour affichage liste)
 */
export default function ScoreCard({ scoreData, compact = false }) {
    if (!scoreData) return null;

    const { globalScore, classInfo } = scoreData;
    const maxScore = 12; // Estimation max théorique pour la jauge
    const percent = Math.min(100, (globalScore / maxScore) * 100);

    // Styles dynamiques selon la classe
    const colorMap = {
        emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
        blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", bar: "bg-blue-500", badge: "bg-blue-100 text-blue-800" },
        amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", bar: "bg-amber-500", badge: "bg-amber-100 text-amber-800" },
        rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", bar: "bg-rose-500", badge: "bg-rose-100 text-rose-800" },
    };

    const theme = colorMap[classInfo.color] || colorMap.blue;

    if (compact) {
        return (
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${theme.bg} ${theme.border}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg bg-white shadow-sm ${theme.text}`}>
                    {classInfo.key}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Score: {globalScore.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/50 rounded-full overflow-hidden">
                        <div className={`h-full ${theme.bar}`} style={{ width: `${percent}%` }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative p-5 rounded-2xl border shadow-sm overflow-hidden ${theme.bg} ${theme.border}`}>

            {/* Decorative Background Icon */}
            <Trophy className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-5 ${theme.text}`} />

            <div className="flex items-start justify-between relative z-10">
                <div>
                    <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Catégorisation Simulée</h3>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-black tracking-tight ${theme.text}`}>{classInfo.label}</span>
                    </div>
                    <div className="text-sm text-slate-500 font-medium mt-1">{classInfo.description}</div>
                </div>

                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl font-bold bg-white shadow-lg border-4 border-white ring-1 ring-slate-100 ${theme.text} transform rotate-3`}>
                    {classInfo.key}
                </div>
            </div>

            {/* Progress Section */}
            <div className="mt-6 relative z-10">
                <div className="flex justify-between items-end mb-2">
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-slate-800">{globalScore.toFixed(2)} pts</span>
                        <span className="text-xs text-slate-500">Score de complexité pondéré</span>
                    </div>
                    <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${theme.badge}`}>
                            <TrendingUp className="w-3 h-3" />
                            Top {Math.round(percent)}%
                        </span>
                    </div>
                </div>

                <div className="h-3 w-full bg-white/60 rounded-full overflow-hidden shadow-inner border border-white/20">
                    <div
                        className={`h-full ${theme.bar} transition-all duration-1000 ease-out`}
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>0</span>
                    <span>Échelle de complexité</span>
                    <span>{maxScore}+</span>
                </div>
            </div>
        </div>
    );
}
