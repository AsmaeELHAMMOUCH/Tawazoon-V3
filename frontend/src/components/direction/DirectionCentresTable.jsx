import React, { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Eye, AlertTriangle, CheckCircle2 } from "lucide-react";
import { fmt } from "../../utils/formatters";

export default function DirectionCentresTable({ centres = [], loading, onOpenDetail }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [sortConfig, setSortConfig] = useState({ key: 'ratioLoad', direction: 'desc' }); // Default sort by criticality

    // 1. Filter
    const filtered = useMemo(() => {
        if (!search) return centres;
        const s = search.toLowerCase();
        return centres.filter(c =>
            (c.label || "").toLowerCase().includes(s) ||
            (String(c.id) || "").includes(s)
        );
    }, [centres, search]);

    // 2. Prepare Data with Intelligent Metrics
    const enriched = useMemo(() => {
        return filtered.map(c => {
            const actuel = c.fte_actuel || 0;
            const cible = c.etp_calcule || 0;
            // Ratio Charge: Cible / Actuel. 
            // Ex: 10 cible / 5 actuel = 200% charge (Surcharge). 
            // Ex: 5 cible / 10 actuel = 50% charge (Sous-charge).
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
            <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Détail Centre</h3>
                </div>
                <div className="relative group">
                    <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#005EA8] transition-colors" size={10} />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        className="pl-5 pr-2 py-0.5 text-[9px] border border-slate-200 rounded-md w-28 focus:w-36 focus:ring-1 focus:ring-[#005EA8] focus:border-[#005EA8] outline-none bg-white transition-all placeholder:text-slate-400 text-slate-700 font-medium"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1 bg-white">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[8px] uppercase text-slate-500 font-bold tracking-wide sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                            <th className="px-2 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50 text-left" onClick={() => handleSort('label')}>
                                <div className="flex items-center gap-1">Centre <SortIcon col="label" /></div>
                            </th>
                            <th className="px-2 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors text-center bg-slate-50 w-24" onClick={() => handleSort('ratioLoad')}>
                                <div className="flex items-center justify-center gap-1">Charge <SortIcon col="ratioLoad" /></div>
                            </th>
                            <th className="px-2 py-1.5 text-right bg-slate-50">
                                Actuel
                            </th>
                            <th className="px-2 py-1.5 text-right bg-slate-50">
                                Cible
                            </th>
                            <th className="px-2 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors text-right bg-slate-50" onClick={() => handleSort('ecart')}>
                                <div className="flex items-center justify-end gap-1">Écart <SortIcon col="ecart" /></div>
                            </th>
                            <th className="px-2 py-1.5 text-center bg-slate-50">
                                Action
                            </th>
                            <th className="px-1 py-1 bg-slate-50 w-6"></th>
                        </tr>
                    </thead>
                    <tbody className="text-[9px] text-slate-700 divide-y divide-slate-50 leading-tight">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-2 py-1.5"><div className="h-2 bg-slate-100 rounded w-20"></div></td>
                                    <td className="px-2 py-1.5"><div className="h-2 bg-slate-100 rounded w-16 mx-auto"></div></td>
                                    <td className="px-2 py-1.5"><div className="h-2 bg-slate-100 rounded w-8 ml-auto"></div></td>
                                    <td className="px-2 py-1.5"><div className="h-2 bg-slate-100 rounded w-8 ml-auto"></div></td>
                                    <td className="px-2 py-1.5"><div className="h-2 bg-slate-100 rounded w-8 ml-auto"></div></td>
                                    <td className="px-2 py-1.5"><div className="h-2 bg-slate-100 rounded w-12 mx-auto"></div></td>
                                    <td className="px-1 py-1"></td>
                                </tr>
                            ))
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-2 py-4 text-center text-slate-400 italic text-[9px] bg-slate-50/20">
                                    <div className="flex flex-col items-center gap-1">
                                        <span>Aucun résultat trouvé.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row) => {
                                const actuel = row.fte_actuel || 0;
                                const cible = row.etp_calcule || 0;
                                const ecart = row.ecart || 0;
                                const ratioLoad = row.ratioLoad || 0;

                                let decision = { label: 'Maintenir', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', barColor: 'bg-emerald-500' };

                                if (ratioLoad > 110) {
                                    decision = { label: 'Recruter', color: 'bg-red-50 text-red-700 border-red-100', barColor: 'bg-red-500' };
                                } else if (ratioLoad > 102) {
                                    decision = { label: 'Surveiller', color: 'bg-orange-50 text-orange-700 border-orange-100', barColor: 'bg-orange-400' };
                                } else if (ratioLoad < 85) {
                                    decision = { label: 'Optimiser', color: 'bg-blue-50 text-blue-700 border-blue-100', barColor: 'bg-blue-500' };
                                }

                                const ecartLabel = ecart > 0 ? "Danger" : ecart < 0 ? "Optimisé" : "OK";
                                const ecartColor = ecart > 0 ? "text-red-600 bg-red-50 border-red-100" : ecart < 0 ? "text-blue-600 bg-blue-50 border-blue-100" : "text-emerald-600 bg-emerald-50 border-emerald-100";

                                return (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group text-[9px]">
                                        <td className="px-2 py-1 font-medium text-slate-800 truncate max-w-[110px]" title={row.label}>
                                            {row.label}
                                        </td>

                                        {/* Intelligent Charge Column */}
                                        <td className="px-2 py-1 text-center">
                                            <div className="flex flex-col gap-0.5 justify-center h-full">
                                                <div className="flex items-center justify-between text-[8px] leading-none mb-0.5 px-0.5">
                                                    <span className="font-bold text-slate-600">{Math.round(ratioLoad)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                                    <div
                                                        className={`h-full rounded-full ${decision.barColor}`}
                                                        style={{ width: `${Math.min(ratioLoad, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-2 py-1 text-right font-mono text-slate-600">{fmt(actuel)}</td>
                                        <td className="px-2 py-1 text-right font-mono text-slate-600">{fmt(cible)}</td>

                                        <td className="px-2 py-1 text-right">
                                            <div className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold border ${ecartColor} min-w-[50px]`}>
                                                {ecart > 0 ? "+" : ""}{fmt(ecart)}
                                            </div>
                                        </td>

                                        <td className="px-2 py-1 text-center">
                                            <span className={`inline-block px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold uppercase border min-w-[60px] shadow-sm ${decision.color}`}>
                                                {decision.label}
                                            </span>
                                        </td>

                                        <td className="px-1 py-1 text-center">
                                            <button
                                                onClick={() => onOpenDetail(row)}
                                                className="p-0.5 rounded text-slate-300 hover:text-[#005EA8] hover:bg-blue-50 transition-all"
                                                title="Voir détails"
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

            {/* Pagination Compact */}
            <div className="border-t border-slate-100 px-2 py-1.5 bg-slate-50/50 flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-medium">
                    {sorted.length > 0 ? `${Math.min((page - 1) * pageSize + 1, sorted.length)} - ${Math.min(page * pageSize, sorted.length)} sur ${sorted.length}` : '0'}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-0.5 rounded hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all text-slate-600"
                    >
                        <ChevronLeft size={10} />
                    </button>
                    <span className="text-[9px] font-bold text-slate-700 w-4 text-center">{page}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="p-0.5 rounded hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all text-slate-600"
                    >
                        <ChevronRight size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
}
