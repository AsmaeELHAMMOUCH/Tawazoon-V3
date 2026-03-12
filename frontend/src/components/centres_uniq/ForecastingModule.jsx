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
    RefreshCw,
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import useEchartAutoResize from "@/components/hooks/useEchartAutoResize";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";

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
    parameters = {}, // Ajouté pour passer les params au backend
    centreId = 1942, // Défaut Bandoeng
    initialPosteId = "all", // Ajouté pour synchroniser avec le wizard
    postes = [],
    tasks = [],
    className = "",
}) {
    const currentYear = 2025; // Fixé par l'utilisateur comme base
    const FLUX_CONFIG = [
        { key: "amana", label: "AMANA" },
        { key: "co", label: "CO" },
        { key: "cr", label: "CR" },
        { key: "lrh", label: "LRH" },
        { key: "ebarkia", label: "E-BARKIA" },
    ];
    const emptyRates = () => ({ amana: [0, 0, 0, 0, 0], co: [0, 0, 0, 0, 0], cr: [0, 0, 0, 0, 0], lrh: [0, 0, 0, 0, 0], ebarkia: [0, 0, 0, 0, 0] });
    const [growthRates, setGrowthRates] = useState(emptyRates());
    const [calculatedData, setCalculatedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedPoste, setSelectedPoste] = useState(initialPosteId || "all");
    const refChart = useEchartAutoResize();

    const baseVolumes = useMemo(() => flattenGridValues(gridValues), [gridValues]);
    const hasVolumes = baseVolumes.length > 0;

    // Compute base ETP/Load for selected intervenant
    const { baseEtp, baseLoad } = useMemo(() => {
        if (selectedPoste === "all" || !selectedPoste) {
            return { baseEtp: initialFte, baseLoad: initialLoad };
        }
        const poste = postes.find((p) => String(p.id) === selectedPoste);
        if (!poste) return { baseEtp: initialFte, baseLoad: initialLoad };

        const label = (poste.label || poste.nom || "").trim().toUpperCase();
        const filtered = tasks.filter(
            (t) => (t.responsable || "").trim().toUpperCase() === label
        );
        const load = filtered.reduce((s, t) => s + (t.heures_calculees || 0), 0);
        // ETP from ressources_par_poste is not available here; derive from load / heuresNet (7.33h)
        const etp = load > 0 ? load / 8 : 0;
        return { baseEtp: etp, baseLoad: load };
    }, [selectedPoste, postes, tasks, initialFte, initialLoad]);

    // Reset results when selection changes
    useEffect(() => {
        setCalculatedData(null);
    }, [selectedPoste]);

    const handleRateChange = (fluxKey, index, value) => {
        const val = value.replace(",", ".");
        if (val === "" || val === "-" || /^-?\d*\.?\d*$/.test(val)) {
            setGrowthRates(prev => ({ ...prev, [fluxKey]: prev[fluxKey].map((v, i) => i === index ? val : v) }));
        }
    };

    // Remplit toute une ligne avec la valeur du premier champ
    const applyRowToAll = (fluxKey) => {
        setGrowthRates(prev => {
            const first = parseFloat(prev[fluxKey][0]) || 0;
            return { ...prev, [fluxKey]: [first, first, first, first, first] };
        });
    };

    const handleCalculate = async () => {
        setLoading(true);
        const parsedRates = Object.fromEntries(
            Object.entries(growthRates).map(([k, arr]) => [k, arr.map(r => parseFloat(r) || 0)])
        );
        // Taux global fallback = moyenne des flux principaux
        const globalRates = [0, 1, 2, 3, 4].map(i =>
            Math.round(((parsedRates.amana[i] + parsedRates.co[i] + parsedRates.cr[i]) / 3) * 100) / 100
        );

        try {
            const results = [
                {
                    year: currentYear,
                    fte: baseEtp,
                    load: baseLoad,
                    growth: 0,
                    volumes: baseVolumes.map((v) => ({ ...v })),
                },
            ];

            let currentGrid = null;
            try {
                if (!gridValues) {
                    throw new Error("Volumes non initialisés (gridValues is null)");
                }
                currentGrid = JSON.parse(JSON.stringify(gridValues));
            } catch (err) {
                console.error("Forecasting handleCalculate init error:", err, "Prop gridValues:", gridValues);
                toast.error("Données de volumes invalides ou manquantes.");
                setLoading(false);
                return;
            }

            // Boucle de 5 ans (2026 à 2030)
            for (let i = 0; i < 5; i++) {
                const year = currentYear + i + 1;
                const rate = globalRates[i];

                const payload = {
                    centre_id: centreId,
                    poste_code: selectedPoste === "all" ? null : (postes.find(p => String(p.id) === selectedPoste)?.code || null),
                    grid_values: currentGrid,
                    parameters: {
                        productivite: parameters.productivite,
                        idle_minutes: parameters.idleMinutes || parameters.idle_minutes,
                        shift: parameters.shift,
                        coeff_geo: parameters.natureGeo || parameters.nature_geo || parameters.coeff_geo,
                        coeff_circ: parameters.tauxComplexite || parameters.taux_complexite || parameters.coeff_circ,
                        duree_trajet: parameters.dureeTrajet || parameters.duree_trajet,
                        pct_axes: parameters.pctAxesArrivee || parameters.pct_axes,
                        pct_local: parameters.pctAxesDepart || parameters.pct_local,
                        pct_national: parameters.pctNational || parameters.pct_national,
                        pct_international: parameters.pctInternational || parameters.pct_international,
                        pct_collecte: parameters.pctCollecte || parameters.pct_collecte,
                        pct_retour: parameters.pctRetour || parameters.pct_retour,
                        pct_marche_ordinaire: parameters.pctMarcheOrdinaire || parameters.pct_marche_ordinaire,
                        colis_amana_par_canva_sac: parameters.colisAmanaParCanvaSac || parameters.colis_amana_par_canva_sac,
                        nbr_co_sac: parameters.nbrCoSac || parameters.nbr_co_sac,
                        nbr_cr_sac: parameters.nbrCrSac || parameters.nbr_cr_sac,
                        cr_par_caisson: parameters.crParCaisson || parameters.cr_par_caisson,
                        ed_percent: parameters.edPercent || parameters.ed_percent || parameters.pct_sac,
                        has_guichet: (parameters.hasGuichet !== undefined ? parameters.hasGuichet : parameters.has_guichet),

                        // Flux specific (CamelCase to SnakeCase)
                        amana_pct_collecte: parameters.amana_pctCollecte,
                        amana_pct_retour: parameters.amana_pctRetour,
                        amana_pct_axes_arrivee: parameters.amana_pctAxesArrivee,
                        amana_pct_axes_depart: parameters.amana_pctAxesDepart,
                        amana_pct_national: parameters.amana_pctNational,
                        amana_pct_international: parameters.amana_pctInternational,
                        amana_pct_marche_ordinaire: parameters.amana_pctMarcheOrdinaire,
                        amana_pct_crbt: parameters.amana_pctCrbt,
                        amana_pct_hors_crbt: parameters.amana_pctHorsCrbt,

                        co_pct_collecte: parameters.co_pctCollecte,
                        co_pct_retour: parameters.co_pctRetour,
                        co_pct_axes_arrivee: parameters.co_pctAxesArrivee,
                        co_pct_axes_depart: parameters.co_pctAxesDepart,
                        co_pct_national: parameters.co_pctNational,
                        co_pct_international: parameters.co_pctInternational,

                        cr_pct_collecte: parameters.cr_pctCollecte,
                        cr_pct_retour: parameters.cr_pctRetour,
                        cr_pct_axes_arrivee: parameters.cr_pctAxesArrivee,
                        cr_pct_axes_depart: parameters.cr_pctAxesDepart,
                        cr_pct_national: parameters.cr_pctNational,
                        cr_pct_international: parameters.cr_pctInternational,

                        pct_mois: null,
                        pct_annee: rate,
                        amana_pct_annee: parsedRates.amana[i],
                        co_pct_annee: parsedRates.co[i],
                        cr_pct_annee: parsedRates.cr[i],
                        lrh_pct_annee: parsedRates.lrh[i],
                        ebarkia_pct_annee: parsedRates.ebarkia[i],
                    }
                };

                console.log(`Forecasting Year ${year} (Rate ${rate}%):`, {
                    centre_id: payload.centre_id,
                    volumes_count: payload.grid_values ? Object.keys(payload.grid_values).length : 'NULL',
                    params: payload.parameters
                });

                const response = await api.bandoengSimulate(payload);

                // On extrait les ETP/Charge du résultat
                const fte = response.total_ressources_humaines;
                const load = response.total_heures;

                // On met à jour la grille pour l'itération suivante (croissance composée gérée par le backend)
                // SECURITE : Ne pas mettre à jour si response.grid_values est absent/null/vide
                if (response.grid_values && Object.keys(response.grid_values).length > 0) {
                    currentGrid = response.grid_values;
                } else {
                    console.warn(`Year ${year}: Backend did not return grid_values. Keeping current volumes.`);
                }

                results.push({
                    year,
                    fte,
                    load,
                    growth: rate,
                    volumes: flattenGridValues(currentGrid),
                });
            }

            setCalculatedData(results);
            toast.success("Projections calculées avec succès");
        } catch (error) {
            console.error("Forecast error:", error);
            toast.error("Erreur lors du calcul des projections");
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
                formatter: (params) => {
                    const d = params[0];
                    return `<b>${d.name}</b><br/>ETP : <b>${d.value}</b>`;
                }
            },
            grid: { left: "3%", right: "4%", bottom: "10%", top: "10%", containLabel: true },
            xAxis: {
                type: "category",
                data: years,
                axisLabel: { color: "#64748b", fontSize: 11 },
                axisLine: { lineStyle: { color: "#e2e8f0" } },
            },
            yAxis: {
                type: "value",
                name: "ETP",
                nameTextStyle: { color: "#64748b", fontSize: 11 },
                axisLabel: { color: "#64748b", fontSize: 11 },
                splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
            },
            series: [
                {
                    name: "ETP Final",
                    type: "bar",
                    data: fteData,
                    barWidth: "50%",
                    itemStyle: {
                        color: {
                            type: "linear",
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: "#0077cc" },
                                { offset: 1, color: "#005EA8" },
                            ],
                        },
                        borderRadius: [6, 6, 0, 0],
                    },
                    label: { show: false },
                    emphasis: { itemStyle: { color: "#003f7f" } },
                },
            ],
        };
    }, [calculatedData]);

    const selectedPosteLabel = useMemo(() => {
        if (selectedPoste === "all") return "Tous les intervenants";
        const p = postes.find((p) => String(p.id) === selectedPoste);
        return p ? (p.label || p.nom || "") : "";
    }, [selectedPoste, postes]);

    return (
        <Card className={`overflow-hidden border-0 shadow-2xl bg-white ${className}`}>
            {/* Header */}
            <CardHeader className="relative overflow-hidden bg-gradient-to-r from-[#003f7f] via-[#005EA8] to-[#0077cc] py-4 px-5 border-none">
                {/* Background geometric decoration */}
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
                <div className="absolute -right-4 -bottom-12 w-28 h-28 bg-white/5 rounded-full" />

                <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap pr-8">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-black text-white uppercase tracking-wider">
                                Prévision ETP
                            </CardTitle>
                            <p className="text-[10px] text-blue-100 mt-0.5">
                                Projections {currentYear} → {currentYear + 5} · Croissance composée
                            </p>
                        </div>
                    </div>

                    {/* Filtre intervenant */}
                    {postes.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-blue-200" />
                            <Select value={selectedPoste} onValueChange={setSelectedPoste}>
                                <SelectTrigger className="h-7 text-xs bg-white/15 border-white/20 text-white min-w-[160px] max-w-xs hover:bg-white/25 [&>span]:text-white">
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

                {/* KPI chips */}
                <div className="relative z-10 flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full">
                        <span className="text-[10px] text-blue-200 font-semibold">Base {currentYear}</span>
                        <span className="text-[11px] text-white font-black">{Math.round(baseEtp)} ETP</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full">
                        <span className="text-[10px] text-blue-200 font-semibold">Charge</span>
                        <span className="text-[11px] text-white font-black">{Math.round(baseLoad * 100) / 100} h/j</span>
                    </div>
                    {selectedPoste !== "all" && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full">
                            <span className="text-[10px] text-blue-100 font-black">{selectedPosteLabel}</span>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-x divide-slate-100">
                    {/* ── Left: taux par flux ── */}
                    <div className="lg:col-span-5 p-4 bg-slate-50/60 flex flex-col gap-4">
                        <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-[#005EA8]/10 flex items-center justify-center">
                                <ArrowUpRight className="w-3 h-3 text-[#005EA8]" />
                            </div>
                            Taux de Croissance par Prestation (%)
                        </h4>

                        {/* Tableau matriciel */}
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                            <table className="w-full text-[10px] border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-2 py-2 text-left font-black text-slate-500 uppercase tracking-wider min-w-[80px]">Prestation</th>
                                        {[1, 2, 3, 4, 5].map(offset => (
                                            <th key={offset} className="px-1 py-2 text-center font-black min-w-[52px]">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-50 text-[#005EA8] text-[9px] font-black">
                                                    {currentYear + offset}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {FLUX_CONFIG.map((flux, fi) => (
                                        <tr key={flux.key} className={`border-b border-slate-100 last:border-0 ${fi % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                                            {/* Label flux — clic pour propager */}
                                            <td className="px-2 py-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => applyRowToAll(flux.key)}
                                                    title="Cliquer pour appliquer la valeur 2026 sur toute la ligne"
                                                    className="text-[10px] font-bold text-slate-700 uppercase tracking-wider hover:text-[#005EA8] transition-colors text-left"
                                                >
                                                    {flux.label}
                                                </button>
                                            </td>
                                            {[0, 1, 2, 3, 4].map(yi => (
                                                <td key={yi} className="px-1 py-1.5">
                                                    <div className="relative">
                                                        <Input
                                                            value={growthRates[flux.key][yi]}
                                                            onChange={e => handleRateChange(flux.key, yi, e.target.value)}
                                                            placeholder="0"
                                                            className={`h-7 text-[10px] pr-5 pl-1 font-black text-center border-slate-200 bg-white focus:border-[#005EA8] focus:ring-1 focus:ring-[#005EA8]/20 rounded-lg w-full`}
                                                            disabled={loading}
                                                        />
                                                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 font-bold pointer-events-none">%</span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className="text-[9px] text-slate-400 italic">
                            💡 Cliquez sur une prestation pour propager le taux 2026 sur toutes les années.
                        </p>

                        <Button
                            className="w-full h-10 gap-2 font-black text-xs uppercase tracking-widest bg-gradient-to-r from-[#004E8A] to-[#005EA8] hover:from-[#003f7f] hover:to-[#004E8A] text-white shadow-lg shadow-blue-200/50 transition-all duration-300 disabled:opacity-50 rounded-xl"
                            onClick={handleCalculate}
                            disabled={loading || !gridValues}
                        >
                            {loading ? (<RefreshCw className="w-4 h-4 animate-spin" />) : (<Play className="w-4 h-4 fill-current" />)}
                            {loading ? "Calcul en cours..." : "Lancer les Projections"}
                        </Button>

                        <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100/80">
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                <span className="font-black text-[#005EA8]">ⓘ</span> Croissance composée par prestation · Le taux global utilisé est la moyenne Amana/CO/CR.
                            </p>
                        </div>
                    </div>

                    {/* ── Right: results ── */}
                    <div className="lg:col-span-7 p-4 flex flex-col gap-4 min-h-[420px] overflow-y-auto">
                        {!calculatedData ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center shadow-inner">
                                    <LineChartIcon className="w-10 h-10 text-[#005EA8]/40" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Aucune projection</p>
                                    <p className="text-[11px] text-slate-300 mt-1">Définissez vos taux et lancez le calcul</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* ETP cards */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-4 rounded-full bg-[#005EA8]" />
                                        <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">ETP Projeté par Année</p>
                                    </div>
                                    <div className="grid grid-cols-6 gap-2">
                                        {calculatedData.map((d, i) => (
                                            <div
                                                key={i}
                                                className={`relative overflow-hidden rounded-xl border transition-all duration-300 flex flex-col items-center justify-center py-2 px-1 ${i === 0
                                                    ? "bg-slate-50 border-slate-200 shadow-sm"
                                                    : "bg-white border-blue-100 shadow-md hover:shadow-lg hover:-translate-y-0.5 group"
                                                    }`}
                                            >
                                                {i !== 0 && (
                                                    <div className="absolute top-0 right-0 w-12 h-12 -mr-6 -mt-6 bg-blue-50/60 rounded-full transition-transform group-hover:scale-150 pointer-events-none" />
                                                )}
                                                {i === 0 && (
                                                    <span className="text-[7px] font-black text-slate-400 bg-slate-200/70 px-1 py-0.5 rounded-full uppercase tracking-widest mb-0.5">
                                                        Base
                                                    </span>
                                                )}
                                                <p className="relative z-10 text-[9px] font-black text-slate-400 uppercase tracking-widest">{d.year}</p>
                                                <span className={`relative z-10 font-black leading-tight text-xl ${i === 0 ? "text-slate-600" : "text-[#005EA8]"}`}>
                                                    {Math.round(d.fte)}
                                                </span>
                                                <span className="relative z-10 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {selectedPoste === "all" ? "ETP" : "ETP"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="flex-1 min-h-[160px] w-full bg-white rounded-xl border border-slate-100 overflow-hidden">
                                    <ReactECharts ref={refChart} option={chartOptions} notMerge={true} lazyUpdate={false} style={{ height: "100%", width: "100%", minHeight: "160px" }} />
                                </div>


                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
