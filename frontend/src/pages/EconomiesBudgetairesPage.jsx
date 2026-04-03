import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings,
    Download,
    BarChart3,
    Activity,
    ChevronDown,
    Info,
    X,
    TrendingUp,
    FileSpreadsheet,
    FileSearch,
    Calculator,
    ArrowRightLeft,
    Coins,
    Wallet,
    TrendingDown,
    ArrowUpDown,
    LayoutDashboard,
    Search,
    Table as TableIcon
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
    LabelList
} from "recharts";
import { API_BASE_URL } from "../lib/api";
import EsignLayout from "../components/EsignLayout";

const API_MS = `${API_BASE_URL}/masse-salariale`;

const EconomiesBudgetairesPage = () => {
    const [params, setParams] = useState({
        sacs_jour: 50,
        dossiers_mois: 6500,
        productivite: 100
    });

    const [derived, setDerived] = useState({
        dossiers_jours: 295.5,
        heures_net_jour: 8.0
    });

    const [data, setData] = useState({
        comparaison: [],
        ecarts: []
    });

    const [showGraph, setShowGraph] = useState(false);
    const [graphData, setGraphData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        handleSimulate();
    }, []);

    const handleSimulate = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`${API_MS}/simuler`, params);
            setData({
                comparaison: res.data.comparaison,
                ecarts: res.data.ecarts
            });
            setDerived(res.data.derived);

            if (showGraph) {
                const gRes = await axios.post(`${API_MS}/graph-data`, params);
                setGraphData(gRes.data.series);
            }
        } catch (err) {
            console.error("Simulation error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const url = `${API_MS}/export-csv?sacs_jour=${params.sacs_jour}&dossiers_mois=${params.dossiers_mois}&productivite=${params.productivite}`;
        window.location.href = url;
    };

    const handleShowGraph = async () => {
        try {
            const res = await axios.post(`${API_MS}/graph-data`, params);
            setGraphData(res.data.series);
            setShowGraph(true);
        } catch (err) {
            console.error("Graph data error:", err);
        }
    };

    const renderCell = (val, isHeader = false) => {
        if (!isHeader && val === "0 MAD") return <span className="text-slate-200">-</span>;
        return val;
    };

    const isSpecialRow = (index) => index === 0 || index === 1;

    const kpis = useMemo(() => {
        if (!data.comparaison.length || !data.ecarts.length) return null;
        const yearRow = data.comparaison[0];
        const yearEcarts = data.ecarts[0];
        return {
            actuel: yearRow[1],
            recommandé: yearRow[3],
            economie: yearEcarts[1],
            ecartPercent: yearEcarts[0]
        };
    }, [data]);

    return (
        <EsignLayout activeKey="Économies Budgétaires Estimées">
            <div className="flex flex-col min-h-screen bg-[#F4F7FA] font-sans selection:bg-blue-100">
                {/* Compact & Sophisticated Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-2 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <img
                            src={`${API_BASE_URL}/assets/logo/barid`}
                            alt="Logo"
                            className="h-8 object-contain"
                        />
                        <div className="h-4 w-px bg-slate-200" />
                        <div>
                            <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
                                <Wallet className="text-[#005EA8]" size={16} />
                                Économies Budgétaires
                            </h1>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Masse Salariale • Simulation Prévisionnelle</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex gap-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSimulate}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005EA8] text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#004b85] transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                            >
                                <Activity size={12} />
                                Lancer Simulation
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleExport}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/10"
                            >
                                <FileSpreadsheet size={12} />
                                Exporter
                            </motion.button>
                        </div>
                        <img src={`${API_BASE_URL}/assets/logo/almav`} alt="Almav" className="h-6 object-contain opacity-40" />
                    </div>
                </header>

                <main className="flex-1 p-4 max-w-[1600px] mx-auto w-full space-y-4">
                    {/* Compact Params & KPI Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                        {/* Simulation Params Panel - More Compact */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="lg:col-span-8 bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-6"
                        >
                            <div className="flex-shrink-0 flex items-center gap-2 pr-4 border-r border-slate-100">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                    <Settings size={14} />
                                </div>
                                <h2 className="text-[9px] font-black text-slate-800 uppercase tracking-wider">Paramètres</h2>
                            </div>

                            <div className="flex-1 grid grid-cols-5 gap-4">
                                {[
                                    { label: "Sacs/Jour", key: "sacs_jour", value: params.sacs_jour, type: "input" },
                                    { label: "Dossiers/Mois", key: "dossiers_mois", value: params.dossiers_mois, type: "input" },
                                    { label: "Productivité %", key: "productivite", value: params.productivite, type: "input" },
                                    { label: "Dossiers/Jrs", key: "dossiers_jours", value: derived.dossiers_jours, type: "readonly" },
                                    { label: "H. Net/Jour", key: "heures_net_jour", value: derived.heures_net_jour, type: "readonly" },
                                ].map((field, i) => (
                                    <div key={i} className="space-y-0.5">
                                        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-0.5">{field.label}</label>
                                        {field.type === "input" ? (
                                            <input
                                                type="number"
                                                value={field.value}
                                                onChange={(e) => setParams({ ...params, [field.key]: parseFloat(e.target.value) || 0 })}
                                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-[10px] font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#005EA8]/5 transition-all outline-none"
                                            />
                                        ) : (
                                            <div className="w-full h-8 bg-slate-100/50 flex items-center px-2 rounded-lg text-[10px] font-black text-slate-500/70 italic border border-transparent">
                                                {field.value}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Summary Economy Card - Concentrated */}
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-4 bg-[#005EA8] p-3 rounded-xl shadow-lg shadow-blue-900/10 relative overflow-hidden flex items-center justify-between"
                        >
                            <div className="relative z-10">
                                <p className="text-[7px] font-black text-blue-200/80 uppercase tracking-widest mb-0.5">Impact Budgétaire Annuel</p>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-black text-white leading-none">
                                        {loading ? "..." : kpis?.economie || "0 MAD"}
                                    </h3>
                                    <div className="p-1 bg-white/10 rounded-md">
                                        <TrendingDown size={12} className="text-blue-200" />
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-10 flex gap-2">
                                <div className="text-right border-l border-white/10 pl-3">
                                    <p className="text-[7px] font-black text-blue-200/60 uppercase tracking-wider">Actuel</p>
                                    <p className="text-[10px] font-bold text-white leading-none mt-1">{loading ? "..." : kpis?.actuel}</p>
                                </div>
                                <div className="text-right border-l border-white/10 pl-3">
                                    <p className="text-[7px] font-black text-blue-200/60 uppercase tracking-wider">Reco.</p>
                                    <p className="text-[10px] font-bold text-white leading-none mt-1">{loading ? "..." : kpis?.recommandé}</p>
                                </div>
                            </div>
                            <Coins size={48} className="absolute -right-2 -bottom-2 text-white/5 rotate-12" />
                        </motion.div>
                    </div>

                    {/* Merged Unified Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden"
                    >
                        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200/60 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutDashboard size={14} className="text-[#005EA8]" />
                                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Analyse Consolidée de la Masse Salariale & Écarts</h3>
                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={handleShowGraph}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <BarChart3 size={12} className="text-indigo-500" />
                                        Visualiser le Graphe
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 border border-slate-100 px-2 py-1 rounded-md uppercase tracking-widest bg-white shadow-inner">
                                    <Info size={10} className="text-[#005EA8]" />
                                    Valeurs en MAD
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#005EA8] divide-x divide-white/10">
                                        <th className="px-4 py-2 text-left text-[10px] font-black text-white uppercase tracking-widest">Poste</th>
                                        <th className="px-4 py-2 text-center text-[10px] font-black text-white uppercase tracking-widest">Actuel</th>
                                        <th className="px-4 py-2 text-center text-[10px] font-black text-white uppercase tracking-widest">Calculé</th>
                                        <th className="px-4 py-2 text-center text-[10px] font-black text-white uppercase tracking-widest">Recommandé</th>
                                        <th className="px-3 py-2 text-center text-[9px] font-black text-blue-200 uppercase tracking-tighter bg-[#004b85]">Calc Vs Act</th>
                                        <th className="px-3 py-2 text-center text-[9px] font-black text-emerald-200 uppercase tracking-tighter bg-[#004b85]">Reco Vs Act</th>
                                        <th className="px-3 py-2 text-center text-[9px] font-black text-amber-200 uppercase tracking-tighter bg-[#004b85]">Reco Vs Calc</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <AnimatePresence mode="popLayout">
                                        {data.comparaison.map((row, idx) => {
                                            const ecartRow = data.ecarts[idx] || ["-", "-", "-"];
                                            return (
                                                <motion.tr
                                                    key={idx}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: idx * 0.005 }}
                                                    className={`${isSpecialRow(idx) ? 'bg-[#cfe2f3] font-black' : 'group hover:bg-slate-50/50'} transition-all divide-x divide-slate-100/50`}
                                                >
                                                    <td className="px-4 py-1.5 text-[11px]">
                                                        <span className={`${isSpecialRow(idx) ? 'text-slate-900 underline' : 'text-slate-700 font-bold'}`}>
                                                            {idx > 1 ? row[0] : row[0]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-1.5 text-[11px] text-center text-slate-600 font-bold italic">
                                                        {renderCell(row[1], isSpecialRow(idx))}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-[11px] text-center text-blue-700 font-bold italic">
                                                        {renderCell(row[2], isSpecialRow(idx))}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-[11px] text-center text-emerald-700 font-black italic">
                                                        {renderCell(row[3], isSpecialRow(idx))}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-[10px] text-center text-blue-800 font-black italic bg-blue-50/20">
                                                        {renderCell(ecartRow[0], isSpecialRow(idx))}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-[10px] text-center text-emerald-800 font-black italic bg-emerald-50/20">
                                                        {renderCell(ecartRow[1], isSpecialRow(idx))}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-[10px] text-center text-amber-700 font-black italic bg-amber-50/20">
                                                        {renderCell(ecartRow[2], isSpecialRow(idx))}
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </main>

                {/* Glassmorphic Graph Modal */}
                <AnimatePresence>
                    {showGraph && graphData && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => setShowGraph(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                            >
                                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
                                            <BarChart3 className="text-indigo-600" size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Analyse Graphique</h3>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Distribution de la Masse Salariale Annuelle</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowGraph(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="p-6 h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={[
                                                {
                                                    name: 'Masse Annuelle',
                                                    ...graphData.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.value }), {})
                                                }
                                            ]}
                                            margin={{ top: 20, right: 30, left: 10, bottom: 0 }}
                                            barGap={10}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }}
                                                tickFormatter={(val) => `${(val / 1000).toLocaleString()} K`}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-slate-100">
                                                                {payload.map((entry, i) => (
                                                                    <div key={i} className="flex items-center gap-4 mb-1 last:mb-0">
                                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                        <span className="text-[7px] font-black text-slate-400 uppercase">{entry.name}:</span>
                                                                        <span className="text-[10px] font-black text-slate-800 ml-auto">
                                                                            {entry.value.toLocaleString()} MAD
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            {graphData.map((entry, index) => (
                                                <Bar
                                                    key={index}
                                                    dataKey={entry.name}
                                                    name={entry.name}
                                                    fill={entry.color}
                                                    radius={[4, 4, 0, 0]}
                                                    barSize={80}
                                                >
                                                    <LabelList
                                                        dataKey={entry.name}
                                                        position="top"
                                                        formatter={(val) => `${Math.round(val / 1000).toLocaleString()} K`}
                                                        style={{ fontSize: 8, fontBold: 900, fill: '#64748b' }}
                                                    />
                                                </Bar>
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}} />
            </div>
        </EsignLayout>
    );
};

export default EconomiesBudgetairesPage;
