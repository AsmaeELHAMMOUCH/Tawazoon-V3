import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNormes, exportNormesXlsx } from "../api/normes";
import {
    Download,
    Calculator,
    Search,
    Activity,
    User,
    Ruler,
    Briefcase,
    FileText
} from "lucide-react";
import EsignLayout from "../components/EsignLayout";

export default function NormesDimensionnementPage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchNormes();
            setRows(data.rows || []);
            setStatus("");
        } catch (error) {
            console.error(error);
            setStatus("Erreur lors du chargement des normes.");
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
        return rows.filter(
            (r) =>
                r.activite?.toLowerCase().includes(lower) ||
                r.responsable?.toLowerCase().includes(lower) ||
                r.intitule_rh?.toLowerCase().includes(lower)
        );
    }, [rows, searchTerm]);

    const handleExport = async () => {
        if (rows.length === 0) {
            setStatus("Aucune donnée à exporter.");
            return;
        }
        try {
            const res = await exportNormesXlsx();
            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "normes_dimensionnement.xlsx";
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
                                <Ruler className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-3">
                                    Normes de Dimensionnement
                                </h1>
                                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                                    Référentiel des temps unitaires par activité.
                                </p>
                            </div>
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
                                placeholder="Rechercher une activité..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white placeholder-slate-400"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate("/app/actuel/capacite-nominale")}
                                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-[#FE5000] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#e64900] transition-all shadow-orange-500/20 border border-transparent"
                            >
                                <Calculator size={14} />
                                Capacité Nominale
                            </button>
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

                    {/* Table Content */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 relative">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[30%]">
                                        <div className="flex items-center gap-2">
                                            <Activity size={12} className="text-blue-500" />
                                            Activité
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[20%] text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Briefcase size={12} className="text-slate-400" />
                                            Responsable
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[20%] text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <User size={12} className="text-slate-400" />
                                            Intitulé RH
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[10%] text-center bg-blue-50/10">Minutes</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[10%] text-center bg-blue-50/10">Secondes</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[10%] text-center">Unité</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400 animate-pulse">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                                <p className="text-[10px] font-medium">Chargement des normes...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3 opacity-60">
                                                <FileText size={48} className="text-slate-300" />
                                                <p>Aucune norme trouvée.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-blue-50/30 transition-colors group"
                                        >
                                            <td className="px-5 py-2 font-medium text-slate-700 group-hover:text-blue-700 transition-colors">
                                                {row.activite}
                                            </td>
                                            <td className="px-5 py-2 text-center">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-white group-hover:shadow-sm transition-all whitespace-nowrap">
                                                    {row.responsable}
                                                </span>
                                            </td>
                                            <td className="px-5 py-2 text-center text-slate-500 text-[11px]">
                                                {row.intitule_rh}
                                            </td>
                                            <td className="px-5 py-2 text-center font-mono font-bold text-slate-700 bg-slate-50/30 group-hover:bg-blue-50/40 border-l border-slate-100 border-r">
                                                {row.minutes}
                                            </td>
                                            <td className="px-5 py-2 text-center font-mono font-bold text-slate-700 bg-slate-50/30 group-hover:bg-blue-50/40 border-r border-slate-100">
                                                {row.secondes}
                                            </td>
                                            <td className="px-5 py-2 text-center text-slate-400 italic text-[10px]">
                                                {row.unite}
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
                            <span className="font-semibold">{filteredRows.length}</span> normes affichées
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
