"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import {
    History,
    Play,
    Calendar,
    Search,
    TrendingUp,
    Clock,
    RefreshCw,
    Download,
    MoreHorizontal,
    X,
    Database,
    Building2,
    Users,
    StopCircle,
    RotateCcw,
    MessageSquare,
    ChevronRight,
    ArrowRight,
    Filter,
    FileSpreadsheet
} from "lucide-react";

// --- 1. COMPOSANTS UI UTILITAIRES ---

const Tooltip = ({ children, content }) => (
    <div className="group relative flex items-center">
        {children}
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 text-white text-[11px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 pointer-events-none whitespace-nowrap z-30 shadow-xl border border-slate-700">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
    </div>
);

// --- 2. COMPOSANT HEATMAP (GITHUB LIGHT STYLE) ---

const ActivityHeatmap = ({ data, onDateSelect, selectedDate }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [tooltipData, setTooltipData] = useState(null);

    // Préparation des données journalières
    const dailyStats = useMemo(() => {
        const stats = {};
        data.forEach(sim => {
            const date = new Date(sim.launched_at).toISOString().split('T')[0];
            if (!stats[date]) stats[date] = { count: 0, totalEtp: 0, totalHours: 0 };
            stats[date].count += 1;
            stats[date].totalEtp += sim.etp_calcule || 0;
            stats[date].totalHours += sim.heures_necessaires || 0;
        });
        return stats;
    }, [data]);

    // Génération de la grille calendaire et positionnement des mois
    const { calendarGrid, monthLabels } = useMemo(() => {
        const startDate = new Date(year, 0, 1);
        const grid = [];
        const monthPos = [];
        const visitedMonths = new Set();

        // Trouver le premier dimanche pour aligner la grille
        const firstSunday = new Date(startDate);
        firstSunday.setDate(startDate.getDate() - startDate.getDay());

        for (let w = 0; w < 53; w++) {
            for (let d = 0; d < 7; d++) {
                const date = new Date(firstSunday);
                date.setDate(firstSunday.getDate() + (w * 7) + d);
                const isCurrentYear = date.getFullYear() === year;

                if (isCurrentYear) {
                    const m = date.getMonth();
                    if (!visitedMonths.has(m)) {
                        visitedMonths.add(m);
                        // Ajoute le label au début de la semaine où le mois commence
                        monthPos.push({
                            name: date.toLocaleString('default', { month: 'short' }),
                            week: w
                        });
                    }
                }
                grid.push({ date: isCurrentYear ? date : null });
            }
        }
        return { calendarGrid: grid, monthLabels: monthPos };
    }, [year]);

    // Échelle de couleurs GitHub Light (Greens)
    const getColor = (count) => {
        if (!count) return "bg-slate-100 border-slate-200"; // Level 0 (Vide) - Light Grey
        if (count === 1) return "bg-[#9be9a8] border-[#9be9a8]"; // Level 1 - Light Green
        if (count <= 3) return "bg-[#40c463] border-[#40c463]"; // Level 2 - Medium Green
        if (count <= 5) return "bg-[#30a14e] border-[#30a14e]"; // Level 3 - Strong Green
        return "bg-[#216e39] border-[#216e39]"; // Level 4 (Max) - Dark Green
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            {/* Header / Titre */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Activité {year}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Densité des simulations par jour</p>
                </div>

                {/* Sélecteur d'année (Light Style) */}
                <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                    {[2024, 2025].map(y => (
                        <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${year === y
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                                }`}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-4">
                {/* Jours de la semaine (Axe Y) */}
                <div className="flex flex-col justify-between py-[18px] h-[100px] text-[9px] font-bold text-slate-400 w-6">
                    <span>Lun</span>
                    <span>Mer</span>
                    <span>Ven</span>
                </div>

                {/* Heatmap Grid & Month Labels */}
                <div className="flex-1 overflow-x-auto">
                    {/* Month Labels (Axe X) */}
                    <div className="relative w-max h-4 mb-2">
                        {monthLabels.map((m, i) => (
                            <span
                                key={i}
                                className="absolute text-[10px] text-slate-500 font-bold"
                                style={{ left: `${m.week * 14}px` }}
                            >
                                {m.name}
                            </span>
                        ))}
                    </div>

                    {/* La Grille */}
                    <div className="flex flex-col flex-wrap h-[98px] gap-[3px] content-start w-max">
                        {calendarGrid.map((cell, i) => {
                            if (!cell.date) return <div key={i} className="w-[11px] h-[11px]" />; // Spacer vide

                            const dateStr = cell.date.toISOString().split('T')[0];
                            const dayStats = dailyStats[dateStr];
                            const count = dayStats?.count || 0;
                            const isSelected = selectedDate === dateStr;

                            return (
                                <div
                                    key={dateStr}
                                    onMouseEnter={(e) => {
                                        const rect = e.target.getBoundingClientRect();
                                        setTooltipData({ x: rect.left + window.scrollX - 70, y: rect.top + window.scrollY - 100, date: cell.date, ...dayStats });
                                    }}
                                    onMouseLeave={() => setTooltipData(null)}
                                    onClick={() => onDateSelect(isSelected ? "" : dateStr)}
                                    className={`w-[11px] h-[11px] rounded-[2px] transition-all duration-150 cursor-pointer border ${getColor(count)} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-10 scale-125' : 'hover:ring-2 hover:ring-slate-300 hover:scale-125 hover:z-10'
                                        }`}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Légende en bas */}
            <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-slate-400 font-medium">
                <span>Moins</span>
                <div className="flex gap-[3px]">
                    <div className="w-[10px] h-[10px] bg-slate-100 rounded-[2px] border border-slate-200" />
                    <div className="w-[10px] h-[10px] bg-[#9be9a8] rounded-[2px] border border-[#9be9a8]" />
                    <div className="w-[10px] h-[10px] bg-[#40c463] rounded-[2px] border border-[#40c463]" />
                    <div className="w-[10px] h-[10px] bg-[#30a14e] rounded-[2px] border border-[#30a14e]" />
                    <div className="w-[10px] h-[10px] bg-[#216e39] rounded-[2px] border border-[#216e39]" />
                </div>
                <span>Plus</span>
            </div>

            {/* Tooltip (Gardé sombre pour le contraste) */}
            {tooltipData && (
                <div
                    className="fixed z-50 pointer-events-none bg-slate-900 text-white text-[10px] rounded-md p-3 shadow-xl w-48 animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: tooltipData.y, left: tooltipData.x }}
                >
                    <div className="font-bold text-slate-200 mb-2 border-b border-slate-700 pb-1">
                        {tooltipData.date.toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {tooltipData.count ? (
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Activité</span>
                                <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[9px]">{tooltipData.count} sims</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Moy. ETP</span>
                                <span className="font-mono text-emerald-400 font-bold">{(tooltipData.totalEtp / tooltipData.count).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Moy. Heures</span>
                                <span className="font-mono text-blue-400 font-bold">{(tooltipData.totalHours / tooltipData.count).toFixed(2)} h</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-500 italic text-center py-1">Pas d'activité ce jour-là.</div>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900 mt.px" />
                </div>
            )}
        </div>
    );
};

// --- PAGE PRINCIPALE ---

export default function SimulationHistoryPage() {
    const navigate = useNavigate();
    const [simulations, setSimulations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [centres, setCentres] = useState([]);
    // Removed selectedSim state

    // Filtres
    const [filters, setFilters] = useState({
        centre_id: "",
        selectedDate: "",
        productivityMin: 0,
        resultType: "all",
        limit: 100,
        search: ""
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [histData, centresData] = await Promise.all([
                api.getSimulationHistory({ limit: filters.limit }),
                api.centres()
            ]);
            setSimulations(histData.simulations || []);
            setCentres(centresData || []);
        } catch (error) {
            console.error("Erreur chargement:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSimulations = useMemo(() => {
        return simulations.filter(sim => {
            if (filters.centre_id && sim.centre_id !== Number(filters.centre_id)) return false;

            if (filters.search) {
                const search = filters.search.toLowerCase();
                const match =
                    sim.centre_label?.toLowerCase().includes(search) ||
                    sim.commentaire?.toLowerCase().includes(search) ||
                    String(sim.simulation_id).includes(search);
                if (!match) return false;
            }

            if (sim.productivite < filters.productivityMin) return false;

            if (filters.resultType === "with_etp" && (!sim.etp_calcule || sim.etp_calcule <= 0)) return false;
            if (filters.resultType === "zero_etp" && sim.etp_calcule > 0) return false;

            if (filters.selectedDate) {
                const simDate = new Date(sim.launched_at).toISOString().split('T')[0];
                if (simDate !== filters.selectedDate) return false;
            }

            return true;
        });
    }, [simulations, filters]);

    const stats = useMemo(() => {
        if (filteredSimulations.length === 0) return { derniereSim: "-" };

        const dates = filteredSimulations.map(s => new Date(s.launched_at));

        return {
            derniereSim: new Date(Math.max(...dates)).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        };
    }, [filteredSimulations]);

    const handleExport = async () => {
        try {
            const blob = await api.exportHistoryExcel({ centre_id: filters.centre_id || null });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Historique_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error(e);
            alert("Erreur export");
        }
    };

    const handleReplay = async (simulationId) => {
        try {
            const data = await api.getSimulationReplay(simulationId);
            navigate('/app/simulation/centre', {
                state: {
                    flux: 'centre',
                    replayData: {
                        centre_id: data.centre_id,
                        productivite: data.productivite,
                        volumes: data.volumes,
                        unites: data.unites,
                        commentaire: `Replay #${simulationId}`,
                        isReplay: true,
                        originalSimulationId: simulationId
                    }
                }
            });
        } catch (error) {
            console.error("Erreur replay:", error);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        return {
            date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
            time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        };
    };

    const resetFilters = () => setFilters({ centre_id: "", selectedDate: "", productivityMin: 0, resultType: "all", search: "", limit: 100 });

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">

            {/* HERO HEADER DASHBOARD COMPACT */}
            <div className="max-w-full px-4 sm:px-6 lg:px-8 py-3 space-y-4">

                {/* SECTION 1: HEADER & STATS SUMMARY (DISCREET) */}
                <section>
                    <div className="mb-6">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                                <History className="w-6 h-6 text-blue-600" />
                                Historique Simulations
                            </h1>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                                <p className="text-slate-500 text-sm font-medium">Audit et suivi des résultats</p>

                                {!loading && filteredSimulations.length > 0 && (
                                    <>
                                        <div className="hidden sm:block w-px h-4 bg-slate-300"></div>
                                        <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <Database className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-slate-700 font-bold">{filteredSimulations.length}</span>
                                                <span>simulations</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                                                <span className="text-slate-400">Dernière Simulation:</span>
                                                <span className="text-slate-700">{stats.derniereSim}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: FILTERS & CONTROL PANEL (Redesigned & COMPACT) */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 transition-all hover:shadow-md z-20 relative">
                    <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between">

                        {/* LEFT: SMART FILTERS */}
                        <div className="flex flex-col sm:flex-row flex-1 w-full items-center gap-2">

                            {/* Input 1: Recherche Globale */}
                            <div className="relative w-full sm:flex-1 group">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Mot-clé, Centre, ID..."
                                    value={filters.search}
                                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                                    className="block w-full h-8 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                />
                            </div>

                            {/* Input 2: Sélecteur de Centre */}
                            <div className="relative w-full sm:w-[240px] shrink-0 group">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <Building2 className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <select
                                    value={filters.centre_id}
                                    onChange={e => setFilters({ ...filters, centre_id: e.target.value })}
                                    className="block w-full h-8 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all hover:bg-slate-100"
                                >
                                    <option value="">Tous les centres</option>
                                    {centres.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                                    <ChevronRight className="h-3 w-3 text-slate-400 rotate-90" />
                                </div>
                            </div>

                            {/* Input 3: Date Picker */}
                            <div className="relative w-full sm:w-[140px] shrink-0 group">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="date"
                                    value={filters.selectedDate}
                                    onChange={e => setFilters({ ...filters, selectedDate: e.target.value })}
                                    className="block w-full h-8 pl-9 pr-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all hover:bg-slate-100 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* RIGHT: SMART ACTIONS */}
                        <div className="flex items-center gap-2 shrink-0 w-full xl:w-auto justify-end border-t xl:border-t-0 border-slate-100 pt-3 xl:pt-0">

                            {/* Reset Button (Conditional) */}
                            <AnimatePresence>
                                {(filters.search || filters.centre_id || filters.selectedDate) && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        onClick={resetFilters}
                                        className="flex items-center gap-1.5 px-3 h-8 text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all mr-auto xl:mr-0"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Reset</span>
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            <div className="h-5 w-px bg-slate-200 hidden xl:block mx-1"></div>

                            {/* Export Button */}
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-1.5 px-3 h-8 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg shadow-sm hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow transition-all active:scale-[0.98]"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Export CSV</span>
                            </button>

                            {/* Refresh Button (Primary) */}
                            <button
                                onClick={loadData}
                                className="flex items-center gap-1.5 px-3 h-8 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-md shadow-slate-900/10 hover:bg-slate-800 hover:shadow-lg transition-all active:scale-[0.98]"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Actualiser</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* SECTION 3: ANALYTICAL HEATMAP (GITHUB LIGHT STYLE) */}
                <section className="animate-in fade-in duration-500">
                    <ActivityHeatmap
                        data={filters.centre_id ? simulations.filter(s => s.centre_id === Number(filters.centre_id)) : simulations}
                        selectedDate={filters.selectedDate}
                        onDateSelect={(date) => setFilters({ ...filters, selectedDate: date })}
                    />
                </section>

                {/* SECTION 4: SIMULATION RESULTS TABLE */}
                <section>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200">
                                    <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider w-[28%]">Simulation</th>
                                    <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider w-[20%] text-center">Productivité</th>
                                    <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider w-[25%]">Résultats</th>
                                    <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider w-[10%] text-center">Infos</th>
                                    <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider w-[17%] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                                                <span className="text-xs text-slate-400 font-medium">Chargement des simulations...</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {!loading && filteredSimulations.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                            <p className="text-sm text-slate-500 font-medium">Aucun résultat trouvé pour cette sélection.</p>
                                        </td>
                                    </tr>
                                )}

                                <AnimatePresence mode="popLayout">
                                    {filteredSimulations.map((sim, index) => {
                                        const { date, time } = formatDate(sim.launched_at);
                                        return (
                                            <motion.tr
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                transition={{ duration: 0.2, delay: index * 0.03, ease: "easeOut" }}
                                                key={sim.simulation_id}
                                                // Removed onClick for modal
                                                className="group hover:bg-slate-50/80 transition-colors duration-150 relative"
                                            >
                                                {/* Colonne Simulation (Centre + Date) */}
                                                <td className="px-6 py-3 align-middle">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors duration-200">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{sim.centre_label}</div>
                                                            <div className="text-[10px] text-slate-400 font-medium mt-0.5 group-hover:text-slate-500 transition-colors">
                                                                <span className="font-mono text-slate-300 mr-2">#{sim.simulation_id}</span>
                                                                {date} <span className="text-slate-300 px-1">•</span> {time}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Colonne Productivité (Avec animation de jauge) */}
                                                <td className="px-6 py-3 align-middle">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`text-sm font-bold mb-1 transition-transform duration-300 group-hover:scale-110 ${sim.productivite >= 100 ? 'text-emerald-600' :
                                                                sim.productivite >= 90 ? 'text-blue-600' : 'text-amber-500'
                                                            }`}>
                                                            {sim.productivite}%
                                                        </div>
                                                        <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ease-out ${sim.productivite >= 100 ? 'bg-emerald-500' :
                                                                        sim.productivite >= 90 ? 'bg-blue-500' : 'bg-amber-500'
                                                                    }`}
                                                                style={{ width: `${Math.min(sim.productivite, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Colonne Résultats (Highlight au survol) - POLICES RÉDUITES */}
                                                <td className="px-6 py-3 align-middle">
                                                    <div className="flex items-center gap-5">
                                                        <div className="group/item">
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase mb-0.5 flex items-center gap-1">
                                                                <Users className="w-2.5 h-2.5" /> ETP
                                                            </div>
                                                            <div className="text-sm font-bold text-slate-700 group-hover/item:text-blue-600 transition-colors tabular-nums">
                                                                {sim.etp_calcule ? sim.etp_calcule.toFixed(2) : "-"}
                                                            </div>
                                                        </div>
                                                        <div className="h-6 w-px bg-slate-100" />
                                                        <div className="group/item">
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase mb-0.5 flex items-center gap-1">
                                                                <Clock className="w-2.5 h-2.5" /> Heures
                                                            </div>
                                                            <div className="text-xs font-bold text-slate-500 group-hover/item:text-slate-800 transition-colors tabular-nums mt-0.5">
                                                                {sim.heures_necessaires ? sim.heures_necessaires.toFixed(0) : "-"} h
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Colonne Commentaire (Tooltip only) */}
                                                <td className="px-6 py-3 align-middle text-center">
                                                    {sim.commentaire ? (
                                                        <Tooltip content={sim.commentaire}>
                                                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100 hover:scale-110 hover:border-yellow-300 transition-all cursor-help shadow-sm">
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                            </div>
                                                        </Tooltip>
                                                    ) : (
                                                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-300">
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Colonne Actions (Slide effect) */}
                                                <td className="px-6 py-3 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleReplay(sim.simulation_id); }}
                                                            className="group/btn relative overflow-hidden px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-md shadow-sm hover:border-blue-300 hover:text-blue-600 hover:shadow-md transition-all flex items-center gap-1.5"
                                                        >
                                                            <span className="relative z-10 transition-transform duration-200 group-hover/btn:translate-x-[-2px]">Rejouer</span>
                                                            <Play className="w-2.5 h-2.5 fill-current relative z-10 transition-transform duration-200 group-hover/btn:translate-x-[2px]" />
                                                        </button>

                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
