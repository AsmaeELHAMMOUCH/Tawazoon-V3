import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCapaciteNominale, exportCapaciteNominaleXlsx } from "../api/capacite_nominale";
import EsignLayout from "../components/EsignLayout";
import {
    Download,
    Calculator,
    Search,
    Briefcase,
    Timer,
    CalendarDays,
    Sun,
    Clock,
    ArrowLeft
} from "lucide-react";

export default function CapaciteNominalePage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchCapaciteNominale();
            setRows(data.rows || []);
            setTotal(data.total || null);
            setStatus("");
        } catch (error) {
            console.error(error);
            setStatus("Erreur lors du chargement.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredRows = useMemo(() => {
        if (!searchTerm) return rows;
        const lower = searchTerm.toLowerCase();
        return rows.filter((r) =>
            r.position?.toLowerCase().includes(lower)
        );
    }, [rows, searchTerm]);

    const handleExport = async () => {
        if (rows.length === 0) {
            setStatus("Aucune donnée à exporter.");
            return;
        }
        try {
            const res = await exportCapaciteNominaleXlsx();
            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "capacite_nominale.xlsx";
            a.click();
            window.URL.revokeObjectURL(url);
            setStatus("Export terminé avec succès.");
            setTimeout(() => setStatus(""), 3000);
        } catch (error) {
            console.error(error);
            setStatus("Erreur lors de l'export.");
        }
    };

    return (
        <EsignLayout activeKey="Normes de dimensionnement">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-500">
                {/* Premium Header */}
                <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-20 -mt-20 opacity-70" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center flex-col md:flex-row gap-3 text-center md:text-left">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 relative">
                                <Calculator className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-3">
                                    Capacité Nominale
                                </h1>
                                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                                    Calcul basé sur les temps unitaires.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">

                    {/* Toolbar */}
                    <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                        <div className="relative w-full md:w-80 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher une position..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white placeholder-slate-400"
                            />
                        </div>

                        <div className="flex items-center gap-2">

                            <div className="h-4 w-px bg-slate-300 mx-1" />
                            <button
                                onClick={handleExport}
                                disabled={rows.length === 0}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-500/20 border border-emerald-500 hover:border-emerald-600 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <Download size={14} />
                                Exporter Excel
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 relative">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[30%]">
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={12} className="text-slate-400" />
                                            Position
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[15%] text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Timer size={12} className="text-slate-400" />
                                            Temps Par Dossier
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[15%] text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Clock size={12} className="text-blue-600" />
                                            Dossiers/Heure
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[20%] text-center bg-blue-50/10">
                                        <div className="flex items-center justify-center gap-2">
                                            <Sun size={12} className="text-blue-600" />
                                            Dossiers/Jour
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[20%] text-center bg-blue-50/10">
                                        <div className="flex items-center justify-center gap-2">
                                            <CalendarDays size={12} className="text-blue-600" />
                                            Dossiers/Mois
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 animate-pulse">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                                <p className="text-[10px] font-medium">Calcul des capacités...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3 opacity-60">
                                                <Calculator size={48} className="text-slate-300" />
                                                <p>Aucune donnée disponible.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-5 py-2 font-medium text-slate-700 group-hover:text-blue-700 transition-colors">
                                                {row.position}
                                            </td>
                                            <td className="px-5 py-2 text-center text-slate-600">
                                                {row.temps_par_dossier}
                                            </td>
                                            <td className="px-5 py-2 text-center text-slate-600">
                                                {row.dossiers_heure}
                                            </td>
                                            <td className="px-5 py-2 text-center font-mono font-bold text-slate-700 bg-slate-50/30 group-hover:bg-blue-50/40 border-l border-slate-100 border-r">
                                                {row.dossiers_jour}
                                            </td>
                                            <td className="px-5 py-2 text-center font-mono font-bold text-slate-700 bg-slate-50/30 group-hover:bg-blue-50/40 border-r border-slate-100">
                                                {row.dossiers_mois}
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
                            <span className="font-semibold">{filteredRows.length}</span> positions affichées
                        </div>
                        {status && (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium animate-in fade-in slide-in-from-bottom-1 ${status.includes("succès") ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                                {status.includes("succès") && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                                {status}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </EsignLayout>
    );
}
