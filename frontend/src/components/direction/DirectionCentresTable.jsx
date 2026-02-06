import React, { useState, useMemo, memo } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Eye, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, UserPlus, Search as SearchIcon } from "lucide-react";
import { fmt } from "../../utils/formatters";

function DirectionCentresTable({ centres = [], loading, onOpenDetail, headerActions }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [sortConfig, setSortConfig] = useState({ key: 'ecart', direction: 'desc' });

    // 1. Filter
    const filtered = useMemo(() => {
        if (!search) return centres;
        const s = search.toLowerCase();
        return centres.filter(c =>
            (c.label || "").toLowerCase().includes(s) ||
            (String(c.id) || "").includes(s)
        );
    }, [centres, search]);

    // 2. Prepare Data
    const enriched = useMemo(() => {
        return filtered.map(c => {
            const actuel = c.fte_actuel || 0;
            const cible = c.etp_calcule || 0;
            const ratioLoad = actuel > 0 ? (cible / actuel) * 100 : (cible > 0 ? 999 : 0);
            return { ...c, ratioLoad };
        });
    }, [filtered]);

    // 3. Sort
    const sorted = useMemo(() => {
        if (!sortConfig.key) return enriched;
        return [...enriched].sort((a, b) => {
            let av = a[sortConfig.key];
            let bv = b[sortConfig.key];
            if (av == null) av = -Infinity;
            if (bv == null) bv = -Infinity;
            if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
            if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [enriched, sortConfig]);

    // 4. Paginate
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
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Résultats</h3>
                    {headerActions}
                </div>
                <div className="relative group">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#005EA8] transition-colors" size={12} />
                    <input
                        type="text"
                        placeholder="Filtrer..."
                        className="pl-7 pr-2 py-1 text-[10px] border border-slate-200 rounded-lg w-32 focus:w-48 focus:ring-1 focus:ring-[#005EA8] focus:border-[#005EA8] outline-none bg-slate-50 focus:bg-white transition-all placeholder:text-slate-400 text-slate-700 font-medium"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1 bg-white">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold tracking-widest sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                        <tr>
                            <th className="px-2 py-1.5 cursor-pointer hover:text-[#005EA8] transition-colors text-left border-r border-slate-200/60" onClick={() => handleSort('label')}>
                                <div className="flex items-center gap-1">Nom de Centre<SortIcon col="label" /></div>
                            </th>
                            <th className="px-2 py-1.5 text-center text-slate-500 font-semibold cursor-pointer hover:text-[#005EA8] border-r border-slate-200/60" onClick={() => handleSort('fte_actuel')}>
                                <div className="flex items-center justify-center gap-1">Actuel <SortIcon col="fte_actuel" /></div>
                            </th>
                            <th className="px-2 py-1.5 text-center text-slate-500 font-semibold cursor-pointer hover:text-[#005EA8] border-r border-slate-200/60" onClick={() => handleSort('etp_calcule')}>
                                <div className="flex items-center justify-center gap-1">Calculé <SortIcon col="etp_calcule" /></div>
                            </th>
                            <th className="px-2 py-1.5 cursor-pointer hover:text-[#005EA8] transition-colors text-center border-r border-slate-200/60" onClick={() => handleSort('ecart')}>
                                <div className="flex items-center justify-center gap-1">Écart <SortIcon col="ecart" /></div>
                            </th>
                            <th className="px-2 py-1.5 text-center w-24 text-slate-400 font-bold tracking-widest uppercase text-[10px]">
                                Détail
                            </th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px] text-slate-600 divide-y divide-slate-50 leading-relaxed">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-2 py-1.5"><div className="h-4 bg-slate-50 rounded w-24"></div></td>
                                    <td className="px-2 py-1.5"><div className="h-4 bg-slate-50 rounded w-8 mx-auto"></div></td>
                                    <td className="px-2 py-1.5"><div className="h-4 bg-slate-50 rounded w-8 mx-auto"></div></td>
                                    <td className="px-2 py-1.5"><div className="h-4 bg-slate-50 rounded w-8 mx-auto"></div></td>
                                    <td className="px-2 py-1.5"><div className="h-8 w-8 bg-slate-50 rounded-lg mx-auto"></div></td>
                                </tr>
                            ))
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-2 py-12 text-center text-slate-400 font-light">
                                    Aucun résultat correspondant
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row) => {
                                const actuel = row.fte_actuel || 0;
                                const cible = row.etp_calcule || 0;
                                const ecart = row.ecart || 0;
                                const ratioLoad = row.ratioLoad || 0;

                                let decision = {
                                    label: 'Maintenir',
                                    icon: CheckCircle2,
                                    color: 'bg-emerald-50/50 text-emerald-600 border-emerald-100',
                                    barColor: 'bg-emerald-400'
                                };

                                if (ratioLoad > 110) {
                                    decision = {
                                        label: 'Recruter',
                                        icon: UserPlus,
                                        color: 'bg-rose-50/50 text-rose-600 border-rose-100',
                                        barColor: 'bg-rose-500'
                                    };
                                } else if (ratioLoad > 102) {
                                    decision = {
                                        label: 'Surveiller',
                                        icon: AlertTriangle,
                                        color: 'bg-amber-50/50 text-amber-600 border-amber-100',
                                        barColor: 'bg-amber-400'
                                    };
                                } else if (ratioLoad < 85) {
                                    decision = {
                                        label: 'Optimiser',
                                        icon: TrendingUp,
                                        color: 'bg-indigo-50/50 text-indigo-600 border-indigo-100',
                                        barColor: 'bg-indigo-500'
                                    };
                                }

                                const ecartColor = ecart > 0 ? "text-rose-600 font-bold" : ecart < 0 ? "text-indigo-600 font-bold" : "text-slate-400";
                                const Icon = decision.icon;

                                return (
                                    <tr key={row.id} className="hover:bg-slate-50/80 transition-all group border-l-2 border-l-transparent hover:border-l-[#005EA8] border-b border-slate-50">
                                        <td className="px-2 py-1.5 font-medium text-slate-700 truncate max-w-[320px] border-r border-slate-50" title={row.label}>
                                            {row.label}
                                        </td>

                                        <td className="px-2 py-1.5 text-center font-mono text-slate-500 border-r border-slate-50">{fmt(actuel)}</td>
                                        <td className="px-2 py-1.5 text-center font-mono text-slate-800 font-semibold border-r border-slate-50">{fmt(cible)}</td>

                                        <td className="px-2 py-1.5 text-center border-r border-slate-50">
                                            <span className={`font-mono text-[10px] ${ecartColor}`}>
                                                {ecart > 0 ? "+" : ""}{fmt(ecart)}
                                            </span>
                                        </td>

                                        <td className="px-2 py-1.5 text-center">
                                            <button
                                                onClick={() => onOpenDetail(row)}
                                                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-[#005EA8] hover:bg-blue-50 transition-colors"
                                                title="Voir le détail"
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

            {/* Pagination Compact */}
            <div className="border-t border-slate-200 px-3 py-2 bg-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-medium">
                    {sorted.length > 0 ? `${Math.min((page - 1) * pageSize + 1, sorted.length)} - ${Math.min(page * pageSize, sorted.length)} sur ${sorted.length}` : '0'}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-1 rounded hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all text-slate-600"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <div className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 min-w-[24px] text-center shadow-sm">
                        {page}
                    </div>
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

export default memo(DirectionCentresTable);
