"use client";
import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
} from "@tanstack/react-table";
import {
    LayoutDashboard,
    ArrowRight,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Search,
    Settings2,
    PieChart as PieIcon,
    Filter,
    CheckCircle2,
    AlertTriangle,
    Info,
    ChevronDown,
    Building2,
    Scale,
    History,
    ArrowLeftRight
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"; // Assuming we have or can use standard Radix-like dialogs, otherwise I'll build a simple modal.

/* =========================================================================================
   UI HELPERS
   ========================================================================================= */

const Badge = ({ children, variant = "neutral", className = "" }) => {
    const styles = {
        neutral: "bg-slate-100 text-slate-700 border-slate-200",
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        danger: "bg-rose-50 text-rose-700 border-rose-200",
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
        blue: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${styles[variant]} ${className}`}>
            {children}
        </span>
    );
};

const Metric = ({ label, value, subtext, color = "slate" }) => (
    <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0">{label}</span>
        <span className={`text-lg font-bold text-${color}-800 leading-tight`}>{value}</span>
        {subtext && <span className="text-[10px] text-slate-400">{subtext}</span>}
    </div>
);

/* =========================================================================================
   MAIN COMPONENT
   ========================================================================================= */

export default function VueCategorie() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCenter, setSelectedCenter] = useState(null); // For Detail View

    // 🛡 FILTER STATES
    const [filterDirection, setFilterDirection] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all"); // all, changed, unchanged, alert
    const [globalFilter, setGlobalFilter] = useState("");

    // 🆔 SCENARIO ID GENERATION
    const [scenarioId] = useState(() => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
        return `SIM-${dateStr}-${timeStr}`;
    });

    // 🧠 SIMULATION RULE ENGINE (MOCK)
    // In a real app, this would come from the backend response
    const RUN_SIMULATION_MOCK = (centres, categories) => {
        return centres.map(c => {
            // Deterministic pseudo-random based on ID for consistent demo
            const seed = c.id * 13;

            // Mock Current Category (mapping generic names if needed)
            let currentCatLabel = categories.find(cat => cat.id === c.categorie_id)?.label || "Classe C";
            if (!currentCatLabel.startsWith("Classe")) currentCatLabel = "Classe C"; // Default cleanup

            // Generate Mock Metrics
            const volume = 20000 + (seed % 80000); // 20k - 100k
            const etp = 2 + (seed % 15);
            const complexite = (seed % 100) / 100;

            // RULES ENGINE (MOCK)
            // Rule 1: Volume > 80k OR ETP > 12 -> Classe A
            // Rule 2: Volume > 50k OR ETP > 6  -> Classe B
            // Rule 3: Volume > 25k -> Classe C
            // Else -> Classe D

            let newCatLabel = "Classe D";
            let justification = "Volume insuffisant pour maintenir la classe supérieure.";
            let score = volume / 100; // Mock score

            if (volume > 80000 || etp > 12) {
                newCatLabel = "Classe A";
                justification = "Volume annuel très élevé (> 80k) justifiant le statut Excellence.";
            } else if (volume > 50000 || etp > 6) {
                newCatLabel = "Classe B";
                justification = "Activité soutenue et effectif supérieur à l'effectif seuil (6 ETP).";
            } else if (volume > 25000) {
                newCatLabel = "Classe C";
                justification = "Volume standard correspondant au maillage de proximité.";
            }

            // Compare
            const rankMap = { "Classe D": 1, "Classe C": 2, "Classe B": 3, "Classe A": 4 };
            const currentRank = rankMap[currentCatLabel] || 2;
            const newRank = rankMap[newCatLabel] || 1;

            let status = "stable";
            if (newRank > currentRank) status = "upgrade";
            if (newRank < currentRank) status = "downgrade";

            return {
                ...c,
                metrics: { volume, etp, complexite, score },
                simulation: {
                    currentCatLabel,
                    newCatLabel,
                    status,
                    justification,
                    regle_appliquee: `Règle #${newRank} (Seuil Vol/ETP)`
                }
            };
        });
    };

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [centresRaw, catsRaw] = await Promise.all([
                    api.centres(),
                    api.categories(),
                ]);
                const simulated = RUN_SIMULATION_MOCK(centresRaw, catsRaw);
                setData(simulated);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // 🌪 FILTERING LOGIC
    const filteredData = useMemo(() => {
        return data.filter(row => {
            // Status Filter
            if (filterStatus === "changed" && row.simulation.status === "stable") return false;
            if (filterStatus === "unchanged" && row.simulation.status !== "stable") return false;
            if (filterStatus === "upgrade" && row.simulation.status !== "upgrade") return false;
            if (filterStatus === "downgrade" && row.simulation.status !== "downgrade") return false;

            // Direction Filter (Mocking regions if missing)
            if (filterDirection !== "all" && String(row.region_id) !== filterDirection) return false;

            return true;
        });
    }, [data, filterStatus, filterDirection, globalFilter]);

    // 📊 KPIS
    const stats = useMemo(() => {
        const total = filteredData.length;
        const changed = filteredData.filter(d => d.simulation.status !== "stable").length;
        const upgrades = filteredData.filter(d => d.simulation.status === "upgrade").length;
        const downgrades = filteredData.filter(d => d.simulation.status === "downgrade").length;
        const percent = total > 0 ? Math.round((changed / total) * 100) : 0;
        return { total, changed, upgrades, downgrades, percent };
    }, [filteredData]);


    // 🏗 TABLE COLUMNS
    const columnHelper = createColumnHelper();
    const columns = useMemo(() => [
        columnHelper.accessor("label", {
            header: "Centre",
            cell: info => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-xs">{info.getValue()}</span>
                    <span className="text-[10px] text-slate-400 font-mono">CODE: {info.row.original.code || "N/A"}</span>
                </div>
            )
        }),
        columnHelper.accessor("simulation.currentCatLabel", {
            header: "Ancienne Catégorie",
            cell: info => <Badge variant="neutral">{info.getValue()}</Badge>
        }),
        columnHelper.accessor("metric.volume", {
            header: "Indice",
            cell: info => (
                <div className={`flex items-center justify-center`}>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                </div>
            )
        }),
        columnHelper.accessor("simulation.newCatLabel", {
            header: "Nouvelle Catégorie",
            cell: info => {
                const row = info.row.original;
                let variant = "neutral";
                if (row.simulation.status === "upgrade") variant = "success";
                if (row.simulation.status === "downgrade") variant = "danger";
                return <Badge variant={variant} className="shadow-sm">{info.getValue()}</Badge>
            }
        }),
        columnHelper.accessor("simulation.status", {
            header: "Impact",
            cell: info => {
                const s = info.getValue();
                if (s === "upgrade") return <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase"><ArrowUpRight className="w-3 h-3" /> Promotion</div>;
                if (s === "downgrade") return <div className="flex items-center gap-1 text-rose-600 font-bold text-[10px] uppercase"><ArrowDownRight className="w-3 h-3" /> Reclassement</div>;
                return <div className="flex items-center gap-1 text-slate-400 text-[10px]"><Minus className="w-3 h-3" /> Stable</div>;
            }
        }),
        columnHelper.accessor("simulation.regle_appliquee", {
            header: "Règle Déclenchée",
            cell: info => <span className="text-xs text-slate-500 italic">{info.getValue()}</span>
        }),
        columnHelper.display({
            id: "actions",
            cell: info => (
                <button
                    onClick={() => setSelectedCenter(info.row.original)}
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors border border-transparent hover:border-indigo-100"
                >
                    Détail
                </button>
            )
        })
    ], []);

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: { globalFilter },
        onGlobalFilterChange: setGlobalFilter,
    });


    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 font-sans text-slate-900">

            {/* 1️⃣ EN-TÊTE PROFESSIONNEL */}
            <div className="mb-4 border-b border-slate-200 pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <History className="w-5 h-5 text-indigo-600" />
                            Catégorisation des centres – Avant / Après simulation
                        </h1>
                        <p className="mt-1 text-slate-500 text-xs max-w-3xl">
                            Comparaison de la catégorisation actuelle avec la nouvelle catégorisation issue des règles métiers et des volumes simulés.
                        </p>
                    </div>
                    <div className="text-right hidden md:block">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                            <Settings2 className="w-3 h-3" />
                            Scénario: {scenarioId}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">Généré le: {new Date().toLocaleDateString()}</div>
                    </div>
                </div>
            </div>

            {/* 2️⃣ KPI CARDS (DASHBOARD) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded text-slate-500"><Building2 className="w-5 h-5" /></div>
                    <Metric label="Total Centres" value={stats.total} subtext="Périmètre actif" />
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded text-amber-600"><ArrowLeftRight className="w-5 h-5" /></div>
                    <Metric label="Impactés" value={stats.changed} subtext={`${stats.percent}% du réseau`} color="amber" />
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded text-emerald-600"><ArrowUpRight className="w-5 h-5" /></div>
                    <Metric label="Promotions" value={stats.upgrades} subtext="Passage cat. sup" color="emerald" />
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-rose-50 rounded text-rose-600"><ArrowDownRight className="w-5 h-5" /></div>
                    <Metric label="Reclassements" value={stats.downgrades} subtext="Passage cat. inf" color="rose" />
                </div>
            </div>

            {/* 3️⃣ FILTRES & DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                {/* TOOLBAR */}
                <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 justify-between items-center">

                    {/* Left: Filters */}
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-white border border-slate-200 rounded shadow-sm">
                            <Filter className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-700 mr-1">Impact:</span>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="text-xs border-none bg-transparent focus:ring-0 text-slate-800 font-medium cursor-pointer py-0 pl-0 pr-6"
                            >
                                <option value="all">Tous les centres</option>
                                <option value="changed">Impactés uniquement</option>
                                <option value="upgrade">Promotions (Hausse)</option>
                                <option value="downgrade">Reclassements (Baisse)</option>
                                <option value="unchanged">Stables</option>
                            </select>
                        </div>

                        {/* Direction Filter Mock */}
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-white border border-slate-200 rounded shadow-sm">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <select
                                value={filterDirection}
                                onChange={e => setFilterDirection(e.target.value)}
                                className="text-xs border-none bg-transparent focus:ring-0 text-slate-800 font-medium cursor-pointer py-0 pl-0 pr-6"
                            >
                                <option value="all">Toutes Régions</option>
                                {[...new Set(data.map(d => d.region_id))].filter(Boolean).map(r => (
                                    <option key={r} value={String(r)}>Région {r}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Right: Search */}
                    <div className="relative w-full md:w-56">
                        <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={globalFilter ?? ""}
                            onChange={e => setGlobalFilter(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* TABLE CONTENT */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id} className="bg-slate-50 border-b border-slate-200">
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {table.getRowModel().rows.slice(0, 50).map(row => (
                                <tr key={row.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-4 py-2 text-xs text-slate-700">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-[10px] text-slate-500">
                        {table.getRowModel().rows.length} résultats
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                            className="px-2 py-1 text-[10px] font-medium bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                        >Précédent</button>
                        <button
                            onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                            className="px-2 py-1 text-[10px] font-medium bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                        >Suivant</button>
                    </div>
                </div>
            </div>

            {/* 4️⃣ DETAIL MODAL (Tailwind simple overlay if no Dialog component) */}
            {selectedCenter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    {selectedCenter.label}
                                </h2>
                                <p className="text-[10px] text-slate-500 mt-0.5">Code: {selectedCenter.code} | Région {selectedCenter.region_id}</p>
                            </div>
                            <button onClick={() => setSelectedCenter(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                <span className="sr-only">Fermer</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-4">

                            {/* Comparison Large */}
                            {/* Comparison Large */}
                            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="text-center">
                                    <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Actuel</span>
                                    <Badge variant="neutral" className="text-xs px-2 py-0.5">{selectedCenter.simulation.currentCatLabel}</Badge>
                                </div>
                                <div className="flex flex-col items-center justify-center px-2">
                                    <ArrowRight className="w-4 h-4 text-slate-300" />
                                    {selectedCenter.simulation.status === "upgrade" && <span className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">Promotion</span>}
                                    {selectedCenter.simulation.status === "downgrade" && <span className="text-[10px] font-bold text-rose-600 uppercase mt-0.5">Reclassement</span>}
                                </div>
                                <div className="text-center">
                                    <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Simulé</span>
                                    <Badge
                                        variant={selectedCenter.simulation.status === "upgrade" ? "success" : selectedCenter.simulation.status === "downgrade" ? "danger" : "indigo"}
                                        className="text-xs px-2 py-0.5"
                                    >
                                        {selectedCenter.simulation.newCatLabel}
                                    </Badge>
                                </div>
                            </div>

                            {/* Analysis Box */}
                            {/* Analysis Box */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                    <Scale className="w-3 h-3 text-indigo-600" />
                                    Analyse Décisionnelle
                                </h3>
                                <div className="bg-indigo-50/50 rounded p-3 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                                    <p><strong>Pourquoi ce changement ?</strong></p>
                                    <p className="mt-1">{selectedCenter.simulation.justification}</p>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-3 gap-2 mt-3">
                                    <div className="p-2 border border-slate-100 rounded bg-white shadow-sm">
                                        <span className="text-[10px] text-slate-400 block mb-0.5">Score</span>
                                        <span className="font-mono font-bold text-xs text-slate-700">{selectedCenter.metrics.score.toFixed(0)} pts</span>
                                    </div>
                                    <div className="p-2 border border-slate-100 rounded bg-white shadow-sm">
                                        <span className="text-[10px] text-slate-400 block mb-0.5">Volume</span>
                                        <span className="font-mono font-bold text-xs text-slate-700">{selectedCenter.metrics.volume.toLocaleString()}</span>
                                    </div>
                                    <div className="p-2 border border-slate-100 rounded bg-white shadow-sm">
                                        <span className="text-[10px] text-slate-400 block mb-0.5">ETP Calc</span>
                                        <span className="font-mono font-bold text-xs text-slate-700">{selectedCenter.metrics.etp.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Rules Applied */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 mb-1.5">Règle Appliquée</h3>
                                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded border border-slate-100">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    {selectedCenter.simulation.regle_appliquee}
                                </div>
                            </div>

                        </div>

                        {/* Footer Actions */}
                        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
                            <button onClick={() => setSelectedCenter(null)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 shadow-sm">
                                Fermer
                            </button>
                            <button className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm">
                                <CheckCircle2 className="w-3 h-3" />
                                Valider Catégorie
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
