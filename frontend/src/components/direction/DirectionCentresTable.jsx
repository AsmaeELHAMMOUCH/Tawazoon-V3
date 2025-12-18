import React, { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Eye } from "lucide-react";
import { fmt } from "../../utils/formatters";

export default function DirectionCentresTable({ centres = [], loading, onOpenDetail }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // 1. Filter
    const filtered = useMemo(() => {
        if (!search) return centres;
        const s = search.toLowerCase();
        return centres.filter(c =>
            (c.label || "").toLowerCase().includes(s) ||
            (String(c.id) || "").includes(s)
        );
    }, [centres, search]);

    // 2. Sort
    const sorted = useMemo(() => {
        if (!sortConfig.key) return filtered;
        return [...filtered].sort((a, b) => {
            let av = a[sortConfig.key];
            let bv = b[sortConfig.key];
            // Handle numeric / nulls
            if (av == null) av = -Infinity;
            if (bv == null) bv = -Infinity;

            if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
            if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filtered, sortConfig]);

    // 3. Paginate
    const totalPages = Math.ceil(sorted.length / pageSize);
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ col }) => (
        <ArrowUpDown
            size={10}
            className={`ml-1 transition-colors ${sortConfig.key === col ? 'text-[#005EA8]' : 'text-slate-300'}`}
        />
    );

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-800">Détail par Centre</h3>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Rechercher un centre..."
                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-64 focus:ring-1 focus:ring-[#005EA8] outline-none"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80 text-[10px] uppercase text-slate-500 font-bold tracking-wide sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('label')}>
                                <div className="flex items-center gap-1">Centre <SortIcon col="label" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('type')}>
                                <div className="flex items-center justify-center gap-1">Catégorie <SortIcon col="type" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => handleSort('fte_actuel')}>
                                <div className="flex items-center justify-end gap-1">Actuel <SortIcon col="fte_actuel" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => handleSort('etp_calcule')}>
                                <div className="flex items-center justify-end gap-1">Cible <SortIcon col="etp_calcule" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => handleSort('ecart')}>
                                <div className="flex items-center justify-end gap-1">Écart <SortIcon col="ecart" /></div>
                            </th>
                            <th className="px-4 py-3 text-center w-12">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px] text-slate-700 divide-y divide-slate-50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-16 mx-auto"></div></td>
                                    <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div></td>
                                    <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div></td>
                                    <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            ))
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-4 py-12 text-center text-slate-400 italic">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                                            <Search size={16} />
                                        </div>
                                        <span>Aucun centre trouvé pour cette recherche.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row) => {
                                const ecart = row.ecart || 0;
                                const isPos = ecart > 0.1; // Surplus
                                const isNeg = ecart < -0.1; // Deficit
                                const isNeutral = !isPos && !isNeg;

                                return (
                                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group border-b border-slate-50 last:border-0">
                                        <td className="px-4 py-3 font-semibold text-slate-800">{row.label}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                {row.type || "N/A"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-600">{fmt(row.fte_actuel)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-600">{fmt(row.etp_calcule)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className={`
                                            inline-flex items-center justify-center min-w-[3.5rem] px-2 py-1 rounded-full text-[10px] font-bold border
                                            ${isPos ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    isNeg ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        'bg-slate-50 text-slate-500 border-slate-200'}
                                        `}>
                                                {isPos ? "+" : ""}{fmt(ecart)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => onOpenDetail(row)}
                                                className="p-1.5 rounded-lg hover:bg-[#005EA8]/10 text-slate-400 hover:text-[#005EA8] transition-all"
                                                title="Voir le détail par poste"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/50 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                    Affichage {Math.min((page - 1) * pageSize + 1, sorted.length)} - {Math.min(page * pageSize, sorted.length)} sur {sorted.length}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-1 rounded hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all text-slate-600"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span className="text-[10px] font-semibold text-slate-700 w-4 text-center">{page}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="p-1 rounded hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all text-slate-600"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
