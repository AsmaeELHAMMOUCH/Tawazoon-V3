import React, { useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import ReactECharts from "echarts-for-react";
import { TrendingUp, Users, Calculator, Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

/* ─── Seuils ─────────────────────────────────────────────── */
const getStatus = (idx) => {
    if (idx === null || idx === undefined) return { label: "—", color: "#94a3b8", bg: "bg-slate-50", text: "text-slate-500", icon: null };
    // Adéquat : entre 90% et 110%
    if (idx >= 90 && idx <= 110) return { label: "Adéquat", color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-600", icon: CheckCircle2 };
    // Hors adéquation : < 90% ou > 110%
    return { label: "Non Adéquat", color: "#ef4444", bg: "bg-red-50", text: "text-red-600", icon: XCircle };
};

const AdequacyGauge = ({ value, color }) => {
    const safeValue = value ?? 0;
    const displayColor = color || "#ef4444";
    // On scale le 200% comme valeur max pour l'affichage
    const maxScale = 200;
    const position = Math.min((safeValue / maxScale) * 100, 100);

    return (
        <div className="mt-7 mb-1 relative">
            {/* Curseur AU DESSUS */}
            <div
                className="absolute -top-5 transition-all duration-700 ease-out flex flex-col items-center"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
                <span className="text-[12px] font-black leading-none mb-0.5" style={{ color: displayColor }}>{safeValue}%</span>
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px]" style={{ borderTopColor: displayColor }} />
            </div>

            <div className="relative h-2 w-full rounded-full overflow-hidden shadow-inner border border-slate-200/50" style={{
                background: `linear-gradient(to right, 
                    #ef4444 0%, #ef4444 45%,     /* Rouge jusqu'à 90% (45/100) */
                    #10b981 45%, #10b981 55%,    /* Vert de 90% à 110% (55/100) */
                    #ef4444 55%, #ef4444 100%)`  /* Rouge après 110% */
            }}>
                {/* Marqueurs subtils pour 90% et 110% */}
                <div className="absolute left-[45%] top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute left-[55%] top-0 bottom-0 w-px bg-white/30" />
            </div>

            {/* Légende graduations EN DESSOUS */}
            <div className="relative h-3 w-full mt-1">
                <div className="absolute left-0 text-[8px] font-bold text-slate-400">0%</div>
                <div className="absolute left-[45%] -translate-x-1/2 text-[8px] font-bold text-slate-500">90%</div>
                <div className="absolute left-[55%] -translate-x-1/2 text-[8px] font-bold text-slate-500">110%</div>
                <div className="absolute -right-1 text-[8px] font-bold text-slate-400">200%+</div>
            </div>
        </div>
    );
};

/* ─── Composant principal ─────────────────────────────────── */
export default function AdequationDialog({ open, onOpenChange, simulationResults, postes, centreDetails, mode }) {
    /* ── Calcul des données par poste ── */
    const rows = useMemo(() => {
        if (!simulationResults || !postes) return [];
        const rpp = simulationResults.ressources_par_poste || {};

        const isMoi = (p) => {
            const type = (p.type_poste || "").toUpperCase();
            return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || !!p.is_moi;
        };

        return postes
            .filter((p) => !isMoi(p))
            .map((p) => {
                const label = (p.label || p.nom || "").trim();
                const actuel = Number(p.effectif_actuel || 0);
                const calcule = Math.round(rpp[label] || 0);
                const indice = actuel > 0 ? Math.round((calcule / actuel) * 100) : null;
                const status = getStatus(indice);
                return { label, actuel, calcule, indice, status, moi: false };
            })
            .filter((r) => r.actuel > 0 || r.calcule > 0)
            .sort((a, b) => b.calcule - a.calcule);
    }, [simulationResults, postes]);

    /* ── Totaux & indice global ── */
    const totalActuel = useMemo(() => rows.reduce((s, r) => s + r.actuel, 0), [rows]);
    const totalCalcule = useMemo(() => rows.reduce((s, r) => s + r.calcule, 0), [rows]);
    const globalIndice = useMemo(() => {
        if (totalActuel === 0) return null;
        return Math.round((totalCalcule / totalActuel) * 100);
    }, [totalActuel, totalCalcule]);
    const globalStatus = getStatus(globalIndice);

    const countByStatus = useMemo(() => ({
        ok: rows.filter(r => r.indice !== null && r.indice >= 90 && r.indice <= 110).length,
        ko: rows.filter(r => r.indice !== null && (r.indice < 90 || r.indice > 110)).length,
    }), [rows]);



    /* ── Options barres groupées ── */
    const barOption = useMemo(() => ({
        tooltip: {
            trigger: "axis",
            formatter: (params) => {
                const name = params[0].axisValue;
                return `<b>${name}</b><br/>${params.map(p => `${p.marker}${p.seriesName}: <b>${p.value}</b>`).join("<br/>")}`;
            },
        },
        legend: { data: ["Actuel", mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé"], bottom: 0, textStyle: { fontSize: 10 } },
        grid: { top: 10, left: 10, right: 10, bottom: 40, containLabel: true },
        xAxis: {
            type: "category",
            data: rows.map((r) => r.label),
            axisLabel: { fontSize: 9, rotate: rows.length > 5 ? 30 : 0, interval: 0, color: "#64748b" },
            axisLine: { lineStyle: { color: "#e2e8f0" } },
        },
        yAxis: { type: "value", min: 0, axisLabel: { fontSize: 9, color: "#94a3b8" }, splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } } },
        series: [
            {
                name: "Actuel",
                type: "bar", barMaxWidth: 28,
                data: rows.map((r) => r.actuel),
                itemStyle: { color: "#94a3b8", borderRadius: [3, 3, 0, 0] },
            },
            {
                name: mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé",
                type: "bar", barMaxWidth: 28,
                data: rows.map((r) => r.calcule),
                itemStyle: { color: "#005EA8", borderRadius: [3, 3, 0, 0] },
            },
        ],
    }), [rows]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] lg:max-w-6xl h-fit max-h-[92vh] p-0 overflow-hidden border-none shadow-2xl">
                <Card className="overflow-hidden border-0 shadow-none bg-white h-full">
                    {/* ── Header ── */}
                    <CardHeader className="relative overflow-hidden bg-gradient-to-r from-[#005EA8] to-[#0077cc] py-3.5 px-5 border-b-0">
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-white -translate-y-1/2 translate-x-1/4" />
                            <div className="absolute left-1/3 bottom-0 w-24 h-24 rounded-full bg-white translate-y-1/2" />
                        </div>
                        <div className="relative flex items-center justify-between mr-8">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white tracking-tight">Indice d'Adéquation {centreDetails?.centre_name && (
                                        <span className="text-xs font-black text-white">-{centreDetails.centre_name}</span>
                                    )}</h2>
                                    <p className="text-[10px] text-blue-200 font-medium">ETP {mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé"} / Effectif Actuel × 100</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Nom du centre */}

                                <div className="text-right">
                                    <p className="text-[9px] text-blue-200 font-bold uppercase tracking-widest">Postes analysés</p>
                                    <p className="text-lg font-black text-white">{rows.length}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-blue-200 font-bold uppercase tracking-widest">Adéquats</p>
                                    <p className="text-lg font-black text-white">{rows.filter(r => r.indice >= 80 && r.indice <= 120).length}</p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-3 overflow-y-auto max-h-[80vh]">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* ── Colonne gauche : 3 KPI cards ── */}
                            <div className="lg:col-span-1 space-y-3">

                                {/* KPI Actuel */}
                                <div className="relative overflow-hidden rounded-xl bg-white border border-slate-100 border-t-[3px] border-t-slate-300 p-3 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-default">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Effectif Actuel</p>
                                            <p className="text-2xl font-black text-slate-700 leading-none">{totalActuel}</p>
                                            <p className="text-[8px] text-slate-400 mt-1 font-semibold">agents en poste (BDD)</p>
                                        </div>
                                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <Users className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* KPI Calculé */}
                                <div className="relative overflow-hidden rounded-xl bg-white border border-slate-100 border-t-[3px] border-t-[#005EA8] p-3 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-default">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">ETP {mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé"}</p>
                                            <p className="text-2xl font-black text-[#005EA8] leading-none">{totalCalcule}</p>
                                            <p className="text-[8px] text-blue-300 mt-1 font-semibold">résultat {mode === "optimise" ? "processus optimisé" : mode === "recommande" ? "processus consolidé" : "simulation"}</p>
                                        </div>
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                            <Calculator className="w-3.5 h-3.5 text-[#005EA8]" />
                                        </div>
                                    </div>
                                    {/* Écart */}
                                    {totalActuel > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${totalCalcule > totalActuel
                                                ? "bg-red-50 text-red-500"
                                                : totalCalcule < totalActuel
                                                    ? "bg-orange-50 text-orange-500"
                                                    : "bg-emerald-50 text-emerald-500"
                                                }`}>
                                                {totalCalcule >= totalActuel ? "+" : ""}{totalCalcule - totalActuel}
                                            </span>
                                            <span className="text-[8px] text-slate-400 font-medium">vs actuel</span>
                                        </div>
                                    )}
                                </div>

                                {/* KPI Indice global */}
                                <div
                                    className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 p-3 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-default"
                                    style={{ borderTopWidth: "4px", borderTopColor: globalStatus.color }}
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Indice Global</p>
                                                <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tight ${globalStatus.bg} ${globalStatus.text} border border-current/30`}>
                                                    {globalStatus.label}
                                                </span>
                                            </div>
                                        </div>

                                        <AdequacyGauge value={globalIndice} color={globalStatus.color} />
                                    </div>
                                </div>

                                {/* Compteurs par statut */}
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { count: countByStatus.ok, label: "Adéquats", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
                                        { count: countByStatus.ko, label: "Non Adéquats", bg: "bg-red-50", text: "text-red-500", border: "border-red-100" },
                                    ].map(s => (
                                        <div key={s.label} className={`rounded-lg border ${s.border} ${s.bg} p-2 text-center`}>
                                            <p className={`text-lg font-black ${s.text}`}>{s.count}</p>
                                            <p className={`text-[8px] font-bold ${s.text} opacity-70`}>{s.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Légende seuils */}
                                <div className="rounded-xl border border-slate-100 bg-white p-3 space-y-1.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Seuils</p>
                                    {[
                                        { range: "90 – 110%", label: "Adéquat", dot: "bg-emerald-400" },
                                        { range: "< 90% ou > 110%", label: "Non Adéquat", dot: "bg-red-400" },
                                    ].map(s => (
                                        <div key={s.label} className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${s.dot} flex-shrink-0`} />
                                            <span className="text-[10px] font-bold text-slate-600">{s.range}</span>
                                            <span className="text-[10px] text-slate-400 ml-auto">{s.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Colonne droite : Graphe + Tableau ── */}
                            <div className="lg:col-span-2 space-y-4">
                                {/* Graphe barres */}
                                <div className="rounded-xl border border-slate-100 bg-white p-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Comparaison Actuel vs {mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé"}</p>
                                    <ReactECharts option={barOption} style={{ height: 180 }} />
                                </div>

                                {/* Tableau */}
                                <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="text-left px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Poste</th>
                                                <th className="text-center px-2 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                                <th className="text-right px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Actuel</th>
                                                <th className="text-right px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">{mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé"}</th>
                                                <th className="text-right px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Indice</th>
                                                <th className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-8 text-slate-400 text-[10px]">
                                                        Aucune donnée disponible
                                                    </td>
                                                </tr>
                                            ) : rows.map((r, i) => {
                                                const StatusIcon = r.status.icon;
                                                return (
                                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-0">
                                                        <td className="px-3 py-2 font-medium text-slate-700 truncate max-w-[160px]" title={r.label}>{r.label}</td>
                                                        <td className="px-2 py-2 text-center">
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black ${r.moi
                                                                ? "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100"
                                                                : "bg-blue-50 text-[#005EA8] border border-blue-100"
                                                                }`}>
                                                                {r.moi ? "MOI" : "MOD"}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded font-bold">{r.actuel}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <span className="px-2 py-0.5 bg-blue-50 text-[#005EA8] rounded font-bold">{r.calcule}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-black" style={{ color: r.status.color }}>
                                                            {r.indice !== null ? `${r.indice}%` : "—"}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${r.status.bg} ${r.status.text}`}>
                                                                {StatusIcon && <StatusIcon className="w-2.5 h-2.5" />}
                                                                {r.status.label}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}
