// VueIntervenantAvancee.jsx - Vue Intervenant avec Grille Bandoeng
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Calculator, MapPin, Building, User, Download, Upload, Box, Gauge, Clock, Eye, EyeOff, TrendingUp, TrendingDown, Table as TableIcon, BarChart3, Timer, CheckCircle2, Building2, Package, Mail, RefreshCw, Briefcase, Layers, Globe, Move, Map as MapIcon, Undo2, Users, Sliders, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import BandoengGrid from "../centres_uniq/BandoengGrid";
import EnterpriseTable from "../tables/EnterpriseTable";
import GraphReferentiel from "../charts/GraphReferentiel";
import { downloadBandoengTemplate, importBandoengVolumes } from "@/services/api";
import toast from "react-hot-toast";


// Simple Card wrapper to handle title and actions
const SimpleCard = ({ title, actions, children, className = "", bodyClassName = "" }) => {
    return (
        <Card className={className}>
            {(title || actions) && (
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    {title && <CardTitle className="text-sm font-medium">{title}</CardTitle>}
                    {actions && <div>{actions}</div>}
                </CardHeader>
            )}
            <CardContent className={bodyClassName}>
                {children}
            </CardContent>
        </Card>
    );
};

const DEFAULT_PARAMS = {
    pct_sac: 60,
    colis_amana_par_canva_sac: 35,
    courriers_par_sac: 350,
    nbr_co_sac: 350,
    nbr_cr_sac: 400,
    ratio_trieur: 1200,
    ratio_preparateur: 1000,
    ratio_magasinier: 800,
    coeff_circ: 1,
    coeff_geo: 1,
    pct_retour: 0,
    pct_collecte: 0,
    pct_axes: 0,
    pct_local: 0,
    pct_international: 0,
    pct_national: 100,
    pct_march_ordinaire: 0,
    productivite: 100,
    idle_minutes: 0,
    shift: 1
};

const baseInputClass = "text-[10px] text-center !px-0.5 !py-0 leading-none h-5 font-medium text-slate-700 bg-transparent border border-transparent rounded-sm hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all placeholder:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed w-full";

const FormattedInput = ({ value, onChange, className, suffix }) => {
    const formatDisplay = (val) => {
        if (val === "" || val === null || val === undefined) return "";
        const num = parseFloat(String(val).replace(',', '.'));
        if (isNaN(num)) return "";
        return Math.round(num).toLocaleString("fr-FR");
    };

    const handleChange = (e) => {
        const raw = e.target.value;
        if (/^[\d\s,.]*$/.test(raw)) {
            const clean = raw.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
            if ((clean.match(/\./g) || []).length > 1) return; // Prevent double dots
            onChange(clean);
        }
    };

    return (
        <div className="relative w-full">
            <Input
                type="text"
                className={`${className} ${suffix ? 'pr-4' : ''}`}
                value={formatDisplay(value)}
                onChange={handleChange}
            />
            {suffix && (
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none">
                    {suffix}
                </span>
            )}
        </div>
    );
};

// --- Helper Components & Functions ---
// --- Helper Components & Functions ---
const formatSmallNumber = (n) => typeof n === 'number' ? n.toFixed(2).replace('.', ',') : '0,00';

const formatHoursMinutes = (hours) => {
    if (!hours) return "0h00";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
};

const EffectifFooter = ({ totalLabel, totalValue, modValue, moiValue, apsLabel, apsValue }) => (
    <div className="text-[10px] text-slate-600 space-y-1.5">
        {totalValue && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                {totalLabel && <span className="font-semibold text-slate-700">{totalLabel}</span>}
                <span className="px-2 py-0.5 rounded-full bg-white text-slate-800 font-semibold shadow-sm">Total : {totalValue}</span>
            </div>
        )}
        <div className="flex items-center justify-center gap-2">
            <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#005EA8]">MOD : {modValue}</span>
            {moiValue !== undefined && moiValue !== null && (
                <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">MOI : {moiValue}</span>
            )}
        </div>
        {(apsValue !== undefined && apsValue !== null) && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-emerald-50/70 px-2 py-1">
                <span className="font-semibold text-emerald-800">{apsLabel}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 font-semibold shadow-sm">Total APS : {apsValue}</span>
            </div>
        )}
    </div>
);

const KPICardGlass = ({
    label, extraLabel, extraValue, total, icon: Icon, tone = "blue",
    emphasize = false, children, customFooter, toggleable = false, isOpen = false, onToggle,
}) => {
    const T = {
        blue: { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" },
        amber: { ring: "ring-amber-300/60", halo: "from-amber-400/25", text: "text-amber-600", dot: "bg-amber-500" },
        cyan: { ring: "ring-cyan-300/60", halo: "from-cyan-400/25", text: "text-cyan-600", dot: "bg-cyan-500" },
        rose: { ring: "ring-rose-300/60", halo: "from-rose-400/25", text: "text-rose-600", dot: "bg-rose-500" },
        emerald: { ring: "ring-emerald-300/60", halo: "from-emerald-400/25", text: "text-emerald-600", dot: "bg-emerald-500" },
        green: { ring: "ring-emerald-300/60", halo: "from-emerald-400/25", text: "text-emerald-600", dot: "bg-emerald-500" },
        slate: { ring: "ring-slate-300/60", halo: "from-slate-400/20", text: "text-slate-700", dot: "bg-slate-500" },
        red: { ring: "ring-rose-300/60", halo: "from-rose-400/25", text: "text-rose-600", dot: "bg-rose-500" },
    }[tone] || { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" };

    return (
        <div className={`relative overflow-hidden rounded-xl border border-white/50 bg-white/55 backdrop-blur-xl p-2 min-h-[75px] pb-2 ring-1 ${T.ring} shadow-[0_18px_55px_-18px_rgba(2,6,23,0.20)] transition-all duration-300 hover:scale-[1.02]`}>
            <div aria-hidden className={`pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${T.halo} to-transparent`} />
            {Icon && <Icon aria-hidden className="pointer-events-none absolute right-3 bottom-0.5 w-6 h-6 opacity-15 text-slate-700" />}

            {toggleable && onToggle && (
                <button type="button" onClick={onToggle} className="absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-full border border-white/70 bg-white/80 p-0.5 shadow-sm hover:bg-slate-50">
                    {isOpen ? <EyeOff className="w-2.5 h-2.5 text-slate-500" /> : <Eye className="w-2.5 h-2.5 text-slate-500" />}
                </button>
            )}

            <div className="text-[10px] font-semibold text-center text-slate-700 px-4 uppercase tracking-wider">{label}</div>
            <div className="mt-0.5 text-center text-lg font-extrabold text-slate-900">
                <span className={emphasize ? T.text : ""}>{total}</span>
            </div>

            {customFooter ? (
                <div className="mt-1 border-t border-slate-100 pt-0.5">{customFooter}</div>
            ) : children ? (
                <div className="mt-1 border-t border-slate-100 pt-0.5">{children}</div>
            ) : null}
        </div>
    );
};

export default function VueIntervenantAvancee({
    regions = [],
    centres = [],
    postesOptions = [],
    loading = {},
    region,
    setRegion,
    centre,
    setCentre,
    centreCategorie,
    poste,
    setPoste,
    productivite,
    setProductivite,
    heuresNet,
    setHeuresNet,
    onSimuler,
    resultats = null,
    totaux = null,
    hasSimulated = false,
    simDirty = false,
    idleMinutes = 0,
    setIdleMinutes,
    shift = 1,
    setShift = () => { },
}) {
    // Ref pour l'input file
    const fileInputRef = useRef(null);
    // États pour la grille Bandoeng
    const [gridValues, setGridValues] = useState({
        amana: {
            depot: {
                gc: { global: "", local: "", axes: "" },
                part: { global: "", local: "", axes: "" }
            },
            recu: {
                gc: { global: "", local: "", axes: "" },
                part: { global: "", local: "", axes: "" }
            }
        },
        cr: {
            med: { global: "", local: "", axes: "" },
            arrive: { global: "", local: "", axes: "" }
        },
        co: {
            med: { global: "", local: "", axes: "" },
            arrive: { global: "", local: "", axes: "" }
        },
        ebarkia: {
            med: "",
            arrive: ""
        },
        lrh: {
            med: "",
            arrive: ""
        }
    });

    // Paramètres avancés
    const [params, setParams] = useState(DEFAULT_PARAMS);

    // Filters State
    const [filterFamille, setFilterFamille] = useState("");
    const [filterProduit, setFilterProduit] = useState("");

    // UI States
    const [showDetails, setShowDetails] = useState(true);
    const [refDisplay, setRefDisplay] = useState("tableau");




    // Helper: Calculate distribution
    const calculateDistribution = (globalVal, pctLocal, pctAxes) => {
        const globalNum = parseFloat(String(globalVal).replace(',', '.')) || 0;
        if (globalNum === 0) return { local: "", axes: "" };

        const localVal = Math.round(globalNum * (pctLocal / 100));
        const axesVal = Math.round(globalNum * (pctAxes / 100));

        return {
            local: localVal.toString(),
            axes: axesVal.toString()
        };
    };

    // Handle param change
    const handleParamChange = (key, value) => {
        const numValue = Number(value);

        setParams(prev => {
            const updated = { ...prev, [key]: numValue };

            // Auto-balance Local/Axes
            if (key === 'pct_local') {
                updated.pct_axes = Math.max(0, 100 - numValue);
            } else if (key === 'pct_axes') {
                updated.pct_local = Math.max(0, 100 - numValue);
            } else if (key === 'pct_international') {
                updated.pct_national = Math.max(0, 100 - numValue);
            } else if (key === 'pct_national') {
                updated.pct_international = Math.max(0, 100 - numValue);
            }

            return updated;
        });

        // Auto-calculate grid if percentages change
        if (key === "pct_local" || key === "pct_axes") {
            const newPctLocal = key === "pct_local" ? numValue : Math.max(0, 100 - numValue);
            const newPctAxes = key === "pct_axes" ? numValue : Math.max(0, 100 - numValue);

            setGridValues(prev => {
                const newState = JSON.parse(JSON.stringify(prev));

                const traverseAndUpdate = (node) => {
                    if (node && typeof node === 'object') {
                        if ("global" in node && "local" in node && "axes" in node) {
                            const { local, axes } = calculateDistribution(node.global, newPctLocal, newPctAxes);
                            node.local = local;
                            node.axes = axes;
                        } else {
                            Object.values(node).forEach(child => traverseAndUpdate(child));
                        }
                    }
                };

                traverseAndUpdate(newState);
                return newState;
            });
        }
    };

    // Handle grid change
    const handleGridChange = (pathArray, value) => {
        setGridValues(prev => {
            const newState = { ...prev };
            let current = newState;
            for (let i = 0; i < pathArray.length - 1; i++) {
                current = current[pathArray[i]];
            }
            const lastKey = pathArray[pathArray.length - 1];
            current[lastKey] = value;

            // Auto-calculation if Global changes
            if (lastKey === "global") {
                const { local, axes } = calculateDistribution(value, params.pct_local, params.pct_axes);
                current["local"] = local;
                current["axes"] = axes;
            }

            // Reverse Auto-calculation if Local or Axes changes
            if (lastKey === "local" || lastKey === "axes") {
                const localVal = parseFloat(String(current["local"]).replace(',', '.')) || 0;
                const axesVal = parseFloat(String(current["axes"]).replace(',', '.')) || 0;
                const newGlobal = Math.round(localVal + axesVal);
                current["global"] = newGlobal.toString();
            }

            return newState;
        });
    };

    // Sum grid values
    const sumValues = (paths) => {
        let total = 0;
        paths.forEach(pathArray => {
            let current = gridValues;
            for (const key of pathArray) {
                if (current && current[key] !== undefined) {
                    current = current[key];
                } else {
                    current = 0;
                    break;
                }
            }
            const val = parseFloat(current);
            if (!isNaN(val)) total += val;
        });
        return total;
    };

    // Calculate heures nettes
    const heuresNettesJourCalculees = useMemo(() => {
        const hBase = 8;
        const idleH = (params.idle_minutes || 0) / 60;
        const baseProductivity = hBase * (params.productivite / 100);
        return Math.max(0, baseProductivity - idleH);
    }, [params]);

    // Handle simulation
    const handleSimuler = useCallback(() => {
        if (!centre) {
            toast.error("Veuillez sélectionner un centre");
            return;
        }

        // Calculate totals from grid
        const co_export_total = sumValues([["co", "med", "global"], ["co", "med", "local"], ["co", "med", "axes"]]);
        const co_import_total = sumValues([["co", "arrive", "global"], ["co", "arrive", "local"], ["co", "arrive", "axes"]]);
        const cr_export_total = sumValues([["cr", "med", "global"], ["cr", "med", "local"], ["cr", "med", "axes"]]);
        const cr_import_total = sumValues([["cr", "arrive", "global"], ["cr", "arrive", "local"], ["cr", "arrive", "axes"]]);
        const colis_export = sumValues([
            ["amana", "depot", "gc", "global"], ["amana", "depot", "gc", "local"], ["amana", "depot", "gc", "axes"],
            ["amana", "depot", "part", "global"], ["amana", "depot", "part", "local"], ["amana", "depot", "part", "axes"]
        ]);
        const colis_import = sumValues([
            ["amana", "recu", "gc", "global"], ["amana", "recu", "gc", "local"], ["amana", "recu", "gc", "axes"],
            ["amana", "recu", "part", "global"], ["amana", "recu", "part", "local"], ["amana", "recu", "part", "axes"]
        ]);
        const gare_export = parseFloat(gridValues.ebarkia?.med || 0);
        const gare_import = parseFloat(gridValues.ebarkia?.arrive || 0);

        // Call parent simulation with grid values
        onSimuler({
            grid_values: gridValues,
            ...params,
            productivite: params.productivite,
            idle_minutes: params.idle_minutes,
            shift: params.shift,
        });
    }, [centre, gridValues, params, onSimuler, sumValues]);

    // Handle template download
    const handleDownloadTemplate = async () => {
        try {
            await downloadBandoengTemplate();
            toast.success("Modèle téléchargé avec succès");
        } catch (error) {
            toast.error("Erreur téléchargement modèle");
        }
    };

    // Handle file upload
    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Importation en cours...");
        try {
            const data = await importBandoengVolumes(file);
            if (data) {
                setGridValues(data); // Update grid with imported values
                toast.success("Volumes importés avec succès", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'importation", { id: toastId });
        } finally {
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Listes uniques pour filtres
    const uniqueFamilles = useMemo(() => {
        if (!resultats?.tasks) return [];
        const s = new Set(resultats.tasks.map(t => t.famille).filter(Boolean));
        return Array.from(s).sort();
    }, [resultats]);

    const uniqueProduits = useMemo(() => {
        if (!resultats?.tasks) return [];
        const s = new Set(resultats.tasks.map(t => t.produit).filter(Boolean));
        return Array.from(s).sort();
    }, [resultats]);

    // Référentiel filtré
    const referentielFiltered = useMemo(() => {
        // Bandoeng API returns 'tasks' array, not 'referentiel'
        if (!resultats?.tasks) return [];

        let filtered = resultats.tasks.filter(r => {
            const moyMin = Number(r.moyenne_min || 0);
            return moyMin > 0;
        });

        if (filterFamille) {
            filtered = filtered.filter(r =>
                (r.famille || "").toLowerCase().includes(filterFamille.toLowerCase())
            );
        }

        if (filterProduit) {
            filtered = filtered.filter(r =>
                (r.produit || "").toLowerCase().includes(filterProduit.toLowerCase())
            );
        }

        // Map to expected format for display
        return filtered.map(task => ({
            id: task.task_code,
            t: task.task_name,
            famille: task.famille,
            produit: task.produit,
            m: task.moyenne_min,
            sec: task.moy_sec,
            vol: task.volume || 0,
            h: task.heures_calculees || 0,
            fte: task.fte || 0,
            ordre: task.ordre || 9999
        })).sort((a, b) => (a.ordre - b.ordre) || (a.id - b.id));
    }, [resultats, filterFamille, filterProduit]);

    const selectedPosteObj = useMemo(() =>
        postesOptions.find(p => String(p.id) === String(poste)),
        [postesOptions, poste]
    );

    const titleSuffix = useMemo(() => {
        const parts = [];
        if (region) {
            const r = regions.find(rg => String(rg.id) === String(region));
            if (r) parts.push(r.label);
        }
        if (centre) {
            const c = centres.find(ct => String(ct.id) === String(centre));
            if (c) parts.push(c.label);
        }
        if (selectedPosteObj) parts.push(selectedPosteObj.label);
        return parts.join(" → ");
    }, [region, centre, selectedPosteObj, regions, centres]);

    // KPI Data
    const kpiData = useMemo(() => {
        if (!resultats || !hasSimulated) {
            return null;
        }

        const totalHeures = resultats.total_heures || 0;

        let actMOD = 0, actMOI = 0, actAPS = 0;

        // Find current centre for APS
        const currentCentre = centres.find(c => String(c.id) === String(centre));
        actAPS = currentCentre?.t_aps || 0;

        const countPoste = (p) => {
            const val = Number(p.effectif_actuel || 0);
            if (p.type_poste === 'MOI') actMOI += val;
            else actMOD += val;
        };

        if (poste && selectedPosteObj) {
            countPoste(selectedPosteObj);
        } else {
            postesOptions.forEach(countPoste);
        }

        const effectifActuel = actMOD + actMOI;

        // Logique Bandoeng:
        // Le moteur retourne le besoin en MOD (fte_calcule)
        // Le besoin en MOI est égal à l'existant (pas de calcul de charge spécifique)
        // Donc Besoin Total = Besoin MOD + Existant MOI

        const etpModCalcule = resultats.fte_calcule || 0;
        const etpModArrondi = resultats.fte_arrondi || Math.round(etpModCalcule);

        // Si on est sur un poste MOI spécifique, le calcul MOD est 0 (normalement)
        // Si on est sur un poste MOD spécifique, actMOI est 0

        const etpTotalCalcule = etpModCalcule + actMOI;
        const etpTotalCible = etpModArrondi + actMOI;

        const ecart = effectifActuel - etpTotalCible;

        return {
            totalHeures,
            etpModCalcule,
            etpTotalCalcule,
            etpTotalCible,
            effectifActuel,
            actMOD,
            actMOI,
            actAPS,
            ecart
        };
    }, [resultats, hasSimulated, selectedPosteObj, poste, postesOptions, centre, centres]);

    return (
        <div className="w-full flex flex-col gap-3 pb-16" style={{ zoom: "90%" }}>
            {/* Header avec titre */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20">
                <h2 className="text-lg font-bold text-slate-800">
                    Simulation Intervenant Avancée {titleSuffix && `- ${titleSuffix}`}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    Grille de volumes complexe avec paramètres avancés
                </p>
            </div>

            {/* Sélection Région/Centre/Poste */}
            {/* 🔹 BARRES STICKY EN HAUT - Sélection Stylisée */}
            <div className="sticky top-[73px] z-10 grid grid-cols-1 gap-2">
                <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2 flex flex-wrap items-center gap-3 transition-all duration-300">

                    {/* REGION */}
                    <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                            <MapPin className="w-3 h-3" />
                        </div>
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Région
                            </label>
                            <select
                                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate text-left"
                                value={region ?? ""}
                                onChange={(e) => setRegion(e.target.value)}
                            >
                                <option value="">Toutes les régions</option>
                                {regions.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden md:block" />

                    {/* CENTRE */}
                    <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                            <Building className="w-3 h-3" />
                        </div>
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Centre
                            </label>
                            <select
                                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate disabled:opacity-50 text-left"
                                value={centre ?? ""}
                                onChange={(e) => setCentre(e.target.value)}
                                disabled={!region}
                            >
                                <option value="">
                                    {loading.centres ? "Chargement..." : "Sélectionner un centre"}
                                </option>
                                {centres.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label ?? c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden md:block" />

                    {/* INTERVENANT (POSTE) */}
                    <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                            <User className="w-3 h-3" />
                        </div>
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Intervenant
                            </label>
                            <select
                                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate disabled:opacity-50 text-left"
                                value={poste ?? ""}
                                onChange={(e) => setPoste(e.target.value)}
                                disabled={!centre || loading.postes}
                            >
                                <option value="">-- Tous les postes (Global) --</option>
                                {postesOptions.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.label ?? p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grille de Volumes Bandoeng */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-[#005EA8]" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Saisie des Volumes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadTemplate}
                            className="h-7 text-[10px] bg-white text-slate-600 hover:text-[#005EA8] hover:border-[#005EA8]/30 px-2"
                        >
                            <Download className="w-3 h-3 mr-1.5" />
                            Modèle
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-7 text-[10px] bg-white text-slate-600 hover:text-[#005EA8] hover:border-[#005EA8]/30 px-2"
                        >
                            <Upload className="w-3 h-3 mr-1.5" />
                            Importer
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </div>
                </div>
                <CardContent className="p-1">
                    <BandoengGrid
                        gridValues={gridValues}
                        onGridChange={handleGridChange}
                        params={params}
                    />
                </CardContent>
            </Card>

            {/* Paramètres Avancés (Barre Horizontale) */}
            <div className="flex flex-col gap-2 mt-2">
                <Card className="bg-white/80 backdrop-blur-md border-slate-200/60 shadow-sm shrink-0 overflow-hidden">
                    <CardContent className="px-2 py-2 overflow-x-auto">
                        <div className="flex items-center gap-4 min-w-max">
                            {/* Groupe 0: Prod, Idle, Shift */}
                            <div className="flex gap-2 border-r border-slate-200 pr-4">
                                <div className="flex flex-col gap-1 w-[85px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Productivité</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Gauge className="w-3 h-3" /></div>
                                        <FormattedInput className={baseInputClass} value={params.productivite} onChange={(v) => handleParamChange('productivite', v)} suffix="%" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-[80px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Non Prod</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><Clock className="w-3 h-3" /></div>
                                        <FormattedInput className={baseInputClass} value={params.idle_minutes} onChange={(v) => handleParamChange('idle_minutes', v)} suffix="m" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-[60px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Shift</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><Users className="w-3 h-3" /></div>
                                        <Select value={String(params.shift || 1)} onValueChange={(val) => handleParamChange('shift', parseFloat(val))}>
                                            <SelectTrigger className="h-7 w-full px-1 text-[10px] text-center justify-center"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">1</SelectItem>
                                                <SelectItem value="2">2</SelectItem>
                                                <SelectItem value="3">3</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Groupe 1: Sacs & Contenants */}
                            <div className="flex gap-2 border-r border-slate-200 pr-4">
                                <div className="flex flex-col gap-1 w-[85px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Colis/Sac</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0"><Package className="w-3 h-3" /></div>
                                        <FormattedInput className={baseInputClass} value={params.colis_amana_par_canva_sac} onChange={(v) => handleParamChange('colis_amana_par_canva_sac', v)} />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-[85px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Courrier/Sac</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><Mail className="w-3 h-3" /></div>
                                        <FormattedInput className={baseInputClass} value={params.nbr_co_sac} onChange={(v) => handleParamChange('nbr_co_sac', v)} />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-[85px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">CR/Caisson</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Box className="w-3 h-3" /></div>
                                        <FormattedInput className={baseInputClass} value={params.nbr_cr_sac} onChange={(v) => handleParamChange('nbr_cr_sac', v)} />
                                    </div>
                                </div>
                            </div>

                            {/* Groupe 2: Coefficients */}
                            <div className="flex gap-2 border-r border-slate-200 pr-4">
                                <div className="flex flex-col gap-1 w-[85px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Coeff Circ</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><RefreshCw className="w-3 h-3" /></div>
                                        <Select value={String(params.coeff_circ)} onValueChange={(val) => handleParamChange('coeff_circ', parseFloat(val))}>
                                            <SelectTrigger className="h-7 w-full px-1 text-[10px] text-center justify-center"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="0.5">0,5</SelectItem><SelectItem value="1">1</SelectItem><SelectItem value="1.25">1,25</SelectItem><SelectItem value="1.5">1,5</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-[85px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Coeff Geo</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center shrink-0"><MapIcon className="w-3 h-3" /></div>
                                        <Select value={String(params.coeff_geo)} onValueChange={(val) => handleParamChange('coeff_geo', parseFloat(val))}>
                                            <SelectTrigger className="h-7 w-full px-1 text-[10px] text-center justify-center"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="0.5">0,5</SelectItem><SelectItem value="1">1</SelectItem><SelectItem value="1.25">1,25</SelectItem><SelectItem value="1.5">1,5</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Groupe 3: Distribution */}
                            <div className="flex gap-2">
                                <div className="flex flex-col gap-1 w-[70px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% Retour</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Undo2 className="w-3 h-3" /></div>
                                        <FormattedInput className={baseInputClass} value={params.pct_retour} onChange={(v) => handleParamChange('pct_retour', v)} suffix="%" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-[70px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% Collecte</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Briefcase className="w-3 h-3" /></div>
                                        <FormattedInput className={baseInputClass} value={params.pct_collecte} onChange={(v) => handleParamChange('pct_collecte', v)} suffix="%" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-[70px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% Axes</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><Move className="w-3 h-3" /></div>
                                        <FormattedInput className={baseInputClass} value={params.pct_axes} onChange={(v) => handleParamChange('pct_axes', v)} suffix="%" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-[70px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% Local</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0"><MapPin className="w-3 h-3" /></div>
                                        <FormattedInput className={baseInputClass} value={params.pct_local} onChange={(v) => handleParamChange('pct_local', v)} suffix="%" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 w-[70px]">
                                    <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% Inter</Label>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Globe className="w-3 h-3" /></div>
                                        <FormattedInput className={baseInputClass} value={params.pct_international} onChange={(v) => handleParamChange('pct_international', v)} suffix="%" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleSimuler}
                        disabled={!centre}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-[#005EA8] text-white rounded-lg hover:bg-[#004a86] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-md transition-all transform hover:scale-105"
                    >
                        <Calculator className="w-4 h-4" />
                        {hasSimulated ? (poste ? 'Relancer Simulation' : 'Relancer Global') : 'Lancer Simulation'}
                    </button>
                </div>
            </div>
            {
                hasSimulated && kpiData && (
                    <>
                        <div className="flex items-center gap-2 mb-0.5 px-1 shrink-0 mt-4">
                            <Gauge className="w-3.5 h-3.5 text-[#005EA8]" />
                            <h3 className="text-xs font-semibold text-[#005EA8]">Synthèse</h3>
                        </div>

                        <div className="grid grid-cols-5 gap-2 shrink-0">
                            <div className="relative overflow-hidden rounded-xl border border-white/50 bg-white/55 backdrop-blur-xl p-2 min-h-[70px] pb-2 ring-1 ring-slate-200 shadow-sm flex flex-col items-center justify-center transition-all hover:ring-blue-200 hover:scale-[1.02] duration-300">
                                <div className="text-[10px] font-semibold text-slate-600 mb-0.5">Charge Totale</div>
                                <div className="text-lg font-bold text-slate-800">{formatSmallNumber(kpiData.totalHeures)}</div>
                                <div className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-0.5">heures / jour</div>
                            </div>

                            <KPICardGlass label="Effectif Actuel" icon={User} tone="cyan" emphasize total={Math.round(kpiData.effectifActuel)}>
                                <EffectifFooter
                                    totalLabel="Statutaire"
                                    totalValue={Math.round(kpiData.effectifActuel)}
                                    modValue={Math.round(kpiData.actMOD)}
                                    moiValue={Math.round(kpiData.actMOI)}
                                    apsLabel="APS"
                                    apsValue={Math.round(kpiData.actAPS)}
                                />
                            </KPICardGlass>

                            <KPICardGlass label="ETP Calculé" icon={Calculator} tone="blue" emphasize total={formatSmallNumber(kpiData.etpTotalCalcule)}>
                                <EffectifFooter
                                    modValue={formatSmallNumber(kpiData.etpModCalcule)}
                                    moiValue={formatSmallNumber(kpiData.actMOI)}
                                />
                            </KPICardGlass>

                            <KPICardGlass label="ETP Final" icon={TrendingUp} tone="emerald" emphasize total={Math.round(kpiData.etpTotalCible)}>
                                <div className="text-[9px] text-emerald-600 text-center font-medium">Objectif Cible</div>
                            </KPICardGlass>

                            <KPICardGlass label="Ecart" icon={TrendingDown} tone={kpiData.ecart >= 0 ? "emerald" : "red"} emphasize total={formatSmallNumber(kpiData.ecart)}>
                                <div className={`text-[9px] font-bold text-center ${kpiData.ecart >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {kpiData.ecart >= 0 ? "Sur-effectif" : "Sous-effectif"}
                                </div>
                            </KPICardGlass>
                        </div>
                    </>
                )
            }

            {/* Filtres et Tableaux */}
            {
                hasSimulated && resultats?.tasks && (
                    <div className="flex flex-col gap-4 mt-6">
                        {/* Filtres */}
                        <div className="flex flex-wrap items-center gap-4 bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 self-start">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Filtre Famille:</span>
                                <select
                                    className="bg-white border text-ellipsis border-slate-200 text-xs text-slate-700 rounded px-2 py-1 focus:outline-none focus:border-blue-500 w-full max-w-[180px]"
                                    value={filterFamille}
                                    onChange={(e) => setFilterFamille(e.target.value)}
                                >
                                    <option value="">Toutes les familles</option>
                                    {uniqueFamilles.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Filtre Produit:</span>
                                <select
                                    className="bg-white border text-ellipsis border-slate-200 text-xs text-slate-700 rounded px-2 py-1 focus:outline-none focus:border-blue-500 w-full max-w-[180px]"
                                    value={filterProduit}
                                    onChange={(e) => setFilterProduit(e.target.value)}
                                >
                                    <option value="">Tous les produits</option>
                                    {uniqueProduits.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative items-start">
                            {/* Tableau Référentiel */}
                            <EnterpriseTable
                                title="Référentiel Temps"
                                subtitle={<span className="text-xs text-slate-500">{referentielFiltered.length} tâches</span>}
                                icon={Clock}
                                columns={[
                                    { key: 'p', label: 'Produit', width: '100px', ellipsis: true },
                                    { key: 'f', label: 'Famille', width: '120px', ellipsis: true },
                                    { key: 't', label: 'Tâche', flex: 1, ellipsis: true },
                                    { key: 'm', label: 'Min', width: '70px', align: 'right' },
                                    { key: 's', label: 'Sec', width: '60px', align: 'right' }
                                ]}
                                data={referentielFiltered.map((r, i) => ({
                                    seq: i + 1,
                                    p: r.produit,
                                    f: r.famille,
                                    t: r.t,
                                    m: formatSmallNumber(r.m),
                                    s: Math.round(r.sec)
                                }))}
                                height={450}
                                enableExport={true}
                            />

                            {/* Tableau Résultats */}
                            <EnterpriseTable
                                title="Résultats Détaillés"
                                subtitle={<span className="text-xs text-slate-500">Volumétrie & Heures</span>}
                                icon={Box}
                                columns={[
                                    { key: 't', label: 'Tâche', flex: 1, ellipsis: true },
                                    { key: 'v', label: 'Volume', width: '90px', align: 'right' },
                                    { key: 'h', label: 'Heures', width: '90px', align: 'right' }
                                ]}
                                data={referentielFiltered.map((r, i) => ({
                                    seq: i + 1,
                                    t: r.t,
                                    v: Math.round(r.vol).toLocaleString('fr-FR'),
                                    h: formatSmallNumber(r.h)
                                }))}
                                height={450}
                                enableExport={true}
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
}

