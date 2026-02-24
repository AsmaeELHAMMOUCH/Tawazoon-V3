"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    LineChart as LineChartIcon,
    TrendingUp,
    Play,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Package,
    Users,
    RefreshCcw,
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import useEchartAutoResize from "@/components/hooks/useEchartAutoResize";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

// ─── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Math.round(n).toLocaleString("fr-FR");

function flattenGridValues(gridValues) {
    if (!gridValues || typeof gridValues !== "object") return [];
    const entries = [];
    Object.entries(gridValues).forEach(([flux, products]) => {
        if (typeof products !== "object" || products === null) return;
        Object.entries(products).forEach(([produit, val]) => {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0) {
                entries.push({ label: `${flux} – ${produit}`, value: num });
            }
        });
    });
    return entries.sort((a, b) => b.value - a.value);
}

// ─── component ─────────────────────────────────────────────────────────────────
export default function ForecastingModule({
    initialFte = 0,
    initialLoad = 0,
    gridValues = null,
    postes = [],
    tasks = [],
    wizardData = null,
    className = "",
}) {
    const currentYear = new Date().getFullYear();
    const [growthRates, setGrowthRates] = useState([0, 0, 0, 0]);
    const [calculatedData, setCalculatedData] = useState(null);
    const [selectedPoste, setSelectedPoste] = useState("all");
    const [loading, setLoading] = useState(false);
    const refChart = useEchartAutoResize();

    // Base products labels for the table (calculated from Year N)
    const productLabels = useMemo(() => {
        const flattened = flattenGridValues(gridValues);
        return flattened.map(v => v.label);
    }, [gridValues]);

    const hasVolumes = productLabels.length > 0;

    // Reset results when selection changes (since selection is frontend only for now)
    // Actually, if the backend returns the full simulation, we might need to filter tasks for the selected poste too.
    // However, the user asked for the "calculation" (volume growth + simulation) at the backend.
    useEffect(() => {
        if (calculatedData) {
            // Keep it for now, user might want to re-run if selection changes
        }
    }, [selectedPoste]);

    const handleRateChange = (index, value) => {
        const newRates = [...growthRates];
        const val = value.replace(",", ".");
        if (val === "" || val === "-" || /^-?\d*\.?\d*$/.test(val)) {
            newRates[index] = val;
            setGrowthRates(newRates);
        }
    };

    const handleCalculate = async () => {
        if (!wizardData?.centre) {
            toast.error("Données du centre manquantes");
            return;
        }

        setLoading(true);
        try {
            const parsedRates = growthRates.map((r) => parseFloat(r) || 0);

            const payload = {
                centre_id: wizardData.centre,
                grid_values: wizardData.gridValues,
                parameters: {
                    productivite: wizardData.productivite,
                    idle_minutes: wizardData.idleMinutes,
                    shift: wizardData.shift,
                    nature_geo: wizardData.natureGeo,
                    taux_complexite: wizardData.tauxComplexite,
                    duree_trajet: wizardData.dureeTrajet,
                    pct_axes_arrivee: wizardData.pctAxesArrivee,
                    pct_axes_depart: wizardData.pctAxesDepart,
                    pct_national: wizardData.pctNational,
                    pct_international: wizardData.pctInternational,
                    pct_collecte: wizardData.pctCollecte,
                    pct_retour: wizardData.pctRetour,
                    pct_marche_ordinaire: wizardData.pctMarcheOrdinaire,
                    colis_amana_par_canva_sac: wizardData.colisAmanaParCanvaSac,
                    nbr_co_sac: wizardData.nbrCoSac,
                    nbr_cr_sac: wizardData.nbrCrSac,
                    cr_par_caisson: wizardData.crParCaisson,
                    ed_percent: wizardData.edPercent,

                    // Individual flux overrides
                    amana_pct_collecte: wizardData.amana_pct_collecte,
                    amana_pct_retour: wizardData.amana_pct_retour,
                    amana_pct_axes_arrivee: wizardData.amana_pct_axes_arrivee,
                    amana_pct_axes_depart: wizardData.amana_pct_axes_depart,
                    amana_pct_national: wizardData.amana_pct_national,
                    amana_pct_international: wizardData.amana_pct_international,
                    amana_pct_marche_ordinaire: wizardData.amana_pct_marche_ordinaire,
                    amana_pct_crbt: wizardData.amana_pct_crbt,
                    amana_pct_hors_crbt: wizardData.amana_pct_hors_crbt,
                    co_pct_collecte: wizardData.co_pct_collecte,
                    co_pct_retour: wizardData.co_pct_retour,
                    co_pct_axes_arrivee: wizardData.co_pct_axes_arrivee,
                    co_pct_axes_depart: wizardData.co_pct_axes_depart,
                    co_pct_national: wizardData.co_pct_national,
                    co_pct_international: wizardData.co_pct_international,
                    cr_pct_collecte: wizardData.cr_pct_collecte,
                    cr_pct_retour: wizardData.cr_pct_retour,
                    cr_pct_axes_arrivee: wizardData.cr_pct_axes_arrivee,
                    cr_pct_axes_depart: wizardData.cr_pct_axes_depart,
                    cr_pct_national: wizardData.cr_pct_national,
                    cr_pct_international: wizardData.cr_pct_international
                },
                growth_rates: parsedRates
            };

            const response = await api.bandoengForecast(payload);

            // Map labels and years correctly
            const mapped = response.forecast.map((step, idx) => {
                const yearLabel = idx === 0 ? currentYear : currentYear + idx;

                // Flatten volumes for each year
                const flattenedVol = flattenGridValues(step.grid_values);

                return {
                    year: yearLabel,
                    fte: step.fte,
                    load: step.load,
                    growth: step.growth,
                    volumes: flattenedVol
                };
            });

            setCalculatedData(mapped);
            toast.success("Prévisions calculées avec succès");
        } catch (error) {
            console.error("Forecast error:", error);
            toast.error("Erreur lors du calcul des prévisions");
        } finally {
            setLoading(false);
        }
    };

    const chartOptions = useMemo(() => {
        if (!calculatedData) return null;
        const years = calculatedData.map((d) => d.year.toString());
        const fteData = calculatedData.map((d) => Math.round(d.fte * 100) / 100);
        const loadData = calculatedData.map((d) => Math.round(d.load * 100) / 100);

        return {
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(255,255,255,0.95)",
                borderRadius: 8,
                padding: [10, 15],
                textStyle: { color: "#1e293b", fontSize: 12 },
                extraCssText: "box-shadow:0 10px 15px -3px rgba(0,0,0,.1);",
            },
            legend: {
                data: ["ETP Final", "Charge (h/j)"],
                bottom: 0,
                textStyle: { color: "#64748b", fontSize: 11 },
            },
            grid: { left: "3%", right: "4%", bottom: "15%", top: "15%", containLabel: true },
            xAxis: {
                type: "category",
                data: years,
                axisLabel: { color: "#64748b", fontSize: 11 },
                axisLine: { lineStyle: { color: "#e2e8f0" } },
            },
            yAxis: [
                {
                    type: "value",
                    name: "ETP",
                    nameTextStyle: { color: "#64748b", fontSize: 11 },
                    axisLabel: { color: "#64748b", fontSize: 11 },
                    splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
                },
                {
                    type: "value",
                    name: "Heures",
                    nameTextStyle: { color: "#64748b", fontSize: 11 },
                    axisLabel: { color: "#64748b", fontSize: 11 },
                    splitLine: { show: false },
                },
            ],
            series: [
                {
                    name: "ETP Final",
                    type: "line",
                    smooth: true,
                    data: fteData,
                    itemStyle: { color: "#005EA8" },
                    lineStyle: { width: 3 },
                    areaStyle: {
                        color: {
                            type: "linear",
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: "rgba(0,94,168,0.2)" },
                                { offset: 1, color: "rgba(0,94,168,0)" },
                            ],
                        },
                    },
                    symbolSize: 8,
                    emphasis: { scale: 1.5 },
                },
                {
                    name: "Charge (h/j)",
                    type: "bar",
                    yAxisIndex: 1,
                    data: loadData,
                    barWidth: "30%",
                    itemStyle: { color: "rgba(100,116,139,0.2)", borderRadius: [4, 4, 0, 0] },
                },
            ],
        };
    }, [calculatedData]);

    return (
        <Card className={`overflow-hidden border-slate-200/60 shadow-xl bg-white/80 backdrop-blur-md ${className}`}>
            {/* Header */}
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#005EA8]" />
                        <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                            Prévision {currentYear}–{currentYear + 4}
                        </CardTitle>
                    </div>

                    {/* Filtre intervenant (Frontend only context for now) */}
                    {postes.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                Intervenant (Visuel uniquement)
                            </Label>
                            <Select value={selectedPoste} onValueChange={setSelectedPoste}>
                                <SelectTrigger className="h-7 text-xs bg-white border-slate-200 min-w-[180px] max-w-xs">
                                    <SelectValue placeholder="Tous" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">— Tous les intervenants —</SelectItem>
                                    {postes.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.label || p.nom}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 mt-1">
                    <span className="text-[10px] text-slate-500 italic">
                        Base {currentYear} — ETP : <strong>{Math.round(initialFte * 100) / 100}</strong>
                        {" · "}Charge : <strong>{Math.round(initialLoad * 100) / 100} h/j</strong>
                    </span>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-x divide-slate-100">
                    {/* ── Left: taux ── */}
                    <div className="lg:col-span-4 p-4 bg-slate-50/30 flex flex-col gap-6">
                        <div>
                            <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-wider flex items-center gap-2">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                Croissance Volume Annuelle
                            </h4>

                            <div className="flex items-center justify-between gap-4 mb-3 p-2 bg-white rounded-lg border border-slate-200">
                                <Label className="text-xs text-slate-500 font-semibold whitespace-nowrap italic">
                                    Année {currentYear} (Base)
                                </Label>
                                <span className="text-xs font-bold text-slate-400 w-24 text-right pr-6">—</span>
                            </div>

                            <div className="space-y-3">
                                {[1, 2, 3, 4].map((offset) => (
                                    <div key={offset} className="flex items-center justify-between gap-4">
                                        <Label className="text-xs text-slate-600 font-semibold whitespace-nowrap">
                                            N+{offset} ({currentYear + offset})
                                        </Label>
                                        <div className="relative w-24">
                                            <Input
                                                value={growthRates[offset - 1]}
                                                onChange={(e) => handleRateChange(offset - 1, e.target.value)}
                                                placeholder="0.0"
                                                className="h-8 text-xs pr-6 font-bold text-right border-slate-200"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button
                            className="w-full h-10 gap-2 font-bold text-xs uppercase tracking-wider bg-[#005EA8] hover:bg-[#004E8A] text-white shadow-lg shadow-blue-100"
                            onClick={handleCalculate}
                            disabled={loading}
                        >
                            {loading ? (
                                <RefreshCcw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4 fill-current" />
                            )}
                            {loading ? "Calcul en cours..." : "Calculer Projections"}
                        </Button>

                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                            <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                * Simulation complète effectuée par le serveur pour chaque année
                                en appliquant la croissance composée sur tous les types de volumes.
                            </p>
                        </div>
                    </div>

                    {/* ── Right: results ── */}
                    <div className="lg:col-span-8 p-4 flex flex-col gap-4 min-h-[450px] overflow-y-auto">
                        {!calculatedData ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <LineChartIcon className="w-12 h-12 mb-3" />
                                <p className="text-xs font-bold uppercase tracking-widest">En attente de calcul</p>
                            </div>
                        ) : (
                            <>
                                {/* ETP cards */}
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ETP Final projeté (Simulé)</p>
                                    <div className="grid grid-cols-5 gap-2">
                                        {calculatedData.map((d, i) => (
                                            <div
                                                key={i}
                                                className={`p-2 rounded-xl border text-center ${i === 0 ? "bg-slate-50 border-slate-200" : "bg-white border-blue-100 shadow-sm"
                                                    }`}
                                            >
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{d.year}</p>
                                                <p className="text-sm font-black text-slate-800">
                                                    {(Math.round(d.fte * 100) / 100).toLocaleString("fr-FR")}
                                                </p>
                                                <div className="flex items-center justify-center gap-0.5">
                                                    {i === 0 ? (
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Base</span>
                                                    ) : (
                                                        <span className={`text-[9px] font-bold flex items-center ${d.growth > 0 ? "text-emerald-600" : d.growth < 0 ? "text-rose-600" : "text-slate-400"}`}>
                                                            {d.growth > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : d.growth < 0 ? <ArrowDownRight className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                                                            {Math.abs(d.growth)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="w-full bg-white rounded-xl border border-slate-100 overflow-hidden" style={{ height: 200 }}>
                                    <ReactECharts ref={refChart} option={chartOptions} style={{ height: "100%", width: "100%" }} />
                                </div>

                                {/* Volume table */}
                                {hasVolumes && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5" />
                                            Volumes projetés simulés
                                        </p>
                                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                                            <table className="w-full text-[10px]">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        <th className="text-left px-3 py-2 font-bold text-slate-600 min-w-[160px]">Produit</th>
                                                        {calculatedData.map((d) => (
                                                            <th key={d.year} className="text-right px-3 py-2 font-bold text-slate-600 whitespace-nowrap">
                                                                {d.year}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {productLabels.map((label, ri) => (
                                                        <tr key={label} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                                                            <td className="px-3 py-2 font-medium text-slate-700 truncate max-w-[180px]">{label}</td>
                                                            {calculatedData.map((d) => {
                                                                const vol = d.volumes.find(v => v.label === label);
                                                                return (
                                                                    <td key={d.year} className={`px-3 py-2 text-right ${d.year === currentYear ? "text-slate-500 font-medium" : "text-slate-800 font-bold"}`}>
                                                                        {fmt(vol?.value ?? 0)}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-blue-50/60 border-t-2 border-blue-200">
                                                        <td className="px-3 py-2 text-[#005EA8] font-extrabold">TOTAL</td>
                                                        {calculatedData.map((d) => (
                                                            <td key={d.year} className="px-3 py-2 text-right text-[#005EA8] font-extrabold">
                                                                {fmt(d.volumes.reduce((s, v) => s + (v?.value ?? 0), 0))}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
