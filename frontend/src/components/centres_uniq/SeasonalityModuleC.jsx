"use client";
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    TrendingUp, Users, RefreshCcw, Play,
    AlertCircle, CheckCircle2, CalendarDays, Eraser,
    ChevronDown, ChevronRight, BarChart3
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import useEchartAutoResize from "@/components/hooks/useEchartAutoResize";

const MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const MONTHS_LONG = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const FLUX_CONFIG = [
    { key: "amana", label: "AMANA", accentColor: "#005EA8", lightBg: "bg-blue-50/60", border: "border-l-blue-500" },
    { key: "co", label: "CO", accentColor: "#0891b2", lightBg: "bg-cyan-50/60", border: "border-l-cyan-500" },
    { key: "cr", label: "CR", accentColor: "#7c3aed", lightBg: "bg-violet-50/60", border: "border-l-violet-500" },
    { key: "lrh", label: "LRH", accentColor: "#059669", lightBg: "bg-emerald-50/60", border: "border-l-emerald-500" },
    { key: "ebarkia", label: "E-BARKIA", accentColor: "#d97706", lightBg: "bg-amber-50/60", border: "border-l-amber-500" },
];

const equalDist = () => {
    const arr = Array(12).fill(8.33);
    for (let i = 0; i < 4; i++) arr[i] = 8.34;
    return arr;
};

const emptyFluxPcts = () => Object.fromEntries(FLUX_CONFIG.map(f => [f.key, equalDist()]));

export default function SeasonalityModuleC({
    onSimulateAnnual,
    loading = false,
    intervenants = [],
    className = "",
}) {
    const [fluxPcts, setFluxPcts] = useState(emptyFluxPcts());
    const [openFlux, setOpenFlux] = useState({ amana: true, co: false, cr: false, lrh: false, ebarkia: false });
    const [selectedIntervenant, setSelectedIntervenant] = useState("all");
    const [results, setResults] = useState(null);
    const refChart = useEchartAutoResize();

    const totals = useMemo(() =>
        Object.fromEntries(FLUX_CONFIG.map(f => [
            f.key,
            Math.round(fluxPcts[f.key].reduce((s, v) => s + (parseFloat(v) || 0), 0) * 100) / 100
        ])), [fluxPcts]);

    const allValid = FLUX_CONFIG.every(f => Math.abs(totals[f.key] - 100) <= 0.01);

    const handleChange = (fluxKey, idx, value) => {
        const val = value.replace(",", ".");
        if (val === "" || /^-?\d*\.?\d*$/.test(val)) {
            setFluxPcts(prev => ({
                ...prev,
                [fluxKey]: prev[fluxKey].map((v, i) => i === idx ? val : v),
            }));
        }
    };

    const handleEqualDist = (e, fluxKey) => { e.stopPropagation(); setFluxPcts(prev => ({ ...prev, [fluxKey]: equalDist() })); };
    const handleClear = (e, fluxKey) => { e.stopPropagation(); setFluxPcts(prev => ({ ...prev, [fluxKey]: Array(12).fill("") })); };
    const toggleFlux = (fluxKey) => setOpenFlux(prev => ({ ...prev, [fluxKey]: !prev[fluxKey] }));

    const handleSimulate = async () => {
        if (!allValid) return;
        const parsed = Object.fromEntries(FLUX_CONFIG.map(f => [f.key, fluxPcts[f.key].map(v => parseFloat(v) || 0)]));
        const res = await onSimulateAnnual(parsed);
        setResults(res);
    };

    const chartOptions = useMemo(() => {
        if (!results) return null;
        const rawValues = results.months.map(m =>
            selectedIntervenant === "all" ? m.totalEtp : (m.intervenants[selectedIntervenant] || 0)
        );
        const avg = rawValues.reduce((a, b) => a + b, 0) / rawValues.length;
        const maxVal = Math.max(...rawValues);

        return {
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(255,255,255,0.97)",
                borderColor: "#e2e8f0",
                borderWidth: 1,
                borderRadius: 10,
                padding: [10, 14],
                textStyle: { color: "#1e293b", fontSize: 12 },
                extraCssText: "box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12);",
                formatter: (params) => {
                    const { name, value } = params[0];
                    return `<div style="font-weight:700;color:#005EA8;margin-bottom:4px">${name}</div>
                            <span style="font-size:16px;font-weight:900;color:#1e293b">${value}</span>
                            <span style="color:#94a3b8;font-size:11px"> ETP</span>`;
                }
            },
            grid: { left: "2%", right: "3%", bottom: "6%", top: "8%", containLabel: true },
            xAxis: {
                type: "category", data: MONTHS_LONG,
                axisLabel: { color: "#94a3b8", fontSize: 9, rotate: 35, interval: 0, fontWeight: 600 },
                axisLine: { lineStyle: { color: "#e2e8f0" } },
                axisTick: { show: false },
            },
            yAxis: {
                type: "value", name: "ETP",
                nameTextStyle: { color: "#94a3b8", fontSize: 10, fontWeight: 600 },
                axisLabel: { color: "#94a3b8", fontSize: 10 },
                splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9", width: 1.5 } },
                axisLine: { show: false },
                axisTick: { show: false },
                min: 0,
            },
            series: [{
                type: "bar",
                barWidth: "55%",
                data: rawValues.map(v => ({
                    value: Math.round(v),
                    itemStyle: {
                        color: {
                            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: Math.round(v) >= Math.round(maxVal) ? "#0050e0" : "#005EA8" },
                                { offset: 1, color: Math.round(v) >= Math.round(maxVal) ? "#00A3FF" : "#3b82f6" },
                            ],
                        },
                        borderRadius: [6, 6, 0, 0],
                        shadowColor: "rgba(0,94,168,0.25)",
                        shadowBlur: Math.round(v) >= Math.round(maxVal) ? 12 : 0,
                    },
                })),
                emphasis: { itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#0050e0" }, { offset: 1, color: "#38bdf8" }] } } },
                label: { show: false },
                markLine: {
                    silent: true, symbol: ["none", "none"],
                    data: [{
                        yAxis: Math.round(avg),
                        lineStyle: { color: "#f59e0b", type: "dashed", width: 1.5 },
                        label: {
                            formatter: `Moy. ${Math.round(avg)} ETP`,
                            color: "#f59e0b", fontWeight: "bold", fontSize: 10,
                            backgroundColor: "rgba(255,255,255,0.9)", padding: [3, 6], borderRadius: 4,
                            borderColor: "#fde68a", borderWidth: 1,
                        }
                    }]
                },
            }],
            animationDuration: 900,
            animationEasing: "cubicOut",
        };
    }, [results, selectedIntervenant]);

    return (
        <Card className={`overflow-hidden border-0 shadow-none bg-transparent ${className}`}>
            {/* ── Header ── */}
            <CardHeader className="relative overflow-hidden bg-gradient-to-r from-[#005EA8] to-[#0077cc] py-3.5 px-5 border-b-0">
                {/* Décoration de fond */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-white -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute left-1/3 bottom-0 w-24 h-24 rounded-full bg-white translate-y-1/2" />
                </div>
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <CalendarDays className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-black text-white tracking-tight">Saisonnalité par Prestation</CardTitle>
                            <p className="text-[10px] text-white/60 font-medium">Répartition mensuelle par prestation</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Badge validation global */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black backdrop-blur transition-all ${allValid ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30" : "bg-red-500/20 text-red-200 ring-1 ring-red-400/30"}`}>
                            {allValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {allValid ? "Tous valides" : "Totaux invalides"}
                        </div>
                        <Button
                            className={`h-9 gap-2 font-black text-xs uppercase tracking-wider px-5 mr-10 rounded-xl transition-all ${allValid
                                ? "bg-white text-[#005EA8] hover:bg-white/90 shadow-lg shadow-black/20"
                                : "bg-white/10 text-white/40 cursor-not-allowed"
                                }`}
                            disabled={!allValid || loading}
                            onClick={handleSimulate}
                        >
                            {loading ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            {loading ? "Calcul…" : "Simuler"}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-12">

                    {/* ── Gauche : Accordéon ── */}
                    <div className="lg:col-span-4 border-r border-slate-100 overflow-y-auto max-h-[75vh]">
                        {FLUX_CONFIG.map((f, fi) => {
                            const total = totals[f.key];
                            const valid = Math.abs(total - 100) <= 0.01;
                            const isOpen = openFlux[f.key];
                            const pct = Math.min(100, Math.max(0, total)); // clamp

                            return (
                                <div key={f.key} className={`border-b border-slate-100 last:border-b-0 ${isOpen ? "bg-slate-50/50" : "bg-white"} transition-colors`}>

                                    {/* Bouton d'en-tête */}
                                    <button
                                        type="button"
                                        onClick={() => toggleFlux(f.key)}
                                        className={`w-full flex items-center justify-between px-4 py-3 group border-l-[3px] transition-all ${isOpen ? `${f.border} bg-slate-50/60` : "border-l-transparent hover:border-l-slate-300"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Numéro flux */}
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${isOpen ? "text-white" : "bg-slate-100 text-slate-500"
                                                }`} style={isOpen ? { backgroundColor: f.accentColor } : {}}>
                                                {fi + 1}
                                            </span>
                                            <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isOpen ? "text-slate-800" : "text-slate-600 group-hover:text-slate-800"
                                                }`}>
                                                {f.label}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Mini barre de progression */}
                                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${pct}%`,
                                                        backgroundColor: valid ? "#10b981" : total > 100 ? "#ef4444" : "#f59e0b"
                                                    }}
                                                />
                                            </div>
                                            {/* Badge total */}
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[9px] transition-all ${valid ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                                }`}>
                                                {valid ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                                                {total}%
                                            </span>
                                            {/* Chevron */}
                                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#005EA8]" : ""}`} />
                                        </div>
                                    </button>

                                    {/* Contenu déplié */}
                                    {isOpen && (
                                        <div className={`px-4 pb-4 pt-2 ${f.lightBg} border-l-[3px] ${f.border}`}>
                                            {/* Actions */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleEqualDist(e, f.key)}
                                                    className="flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-[#005EA8] uppercase tracking-wide transition-colors"
                                                >
                                                    <RefreshCcw className="w-3 h-3" /> Répart. égale
                                                </button>
                                                <span className="w-px h-3 bg-slate-300" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleClear(e, f.key)}
                                                    className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-wide transition-colors"
                                                >
                                                    <Eraser className="w-3 h-3" /> Vider
                                                </button>
                                            </div>

                                            {/* Grille 6×2 */}
                                            <div className="grid grid-cols-6 gap-x-1.5 gap-y-2">
                                                {MONTHS_SHORT.map((month, idx) => (
                                                    <div key={month}>
                                                        <p className="text-[8px] font-bold text-slate-400 text-center mb-1 uppercase">{month}</p>
                                                        <div className="relative">
                                                            <Input
                                                                value={fluxPcts[f.key][idx]}
                                                                onChange={e => handleChange(f.key, idx, e.target.value)}
                                                                placeholder="0"
                                                                disabled={loading}
                                                                className={`h-7 text-[10px] px-1 pr-3.5 text-center font-bold bg-white rounded-lg w-full transition-all
                                                                    border-slate-200 focus:border-2 focus:ring-0
                                                                    placeholder:text-slate-300`}
                                                                style={{ "--input-focus-border": f.accentColor }}
                                                                onFocus={e => e.target.style.borderColor = f.accentColor}
                                                                onBlur={e => e.target.style.borderColor = ""}
                                                            />
                                                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] text-slate-300 font-bold pointer-events-none">%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Droite : Graphe + KPIs ── */}
                    <div className="lg:col-span-8 p-5 flex flex-col gap-4 min-h-[420px] overflow-y-auto max-h-[75vh]">

                        {/* Top bar graphe */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-fuchsia-50 flex items-center justify-center">
                                    <BarChart3 className="w-4 h-4 text-fuchsia-500" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Évolution des Effectifs</p>
                                    {results && <p className="text-[9px] text-slate-400">Résultats mensuels projetés</p>}
                                </div>
                            </div>
                            {results && (
                                <select
                                    className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005EA8]/20 cursor-pointer shadow-sm hover:border-[#005EA8]/30 transition-colors"
                                    value={selectedIntervenant}
                                    onChange={e => setSelectedIntervenant(e.target.value)}
                                >
                                    <option value="all">Tout le centre</option>
                                    {intervenants.map(it => (
                                        <option key={it.id} value={it.label}>{it.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Zone graphe */}
                        <div className="flex-1 w-full rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden relative min-h-[200px]">
                            {!results ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                    <div className="relative mb-5">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center shadow-inner">
                                            <TrendingUp className="w-9 h-9 text-slate-300" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#005EA8]/10 flex items-center justify-center">
                                            <Play className="w-3 h-3 text-[#005EA8] fill-current" />
                                        </div>
                                    </div>
                                    <p className="font-black text-xs uppercase tracking-widest text-slate-500 mb-1">Aucune simulation lancée</p>
                                    <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                                        Configurez les taux mensuels par prestation et cliquez sur Simuler.
                                    </p>
                                </div>
                            ) : (
                                <ReactECharts
                                    ref={refChart}
                                    option={chartOptions}
                                    notMerge={true}
                                    lazyUpdate={false}
                                    style={{ height: "100%", width: "100%", minHeight: "200px" }}
                                />
                            )}
                        </div>

                        {/* KPI Cards */}
                        {results && (() => {
                            const vals = results.months.map(m =>
                                selectedIntervenant === "all" ? m.totalEtp : (m.intervenants[selectedIntervenant] || 0)
                            );
                            const maxV = Math.max(...vals), minV = Math.min(...vals);
                            const peakIdx = vals.indexOf(maxV), lowIdx = vals.indexOf(minV);
                            const isAll = selectedIntervenant === "all";
                            const avgVal = Math.round(vals.reduce((a, b) => a + b, 0) / 12);
                            const annualVal = isAll
                                ? (results.annualEtp ?? avgVal)
                                : avgVal;

                            return (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                                    {[
                                        {
                                            label: isAll ? "Moyenne Annuelle" : `Moy. ${selectedIntervenant}`,
                                            value: annualVal, unit: "ETP",
                                            sub: "Simulation de référence",
                                            bg: "bg-blue-50",
                                            border: "border-t-[3px] border-t-[#005EA8]",
                                            valueColor: "text-[#005EA8]",
                                            labelColor: "text-[#005EA8]",
                                            subColor: "text-blue-400",
                                        },
                                        {
                                            label: "Pic d'activité",
                                            value: Math.round(maxV), unit: "ETP",
                                            sub: MONTHS_LONG[peakIdx],
                                            bg: "bg-sky-50",
                                            border: "border-t-[3px] border-t-sky-400",
                                            valueColor: "text-sky-600",
                                            labelColor: "text-sky-600",
                                            subColor: "text-sky-400",
                                        },
                                        {
                                            label: "Activité minimale",
                                            value: Math.round(minV), unit: "ETP",
                                            sub: MONTHS_LONG[lowIdx],
                                            bg: "bg-emerald-50",
                                            border: "border-t-[3px] border-t-emerald-400",
                                            valueColor: "text-emerald-600",
                                            labelColor: "text-emerald-600",
                                            subColor: "text-emerald-400",
                                        },
                                        {
                                            label: "Amplitude",
                                            value: Math.round(maxV - minV), unit: "ETP",
                                            sub: "Max − Min",
                                            bg: "bg-slate-50",
                                            border: "border-t-[3px] border-t-slate-400",
                                            valueColor: "text-slate-700",
                                            labelColor: "text-slate-500",
                                            subColor: "text-slate-400",
                                        },
                                    ].map(({ label, value, unit, sub, bg, border, valueColor, labelColor, subColor }) => (
                                        <div
                                            key={label}
                                            className={`relative overflow-hidden rounded-xl ${bg} ${border} border border-slate-100 p-3.5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-default`}
                                        >
                                            <p className={`text-[8px] font-black uppercase tracking-widest mb-1.5 ${labelColor}`}>{label}</p>
                                            <p className={`text-2xl font-black ${valueColor} leading-none`}>
                                                {value}
                                                <span className="text-sm font-bold ml-1 opacity-60">{unit}</span>
                                            </p>
                                            <p className={`text-[9px] mt-1.5 font-semibold ${subColor}`}>{sub}</p>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
