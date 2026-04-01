import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import {
    MapPin, Globe, Download, Upload, CheckCircle2, ChevronRight,
    AlertTriangle, Loader2, FileSpreadsheet, X, RefreshCcw, RotateCcw,
    Building2, Zap, BookText, Sparkles, GitCompareArrows, Layers,
    Users, Calculator,
    Network,
    DollarSign,
} from "lucide-react";
import { TableHead, TableCell } from "@/components/ui/table";
import ComparatifScenarioMetricsTable from "@/components/wizard/comparison/ComparatifScenarioMetricsTable";
import ChiffrageBatchHierarchyDialog from "@/components/wizard/ChiffrageBatchHierarchyDialog";
import { mergeParCentreForComparatif } from "@/lib/chiffrage-batch-aggregate";

// ─── Constants ───────────────────────────────────────────────────────────────
const MODES = {
    actuel: { key: "actuel", label: "Processus Actuel", short: "Actuel", color: "#005EA8", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", ring: "ring-blue-100", icon: Zap, gradient: "from-[#005EA8] to-[#0A6BBC]" },
    recommande: { key: "recommande", label: "Processus Consolidé", short: "Consolidé", color: "#0A6BBC", bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800", ring: "ring-blue-200", icon: BookText, gradient: "from-blue-600 to-blue-800" },
    optimise: { key: "optimise", label: "Processus Optimisé", short: "Optimisé", color: "#063A66", bg: "bg-blue-200/50", border: "border-blue-400", text: "text-blue-900", ring: "ring-blue-300", icon: Sparkles, gradient: "from-blue-700 to-blue-900" },
};
const MODES_LIST = Object.values(MODES);

const fmt = (n) => (n == null || Number.isNaN(Number(n)) ? "—" : Number(n).toLocaleString("fr-MA", { maximumFractionDigits: 1 }));

/** Index par_centre by centre_id */
function indexParCentreById(parCentre) {
    const m = {};
    (parCentre || []).forEach((r) => { m[r.centre_id] = r; });
    return m;
}

/**
 * Référence « ETP Actuel (DB) » pour le comparatif batch : effectif MOD + APS des postes MOD uniquement (sans MOI).
 * `actual_aps_mod` vient du backend ; `actual_aps` reste l’APS totale (ex. Simulation batch).
 */
function computeBatchKpiDb(parCentre) {
    const rows = parCentre || [];
    let mod = 0, moi = 0, apsMod = 0;
    rows.forEach((r) => {
        mod += Number(r.actual_mod || 0);
        moi += Number(r.actual_moi || 0);
        apsMod += Number(r.actual_aps_mod ?? 0);
    });
    return {
        total: Math.round(mod + apsMod),
        actualStatutaire: Math.round(mod),
        actualMOD: Math.round(mod),
        actualMOI: Math.round(moi),
        actualAPS: Math.round(apsMod),
    };
}

/**
 * ETP scénario par centre = Σ arrondi par poste sur `ressources_par_poste` (Calculé / Consolidé / Optimisé).
 * Sans ventilation, repli sur fte_arrondi puis round(fte_calcule).
 */
function etpFinalFromRessourcesParPoste(centreRow) {
    if (!centreRow) return 0;
    const rpp = centreRow.ressources_par_poste || {};
    const vals = Object.values(rpp);
    if (!vals.length) {
        return Number(
            centreRow.fte_arrondi ?? Math.round(Number(centreRow.fte_calcule || 0))
        );
    }
    return vals.reduce((s, v) => s + Math.round(Number(v) || 0), 0);
}

/**
 * ETP scénario agrégé = Σ par centre des sommes d’arrondis poste (puis régions = Σ de ces totaux centre).
 * Écart vs DB = cette somme − référence DB (MOD + APS postes MOD).
 */
function computeBatchScenarioKpi(parBase, parMode, dbTotalRounded) {
    const byId = indexParCentreById(parMode);
    let fteSum = 0;
    (parBase || []).forEach((base) => {
        const r = byId[base.centre_id];
        if (!r) return;
        fteSum += etpFinalFromRessourcesParPoste(r);
    });
    const totalCalculated = fteSum;
    return {
        totalCalculated,
        totalGap: Math.round(totalCalculated - dbTotalRounded),
        targetCalculatedMOD: Math.round(fteSum),
    };
}

const normPosteKey = (k) => String(k || "").trim().toUpperCase();

/** Somme des valeurs d&apos;un objet poste en faisant correspondre les clés (insensible à la casse). */
function sumPosteBucket(obj, keyNorm) {
    const o = obj || {};
    let s = 0;
    for (const [k, v] of Object.entries(o)) {
        if (normPosteKey(k) === keyNorm) s += Number(v) || 0;
    }
    return s;
}

/**
 * Agrégation des effectifs / ressources par libellé de poste.
 * @param {Set<string|number>|null} centreIdsFilter — si défini (ex. centres d’une région), seuls ces centre_id sont cumulés.
 */
function buildBatchPerPosteComparisonRows(results, centreIdsFilter = null) {
    const parAll = results?.actuel?.par_centre || [];
    const par = centreIdsFilter
        ? parAll.filter(
            (c) =>
                centreIdsFilter.has(c.centre_id) ||
                centreIdsFilter.has(String(c.centre_id))
        )
        : parAll;
    if (!par.length) return [];

    const act = indexParCentreById(results?.actuel?.par_centre);
    const rec = indexParCentreById(results?.recommande?.par_centre);
    const opt = indexParCentreById(results?.optimise?.par_centre);

    const labelsNorm = new Set();
    const labelDisplay = {};
    const addKeys = (obj) => {
        Object.keys(obj || {}).forEach((k) => {
            const n = normPosteKey(k);
            if (!n) return;
            labelsNorm.add(n);
            if (!labelDisplay[n]) labelDisplay[n] = String(k).trim();
        });
    };
    // Union : postes calculés (3 modes) + postes présents en DB (effectifs_par_poste) même si le
    // moteur ne renvoie pas la clé (ETP calculé nul ou poste non ventilé dans la sortie).
    par.forEach((c) => {
        addKeys(c.ressources_par_poste);
        addKeys(rec[c.centre_id]?.ressources_par_poste);
        addKeys(opt[c.centre_id]?.ressources_par_poste);
    });
    par.forEach((c) => {
        addKeys(c.effectifs_par_poste);
    });

    const rows = [];
    for (const keyNorm of Array.from(labelsNorm).sort((a, b) => a.localeCompare(b, "fr"))) {
        let db = 0, calc = 0, cons = 0, optim = 0;
        par.forEach((c) => {
            db += sumPosteBucket(c.effectifs_par_poste, keyNorm);
            calc += Math.round(sumPosteBucket(act[c.centre_id]?.ressources_par_poste, keyNorm));
            cons += Math.round(sumPosteBucket(rec[c.centre_id]?.ressources_par_poste, keyNorm));
            optim += Math.round(sumPosteBucket(opt[c.centre_id]?.ressources_par_poste, keyNorm));
        });
        if (db === 0 && calc === 0 && cons === 0 && optim === 0) continue;

        const dCalcVsDb = Math.round(calc - db);
        const dConsVsDb = Math.round(cons - db);
        const dOptVsDb = Math.round(optim - db);
        const dConsVsCalc = Math.round(cons - calc);
        const dOptVsCalc = Math.round(optim - calc);

        const disp = labelDisplay[keyNorm] || keyNorm;
        rows.push({
            id: keyNorm,
            label: disp,
            db,
            calc,
            cons,
            opt: optim,
            dCalcVsDb,
            dConsVsDb,
            dOptVsDb,
            dConsVsCalc,
            dOptVsCalc,
        });
    }
    return rows;
}

// ─── UI aligné SimulationBatchPage / Vue nationale ────────────────────────────
function KpiCard({ label, value, icon: Icon, color = "blue", sub }) {
    const colorMap = {
        blue: { bg: "bg-blue-50", text: "text-[#005EA8]", border: "border-b-blue-400", iconRing: "ring-blue-100" },
        blue2: { bg: "bg-blue-100/70", text: "text-blue-800", border: "border-b-[#005EA8]", iconRing: "ring-blue-200" },
        blue3: { bg: "bg-blue-200/40", text: "text-blue-900", border: "border-b-blue-700", iconRing: "ring-blue-200" },
    };
    const theme = colorMap[color] || colorMap.blue;
    return (
        <div className="relative bg-white rounded-xl shadow-sm border border-slate-100 p-2.5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden h-full min-h-[85px] flex flex-col items-center justify-center text-center">
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${theme.bg} ${theme.border} opacity-80 transition-all group-hover:h-1.5`} />
            <div className="relative z-10 flex flex-col items-center gap-1.5 w-full">
                <div className={`p-1.5 rounded-xl ${theme.bg} ${theme.text} ring-2 ${theme.iconRing} inline-flex items-center justify-center shadow-sm transition-transform group-hover:scale-110`}>
                    <Icon size={16} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                    <div className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">{value}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{label}</div>
                    {sub && <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">{sub}</p>}
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label, count, color = "blue" }) {
    const colorMap = {
        blue: active ? "border-[#005EA8] text-[#005EA8] bg-blue-50/80" : "border-transparent text-slate-500 hover:text-blue-800 hover:bg-blue-50/40",
        blueMid: active ? "border-blue-600 text-blue-800 bg-blue-100/50" : "border-transparent text-slate-500 hover:text-blue-800 hover:bg-blue-50/40",
        blueDeep: active ? "border-blue-800 text-blue-950 bg-blue-100/70" : "border-transparent text-slate-500 hover:text-blue-800 hover:bg-blue-50/40",
    };
    const badgeMap = {
        blue: active ? "bg-blue-200 text-blue-900" : "bg-slate-100 text-slate-500",
        blueMid: active ? "bg-blue-300/60 text-blue-950" : "bg-slate-100 text-slate-500",
        blueDeep: active ? "bg-blue-400/50 text-blue-950" : "bg-slate-100 text-slate-500",
    };
    return (
        <button type="button" onClick={onClick} className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-[11px] font-bold transition-all duration-200 ${colorMap[color]}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count != null && <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 leading-none ${badgeMap[color]}`}>{count}</span>}
        </button>
    );
}

// ─── Step indicator (identique SimulationBatchPage) ───────────────────────────
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
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 shadow-sm ${done ? "bg-[#005EA8] text-white shadow-[0_4px_12px_rgba(0,94,168,0.35)]" : active ? "bg-gradient-to-br from-[#005EA8] to-[#0A6BBC] text-white ring-4 ring-blue-100 shadow-[0_4px_14px_rgba(0,94,168,0.38)]" : "bg-slate-100 text-slate-400 border border-slate-200"}`}>
                                    {done ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                                </div>
                                <span className={`text-[10px] font-bold tracking-wide ${active ? "text-blue-600" : done ? "text-[#005EA8]" : "text-slate-400"}`}>
                                    {s.label}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`flex-1 h-1 mx-2 mb-5 rounded-full transition-all duration-500 ${done ? "bg-gradient-to-r from-blue-400 to-[#005EA8]" : "bg-slate-100"}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ComparatifBatchPage({ mode = "regional" }) {
    const isNational = mode === "national";

    const [step, setStep] = useState(isNational ? 2 : 1);
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [file, setFile] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [resultsTab, setResultsTab] = useState("centres");
    const [selectedCentreId, setSelectedCentreId] = useState(null);
    const [selectedRegionId, setSelectedRegionId] = useState(null);
    const [showChiffrageBatch, setShowChiffrageBatch] = useState(false);

    useEffect(() => {
        if (!isNational) api.regions().then(setRegions).catch(console.error);
    }, [isNational]);

    useEffect(() => {
        if (step === 4) {
            setResultsTab(isNational ? "regions" : "centres");
            setSelectedCentreId(null);
            setSelectedRegionId(null);
        }
    }, [step, results, isNational]);

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
        if (f) setFile(f);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f?.name.endsWith(".xlsx")) setFile(f);
    };

    const handleSimulate = useCallback(async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const regionId = isNational ? null : selectedRegion?.id;
            const data = await api.simulateBatchComparatif(file, regionId);
            setResults(data);
            setStep(4);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [file, isNational, selectedRegion]);

    /** Agrégation résultats batch : KPI DB + 3 scénarios (même logique que comparatif par centre), lignes poste, centres */
    const batchResultsView = useMemo(() => {
        const par = results?.actuel?.par_centre;
        if (!par?.length) return null;

        const kpiDb = computeBatchKpiDb(par);
        const kpiActuel = computeBatchScenarioKpi(par, results.actuel?.par_centre, kpiDb.total);
        const kpiCons = computeBatchScenarioKpi(par, results.recommande?.par_centre, kpiDb.total);
        const kpiOpt = computeBatchScenarioKpi(par, results.optimise?.par_centre, kpiDb.total);

        const actuelEtp = kpiActuel.totalCalculated;
        const consEtp = kpiCons.totalCalculated;
        const optEtp = kpiOpt.totalCalculated;
        const ecartVsDbCalc = kpiActuel.totalGap;
        const tauxAdequation = kpiDb.total > 0 ? (actuelEtp / kpiDb.total) * 100 : 0;

        const actById = indexParCentreById(results.actuel?.par_centre);
        const recById = indexParCentreById(results.recommande?.par_centre);
        const optById = indexParCentreById(results.optimise?.par_centre);

        const centreRows = [...par]
            .sort((a, b) => (a.centre_label || "").localeCompare(b.centre_label || "", "fr"))
            .map((base) => {
                const db =
                    Number(base.actual_mod || 0) + Number(base.actual_aps_mod ?? 0);
                const ca = etpFinalFromRessourcesParPoste(actById[base.centre_id]);
                const cr = etpFinalFromRessourcesParPoste(recById[base.centre_id]);
                const co = etpFinalFromRessourcesParPoste(optById[base.centre_id]);
                return {
                    id: base.centre_id,
                    label: base.centre_label,
                    regionId: base.region_id,
                    region: base.region_label,
                    db,
                    calc: ca,
                    cons: cr,
                    opt: co,
                    dCalcVsDb: Math.round(ca - db),
                    dConsVsDb: Math.round(cr - db),
                    dOptVsDb: Math.round(co - db),
                    dConsVsCalc: Math.round(cr - ca),
                    dOptVsCalc: Math.round(co - ca),
                };
            });

        // Agrégation par région pour le mode national
        const regionMap = {};
        centreRows.forEach((c) => {
            const rid = c.regionId || c.region || "_";
            if (!regionMap[rid]) regionMap[rid] = { id: rid, label: c.region || rid, db: 0, calc: 0, cons: 0, opt: 0, nbCentres: 0 };
            regionMap[rid].db += c.db;
            regionMap[rid].calc += c.calc;
            regionMap[rid].cons += c.cons;
            regionMap[rid].opt += c.opt;
            regionMap[rid].nbCentres += 1;
        });
        const regionRows = Object.values(regionMap)
            .sort((a, b) => a.label.localeCompare(b.label, "fr"))
            .map((r) => ({
                ...r,
                dCalcVsDb: Math.round(r.calc - r.db),
                dConsVsDb: Math.round(r.cons - r.db),
                dOptVsDb: Math.round(r.opt - r.db),
                dConsVsCalc: Math.round(r.cons - r.calc),
                dOptVsCalc: Math.round(r.opt - r.calc),
            }));

        return {
            kpiDb,
            kpiActuel,
            kpiCons,
            kpiOpt,
            actuelEtp,
            consEtp,
            optEtp,
            ecartVsDbCalc,
            tauxAdequation,
            centreRows,
            regionRows,
            nbCentres: par.length,
            rawById: { actuel: actById, recommande: recById, optimise: optById },
            rawBase: par,
        };
    }, [results]);

    /** Centres visibles (filtre région en mode national). */
    const centresForRegionMemo = useMemo(() => {
        if (!batchResultsView) return [];
        const selectedRegionRow = batchResultsView.regionRows.find((r) => r.id === selectedRegionId);
        return selectedRegionId
            ? batchResultsView.centreRows.filter(
                (c) => c.regionId === selectedRegionId || c.region === selectedRegionRow?.label
            )
            : batchResultsView.centreRows;
    }, [batchResultsView, selectedRegionId]);

    /** Cumul par poste pour l’onglet Postes sans centre sélectionné (tout le périmètre ou région filtrée). */
    const postesAggregatedRows = useMemo(() => {
        if (!results?.actuel?.par_centre?.length) return [];
        let ids = null;
        if (isNational && selectedRegionId && centresForRegionMemo.length) {
            ids = new Set();
            centresForRegionMemo.forEach((c) => {
                ids.add(c.id);
                ids.add(String(c.id));
            });
        }
        return buildBatchPerPosteComparisonRows(results, ids);
    }, [results, isNational, selectedRegionId, centresForRegionMemo]);

    useEffect(() => {
        if (resultsTab === "agregat") setResultsTab("postes");
    }, [resultsTab]);

    /** Postes pour le centre sélectionné : uniquement les postes calculés (ressources_par_poste
     *  des 3 scénarios), la valeur DB vient de effectifs_par_poste pour le même libellé normalisé.
     *  Logique identique à PostesTabTable dans SimulationBatchPage. */
    const postesForSelectedCentre = useMemo(() => {
        if (!selectedCentreId || !batchResultsView) return [];
        const { rawById, rawBase } = batchResultsView;
        const baseRow = rawBase.find((r) => r.centre_id === selectedCentreId);
        if (!baseRow) return [];
        const actRow = rawById.actuel[selectedCentreId];
        const recRow = rawById.recommande[selectedCentreId];
        const optRow = rawById.optimise[selectedCentreId];

        // Clés depuis ressources_par_poste (MOD calculé). effectifs_par_poste côté API = MOD seulement
        // (effectif + APS par poste), excluant MOI.
        const keysNorm = new Set();
        const keyDisplay = {};
        const addK = (obj) => Object.keys(obj || {}).forEach((k) => {
            const n = normPosteKey(k);
            if (n) { keysNorm.add(n); if (!keyDisplay[n]) keyDisplay[n] = String(k).trim(); }
        });
        addK(actRow?.ressources_par_poste);
        addK(recRow?.ressources_par_poste);
        addK(optRow?.ressources_par_poste);
        addK(baseRow?.effectifs_par_poste);

        if (keysNorm.size === 0) return [];

        return Array.from(keysNorm)
            .sort((a, b) => a.localeCompare(b, "fr"))
            .map((n) => {
                const db = sumPosteBucket(baseRow.effectifs_par_poste, n);
                const calc = Math.round(sumPosteBucket(actRow?.ressources_par_poste, n));
                const cons = Math.round(sumPosteBucket(recRow?.ressources_par_poste, n));
                const opt = Math.round(sumPosteBucket(optRow?.ressources_par_poste, n));
                return {
                    id: n,
                    label: keyDisplay[n] || n,
                    db,
                    calc,
                    cons,
                    opt,
                    dCalcVsDb: Math.round(calc - db),
                    dConsVsDb: Math.round(cons - db),
                    dOptVsDb: Math.round(opt - db),
                    dConsVsCalc: Math.round(cons - calc),
                    dOptVsCalc: Math.round(opt - calc),
                };
            });
    }, [selectedCentreId, batchResultsView]);

    const chiffrageParCentreMerged = useMemo(
        () => mergeParCentreForComparatif(results?.actuel, results?.recommande, results?.optimise),
        [results]
    );

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_20%_0%,rgba(14,165,233,0.07),transparent_50%),radial-gradient(ellipse_at_80%_5%,rgba(99,102,241,0.06),transparent_50%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-6">
            <div className="max-w-7xl mx-auto w-full min-w-0 px-2 sm:px-4">

                <div className="mb-8">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg bg-gradient-to-br from-[#005EA8] to-[#0A6BBC] shadow-blue-200">
                            {isNational ? <Globe className="w-6 h-6 text-white" /> : <GitCompareArrows className="w-6 h-6 text-white" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                    Comparatif {isNational ? "National" : "Régional"}
                                </h1>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isNational ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>
                                    {isNational ? "Réseau national" : selectedRegion ? selectedRegion.label : "Batch régional"}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                    <Sparkles className="w-3 h-3" />
                                    3 Scénarios
                                </span>
                            </div>
                            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                                {isNational
                                    ? "Comparez Actuel, Consolidé et Optimisé sur l’ensemble du réseau via un fichier Excel multi-centres."
                                    : "Comparez les trois processus pour tous les centres de la région via import Excel."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.45)] p-7">
                    <StepBar current={step} isNational={isNational} />

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
                            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-slate-50/40 p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <GitCompareArrows className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] font-black text-slate-800 mb-1">Fichier unique — 3 simulations automatiquement</p>
                                        <p className="text-[10px] text-slate-600 leading-relaxed">
                                            Un seul Excel déclenche les trois processus (Actuel, Consolidé, Optimisé) en parallèle.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 border border-blue-200 rounded-2xl p-5 space-y-2 shadow-sm">
                                <p className="text-[11px] font-black text-blue-900 flex items-center gap-2 uppercase tracking-wide">
                                    <span className="text-base">📋</span> Instructions
                                </p>
                                <ul className="space-y-1.5">
                                    {[
                                        "Une feuille par centre avec le canvas de volumes",
                                        <>Remplissez les cellules <span className="bg-blue-200/80 px-1.5 py-0.5 rounded text-blue-950">jaunes</span> avec les volumes annuels</>,
                                        <><strong>Ne renommez pas les onglets</strong> — ils identifient chaque centre</>,
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-[11px] text-blue-800">
                                            <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button onClick={handleDownloadTemplate} disabled={downloading}
                                    className="flex items-center gap-2 bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] hover:from-[#004e8a] hover:to-[#085a9c] disabled:opacity-60 text-white text-[11px] font-bold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg">
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

                    {step === 3 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Étape {isNational ? "2" : "3"}</h2>
                                <p className="text-lg font-bold text-slate-800">Importer le fichier rempli</p>
                            </div>
                            <div
                                onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                                onClick={() => document.getElementById("comparatif-batch-file").click()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${file ? "border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100/60 shadow-sm" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm bg-slate-50/50"}`}
                            >
                                <input id="comparatif-batch-file" type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
                                {file ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center shadow-sm">
                                            <FileSpreadsheet className="w-7 h-7 text-[#005EA8]" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-blue-800">{file.name}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} Ko</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            className="flex items-center gap-1.5 text-red-400 text-[10px] hover:text-red-600 bg-white border border-red-100 rounded-lg px-3 py-1.5 transition-colors">
                                            <X className="w-3 h-3" /> Supprimer
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                            <Upload className="w-7 h-7 text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-semibold text-slate-500">Glissez le fichier .xlsx ici</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">ou cliquez pour sélectionner</p>
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Formats acceptés : .xlsx</span>
                                    </div>
                                )}
                            </div>
                            {error && <div className="flex items-center gap-2 text-red-600 text-[11px] bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
                            <div className="flex items-center gap-3 flex-wrap">
                                <button disabled={!file || loading} onClick={handleSimulate}
                                    className="flex items-center gap-2 bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] hover:from-[#004e8a] hover:to-[#085a9c] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompareArrows className="w-4 h-4" />}
                                    {loading ? "Simulation des 3 processus…" : "Lancer le comparatif"}
                                </button>
                                {!isNational && (
                                    <button onClick={() => setStep(2)} className="text-[10px] text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2">← Retour</button>
                                )}
                            </div>
                            {loading && (
                                <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50/80 animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600" />
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-black text-slate-800">Calcul des trois processus en parallèle…</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {MODES_LIST.map((m) => (
                                                <span key={m.key} className={`text-[9px] font-bold ${m.text} ${m.bg} border ${m.border} px-2 py-0.5 rounded-full`}>{m.short}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 4 && results && !batchResultsView && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-5 py-6 text-center space-y-3">
                            <AlertTriangle className="w-8 h-8 text-[#005EA8] mx-auto" />
                            <p className="text-sm font-bold text-slate-800">Aucune donnée centre exploitable</p>
                            <p className="text-[11px] text-slate-600 max-w-md mx-auto">La réponse ne contient pas de lignes <code className="text-blue-900">par_centre</code>. Vérifiez le fichier ou les erreurs ci-dessus.</p>
                            <button type="button" onClick={() => { setStep(isNational ? 2 : 1); setResults(null); setFile(null); setError(null); }}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
                                <RefreshCcw className="w-3.5 h-3.5" /> Recommencer
                            </button>
                        </div>
                    )}

                    {step === 4 && results && batchResultsView && (() => {
                        const selectedCentreRow = batchResultsView.centreRows.find((r) => r.id === selectedCentreId);
                        const selectedRegionRow = batchResultsView.regionRows.find((r) => r.id === selectedRegionId);
                        return (
                            <div className="space-y-7">
                                {/* ── En-tête résultats ── */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <Sparkles className="w-4 h-4 text-blue-400" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                                                {isNational ? "Vue nationale" : "Vue régionale"} — Comparatif
                                            </p>
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                                <GitCompareArrows className="w-3 h-3" /> 3 processus
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-extrabold text-slate-900">Synthèse des trois scénarios</h2>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            {batchResultsView.nbCentres} centre(s) simulé(s)
                                            {!isNational && selectedRegion?.label ? ` · ${selectedRegion.label}` : isNational ? " · Réseau national" : ""}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => setShowChiffrageBatch(true)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 hover:border-[#005EA8]/30 transition-all shadow-sm"
                                        >
                                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Chiffrage
                                        </button>
                                        <button
                                            onClick={() => { setStep(isNational ? 2 : 1); setResults(null); setFile(null); setError(null); setSelectedCentreId(null); }}
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                        >
                                            <RefreshCcw className="w-3.5 h-3.5" /> Nouvelle simulation
                                        </button>
                                    </div>
                                </div>

                                <ChiffrageBatchHierarchyDialog
                                    open={showChiffrageBatch}
                                    onOpenChange={setShowChiffrageBatch}
                                    variant="comparatif"
                                    par_centre={chiffrageParCentreMerged}
                                />

                                {/* ── Grille KPI ── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <KpiCard icon={Users} label="Effectif actuel" value={fmt(batchResultsView.kpiDb.total)} sub="Référence MOD + APS (postes MOD)" color="blue" />
                                <KpiCard icon={Calculator} label="Scénario Calculé" value={fmt(Math.round(batchResultsView.actuelEtp))} sub={`MOD calculé · Δ vs ACT. ${batchResultsView.ecartVsDbCalc >= 0 ? "+" : ""}${fmt(batchResultsView.ecartVsDbCalc)}`} color="blue" />
                                <KpiCard icon={BookText} label="Scénario Consolidé" value={fmt(Math.round(batchResultsView.consEtp))} sub={`MOD calculé · Δ vs ACT. ${batchResultsView.kpiCons.totalGap >= 0 ? "+" : ""}${fmt(batchResultsView.kpiCons.totalGap)}`} color="blue2" />
                                <KpiCard icon={Sparkles} label="Scénario Optimisé" value={fmt(Math.round(batchResultsView.optEtp))} sub={`MOD calculé · Δ vs ACT. ${batchResultsView.kpiOpt.totalGap >= 0 ? "+" : ""}${fmt(batchResultsView.kpiOpt.totalGap)}`} color="blue3" />
                            </div>

                                {/* ── Barre d'onglets (identique SimulationBatchPage) ── */}
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between border-b border-slate-100 bg-white px-2 gap-1">
                                        <div className="flex items-center gap-1 overflow-x-auto">
                                            {isNational && (
                                                <TabButton
                                                    active={resultsTab === "regions"}
                                                    onClick={() => setResultsTab("regions")}
                                                    icon={MapPin} label="Régions"
                                                    count={batchResultsView.regionRows.length}
                                                    color="blue"
                                                />
                                            )}
                                            <TabButton
                                                active={resultsTab === "centres"}
                                                onClick={() => setResultsTab("centres")}
                                                icon={Building2} label="Centres"
                                                count={centresForRegionMemo.length}
                                                color="blueMid"
                                            />
                                            <TabButton
                                                active={resultsTab === "postes"}
                                                onClick={() => setResultsTab("postes")}
                                                icon={Layers} label="Postes"
                                                count={
                                                    selectedCentreId
                                                        ? postesForSelectedCentre.length
                                                        : postesAggregatedRows.length
                                                }
                                                color="blueDeep"
                                            />
                                        </div>
                                    </div>

                                    {/* ── Onglet Régions (national uniquement) ── */}
                                    {resultsTab === "regions" && isNational && (
                                        <div className="rounded-2xl border border-slate-200/40 bg-white/95 overflow-hidden shadow-sm">
                                            <ComparatifScenarioMetricsTable
                                                rows={batchResultsView.regionRows}
                                                density="comfortable"
                                                emptyColSpan={12}
                                                emptyMessage="Aucune région disponible."
                                                getRowProps={(r) => ({
                                                    onClick: () => {
                                                        setSelectedRegionId(r.id);
                                                        setSelectedCentreId(null);
                                                        setResultsTab("centres");
                                                    },
                                                    className: "cursor-pointer",
                                                })}
                                                renderLeadHeaderRow1={() => (
                                                    <>
                                                        <TableHead
                                                            rowSpan={2}
                                                            className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 border-b border-r border-slate-200/70 bg-slate-50/90 min-w-[12rem] max-w-[min(28vw,20rem)]"
                                                        >
                                                            Région
                                                        </TableHead>
                                                        <TableHead
                                                            rowSpan={2}
                                                            className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-r border-slate-200/70 bg-slate-100/40 w-[5.5rem] min-w-[5.5rem] whitespace-nowrap"
                                                            title="Nombre de centres"
                                                        >
                                                            Centres
                                                        </TableHead>
                                                        <TableHead rowSpan={2} className="w-12 min-w-[3rem] border-b border-slate-200/70 bg-slate-50/90" aria-hidden />
                                                    </>
                                                )}
                                                renderLeadCell={(r) => (
                                                    <>
                                                        <TableCell className="px-4 py-3 border-r border-slate-100/90 min-w-0 max-w-[min(28vw,20rem)]">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                                                                    <MapPin className="w-4 h-4 text-blue-500" />
                                                                </div>
                                                                <span className="font-bold text-slate-800 text-xs group-hover:text-[#005EA8] transition-colors leading-snug">{r.label}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-3 py-3 text-center border-r border-slate-100/80 w-[5.5rem]">
                                                            <span className="inline-flex bg-slate-100 text-slate-600 rounded-lg px-3 py-1.5 text-[11px] font-bold tabular-nums">{r.nbCentres}</span>
                                                        </TableCell>
                                                        <TableCell className="px-2 py-3 text-right border-r border-slate-100/80 w-12">
                                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#005EA8] transition-colors ml-auto" />
                                                        </TableCell>
                                                    </>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {/* ── Onglet Centres ── */}
                                    {resultsTab === "centres" && (
                                        <div>
                                            {isNational && selectedRegionRow && (
                                                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50 bg-slate-50/40">
                                                    <button
                                                        onClick={() => { setSelectedRegionId(null); setResultsTab("regions"); }}
                                                        className="text-[10px] text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" /> Toutes les régions
                                                    </button>
                                                    <span className="text-slate-300">›</span>
                                                    <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full px-3 py-1 text-[10px] font-bold">
                                                        <MapPin className="w-3 h-3" />{selectedRegionRow.label}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="rounded-2xl border border-slate-200/40 bg-white/95 overflow-hidden shadow-sm">
                                                <ComparatifScenarioMetricsTable
                                                    rows={centresForRegionMemo}
                                                    density="comfortable"
                                                    emptyColSpan={isNational ? 12 : 11}
                                                    emptyMessage="Aucun centre disponible."
                                                    getRowProps={(row) => ({
                                                        onClick: () => {
                                                            setSelectedCentreId(row.id);
                                                            setResultsTab("postes");
                                                        },
                                                        className: "cursor-pointer",
                                                    })}
                                                    renderLeadHeaderRow1={() => (
                                                        <>
                                                            <TableHead
                                                                rowSpan={2}
                                                                className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 border-b border-r border-slate-200/70 bg-slate-50/90 min-w-[14rem]"
                                                            >
                                                                Centre
                                                            </TableHead>
                                                            {isNational && (
                                                                <TableHead
                                                                    rowSpan={2}
                                                                    className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 border-b border-r border-slate-200/70 bg-slate-50/90 min-w-[9rem] max-w-[14rem]"
                                                                >
                                                                    Région
                                                                </TableHead>
                                                            )}
                                                            <TableHead rowSpan={2} className="w-12 min-w-[3rem] border-b border-slate-200/70 bg-slate-50/90" aria-hidden />
                                                        </>
                                                    )}
                                                    renderLeadCell={(row) => (
                                                        <>
                                                            <TableCell className="px-4 py-3 border-r border-slate-100/90 min-w-0">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                                                                        <Building2 className="w-4 h-4 text-[#005EA8]" />
                                                                    </div>
                                                                    <span className="font-bold text-slate-800 text-xs group-hover:text-[#005EA8] transition-colors leading-snug">{row.label}</span>
                                                                </div>
                                                            </TableCell>
                                                            {isNational && (
                                                                <TableCell className="px-4 py-3 border-r border-slate-100/90 min-w-0 max-w-[14rem]">
                                                                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1 text-[11px] font-medium" title={row.region}>
                                                                        <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
                                                                        <span className="truncate">{row.region}</span>
                                                                    </span>
                                                                </TableCell>
                                                            )}
                                                            <TableCell className="px-2 py-3 text-right border-r border-slate-100/80 w-12">
                                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#005EA8] transition-colors ml-auto" />
                                                            </TableCell>
                                                        </>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Onglet Postes (drill-down centre) ── */}
                                    {resultsTab === "postes" && (
                                        <div>
                                            {selectedCentreRow ? (
                                                <>
                                                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50 bg-slate-50/40 flex-wrap">
                                                        {isNational && selectedRegionRow && (
                                                            <>
                                                                <button
                                                                    onClick={() => { setSelectedRegionId(null); setSelectedCentreId(null); setResultsTab("regions"); }}
                                                                    className="text-[10px] text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1 transition-colors"
                                                                >
                                                                    <X className="w-3 h-3" /> Toutes les régions
                                                                </button>
                                                                <span className="text-slate-300">›</span>
                                                                <button
                                                                    onClick={() => { setSelectedCentreId(null); setResultsTab("centres"); }}
                                                                    className="text-[10px] text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                                                                >
                                                                    <MapPin className="w-3 h-3" />{selectedRegionRow.label}
                                                                </button>
                                                                <span className="text-slate-300">›</span>
                                                            </>
                                                        )}
                                                        {!isNational && (
                                                            <>
                                                                <button
                                                                    onClick={() => { setSelectedCentreId(null); setResultsTab("centres"); }}
                                                                    className="text-[10px] text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1 transition-colors"
                                                                >
                                                                    <X className="w-3 h-3" /> Tous les centres
                                                                </button>
                                                                <span className="text-slate-300">›</span>
                                                            </>
                                                        )}
                                                        <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-[#005EA8] rounded-full px-3 py-1 text-[10px] font-bold">
                                                            <Building2 className="w-3 h-3" />{selectedCentreRow.label}
                                                        </span>
                                                        <span className="text-slate-300 hidden sm:inline">·</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCentreId(null)}
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-[#005EA8] transition-colors sm:ml-auto"
                                                            title="Revenir au cumul par poste (périmètre actuel)"
                                                        >
                                                            <RotateCcw className="w-3 h-3 shrink-0" />
                                                            Réinitialiser le filtre
                                                        </button>
                                                        {isNational && selectedRegionId && (
                                                            <>
                                                                <span className="text-slate-300 hidden sm:inline">·</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setSelectedCentreId(null); setSelectedRegionId(null); }}
                                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors"
                                                                    title="Cumul national : enlever région et centre"
                                                                >
                                                                    <RotateCcw className="w-3 h-3 shrink-0" />
                                                                    Tout réinitialiser
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-200/40 bg-white/95 overflow-hidden shadow-sm">
                                                        <ComparatifScenarioMetricsTable
                                                            rows={postesForSelectedCentre}
                                                            density="compact"
                                                            emptyColSpan={10}
                                                            emptyMessage="Aucun poste disponible pour ce centre."
                                                            renderLeadHeaderRow1={() => (
                                                                <TableHead
                                                                    rowSpan={2}
                                                                    className="sticky left-0 z-40 min-w-0 w-[12%] bg-slate-50/90 backdrop-blur-md font-black text-slate-800 text-[8px] sm:text-[10px] uppercase tracking-tight sm:tracking-widest h-12 sm:h-14 px-2 sm:px-4 border-b border-r border-slate-200/70"
                                                                >
                                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                                        <Network className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#005EA8]/90 shrink-0" />
                                                                        <span className="leading-tight">Poste</span>
                                                                    </div>
                                                                </TableHead>
                                                            )}
                                                            renderLeadCell={(row) => (
                                                                <TableCell className="sticky left-0 z-10 bg-inherit px-2 sm:px-3 py-2 border-r border-slate-100/90 min-w-0 max-w-[10rem] sm:max-w-none">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                                            <Layers className="w-3 h-3 text-[#005EA8]" />
                                                                        </div>
                                                                        <span className="font-semibold text-slate-700 text-xs truncate" title={row.label}>{row.label}</span>
                                                                    </div>
                                                                </TableCell>
                                                            )}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 border-b border-slate-50 bg-slate-50/40 text-[10px] text-slate-600">
                                                        <Layers className="w-3.5 h-3.5 text-[#005EA8] shrink-0" />
                                                        {isNational && selectedRegionRow && (
                                                            <>
                                                                <span className="inline-flex items-center gap-1 font-bold text-blue-800">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {selectedRegionRow.label}
                                                                </span>
                                                                <span className="text-slate-300 hidden sm:inline">·</span>
                                                            </>
                                                        )}
                                                        <span>
                                                            Cumul par poste sur{" "}
                                                            <strong className="text-slate-800 tabular-nums">{centresForRegionMemo.length}</strong>{" "}
                                                            centre{centresForRegionMemo.length !== 1 ? "s" : ""}
                                                            {isNational && !selectedRegionId ? " (réseau national)" : ""}
                                                        </span>
                                                        <span className="text-slate-300 hidden sm:inline">·</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setResultsTab("centres")}
                                                            className="font-bold text-[#005EA8] hover:underline"
                                                        >
                                                            Choisir un centre pour le détail
                                                        </button>
                                                        {isNational && selectedRegionId && (
                                                            <>
                                                                <span className="text-slate-300 hidden sm:inline">·</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedRegionId(null)}
                                                                    className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-[#005EA8] transition-colors"
                                                                >
                                                                    <RotateCcw className="w-3 h-3" />
                                                                    Réinitialiser le filtre
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-200/40 bg-white/95 overflow-hidden shadow-sm">
                                                        <ComparatifScenarioMetricsTable
                                                            rows={postesAggregatedRows}
                                                            density="compact"
                                                            emptyColSpan={10}
                                                            emptyMessage="Aucun poste agrégé sur ce périmètre."
                                                            renderLeadHeaderRow1={() => (
                                                                <TableHead
                                                                    rowSpan={2}
                                                                    className="sticky left-0 z-40 min-w-0 w-[12%] bg-slate-50/90 backdrop-blur-md font-black text-slate-800 text-[8px] sm:text-[10px] uppercase tracking-tight sm:tracking-widest h-12 sm:h-14 px-2 sm:px-4 border-b border-r border-slate-200/70"
                                                                >
                                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                                        <Network className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#005EA8]/90 shrink-0" />
                                                                        <span className="leading-tight">Poste</span>
                                                                    </div>
                                                                </TableHead>
                                                            )}
                                                            renderLeadCell={(row) => (
                                                                <TableCell
                                                                    className="sticky left-0 z-10 bg-inherit px-2 sm:px-3 py-2 font-semibold text-slate-700 text-[10px] sm:text-xs border-r border-slate-100/90 shadow-[2px_0_12px_-6px_rgba(15,23,42,0.05)] min-w-0 max-w-[10rem] sm:max-w-none truncate"
                                                                    title={row.label}
                                                                >
                                                                    {row.label}
                                                                </TableCell>
                                                            )}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
