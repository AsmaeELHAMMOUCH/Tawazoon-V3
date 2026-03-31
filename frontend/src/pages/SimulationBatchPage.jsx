import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import ReactECharts from "echarts-for-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    MapPin, Globe, Download, Upload, Play, CheckCircle2,
    ChevronRight, AlertTriangle, Users, TrendingUp, TrendingDown, Building2,
    Loader2, FileSpreadsheet, BarChart3, X, RefreshCcw,
    Sparkles, ArrowUpRight, ArrowDownRight, Minus, Target, Layers,
    ChevronLeft, Zap, RotateCcw, BookText, Calculator
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
    n == null ? "—" : Number(n).toLocaleString("fr-MA", { maximumFractionDigits: 1 });

// Mode label & style helpers
const PROCESS_MODES = {
    actuel: { label: "Processus Actuel", color: "#0EA5E9", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: Zap },
    recommande: { label: "Processus Consolidé", color: "#10B981", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: BookText },
    optimise: { label: "Processus Optimisé", color: "#8B5CF6", bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", icon: Sparkles },
};

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepBar({ current, isNational }) {
    const steps = isNational
        ? [{ id: 2, label: "Template" }, { id: 3, label: "Import" }, { id: 4, label: "Résultats" }]
        : [{ id: 1, label: "Sélection" }, { id: 2, label: "Template" }, { id: 3, label: "Import" }, { id: 4, label: "Résultats" }];

    return (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 mb-8">
            <div className="flex items-center">
                {steps.map((s, i) => {
                    const done = s.id < current;
                    const active = s.id === current;
                    return (
                        <React.Fragment key={s.id}>
                            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 shadow-sm ${done ? "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)]" : active ? "bg-gradient-to-br from-[#005EA8] to-[#0A6BBC] text-white ring-4 ring-blue-100 shadow-[0_4px_14px_rgba(0,94,168,0.38)]" : "bg-slate-100 text-slate-400 border border-slate-200"}`}>
                                    {done ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                                </div>
                                <span className={`text-[10px] font-bold tracking-wide ${active ? "text-blue-600" : done ? "text-emerald-600" : "text-slate-400"}`}>
                                    {s.label}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`flex-1 h-1 mx-2 mb-5 rounded-full transition-all duration-500 ${done ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-slate-100"}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
// ─── KPI Card (Matched with VueNationale.jsx style) ─────────────────────────
function KpiCard({ label, value, icon: Icon, color = "blue", sub, trend }) {
    const colorMap = {
        blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-b-blue-500", iconRing: "ring-blue-100" },
        green: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-b-emerald-500", iconRing: "ring-emerald-100" },
        red: { bg: "bg-rose-50", text: "text-rose-600", border: "border-b-rose-500", iconRing: "ring-rose-100" },
        orange: { bg: "bg-amber-50", text: "text-amber-600", border: "border-b-amber-500", iconRing: "ring-amber-100" },
        purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-b-purple-500", iconRing: "ring-purple-100" },
    };
    const theme = colorMap[color] || colorMap.blue;

    return (
        <div className="relative bg-white rounded-xl shadow-sm border border-slate-100 p-2.5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden h-full min-h-[85px] flex flex-col items-center justify-center text-center">
            {/* Colored Accent Line at Bottom */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${theme.bg} ${theme.border} opacity-80 transition-all group-hover:h-1.5`}></div>

            <div className="relative z-10 flex flex-col items-center gap-1.5 w-full">
                {/* Icon with Ring Effect */}
                <div className={`p-1.5 rounded-xl ${theme.bg} ${theme.text} ring-2 ${theme.iconRing} inline-flex items-center justify-center shadow-sm transition-transform group-hover:scale-110`}>
                    <Icon size={16} strokeWidth={2.5} />
                </div>

                <div className="flex flex-col items-center gap-0.5">
                    <div className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">{value}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mt-0.5">{label}</div>
                    
                    {sub && <p className="text-[9px] text-slate-400 font-medium group-hover:text-slate-500 transition-colors uppercase tracking-tight">{sub}</p>}

                    {trend && (
                        <div className={`mt-1 flex items-center justify-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                            {trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {trend === 'up' ? 'Hausse' : 'Baisse'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────
function AdequacyBar({ value }) {
    const pct = Math.min(Math.max(value, 0), 200);
    const display = Math.min(pct, 100);
    const color = pct < 80 ? "#F59E0B" : pct > 120 ? "#EF4444" : "#10B981";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${display}%`, background: color }} />
            </div>
            <span className="text-[9px] font-bold w-10 text-right" style={{ color }}>{fmt(value)}%</span>
        </div>
    );
}

// ─── Écart badge ──────────────────────────────────────────────────────────────
function EcartBadge({ value }) {
    const pos = value >= 0;
    return (
        <span className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold ${pos ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
            {value > 0 ? <ArrowUpRight className="w-3 h-3" /> : value < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {value > 0 ? "+" : ""}{fmt(value)}
        </span>
    );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label, count, color = "blue" }) {
    const colorMap = {
        blue: active ? "border-blue-500 text-blue-700 bg-blue-50/70" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50",
        indigo: active ? "border-indigo-500 text-indigo-700 bg-indigo-50/70" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50",
        violet: active ? "border-violet-500 text-violet-700 bg-violet-50/70" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50",
    };
    const badgeMap = {
        blue: active ? "bg-blue-200 text-blue-800" : "bg-slate-100 text-slate-500",
        indigo: active ? "bg-indigo-200 text-indigo-800" : "bg-slate-100 text-slate-500",
        violet: active ? "bg-violet-200 text-violet-800" : "bg-slate-100 text-slate-500",
    };
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-[11px] font-bold transition-all duration-200 ${colorMap[color]}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count != null && <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 leading-none ${badgeMap[color]}`}>{count}</span>}
        </button>
    );
}

// ─── Results Tabs (Step 4) ─────────────────────────────────────────────────────
function ResultsTabs({ results, processMode }) {
    const [activeTab, setActiveTab] = useState("regions");
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [selectedCentre, setSelectedCentre] = useState(null);
    const [viewMode, setViewMode] = useState("table"); // 'table' | 'chart'

    // Réinitialise les filtres/tableaux quand le mode de process change
    useEffect(() => {
        setActiveTab("regions");
        setSelectedRegion(null);
        setSelectedCentre(null);
        setViewMode("table");
    }, [processMode]);

    const centresForRegion = useMemo(() => {
        if (!selectedRegion) return results.par_centre;
        return results.par_centre.filter((c) => c.region_id === selectedRegion.region_id);
    }, [selectedRegion, results.par_centre]);

    const postesForCentre = useMemo(() => {
        if (!selectedCentre) return [];
        const postesCalc = Object.entries(selectedCentre.ressources_par_poste || {});
        const postesActuels = selectedCentre.effectifs_par_poste || {};
        return postesCalc.map(([poste, etpCalc]) => {
            const actuel = Number(postesActuels[poste] || 0);
            const ecart = Number(etpCalc || 0) - actuel;
            return { poste, etpCalc: Number(etpCalc || 0), actuel, ecart };
        });
    }, [selectedCentre]);

    const RegionsTabTable = () => (
        <table className="w-full">
            <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                    {["Région", "Centres", "ETP Actuel", "ETP Calculé", "ETP Arrondi", "Écart", "Adéquation", ""].map((h) => (
                        <th key={h} className={`px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 ${h === "Région" || h === "" ? "text-left" : "text-center"}`}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {results.par_region.map((r, i) => {
                    const regionCentres = results.par_centre.filter((c) => c.region_id === r.region_id);
                    const actuelRegion = regionCentres.reduce((s, c) => s + Number(c.actual_mod || 0) + Number(c.actual_moi || 0) + Number(c.actual_aps || 0), 0);
                    const ecartRegion = Number(r.total_fte_calcule || 0) - actuelRegion;
                    const adequation = actuelRegion > 0 ? (Number(r.total_fte_calcule || 0) / actuelRegion) * 100 : 0;
                    return (
                        <tr key={r.region_id} className={`border-b border-slate-50 cursor-pointer transition-all group ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-blue-50/50`}
                            onClick={() => { setSelectedRegion(r); setSelectedCentre(null); setActiveTab("centres"); }}>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                    </div>
                                    <span className="text-[12px] font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{r.region_label}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-center"><span className="bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1 text-[10px] font-bold">{r.nb_centres}</span></td>
                            <td className="px-4 py-3 text-center text-[11px] font-semibold text-slate-600">{fmt(actuelRegion)}</td>
                            <td className="px-4 py-3 text-center"><span className="bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-2.5 py-1 text-[11px] font-black">{fmt(r.total_fte_calcule)}</span></td>
                            <td className="px-4 py-3 text-center text-[11px] font-bold text-slate-600">{r.total_fte_arrondi}</td>
                            <td className="px-4 py-3 text-center"><EcartBadge value={ecartRegion} /></td>
                            <td className="px-4 py-3 min-w-[120px]"><AdequacyBar value={adequation} /></td>
                            <td className="px-3 py-3 text-right"><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors ml-auto" /></td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    const RegionsTabChart = () => {
        const data = results.par_region.map((r) => {
            const regionCentres = results.par_centre.filter((c) => c.region_id === r.region_id);
            const actuelRegion = regionCentres.reduce((s, c) => s + Number(c.actual_mod || 0) + Number(c.actual_moi || 0) + Number(c.actual_aps || 0), 0);
            return {
                label: r.region_label,
                actuel: actuelRegion,
                calcule: Number(r.total_fte_calcule || 0),
            };
        });

        const option = {
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                valueFormatter: (v) => fmt(v),
            },
            legend: {
                data: ["Actuel", "Calculé"],
                bottom: 0,
                icon: "circle",
                itemWidth: 8,
                itemHeight: 8,
                textStyle: { fontSize: 10, color: "#64748B" },
            },
            grid: { left: "3%", right: "3%", top: 20, bottom: 50, containLabel: true },
            xAxis: {
                type: "category",
                data: data.map((d) => d.label),
                axisLabel: { color: "#64748B", interval: 0, rotate: 20, fontSize: 10 },
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#E2E8F0" } },
            },
            yAxis: {
                type: "value",
                splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } },
                axisLabel: { color: "#64748B" },
            },
            series: [
                {
                    name: "Actuel",
                    type: "bar",
                    barGap: "20%",
                    barMaxWidth: 26,
                    itemStyle: {
                        color: {
                            type: "linear",
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: "#0EA5E9" },
                                { offset: 1, color: "#38BDF8" },
                            ],
                        },
                        borderRadius: [6, 6, 0, 0],
                        shadowBlur: 6,
                        shadowColor: "rgba(15,23,42,0.15)",
                        shadowOffsetY: 2,
                    },
                    data: data.map((d) => d.actuel),
                },
                {
                    name: "Calculé",
                    type: "bar",
                    barMaxWidth: 26,
                    itemStyle: {
                        color: {
                            type: "linear",
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: "#10B981" },
                                { offset: 1, color: "#22C55E" },
                            ],
                        },
                        borderRadius: [6, 6, 0, 0],
                        shadowBlur: 6,
                        shadowColor: "rgba(15,23,42,0.15)",
                        shadowOffsetY: 2,
                    },
                    data: data.map((d) => d.calcule),
                },
            ],
            dataZoom: [],
        };

        const handleClick = (params) => {
            const region = results.par_region.find((r) => r.region_label === params.name);
            if (!region) return;
            setSelectedRegion(region);
            setSelectedCentre(null);
            setActiveTab("centres");
        };

        return (
            <div className="p-3">
                <ReactECharts
                    option={option}
                    style={{ height: 320 }}
                    onEvents={{ click: handleClick }}
                />
            </div>
        );
    };

    const CentresTab = () => (
        <div>
            {selectedRegion && (
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50 bg-slate-50/40">
                    <button onClick={() => setSelectedRegion(null)} className="text-[10px] text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1 transition-colors">
                        <X className="w-3 h-3" /> Toutes les régions
                    </button>
                    <span className="text-slate-300">›</span>
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full px-3 py-1 text-[10px] font-bold">
                        <MapPin className="w-3 h-3" />{selectedRegion.region_label}
                    </span>
                </div>
            )}
            <table className="w-full">
                <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        {["Centre", "Région", "ETP Actuel", "ETP Calculé", "ETP Arrondi", "Écart", "Adéquation", ""].map((h) => (
                            <th key={h} className={`px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 ${h === "Centre" || h === "Région" || h === "" ? "text-left" : "text-center"}`}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {centresForRegion.map((c, i) => {
                        const actuel = Number(c.actual_mod || 0) + Number(c.actual_moi || 0) + Number(c.actual_aps || 0);
                        const ecart = Number(c.fte_calcule || 0) - actuel;
                        const adequation = actuel > 0 ? (Number(c.fte_calcule || 0) / actuel) * 100 : 0;
                        const hasPostes = Object.keys(c.ressources_par_poste || {}).length > 0;
                        return (
                            <tr key={c.centre_id}
                                className={`border-b border-slate-50 transition-all group ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} ${hasPostes ? "cursor-pointer hover:bg-indigo-50/50" : ""}`}
                                onClick={() => { if (!hasPostes) return; setSelectedCentre(c); setActiveTab("postes"); }}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${hasPostes ? "bg-indigo-50 group-hover:bg-indigo-100" : "bg-slate-100"}`}>
                                            <Building2 className={`w-3.5 h-3.5 ${hasPostes ? "text-indigo-500" : "text-slate-400"}`} />
                                        </div>
                                        <span className={`text-[12px] font-bold transition-colors ${hasPostes ? "text-slate-800 group-hover:text-indigo-700" : "text-slate-600"}`}>{c.centre_label}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 rounded-md px-2 py-0.5 text-[10px] font-medium">
                                        <MapPin className="w-2.5 h-2.5" />{c.region_label}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center text-[11px] font-semibold text-slate-600">{fmt(actuel)}</td>
                                <td className="px-4 py-3 text-center"><span className="bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-2.5 py-1 text-[11px] font-black">{fmt(c.fte_calcule)}</span></td>
                                <td className="px-4 py-3 text-center text-[11px] font-bold text-slate-600">{c.fte_arrondi}</td>
                                <td className="px-4 py-3 text-center"><EcartBadge value={ecart} /></td>
                                <td className="px-4 py-3 min-w-[120px]"><AdequacyBar value={adequation} /></td>
                                <td className="px-3 py-3 text-right">
                                    {hasPostes ? <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors ml-auto" /> : <span className="text-[9px] text-slate-300">—</span>}
                                </td>
                            </tr>
                        );
                    })}
                    {centresForRegion.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-10 text-center text-[11px] text-slate-400">Aucun centre disponible.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    const CentresTabChart = () => {
        const data = centresForRegion.map((c) => {
            const actuel = Number(c.actual_mod || 0) + Number(c.actual_moi || 0) + Number(c.actual_aps || 0);
            return {
                label: c.centre_label,
                actuel,
                calcule: Number(c.fte_calcule || 0),
            };
        });

        const option = {
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                valueFormatter: (v) => fmt(v),
            },
            legend: {
                data: ["Actuel", "Calculé"],
                bottom: 0,
                icon: "circle",
                itemWidth: 8,
                itemHeight: 8,
                textStyle: { fontSize: 10, color: "#64748B" },
            },
            grid: { left: "3%", right: "3%", top: 20, bottom: 50, containLabel: true },
            xAxis: {
                type: "category",
                data: data.map((d) => d.label),
                axisLabel: { color: "#64748B", interval: 0, rotate: 30, fontSize: 10 },
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#E2E8F0" } },
            },
            yAxis: {
                type: "value",
                splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } },
                axisLabel: { color: "#64748B" },
            },
            series: [
                {
                    name: "Actuel",
                    type: "bar",
                    barGap: "20%",
                    barMaxWidth: 22,
                    itemStyle: {
                        color: {
                            type: "linear",
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: "#0EA5E9" },
                                { offset: 1, color: "#38BDF8" },
                            ],
                        },
                        borderRadius: [6, 6, 0, 0],
                        shadowBlur: 5,
                        shadowColor: "rgba(15,23,42,0.15)",
                        shadowOffsetY: 2,
                    },
                    data: data.map((d) => d.actuel),
                },
                {
                    name: "Calculé",
                    type: "bar",
                    barMaxWidth: 22,
                    itemStyle: {
                        color: {
                            type: "linear",
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: "#10B981" },
                                { offset: 1, color: "#22C55E" },
                            ],
                        },
                        borderRadius: [6, 6, 0, 0],
                        shadowBlur: 5,
                        shadowColor: "rgba(15,23,42,0.15)",
                        shadowOffsetY: 2,
                    },
                    data: data.map((d) => d.calcule),
                },
            ],
            dataZoom: [],
        };

        const handleClick = (params) => {
            const centre = centresForRegion.find((c) => c.centre_label === params.name);
            if (!centre) return;
            const hasPostes = Object.keys(centre.ressources_par_poste || {}).length > 0;
            if (!hasPostes) return;
            setSelectedCentre(centre);
            setActiveTab("postes");
        };

        return (
            <div className="p-3">
                <ReactECharts
                    option={option}
                    style={{ height: 320 }}
                    onEvents={{ click: handleClick }}
                />
            </div>
        );
    };

    const PostesTabTable = () => {
        if (!(selectedCentre && postesForCentre.length > 0)) {
            return (
                <div className="py-12 text-center">
                    <Layers className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-[11px] text-slate-400">Sélectionnez un centre dans l'onglet Centres pour voir le détail par poste.</p>
                </div>
            );
        }
        return (
            <table className="w-full">
                <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        {["Poste", "ETP Actuel", "ETP Calculé", "Écart"].map((h) => (
                            <th key={h} className={`px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 ${h === "Poste" ? "text-left" : "text-center"}`}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {postesForCentre.map(({ poste, etpCalc, actuel, ecart }, i) => (
                        <tr key={poste} className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center flex-shrink-0"><Layers className="w-3 h-3 text-violet-500" /></div>
                                    <span className="text-[12px] font-semibold text-slate-700">{poste}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-center text-[11px] font-semibold text-slate-600">{fmt(actuel)}</td>
                            <td className="px-4 py-3 text-center"><span className="bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-2.5 py-1 text-[11px] font-black">{fmt(etpCalc)}</span></td>
                            <td className="px-4 py-3 text-center"><EcartBadge value={ecart} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const PostesTabChart = () => {
        if (!(selectedCentre && postesForCentre.length > 0)) {
            return (
                <div className="py-12 text-center">
                    <Layers className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-[11px] text-slate-400">Sélectionnez un centre dans l'onglet Centres pour voir le détail par poste.</p>
                </div>
            );
        }

        const option = {
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                valueFormatter: (v) => fmt(v),
            },
            legend: {
                data: ["Actuel", "Calculé"],
                bottom: 0,
                icon: "circle",
                itemWidth: 8,
                itemHeight: 8,
                textStyle: { fontSize: 10, color: "#64748B" },
            },
            grid: { left: "3%", right: "3%", top: 20, bottom: 60, containLabel: true },
            xAxis: {
                type: "category",
                data: postesForCentre.map((p) => p.poste),
                axisLabel: { color: "#64748B", interval: 0, rotate: 35, fontSize: 10 },
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#E2E8F0" } },
            },
            yAxis: {
                type: "value",
                splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } },
                axisLabel: { color: "#64748B" },
            },
            series: [
                {
                    name: "Actuel",
                    type: "bar",
                    barGap: "20%",
                    barMaxWidth: 22,
                    itemStyle: {
                        color: {
                            type: "linear",
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: "#0EA5E9" },
                                { offset: 1, color: "#38BDF8" },
                            ],
                        },
                        borderRadius: [6, 6, 0, 0],
                        shadowBlur: 5,
                        shadowColor: "rgba(15,23,42,0.15)",
                        shadowOffsetY: 2,
                    },
                    data: postesForCentre.map((p) => p.actuel),
                },
                {
                    name: "Calculé",
                    type: "bar",
                    barMaxWidth: 22,
                    itemStyle: {
                        color: {
                            type: "linear",
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: "#10B981" },
                                { offset: 1, color: "#22C55E" },
                            ],
                        },
                        borderRadius: [6, 6, 0, 0],
                        shadowBlur: 5,
                        shadowColor: "rgba(15,23,42,0.15)",
                        shadowOffsetY: 2,
                    },
                    data: postesForCentre.map((p) => p.etpCalc),
                },
            ],
            dataZoom: [],
        };

        return (
            <div className="p-3">
                <ReactECharts option={option} style={{ height: 320 }} />
            </div>
        );
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-2 gap-1">
                <div className="flex items-center gap-1 overflow-x-auto">
                    <TabButton active={activeTab === "regions"} onClick={() => setActiveTab("regions")} icon={MapPin} label="Régions" count={results.par_region.length} color="blue" />
                    <TabButton active={activeTab === "centres"} onClick={() => setActiveTab("centres")} icon={Building2} label="Centres" count={centresForRegion.length} color="indigo" />
                    <TabButton active={activeTab === "postes"} onClick={() => setActiveTab("postes")} icon={Layers} label="Postes" count={selectedCentre ? postesForCentre.length : null} color="violet" />
                </div>
                <div className="flex items-center gap-1 pr-2">
                    <button
                        onClick={() => setViewMode("table")}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all ${viewMode === "table"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                            }`}
                    >
                        Tableau
                    </button>
                    <button
                        onClick={() => setViewMode("chart")}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all ${viewMode === "chart"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                            }`}
                    >
                        Graphique
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                {activeTab === "regions" && (viewMode === "table" ? <RegionsTabTable /> : <RegionsTabChart />)}
                {activeTab === "centres" && (viewMode === "table" ? <CentresTab /> : <CentresTabChart />)}
                {activeTab === "postes" && (viewMode === "table" ? <PostesTabTable /> : <PostesTabChart />)}
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SimulationBatchPage({ mode = "regional" }) {
    const isNational = mode === "national";
    const [searchParams] = useSearchParams();
    // Process mode from URL: actuel / recommande / optimise
    const processMode = searchParams.get("mode") || "actuel";
    const prevProcessModeRef = useRef(processMode);

    const [step, setStep] = useState(1);
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [file, setFile] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);
    // Show relaunch banner when processMode changes and we already have a file
    const [showRelauncher, setShowRelauncher] = useState(false);

    useEffect(() => {
        if (!isNational) {
            api.regions().then(setRegions).catch(console.error);
        } else {
            setStep(2);
        }
    }, [isNational]);

    // Detect process mode change — if we already have a file, show relaunch banner
    useEffect(() => {
        if (prevProcessModeRef.current !== processMode) {
            prevProcessModeRef.current = processMode;
            if (file) {
                setShowRelauncher(true);
                setError(null);
            }
        }
    }, [processMode, file]);

    const handleDownloadTemplate = useCallback(async () => {
        setDownloading(true);
        setError(null);
        try {
            await api.downloadBatchTemplate(mode, selectedRegion?.id);
            setStep(3);
        } catch (e) {
            setError(e.message);
        } finally {
            setDownloading(false);
        }
    }, [mode, selectedRegion]);

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f) { setFile(f); setShowRelauncher(false); }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f && f.name.endsWith(".xlsx")) { setFile(f); setShowRelauncher(false); }
    };

    const handleSimulate = useCallback(async (fileOverride = null) => {
        const targetFile = fileOverride || file;
        if (!targetFile) return;
        setLoading(true);
        setError(null);
        try {
            const regionId = isNational ? null : selectedRegion?.id;
            const data = await api.simulateBatch(targetFile, regionId, processMode);
            setResults(data);
            setStep(4);
            setShowRelauncher(false);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [file, isNational, selectedRegion, processMode]);

    const dashboard = useMemo(() => {
        if (!results?.par_centre?.length) {
            return { etpActuelTotal: 0, etpCalculeTotal: 0, etpArrondiTotal: 0, ecartGlobal: 0, tauxAdequation: 0 };
        }
        const etpActuelTotal = results.par_centre.reduce(
            (s, c) => s + Number(c.actual_mod || 0) + Number(c.actual_moi || 0) + Number(c.actual_aps || 0), 0
        );
        const etpCalculeTotal = Number(results.national?.total_fte_calcule || 0);
        const etpArrondiTotal = Math.round(etpCalculeTotal);
        const ecartGlobal = etpCalculeTotal - etpActuelTotal;
        const tauxAdequation = etpActuelTotal > 0 ? (etpCalculeTotal / etpActuelTotal) * 100 : 0;
        return { etpActuelTotal, etpCalculeTotal, etpArrondiTotal, ecartGlobal, tauxAdequation };
    }, [results]);

    const currMode = PROCESS_MODES[processMode] || PROCESS_MODES.actuel;
    const ModeIcon = currMode.icon;

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_20%_0%,rgba(14,165,233,0.07),transparent_50%),radial-gradient(ellipse_at_80%_5%,rgba(99,102,241,0.06),transparent_50%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-6">
            <div className="max-w-6xl mx-auto">

                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="mb-8">
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${isNational ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-200" : "bg-gradient-to-br from-[#005EA8] to-[#0A6BBC] shadow-blue-200"}`}>
                            {isNational ? <Globe className="w-6 h-6 text-white" /> : <MapPin className="w-6 h-6 text-white" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                    Simulation {isNational ? "Nationale" : "Régionale"}
                                </h1>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isNational ? "bg-violet-100 text-violet-700 border border-violet-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>
                                    {isNational ? "Réseau national" : selectedRegion ? selectedRegion.label : "Batch régional"}
                                </span>
                                {/* Process mode badge */}
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${currMode.bg} ${currMode.border} border ${currMode.text}`}>
                                    <ModeIcon className="w-3 h-3" />
                                    {currMode.label}
                                </span>
                            </div>
                            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                                {isNational
                                    ? "Calculez les effectifs de l'ensemble du réseau via un fichier Excel multi-centres."
                                    : "Calculez les effectifs de tous les centres d'une région via import Excel."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Popup de relance quand le mode de process change */}
                <Dialog open={showRelauncher && !!file} onOpenChange={setShowRelauncher}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <RotateCcw className="w-4 h-4 text-blue-600" />
                                Changement de processus détecté
                            </DialogTitle>
                            <DialogDescription className="text-[12px] leading-relaxed">
                                Vous avez changé le mode vers <strong className={currMode.text}>{currMode.label}</strong>.
                                Relancez la simulation pour appliquer ce mode au fichier importé.
                            </DialogDescription>
                        </DialogHeader>

                        <div className={`rounded-xl border ${currMode.border} ${currMode.bg} p-3`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${currMode.text}`}>
                                Fichier prêt
                            </p>
                            <p className="text-[11px] text-slate-700 mt-1 break-all">
                                {file?.name || "Aucun fichier"}
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-[11px] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-2">
                            <button
                                onClick={() => setShowRelauncher(false)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Plus tard
                            </button>
                            <button
                                onClick={() => handleSimulate(file)}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] px-4 py-2 text-[11px] font-bold text-white hover:from-[#004e8a] hover:to-[#085a9c] disabled:opacity-60 transition-all"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                {loading ? "Calcul en cours…" : "Relancer la simulation"}
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── MAIN CARD ──────────────────────────────────────────────── */}
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.45)] p-7">
                    <StepBar current={step} isNational={isNational} />

                    {/* STEP 1 */}
                    {step === 1 && !isNational && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Étape 1</h2>
                                <p className="text-lg font-bold text-slate-800">Choisissez une région</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {regions.map((r) => {
                                    const selected = selectedRegion?.id === r.id;
                                    return (
                                        <button key={r.id} onClick={() => setSelectedRegion(r)}
                                            className={`flex items-center gap-2.5 text-left px-4 py-3 rounded-xl border text-[11px] font-semibold transition-all duration-200 ${selected ? "bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] border-blue-600 text-white shadow-[0_6px_20px_rgba(0,94,168,0.3)] scale-[1.02]" : "border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm bg-white"}`}>
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? "bg-white/20" : "bg-slate-100"}`}>
                                                {selected ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <MapPin className="w-3.5 h-3.5 text-slate-400" />}
                                            </div>
                                            <span className="leading-tight">{r.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button disabled={!selectedRegion} onClick={() => setStep(2)}
                                className="mt-2 flex items-center gap-2 bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] hover:from-[#004e8a] hover:to-[#085a9c] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg">
                                Continuer <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Étape {isNational ? "1" : "2"}</h2>
                                <p className="text-lg font-bold text-slate-800">Télécharger le modèle Excel</p>
                            </div>
                            {!isNational && selectedRegion && (
                                <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 w-fit">
                                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                    Région sélectionnée : <span className="font-bold text-blue-700">{selectedRegion.label}</span>
                                </div>
                            )}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200 rounded-2xl p-5 space-y-2 shadow-sm">
                                <p className="text-[11px] font-black text-amber-800 flex items-center gap-2 uppercase tracking-wide">
                                    <span className="text-base">📋</span> Instructions
                                </p>
                                <ul className="space-y-1.5">
                                    {[
                                        "Le fichier contiendra une feuille par centre avec le canvas de volumes",
                                        <>Remplissez les cellules <span className="bg-amber-200 px-1.5 py-0.5 rounded text-amber-900">jaunes</span> avec les volumes annuels</>,
                                        "Ajustez les paramètres dans la section PARAMÈTRES si nécessaire",
                                        <><strong>Ne renommez pas les onglets</strong> — ils identifient chaque centre</>,
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-[11px] text-amber-700">
                                            <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button onClick={handleDownloadTemplate} disabled={downloading}
                                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-60 text-white text-[11px] font-bold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg">
                                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    {downloading ? "Téléchargement…" : "Télécharger le modèle .xlsx"}
                                </button>
                                <button onClick={() => setStep(3)} className="text-[11px] text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 underline underline-offset-2">
                                    Passer au téléversement <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {error && <div className="flex items-center gap-2 text-red-600 text-[11px] bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
                        </div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Étape {isNational ? "2" : "3"}</h2>
                                <p className="text-lg font-bold text-slate-800">Importer le fichier rempli</p>
                            </div>
                            <div
                                onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                                onClick={() => document.getElementById("batch-file-input").click()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${file ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-sm" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm bg-slate-50/50"}`}
                            >
                                <input id="batch-file-input" type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
                                {file ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-sm"><FileSpreadsheet className="w-7 h-7 text-emerald-600" /></div>
                                        <div>
                                            <p className="text-[13px] font-bold text-emerald-700">{file.name}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} Ko</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            className="flex items-center gap-1.5 text-red-400 text-[10px] hover:text-red-600 bg-white border border-red-100 rounded-lg px-3 py-1.5 transition-colors">
                                            <X className="w-3 h-3" /> Supprimer
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Upload className="w-7 h-7 text-slate-300" /></div>
                                        <div>
                                            <p className="text-[13px] font-semibold text-slate-500">Glissez le fichier .xlsx ici</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">ou cliquez pour sélectionner</p>
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Formats acceptés : .xlsx</span>
                                    </div>
                                )}
                            </div>
                            {error && <div className="flex items-center gap-2 text-red-600 text-[11px] bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
                            <div className="flex items-center gap-3">
                                <button disabled={!file || loading} onClick={() => handleSimulate()}
                                    className="flex items-center gap-2 bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] hover:from-[#004e8a] hover:to-[#085a9c] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                    {loading ? "Simulation en cours…" : "Lancer la simulation"}
                                </button>
                                {!isNational && (
                                    <button onClick={() => setStep(2)} className="text-[10px] text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2">← Retour</button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 4 — Résultats */}
                    {step === 4 && results && (
                        <div className={`space-y-7 relative transition-all duration-300 ${loading ? "opacity-40 pointer-events-none grayscale-[0.3]" : "opacity-100"}`}>
                            {loading && (
                                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/10 backdrop-blur-[2px] rounded-3xl">
                                    <div className="bg-white/90 shadow-2xl rounded-2xl p-6 flex flex-col items-center gap-4 border border-slate-100 animate-in zoom-in-95 duration-200">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-800">Actualisation en cours…</p>
                                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">Mode {currMode.label}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                                <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <Sparkles className="w-4 h-4 text-blue-400" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                                            {isNational ? "Vue Nationale" : "Vue Régionale"} — Résultats
                                        </p>
                                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${currMode.bg} ${currMode.border} border ${currMode.text}`}>
                                            <ModeIcon className="w-3 h-3" />{currMode.label}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-extrabold text-slate-900">Synthèse des effectifs calculés</h2>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {results.national.nb_centres} centre(s) simulé(s)
                                        {results.errors?.length ? ` · ${results.errors.length} rejet(s)` : ""}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setStep(isNational ? 2 : 1); setResults(null); setFile(null); setError(null); setShowRelauncher(false); }}
                                    className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                                    <RefreshCcw className="w-3.5 h-3.5" /> Nouvelle simulation
                                </button>
                            </div>

                            {/* KPI grid (Synchronized with VueNationale blocks) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                <KpiCard icon={Users} label="Effectif Actuel" value={fmt(dashboard.etpActuelTotal)} sub="Total ETP" color="blue" />
                                <KpiCard icon={Calculator} label="Effectif Calculé" value={fmt(results.national.total_fte_calcule)} sub="Besoin théorique" color="blue" />
                                <KpiCard icon={AlertTriangle} label="Écart Global" value={`${dashboard.ecartGlobal > 0 ? "+" : ""}${fmt(dashboard.ecartGlobal)}`} sub="Écart ETP" color={dashboard.ecartGlobal >= 0 ? "orange" : "red"} />
                                <KpiCard icon={Target} label="Adéquation" value={`${fmt(dashboard.tauxAdequation)}%`} sub="Taux d'occupation" color="green" />
                                <KpiCard icon={Building2} label={isNational ? "Centres" : "Centres / Direction"} value={results.national.nb_centres} sub="Nombre simulé" color="purple" />
                            </div>

                            {/* Bloc erreurs volontairement masqué pour simplifier la vue résultats */}

                            <ResultsTabs results={results} processMode={processMode} isNational={isNational} />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
