import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchChronogrammeTachesRec,
    exportChronogrammeTachesRecCsv
} from "../api/recommande";
import EsignLayout from "../components/EsignLayout";
import {
    Search,
    Download,
    Clock,
    Activity,
    User,
    List,
    BarChart3,
    Loader2
} from "lucide-react";

export default function ChronogrammeRecommandePage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [exporting, setExporting] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const payload = await fetchChronogrammeTachesRec();
            if (payload.message && payload.rows.length === 0) {
                setError(payload.message);
            } else {
                setRows(payload.rows || []);
                setError("");
            }
        } catch (err) {
            console.error(err);
            setError("Erreur lors du chargement des données.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredRows = useMemo(() => {
        if (!searchTerm) return rows;
        const normalized = searchTerm.toLowerCase();
        return rows.filter((row) =>
            (row.responsable || "").toLowerCase().includes(normalized) ||
            (row.tache || "").toLowerCase().includes(normalized)
        );
    }, [rows, searchTerm]);

    const handleExport = async () => {
        if (rows.length === 0) return;
        try {
            setExporting(true);
            const blob = await exportChronogrammeTachesRecCsv();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "export_taches.csv";
            anchor.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            setError("Erreur lors de l'export.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <EsignLayout activeKey="Chronogramme recommandé">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-500">
                {/* Premium Header */}
                <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-20 -mt-20 opacity-70" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center flex-col md:flex-row gap-3 text-center md:text-left">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 relative">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-3">
                                    Chronogramme de Traitement Unitaire
                                    <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border border-blue-200 shadow-sm translate-y-px">Recommandé</span>
                                </h1>
                                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                                    Détail chronologique des tâches et temps cumulés (Processus Recommandé).
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate("/dimensionnement-recommande/chronogramme/positions")}
                                className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
                            >
                                <BarChart3 size={14} className="text-slate-400 group-hover:text-blue-600" />
                                Vue par Position
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[500px]">

                    {/* Toolbar */}
                    <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                        <div className="relative w-full md:w-80 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher une tâche ou un responsable..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white placeholder-slate-400"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExport}
                                disabled={rows.length === 0 || exporting}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-500/20 border border-emerald-500 hover:border-emerald-600 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                Exporter CSV
                            </button>
                        </div>
                    </div>

                    {/* Table Content */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 relative">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <List size={12} className="text-blue-500" />
                                            Tâche
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <User size={12} className="text-slate-400" />
                                            Responsable
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center bg-blue-50/10">Durée (Min)</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center bg-blue-50/10">Durée (Sec)</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Cumul (Min)</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Cumul (Sec)</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Cumul (m:s)</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Cumul (Heure)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center text-slate-400 animate-pulse">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                                <p className="text-[10px] font-medium">Chargement des données...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3 opacity-60">
                                                <Activity size={48} className="text-slate-300" />
                                                <p>{error || "Aucune donnée trouvée."}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-blue-50/30 transition-colors group"
                                        >
                                            <td className="px-5 py-2 font-medium text-slate-700 group-hover:text-blue-700 transition-colors max-w-xs truncate" title={row.tache}>
                                                {row.tache}
                                            </td>
                                            <td className="px-5 py-2 text-center text-slate-600">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200 group-hover:bg-white group-hover:shadow-sm transition-all whitespace-nowrap">
                                                    {row.responsable}
                                                </span>
                                            </td>
                                            <td className="px-5 py-2 text-center font-mono text-slate-500 bg-slate-50/30 group-hover:bg-blue-50/40 border-l border-slate-100 border-r">
                                                {row.duree_min}
                                            </td>
                                            <td className="px-5 py-2 text-center font-mono text-slate-500 bg-slate-50/30 group-hover:bg-blue-50/40 border-r border-slate-100">
                                                {row.duree_sec}
                                            </td>
                                            <td className="px-5 py-2 text-center font-mono text-slate-600">
                                                {row.cum_min}
                                            </td>
                                            <td className="px-5 py-2 text-center font-mono text-slate-600">
                                                {row.cum_sec}
                                            </td>
                                            <td className="px-5 py-2 text-center font-mono text-slate-600">
                                                {row.cum_ms}
                                            </td>
                                            <td className="px-5 py-2 text-center font-mono text-blue-600 font-bold">
                                                {row.cum_heure}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Info */}
                    <div className="bg-white border-t border-slate-200 px-4 py-2 text-[10px] text-slate-500 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div>
                            <span className="font-semibold">{filteredRows.length}</span> lignes affichées
                        </div>
                        {error && !loading && rows.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600 border border-red-100 animate-in fade-in slide-in-from-bottom-1">
                                {error}
                            </span>
                        )}
                        <div className="text-slate-400 font-medium">
                            © 2025 – ALMAV GROUP
                        </div>
                    </div>
                </div>
            </div>
        </EsignLayout>
    );
}
