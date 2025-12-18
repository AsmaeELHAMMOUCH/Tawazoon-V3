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
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Toolbar */}
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Détail par Centre</h3>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        className="pl-7 pr-2 py-1 text-[10px] border border-slate-200 rounded-md w-48 focus:ring-1 focus:ring-[#005EA8] outline-none bg-white"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[9px] uppercase text-slate-500 font-bold sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                            <th className="px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50" onClick={() => handleSort('label')}>
                                <div className="flex items-center gap-1">Centre <SortIcon col="label" /></div>
                            </th>
                            <th className="px-3 py-2 text-center w-24 bg-slate-50">
                                Charge
                            </th>
                            <th className="px-3 py-2 text-center bg-slate-50">
                                <div className="flex flex-col items-center leading-none gap-0.5">
                                    <span>Effectifs</span>
                                    <span className="text-[8px] opacity-60 normal-case">Act. / Cible</span>
                                </div>
                            </th>
                            <th className="px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors text-center bg-slate-50" onClick={() => handleSort('ecart')}>
                                <div className="flex items-center justify-center gap-1">Écart <SortIcon col="ecart" /></div>
                            </th>
                            <th className="px-3 py-2 text-center bg-slate-50">
                                Décision
                            </th>
                            <th className="px-2 py-2 text-center w-8 bg-slate-50">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-[10px] text-slate-700 divide-y divide-slate-50 leading-tight">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-24"></div></td>
                                    <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-16 mx-auto"></div></td>
                                    <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-12 mx-auto"></div></td>
                                    <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-8 mx-auto"></div></td>
                                    <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-16 mx-auto"></div></td>
                                    <td className="px-2 py-2"></td>
                                </tr>
                            ))
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-3 py-8 text-center text-slate-400 italic text-[10px]">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                                            <Search size={12} />
                                        </div>
                                        <span>Aucun résultat.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row) => {
                                const actuel = row.fte_actuel || 0;
                                const cible = row.etp_calcule || 0;
                                const ecart = row.ecart || 0;

                                // Calculation for Intelligent Status
                                const ratioLoad = actuel > 0 ? (cible / actuel) * 100 : (cible > 0 ? 999 : 0);

                                let decision = { label: 'Maintenir', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', barColor: 'bg-emerald-500' };

                                if (ratioLoad > 110) {
                                    decision = { label: 'Recruter', color: 'bg-red-50 text-red-700 border-red-100', barColor: 'bg-red-500' };
                                } else if (ratioLoad > 102) {
                                    decision = { label: 'Surveiller', color: 'bg-orange-50 text-orange-700 border-orange-100', barColor: 'bg-orange-400' };
                                } else if (ratioLoad < 85) {
                                    decision = { label: 'Optimiser', color: 'bg-blue-50 text-blue-700 border-blue-100', barColor: 'bg-blue-500' };
                                }

                                return (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0 text-[10px]">
                                        <td className="px-3 py-1.5">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800 truncate max-w-[140px]" title={row.label}>{row.label}</span>
                                                <span className="text-[8px] uppercase text-slate-400 font-medium">{row.type || "-"}</span>
                                            </div>
                                        </td>

                                        {/* Charge Bar */}
                                        <td className="px-3 py-1.5">
                                            <div className="flex flex-col gap-0.5 w-full max-w-[80px] mx-auto">
                                                <div className="flex justify-between text-[8px] font-bold text-slate-400">
                                                    <span>{Math.min(ratioLoad, 999).toFixed(0)}%</span>
                                                </div>
                                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${decision.barColor}`}
                                                        style={{ width: `${Math.min(ratioLoad, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Effectifs */}
                                        <td className="px-3 py-1.5 text-center">
                                            <div className="text-[10px] font-mono whitespace-nowrap">
                                                <span className="text-slate-500">{fmt(actuel)}</span>
                                                <span className="mx-1 text-slate-300">/</span>
                                                <span className="font-bold text-slate-800">{fmt(cible)}</span>
                                            </div>
                                        </td>

                                        {/* Ecart Badge */}
                                        <td className="px-3 py-1.5 text-center">
                                            <div className={`
                                                inline-flex items-center justify-center min-w-[2.5rem] px-1.5 py-0.5 rounded-md text-[9px] font-bold border
                                                ${ecart > 0 ? 'bg-red-50 text-red-700 border-red-100' :
                                                    ecart < 0 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        'bg-slate-50 text-slate-400 border-slate-100'}
                                            `}>
                                                {ecart > 0 ? "+" : ""}{fmt(ecart)}
                                            </div>
                                        </td>

                                        {/* Decision */}
                                        <td className="px-3 py-1.5 text-center">
                                            <span className={`px-1.5 py-0.5 rounded flex justify-center text-[9px] font-bold uppercase border mx-auto w-16 ${decision.color}`}>
                                                {decision.label}
                                            </span>
                                        </td>

                                        <td className="px-2 py-1.5 text-center">
                                            <button
                                                onClick={() => onOpenDetail(row)}
                                                className="p-1 rounded-md hover:bg-[#005EA8]/10 text-slate-300 hover:text-[#005EA8] transition-all"
                                                title="Détail"
                                            >
                                                <Eye size={12} />
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
