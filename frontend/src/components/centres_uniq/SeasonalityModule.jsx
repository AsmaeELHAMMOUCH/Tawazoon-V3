"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Calendar,
    TrendingUp,
    Users,
    RefreshCcw,
    Play,
    AlertCircle,
    CheckCircle2,
    CalendarDays,
    Eraser
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import useEchartAutoResize from "@/components/hooks/useEchartAutoResize";

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const INITIAL_PCTS = Array(12).fill(8.33);

export default function SeasonalityModule({
    onSimulateAnnual,
    loading = false,
    intervenants = [],
    className = ""
}) {
    const [pcts, setPcts] = useState(INITIAL_PCTS);
    const [selectedIntervenant, setSelectedIntervenant] = useState("all");
    const [results, setResults] = useState(null);
    const refChart = useEchartAutoResize();

    const totalPct = useMemo(() => {
        const sum = pcts.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        return Math.round(sum * 100) / 100;
    }, [pcts]);

    const isValid = Math.abs(totalPct - 100) < 0.1;

    const handlePctChange = (index, value) => {
        const newPcts = [...pcts];
        const val = value.replace(',', '.');
        if (val === "" || /^\d*\.?\d*$/.test(val)) {
            newPcts[index] = val;
            setPcts(newPcts);
        }
    };

    const handleEqualDistribution = () => {
        setPcts(Array(12).fill(8.33));
    };

    const handleClear = () => {
        setPcts(Array(12).fill(""));
    };

    const handleSimulate = async () => {
        if (!isValid) return;
        const finalPcts = pcts.map(p => parseFloat(p) || 0);
        const annualResults = await onSimulateAnnual(finalPcts);
        setResults(annualResults);
    };

    const chartOptions = useMemo(() => {
        if (!results) return null;

        const data = results.months.map(m => {
            const val = selectedIntervenant === "all" ? m.totalEtp : (m.intervenants[selectedIntervenant] || 0);
            return Math.round(val);
        });
        const average = data.length > 0 ? (data.reduce((a, b) => a + b, 0) / data.length) : 0;

        return {
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 8,
                padding: [10, 15],
                textStyle: { color: '#1e293b', fontSize: 12 },
                extraCssText: 'box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: true, // Better for bars
                data: MONTHS,
                axisLabel: {
                    color: '#64748b',
                    fontSize: 10, // Slightly smaller to fit all
                    interval: 0,    // Force show all labels
                    rotate: 45
                },
                axisLine: { lineStyle: { color: '#e2e8f0' } }
            },
            yAxis: {
                type: 'value',
                name: 'Effectif (ETP)',
                nameTextStyle: { color: '#64748b', fontSize: 11 },
                axisLabel: { color: '#64748b', fontSize: 11 },
                splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
                scale: true, // Adapt to data range
                min: (value) => Math.max(0, Math.floor(value.min * 0.9)) // Dynamic min with padding, rarely 0 unless data is 0
            },
            series: [
                {
                    name: selectedIntervenant === "all" ? 'Total Centre' : selectedIntervenant,
                    type: 'bar',
                    barWidth: '60%',
                    data: data,
                    itemStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: '#005EA8' },
                                { offset: 1, color: '#00A3FF' }
                            ]
                        },
                        borderRadius: [6, 6, 0, 0]
                    },
                    emphasis: {
                        itemStyle: {
                            color: '#004E8A'
                        }
                    },
                    markLine: {
                        silent: true,
                        symbol: ['none', 'none'],
                        data: [
                            {
                                yAxis: Math.round(average),
                                label: {
                                    formatter: `Target: ${Math.round(average)} ETP`,
                                    position: 'end',
                                    color: '#ef4444',
                                    fontWeight: 'bold',
                                    fontSize: 10,
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    padding: [2, 4],
                                    borderRadius: 4
                                },
                                lineStyle: {
                                    color: '#ef4444',
                                    type: 'dashed',
                                    width: 2
                                }
                            }
                        ]
                    }
                }
            ],
            animationDuration: 1000
        };
    }, [results, selectedIntervenant]);

    return (
        <Card className={`overflow-hidden border-slate-200/60 shadow-xl bg-white/80 backdrop-blur-md ${className}`}>
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-[#005EA8]" />
                        <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-tight">Saisonnalité des Volumes</CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${isValid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                            }`}>
                            {isValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            Total: {totalPct}%
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-full"
                            title="Vider les champs"
                        >
                            <Eraser className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEqualDistribution}
                            className="h-8 text-[11px] gap-1.5 border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                            <RefreshCcw className="w-3.5 h-3.5" />
                            Distrib. Égale
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-x divide-slate-100">
                    {/* Colonne de Saisie (Gauche) */}
                    <div className="lg:col-span-3 p-4 bg-slate-50/30">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5" /> Répartition Mensuelle
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            {MONTHS.map((month, idx) => (
                                <div key={month} className="space-y-1">
                                    <Label className="text-[10px] text-slate-600 font-medium pl-0.5">{month}</Label>
                                    <div className="relative">
                                        <Input
                                            value={pcts[idx]}
                                            onChange={(e) => handlePctChange(idx, e.target.value)}
                                            className={`h-8 text-xs pr-6 font-semibold focus-visible:ring-[#005EA8] border-slate-200 ${!isValid ? 'border-red-200 focus-visible:ring-red-500' : ''
                                                }`}
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            className={`w-full mt-6 h-10 gap-2 font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${isValid
                                ? 'bg-[#005EA8] hover:bg-[#004E8A] text-white shadow-blue-100'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                }`}
                            disabled={!isValid || loading}
                            onClick={handleSimulate}
                        >
                            {loading ? (
                                <RefreshCcw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4 fill-current" />
                            )}
                            {loading ? "Calcul en cours..." : "Simuler l'Année"}
                        </Button>
                    </div>

                    {/* Colonne Graphique (Droite) */}
                    <div className="lg:col-span-9 p-4 flex flex-col min-h-[400px]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-fuchsia-600" />
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Évolution des Effectifs</span>
                            </div>

                            {results && (
                                <div className="flex items-center gap-2">
                                    <Label className="text-[10px] text-slate-400 font-bold uppercase">Filtre:</Label>
                                    <select
                                        className="text-xs font-semibold py-1 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                                        value={selectedIntervenant}
                                        onChange={(e) => setSelectedIntervenant(e.target.value)}
                                    >
                                        <option value="all">Tout le centre</option>
                                        {intervenants.map(it => (
                                            <option key={it.id} value={it.label}>{it.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 w-full bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden relative">
                            {!results ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                        <TrendingUp className="w-8 h-8 opacity-20" />
                                    </div>
                                    <p className="font-bold text-xs uppercase tracking-widest mb-1">Aucune simulation annuelle</p>
                                    <p className="text-[10px] max-w-[240px]">Configurez la répartition mensuelle et lancez la simulation pour visualiser les résultats.</p>
                                </div>
                            ) : (
                                <ReactECharts
                                    ref={refChart}
                                    option={chartOptions}
                                    style={{ height: '100%', width: '100%' }}
                                    notMerge={true}
                                />
                            )}
                        </div>

                        {results && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {/* Moyenne Annuelle - Blue Theme */}
                                <div className="relative overflow-hidden rounded-xl border border-white/50 bg-white/60 backdrop-blur-md p-3 ring-1 ring-blue-300/50 shadow-sm transition-all hover:scale-[1.02]">
                                    <div className="absolute -right-8 -top-8 h-16 w-16 rounded-full blur-2xl bg-blue-400/20" />
                                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Moyenne Annuelle</p>
                                    <p className="text-xl font-black text-[#005EA8]">
                                        {Math.round(results.months.reduce((acc, m) => acc + (selectedIntervenant === "all" ? m.totalEtp : (m.intervenants[selectedIntervenant] || 0)), 0) / 12)} <span className="text-xs font-medium">ETP</span>
                                    </p>
                                </div>

                                {/* Pic d'Activité - Blue/Cyan Theme */}
                                <div className="relative overflow-hidden rounded-xl border border-white/50 bg-white/60 backdrop-blur-md p-3 ring-1 ring-cyan-300/50 shadow-sm transition-all hover:scale-[1.02]">
                                    <div className="absolute -right-8 -top-8 h-16 w-16 rounded-full blur-2xl bg-cyan-400/20" />
                                    <p className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest mb-1">Pic d'Activité</p>
                                    <p className="text-xl font-black text-cyan-700">
                                        {Math.round(Math.max(...results.months.map(m => selectedIntervenant === "all" ? m.totalEtp : (m.intervenants[selectedIntervenant] || 0))))} <span className="text-xs font-medium">ETP</span>
                                    </p>
                                </div>

                                {/* Mois du Pic - Slate Theme */}
                                <div className="relative overflow-hidden rounded-xl border border-white/50 bg-white/60 backdrop-blur-md p-3 ring-1 ring-slate-300/60 shadow-sm transition-all hover:scale-[1.02]">
                                    <div className="absolute -right-8 -top-8 h-16 w-16 rounded-full blur-2xl bg-slate-400/10" />
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Mois du Pic</p>
                                    <p className="text-xl font-black text-slate-700">
                                        {(() => {
                                            const data = results.months.map(m => selectedIntervenant === "all" ? m.totalEtp : (m.intervenants[selectedIntervenant] || 0));
                                            const peakIdx = data.indexOf(Math.max(...data));
                                            return MONTHS[peakIdx];
                                        })()}
                                    </p>
                                </div>

                                {/* Activité Minimale - Emerald/Sky Theme */}
                                <div className="relative overflow-hidden rounded-xl border border-white/50 bg-white/60 backdrop-blur-md p-3 ring-1 ring-emerald-300/40 shadow-sm transition-all hover:scale-[1.02]">
                                    <div className="absolute -right-8 -top-8 h-16 w-16 rounded-full blur-2xl bg-emerald-400/15" />
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Activité Minimale</p>
                                    <p className="text-xl font-black text-emerald-700">
                                        {Math.round(Math.min(...results.months.map(m => selectedIntervenant === "all" ? m.totalEtp : (m.intervenants[selectedIntervenant] || 0))))} <span className="text-xs font-medium">ETP</span>
                                    </p>
                                </div>

                                {/* Mois le plus bas - Slate Theme */}
                                <div className="relative overflow-hidden rounded-xl border border-white/50 bg-white/60 backdrop-blur-md p-3 ring-1 ring-slate-300/60 shadow-sm transition-all hover:scale-[1.02]">
                                    <div className="absolute -right-8 -top-8 h-16 w-16 rounded-full blur-2xl bg-slate-400/10" />
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Mois le plus bas</p>
                                    <p className="text-xl font-black text-slate-700">
                                        {(() => {
                                            const data = results.months.map(m => selectedIntervenant === "all" ? m.totalEtp : (m.intervenants[selectedIntervenant] || 0));
                                            const lowIdx = data.indexOf(Math.min(...data));
                                            return MONTHS[lowIdx];
                                        })()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
