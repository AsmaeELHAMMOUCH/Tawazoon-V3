import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileSpreadsheet,
    Activity,
    Info,
    CheckCircle2,
    PlusCircle,
    MinusCircle,
    Download,
    LayoutDashboard,
    ArrowUpDown,
    Table as TableIcon,
    Search,
    Filter,
    ArrowRightLeft,
    TrendingUp,
    TrendingDown,
    Minus
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import EsignLayout from "../components/EsignLayout";

const API_COMPARATIF = `${API_BASE_URL}/comparatif-positions`;

const ComparatifPositionsPage = () => {
    const [data, setData] = useState({ columns: [], rows: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchSimulation();
    }, []);

    const fetchSimulation = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_COMPARATIF}/simuler`);
            setData(res.data);
        } catch (err) {
            console.error("Simulation error:", err);
            setError("Impossible de charger les données de simulation.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        window.location.href = `${API_COMPARATIF}/export`;
    };

    // Analytics Summary Logic
    const stats = useMemo(() => {
        if (!data.rows.length) return { ajouts: 0, suppressions: 0, ras: 0 };
        return data.rows.reduce((acc, row) => {
            const status = row[2];
            if (status === "Ajout") acc.ajouts++;
            else if (status === "Suppression") acc.suppressions++;
            else if (status === "RAS") acc.ras++;
            return acc;
        }, { ajouts: 0, suppressions: 0, ras: 0 });
    }, [data.rows]);

    const filteredRows = useMemo(() => {
        if (!searchTerm) return data.rows;
        return data.rows.filter(row =>
            (row[0] && row[0].toLowerCase().includes(searchTerm.toLowerCase())) ||
            (row[1] && row[1].toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [data.rows, searchTerm]);

    const getStatusBadge = (status) => {
        switch (status) {
            case "RAS":
                return (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100/50 shadow-sm">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-wider">RAS</span>
                    </div>
                );
            case "Ajout":
                return (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm">
                        <TrendingUp size={10} className="stroke-[3]" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Ajout</span>
                    </div>
                );
            case "Suppression":
                return (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-100/50 shadow-sm">
                        <TrendingDown size={10} className="stroke-[3]" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Suppr.</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <EsignLayout activeKey="Comparatif Positions">
            <div className="flex flex-col min-h-screen bg-[#f8fafc] font-sans selection:bg-blue-100">
                {/* Modern Header Section */}
                <header className="bg-white border-b border-slate-200 px-8 py-2 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                    <div className="flex items-center gap-4">
                        <motion.img
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            src={`${API_BASE_URL}/assets/logo/barid`}
                            alt="Logo"
                            className="h-10 object-contain"
                        />
                        <div className="h-8 w-px bg-slate-200 hidden md:block" />
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h1 className="text-base font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
                                <ArrowRightLeft className="text-[#005EA8]" size={18} />
                                Comparatif des Positions
                            </h1>
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-4">
                        <img src={`${API_BASE_URL}/assets/logo/almav`} alt="Almav" className="h-8 object-contain opacity-60" />
                    </div>
                </header>

                <main className="flex-1 p-5 max-w-[1600px] mx-auto w-full space-y-4">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Positions", val: data.rows.length, icon: Activity, color: "blue", border: "blue" },
                            { label: "Stabilité (RAS)", val: stats.ras, icon: CheckCircle2, color: "emerald", border: "emerald" },
                            { label: "Ajouts (Nouveaux)", val: stats.ajouts, icon: PlusCircle, color: "indigo", border: "indigo" },
                            { label: "Suppressions", val: stats.suppressions, icon: MinusCircle, color: "rose", border: "rose" }
                        ].map((kpi, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm border-b-4 ${i === 0 ? 'border-b-blue-500' : i === 1 ? 'border-b-emerald-500' : i === 2 ? 'border-b-indigo-500' : 'border-b-rose-500'}`}
                            >
                                <div className="flex justify-between items-start mb-1.5">
                                    <div className={`p-2 rounded-xl ${i === 0 ? 'bg-blue-50 text-blue-600' : i === 1 ? 'bg-emerald-50 text-emerald-600' : i === 2 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                                        <kpi.icon size={16} />
                                    </div>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${i === 0 ? 'text-blue-400 bg-blue-50' : i === 1 ? 'text-emerald-400 bg-emerald-50' : i === 2 ? 'text-indigo-400 bg-indigo-50' : 'text-rose-400 bg-rose-50'}`}>Statut</span>
                                </div>
                                <h4 className="text-xl font-black text-slate-800 leading-none">{loading ? "..." : kpi.val}</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{kpi.label}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Search & Statistics Header */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-1.5 flex flex-col md:flex-row items-center justify-between gap-2">
                        <div className="w-full md:flex-1 relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-[#005EA8]/10 transition-all font-sans"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 text-slate-400">
                                <TableIcon size={14} />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {filteredRows.length} {filteredRows.length > 1 ? "Entrées" : "Entrée"}
                                </span>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10"
                            >
                                <FileSpreadsheet size={14} />
                                Exporter
                            </motion.button>
                        </div>
                    </div>

                    {/* Table Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/30 border border-slate-200/60 overflow-hidden"
                    >
                        {loading ? (
                            <div className="h-[500px] flex flex-col items-center justify-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-50 border-t-[#005EA8] rounded-full animate-spin" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Calcul de la parité fonctionnelle...</p>
                            </div>
                        ) : error ? (
                            <div className="h-[500px] flex flex-col items-center justify-center text-center px-10">
                                <div className="p-5 bg-rose-50 text-rose-500 rounded-full mb-6 italic font-black shadow-lg shadow-rose-100 animate-bounce">!</div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Simulation Interrompue</h3>
                                <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto font-medium">{error}</p>
                                <button onClick={fetchSimulation} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">Relancer l'analyse</button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto overflow-y-auto max-h-[700px] custom-scrollbar">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 z-20">
                                        <tr>
                                            {data.columns.map((col, idx) => (
                                                <th key={idx} className="bg-slate-50/80 backdrop-blur-sm px-4 py-2 text-center border-b border-slate-100 shadow-sm first:pl-6 last:pr-6">
                                                    <div className="flex items-center justify-center gap-2 group cursor-default">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{col}</span>
                                                        <ArrowUpDown size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/60">
                                        <AnimatePresence mode="popLayout">
                                            {filteredRows.map((row, rowIdx) => (
                                                <motion.tr
                                                    key={rowIdx}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: rowIdx * 0.01 }}
                                                    className="group hover:bg-blue-50/30 transition-all duration-300"
                                                >
                                                    <td className="px-4 py-1.5 text-center first:pl-6">
                                                        <span className="text-[11px] font-extrabold text-slate-700 tracking-tight group-hover:text-[#005EA8] transition-colors">
                                                            {row[0] || <Minus className="mx-auto text-slate-200" size={12} />}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-1.5 text-center">
                                                        <span className="text-[11px] font-extrabold text-[#005EA8]/80 tracking-tight">
                                                            {row[1] || <Minus className="mx-auto text-slate-200" size={12} />}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-1.5 text-center last:pr-6">
                                                        {getStatusBadge(row[2])}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                        {filteredRows.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-24 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <Search size={40} className="text-slate-200" />
                                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Aucun métier correspondant à votre recherche</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                </main>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 2px solid #fff; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                `}} />
            </div>
        </EsignLayout>
    );
};

export default ComparatifPositionsPage;
