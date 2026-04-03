import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    BarChart3,
    Settings2,
    Check,
    ArrowLeft,
    Download,
    FileSpreadsheet,
    File as FileIcon,
    Maximize2,
    Activity,
    FileSearch,
    ChevronRight,
    Loader2
} from "lucide-react";

import EsignLayout from "../components/EsignLayout.jsx";
import AdequationModal from "../components/ratios/AdequationModal.jsx";
import RatiosDetailedTable from "../components/ratios/RatiosDetailedTable.jsx";
import RatiosSummaryTable from "../components/ratios/RatiosSummaryTable.jsx";
import SimulationParamsCard from "../components/ratios/SimulationParamsCard.jsx";
import VolumeChartModal from "../components/ratios/VolumeChartModal.jsx";
import VolumeComparisonChart from "../components/ratios/VolumeComparisonChart.jsx";
import { ratiosApi } from "../services/ratiosApi.js";

const initialParams = {
    sacs_jour: 50,
    dossiers_mois: 6500,
    productivite: 100,
};

const timeframeLabels = {
    mois: "Volume moyen / Mois",
    jour: "Volume moyen / Jour",
    heure: "Volume moyen / Heure",
};

const timeframeColors = {
    mois: "from-blue-500/10 to-transparent",
    jour: "from-indigo-500/10 to-transparent",
    heure: "from-emerald-500/10 to-transparent",
};

const timeframeAccent = {
    mois: "text-blue-600 bg-blue-50 border-blue-100",
    jour: "text-indigo-600 bg-indigo-50 border-indigo-100",
    heure: "text-emerald-600 bg-emerald-50 border-emerald-100",
};

const RatiosProductivitePage = () => {
    const navigate = useNavigate();
    const dashboardRef = useRef(null);

    const [activeStep, setActiveStep] = useState(1);
    const [params, setParams] = useState(initialParams);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [showAdequation, setShowAdequation] = useState(false);
    const [activeChart, setActiveChart] = useState(null);

    // Calculs instantanés
    const calculated = useMemo(() => {
        const dossiers_par_jour = params.dossiers_mois / 22.0;
        const hNet = (8.0 * params.productivite) / 100.0 || 0.0001;
        const heures_net_par_jour = hNet > 0 ? hNet : 0.0001;
        return {
            dossiers_par_jour: Number(dossiers_par_jour.toFixed(2)),
            heures_net_par_jour: Number(heures_net_par_jour.toFixed(2)),
            volume_activites_par_heure_total: Number((dossiers_par_jour / heures_net_par_jour).toFixed(2)),
        };
    }, [params]);

    const handleParamChange = useCallback((field, value) => {
        setParams((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleRunSimulation = useCallback(async () => {
        setLoading(true);
        try {
            const response = await ratiosApi.simulate(params);
            setResult(response);
            toast.success("Simulation calculée avec succès");
            // Auto-transition vers les calculs après succès
            setActiveStep(2);
        } catch (error) {
            toast.error(error?.message ?? "Erreur lors de la simulation");
        } finally {
            setLoading(false);
        }
    }, [params]);

    // Lancer au chargement initial
    useEffect(() => {
        handleRunSimulation();
    }, []);

    const handleExportCsv = useCallback(async (scope) => {
        setExportLoading(true);
        try {
            await ratiosApi.exportCsv(params, scope);
            toast.success("Fichier CSV téléchargé");
        } catch (error) {
            toast.error(error?.message ?? "Impossible d'exporter");
        } finally {
            setExportLoading(false);
        }
    }, [params]);

    const handleExportExcel = useCallback(async (scope) => {
        setExportLoading(true);
        try {
            await ratiosApi.exportExcel(params, scope);
            toast.success("Fichier Excel téléchargé");
        } catch (error) {
            toast.error(error?.message ?? "Export Excel non disponible");
        } finally {
            setExportLoading(false);
        }
    }, [params]);

    const openChart = (type) => setActiveChart(type);
    const closeChart = () => setActiveChart(null);

    const chartToDisplay = useMemo(() => {
        if (!result || !activeChart) return null;
        return result.charts?.find((item) => item.type === activeChart) ?? null;
    }, [activeChart, result]);

    return (
        <EsignLayout activeKey="Ratios" className="bg-slate-50/50">
            <div className="w-full max-w-[1600px] mx-auto p-4 space-y-6 animate-in fade-in duration-700">

                {/* Premium Header */}
                <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-32 -mt-32 opacity-60" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center flex-col md:flex-row gap-4 text-center md:text-left">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 group shadow-sm bg-white"
                            >
                                <ArrowLeft size={20} className="text-slate-400 group-hover:text-blue-600" />
                            </button>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-500/20 shrink-0 transform rotate-3">
                                <Activity className="w-8 h-8 text-white -rotate-3" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-900">
                                    Ratios de Productivité
                                </h1>
                                <p className="text-slate-500 mt-1 text-xs max-w-xl font-medium">
                                    Analyse granulaire de la charge de travail et adéquation des ressources par position.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRunSimulation}
                                disabled={loading}
                                className="bg-[#005EA8] text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-[#072956] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Settings2 className="w-4 h-4" />}
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress Stepper */}
                <div className="relative py-4 max-w-3xl mx-auto w-full">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full z-0" />
                    <div
                        className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 -translate-y-1/2 rounded-full z-0 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: result ? '100%' : '33%' }}
                    />

                    <div className="relative z-10 flex justify-between w-full px-2">
                        {[
                            { step: 1, label: 'Configuration', icon: Settings2 },
                            { step: 2, label: 'Calculs', icon: Activity },
                            { step: 3, label: 'Analyses', icon: BarChart3 }
                        ].map((s) => {
                            const isDone = s.step < activeStep || (s.step === 2 && result) || (s.step === 3 && result);
                            const isActive = activeStep === s.step;

                            return (
                                <button
                                    key={s.step}
                                    onClick={() => setActiveStep(s.step)}
                                    className="flex flex-col items-center gap-3 group outline-none"
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition-all duration-500 
                                        ${isActive ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white scale-125 z-20' :
                                            isDone ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-300'}`}>
                                        <s.icon size={18} strokeWidth={isActive ? 3 : 2.5} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm border transition-all duration-500 
                                        ${isActive ? 'bg-white text-blue-700 border-blue-100 shadow-blue-100/50 scale-110' :
                                            isDone ? 'bg-blue-50/50 text-blue-500 border-blue-50' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        {s.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Conditionally Render Step Content */}
                {activeStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <SimulationParamsCard
                            params={params}
                            calculated={calculated}
                            loading={loading}
                            onChange={handleParamChange}
                            onSubmit={handleRunSimulation}
                            onShowAdequation={() => setShowAdequation(true)}
                        />
                    </div>
                )}

                {/* Loading State */}
                {loading && !result && (
                    <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-blue-200 bg-blue-50/30 p-20 text-blue-600 backdrop-blur-sm">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Activity className="w-6 h-6 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="text-base font-black uppercase tracking-widest block">Analyse en cours</span>
                            <span className="text-xs opacity-60">Calcul des ratios de productivité...</span>
                        </div>
                    </div>
                )}

                {/* Empty State for results */}
                {activeStep !== 1 && !loading && !result && (
                    <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 py-24 text-slate-400 transition-all hover:bg-white hover:border-blue-200 group">
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <FileSearch className="h-10 w-10 opacity-20 group-hover:opacity-60 transition-opacity" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-lg font-black text-slate-800 tracking-tight">Aucun résultat</p>
                            <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto text-balance">
                                Veuillez d'abord configurer et lancer la simulation dans l'onglet "Configuration".
                            </p>
                            <button
                                onClick={() => setActiveStep(1)}
                                className="mt-4 px-6 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
                            >
                                Retour à la configuration
                            </button>
                        </div>
                    </div>
                )}

                {/* Results UI */}
                {result && (
                    <div className="space-y-12">
                        {/* STEP 2: CALCULS */}
                        {activeStep === 2 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">Calculs des Flux</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Récapitulatif global et analyse par position</p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-3">
                                        <button
                                            onClick={() => handleExportExcel("global")}
                                            disabled={exportLoading}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 active:scale-95 shadow-sm disabled:opacity-50"
                                        >
                                            <FileSpreadsheet size={14} />
                                            Rapport Excel
                                        </button>
                                        <button
                                            onClick={() => setShowAdequation(true)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100 active:scale-95 shadow-sm"
                                        >
                                            <BarChart3 size={12} strokeWidth={3} />
                                            Indice d'Adéquation
                                        </button>
                                    </div>
                                </div>
                                <RatiosSummaryTable summary={result.summary} />
                                <RatiosDetailedTable rows={result.rows} />
                            </div>
                        )}

                        {/* STEP 3: ANALYSES */}
                        {activeStep === 3 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <BarChart3 size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">Analyses Visuelles</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Compositions et comparaisons de volumes</p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-3">
                                        <button
                                            onClick={() => handleExportExcel("global")}
                                            disabled={exportLoading}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 active:scale-95 shadow-sm disabled:opacity-50"
                                        >
                                            <FileSpreadsheet size={14} />
                                            Rapport Excel
                                        </button>
                                    </div>
                                </div>
                                <div className="grid gap-6 lg:grid-cols-3">
                                    {["mois", "jour", "heure"].map((timeframe) => {
                                        const chart = result.charts?.find((item) => item.type === timeframe) ?? null;
                                        return (
                                            <div
                                                key={timeframe}
                                                className={`group relative overflow-hidden rounded-3xl border border-white bg-white shadow-xl shadow-slate-200/50 p-6 transition-all hover:shadow-2xl hover:-translate-y-1`}
                                            >
                                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${timeframeColors[timeframe]} rounded-bl-full opacity-50 transition-all group-hover:scale-110`} />
                                                <div className="relative z-10 mb-6 flex items-center justify-between">
                                                    <div>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-1 border ${timeframeAccent[timeframe]}`}>
                                                            {timeframe}
                                                        </span>
                                                        <h3 className="text-sm font-black text-slate-900 leading-none">
                                                            {timeframeLabels[timeframe]}
                                                        </h3>
                                                    </div>
                                                    <button
                                                        onClick={() => openChart(timeframe)}
                                                        className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 transition-all hover:bg-white hover:text-blue-600 hover:border-blue-100 hover:shadow-lg active:scale-90"
                                                    >
                                                        <Maximize2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="relative z-10 h-[220px]">
                                                    {chart ? (
                                                        <VolumeComparisonChart data={chart.points} timeframe={chart.type} height={220} />
                                                    ) : (
                                                        <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400 gap-2 italic">
                                                            <Activity className="w-5 h-5 opacity-20" />
                                                            Pas de données
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Results UI common bottom padding or info could go here if needed, but keeping it clean */}
                        <div className="h-4" />
                    </div>
                )}
            </div>

            <Toaster position="top-right" />

            <AdequationModal
                isOpen={showAdequation}
                adequation={result?.adequation ?? null}
                onClose={() => setShowAdequation(false)}
                onExportExcel={handleExportExcel}
                isExporting={exportLoading}
            />

            <VolumeChartModal
                isOpen={Boolean(activeChart)}
                chart={chartToDisplay}
                onClose={closeChart}
            />
        </EsignLayout>
    );
};

export default RatiosProductivitePage;
