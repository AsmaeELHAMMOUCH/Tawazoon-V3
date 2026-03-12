import React, { useMemo } from "react";
import { TrendingUp, DollarSign, Users, Package, Calculator, ArrowRight, Info } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/* ─── Helpers ────────────────────────────────────────────────── */
const fmt = (v) => {
    const val = Number(v || 0);
    const fixed = Math.round(val).toString();
    return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const isMod = (p) => {
    if (!p) return false;
    const type = (p.type_poste || "").toUpperCase();
    return type === "MOD" || type === "DIRECT" || !!p.is_mod;
};

/* ─── Budget Card ──────────────────────────────────────────── */
function BudgetCard({ icon: Icon, label, sublabel, monthly, annual, color }) {
    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0" style={{ backgroundColor: `${color}18`, color }}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] leading-none" style={{ color }}>{sublabel}</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">{label}</p>
                </div>
            </div>
            <div className="px-3 pb-2">
                <p className="text-[7px] font-bold uppercase tracking-wider text-slate-300">/an</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-slate-800 tabular-nums tracking-tight leading-none">{annual}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">MAD</span>
                </div>
            </div>
            <div className="flex items-baseline justify-between bg-slate-50 border-t border-slate-100 px-3 py-1.5">
                <span className="text-[7px] font-bold uppercase tracking-wider text-slate-300">/mois</span>
                <div className="flex items-baseline gap-0.5">
                    <span className="text-[11px] font-black text-slate-500 tabular-nums">{monthly}</span>
                    <span className="text-[7px] font-bold text-slate-300 uppercase">MAD</span>
                </div>
            </div>
        </div>
    );
}

export default function ChiffrageDialog({
    open,
    onOpenChange,
    simulationResults,
    postes,
    mode
}) {
    /* Chiffrage financier */
    const chiffrageData = useMemo(() => {
        const rpp = simulationResults?.ressources_par_poste || {};
        const rows = (postes || [])
            .filter(p => isMod(p))
            .map(p => {
                const label = (p.label || p.nom || "").trim();
                const actuel = p.effectif_actuel || 0;
                const calcule = Math.round(rpp[label] || 0);
                const salaire = p.charge_salaire || 0;

                const gap = actuel - calcule; // L'écart c'est actuel - calculé
                const coutActuel = actuel * salaire;
                const coutCalcule = calcule * salaire;
                const impact = gap * salaire; // Positif = économie, Négatif = surcoût

                return { label, type: p.type_poste, actuel, calcule, gap, salaire, impact, coutActuel, coutCalcule };
            }).filter(r => r.actuel > 0 || r.calcule > 0)
            .sort((a, b) => b.impact - a.impact);

        const totalActuel = rows.reduce((s, r) => s + r.actuel, 0);
        const totalCalcule = rows.reduce((s, r) => s + r.calcule, 0);
        const totalGap = rows.reduce((s, r) => s + r.gap, 0);
        const totalImpact = rows.reduce((s, r) => s + r.impact, 0);
        const totalBudgetAct = rows.reduce((s, r) => s + (r.actuel * r.salaire), 0);
        const totalBudgetCal = rows.reduce((s, r) => s + (r.calcule * r.salaire), 0);

        return { rows, totalGap, totalImpact, totalBudgetAct, totalBudgetCal, totalActuel, totalCalcule };
    }, [postes, simulationResults]);


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl h-fit max-h-[92vh] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                <Card className="overflow-hidden border-0 shadow-none bg-slate-50 h-full flex flex-col">

                    {/* ── Header Harmonisé (Style CapaciteNominale) ── */}
                    <CardHeader className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#015294] via-[#005EA8] to-[#00A0E0] py-3 px-5 border-b-0">
                        <div className="absolute inset-0 opacity-15">
                            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/20 blur-2xl" />
                            <div className="absolute left-1/4 -bottom-5 w-32 h-32 rounded-full bg-sky-300/20 blur-xl" />
                        </div>
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                                    <DollarSign className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                        Chiffrage & Impact Financier ({mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Cible"})
                                        <span className="text-[10px] font-medium text-blue-100/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">
                                            Analyse Mensuelle
                                        </span>
                                    </h2>
                                    <p className="text-[10px] text-blue-100 font-medium opacity-80 uppercase tracking-wide">
                                        Économie Estimée : {chiffrageData.totalImpact > 0 ? "+" : ""}{fmt(chiffrageData.totalImpact)} MAD
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-2 rounded-xl flex gap-4">
                                    <div className="text-center">
                                        <p className="text-[8px] text-blue-100/70 font-bold uppercase tracking-widest">Actuel</p>
                                        <p className="text-base font-black text-white leading-tight">{fmt(chiffrageData.totalBudgetAct)}</p>
                                    </div>
                                    <div className="w-px bg-white/10" />
                                    <div className="text-center">
                                        <p className="text-[8px] text-blue-200 font-bold uppercase tracking-widest" style={{ color: "#7dd3fc" }}>{mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé"}</p>
                                        <p className="text-base font-black text-white leading-tight">{fmt(chiffrageData.totalBudgetCal)}</p>
                                    </div>
                                    <div className="w-px bg-white/10" />
                                    <div className="text-center">
                                        <p className="text-[8px] text-blue-100/70 font-bold uppercase tracking-widest">Économie</p>
                                        <p className={`text-base font-black leading-tight ${chiffrageData.totalImpact >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                                            {chiffrageData.totalImpact > 0 ? "+" : ""}{fmt(chiffrageData.totalImpact)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-4 overflow-y-auto max-h-[82vh] space-y-4">

                        {/* ── Bandeau Ressources ── */}
                        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-300" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Effectifs MOD</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-[8px] font-black uppercase text-slate-300 tracking-widest">Actuel</p>
                                    <p className="text-sm font-black text-slate-600 tabular-nums">{fmt(chiffrageData.totalActuel)} <span className="text-[9px] font-bold text-slate-300">ETP</span></p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-200" />
                                <div className="text-center">
                                    <p className="text-[8px] font-black uppercase text-blue-400 tracking-widest">{mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé"}</p>
                                    <p className="text-sm font-black text-blue-600 tabular-nums">{fmt(chiffrageData.totalCalcule)} <span className="text-[9px] font-bold text-blue-200">ETP</span></p>
                                </div>
                                <div className="w-px h-6 bg-slate-100 mx-1" />
                                <div className={`px-3 py-1 rounded-lg flex items-center gap-1.5 font-black text-sm tabular-nums ${chiffrageData.totalGap >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                    <span className="text-[9px] font-bold opacity-60 uppercase">Écart :</span>
                                    {chiffrageData.totalGap > 0 ? "+" : ""}{fmt(chiffrageData.totalGap)} ETP
                                </div>
                            </div>
                        </div>

                        {/* ── Grille Financière 3 colonnes ── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <BudgetCard
                                icon={Package}
                                label="Masse Salariale Actuelle"
                                sublabel="Budget Initial"
                                monthly={fmt(chiffrageData.totalBudgetAct)}
                                annual={fmt(chiffrageData.totalBudgetAct * 12)}
                                color="#64748b"
                            />
                            <BudgetCard
                                icon={Calculator}
                                label={`Masse Salariale ${mode === "optimise" ? "Optimisée" : mode === "recommande" ? "Consolidée" : "Calculée"}`}
                                sublabel={`Budget ${mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé"}`}
                                monthly={fmt(chiffrageData.totalBudgetCal)}
                                annual={fmt(chiffrageData.totalBudgetCal * 12)}
                                color="#0ea5e9"
                            />

                            {/* Hero Card — Impact Final */}
                            <div className={`relative overflow-hidden rounded-xl flex flex-col shadow-md group transition-shadow hover:shadow-lg ${chiffrageData.totalImpact >= 0
                                ? "bg-gradient-to-b from-emerald-600 to-emerald-700"
                                : "bg-gradient-to-b from-rose-600 to-rose-700"
                                }`}>
                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                                <div className="relative flex items-center justify-between px-3 pt-2.5 pb-0">
                                    <div>
                                        <p className="text-[8px] font-black text-white/60 uppercase tracking-[0.15em] leading-none">
                                            {chiffrageData.totalImpact >= 0 ? "Économie" : "Surcoût"}
                                        </p>
                                        <p className="text-[9px] font-bold text-white/70 mt-0.5">Impact financier</p>
                                    </div>
                                    <div className="w-6 h-6 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                                    </div>
                                </div>

                                <div className="relative px-3 pt-1.5 pb-2">
                                    <p className="text-[7px] font-bold text-white/50 uppercase tracking-wider">/an</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-base font-black text-white tabular-nums tracking-tight leading-none">
                                            {chiffrageData.totalImpact > 0 ? "+" : ""}{fmt(chiffrageData.totalImpact * 12)}
                                        </span>
                                        <span className="text-[8px] font-bold text-white/50 uppercase">MAD</span>
                                    </div>
                                </div>

                                <div className="relative mt-auto flex items-center justify-between bg-black/15 border-t border-white/10 px-3 py-1.5">
                                    <span className="text-[7px] font-bold text-white/50 uppercase tracking-wider">/mois</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[11px] font-black text-white tabular-nums">
                                            {chiffrageData.totalImpact > 0 ? "+" : ""}{fmt(chiffrageData.totalImpact)}
                                        </span>
                                        <span className="text-[7px] font-bold text-white/40 uppercase">MAD</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Tableau analytique ── */}
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                            <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calculator className="w-3.5 h-3.5 text-slate-500" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Détail financier par poste</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px] border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="text-left px-4 py-2 text-[9px] font-black uppercase text-slate-400 sticky left-0 z-30 bg-white border-r border-slate-100">Poste</th>
                                            <th className="text-center px-3 py-2 text-[9px] font-black uppercase text-slate-400 border-l border-slate-50">Type</th>
                                            <th className="text-center px-4 py-2 text-[9px] font-black uppercase text-slate-400 border-l border-slate-50">Actuel</th>
                                            <th className="text-center px-4 py-2 text-[9px] font-black uppercase text-[#005EA8]">{mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé"}</th>
                                            <th className="text-center px-4 py-2 text-[9px] font-black uppercase text-slate-500 border-l border-slate-100 bg-slate-50/30">Écart</th>
                                            <th className="text-center px-4 py-2 text-[9px] font-black uppercase text-slate-400 border-l border-slate-50">Salaire Unit.</th>
                                            <th className="text-right px-4 py-2 text-[9px] font-black uppercase text-slate-500 border-l border-slate-50 bg-slate-50/20">Budget Act.</th>
                                            <th className="text-right px-4 py-2 text-[9px] font-black uppercase text-[#005EA8] border-l border-slate-50 bg-blue-50/10">Budget {mode === "optimise" ? "Opt." : mode === "recommande" ? "Cons." : "Cal."}</th>
                                            <th className="text-right px-6 py-2 text-[9px] font-black uppercase text-slate-700 border-l border-slate-100 bg-slate-50/30">Économie</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {chiffrageData.rows.map((r, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-4 py-1.5 sticky left-0 z-10 bg-inherit border-r border-slate-100 group-hover:bg-blue-50/50">
                                                    <span className="font-bold text-slate-700 text-[10px] tracking-tight">{r.label}</span>
                                                </td>
                                                <td className="px-3 py-1.5 text-center border-l border-slate-50 bg-slate-50/5">
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded leading-none ${r.type === 'MOD' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                        {r.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-1.5 text-center font-bold text-slate-500">{fmt(r.actuel)}</td>
                                                <td className="px-4 py-1.5 text-center font-black text-[#005EA8] bg-blue-50/20">{fmt(r.calcule)}</td>
                                                <td className="px-4 py-1.5 text-center border-l border-slate-100 bg-slate-50/20">
                                                    <div className={`font-black inline-flex items-center px-1.5 py-0.5 rounded ${r.gap >= 0 ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-rose-700 bg-rose-50 border border-rose-100"}`}>
                                                        {r.gap > 0 ? "+" : ""}{fmt(r.gap)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-1.5 text-center text-[10px] font-bold text-slate-400 tabular-nums italic">{fmt(r.salaire)}</td>
                                                <td className="px-4 py-1.5 text-right font-bold text-slate-500 bg-slate-50/10 border-l border-slate-50">{fmt(r.coutActuel)}</td>
                                                <td className="px-4 py-1.5 text-right font-black text-[#005EA8] bg-blue-50/5 border-l border-slate-50">{fmt(r.coutCalcule)}</td>
                                                <td className="px-6 py-1.5 text-right border-l border-slate-100 bg-slate-50/40">
                                                    <div className="flex flex-col items-end">
                                                        <span className={`font-black text-[11px] tracking-tight ${r.impact >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                                            {r.impact > 0 ? "+" : ""}{fmt(r.impact)}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-slate-300 uppercase shrink-0">MAD</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}
