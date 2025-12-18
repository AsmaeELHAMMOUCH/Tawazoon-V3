```javascript
import React, { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Eye, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, UserPlus, Search as SearchIcon } from "lucide-react";
import { fmt } from "../../utils/formatters";

export default function DirectionCentresTable({ centres = [], loading, onOpenDetail }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [sortConfig, setSortConfig] = useState({ key: 'ratioLoad', direction: 'desc' });

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
            className={`ml - 1 transition - colors ${ sortConfig.key === col ? 'text-[#005EA8]' : 'text-slate-300' } `}
        />
    );

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Toolbar */}
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Performance des Centres</h3>
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
                    <thead className="bg-slate-50/80 text-[9px] uppercase text-slate-500 font-bold tracking-wide sticky top-0 z-10 border-b border-slate-200 backdrop-blur-sm">
                        <tr>
                            <th className="px-3 py-2 cursor-pointer hover:text-[#005EA8] transition-colors text-left" onClick={() => handleSort('label')}>
                                <div className="flex items-center gap-1">Centre <SortIcon col="label" /></div>
                            </th>
                            <th className="px-3 py-2 cursor-pointer hover:text-[#005EA8] transition-colors text-left w-32" onClick={() => handleSort('ratioLoad')}>
                                <div className="flex items-center gap-1">Charge <SortIcon col="ratioLoad" /></div>
                            </th>
                            <th className="px-3 py-2 text-right text-slate-400 font-semibold border-l border-slate-100 cursor-pointer hover:text-[#005EA8]" onClick={() => handleSort('fte_actuel')}>
                                <div className="flex items-center justify-end gap-1">Réel <SortIcon col="fte_actuel" /></div>
                            </th>
                            <th className="px-3 py-2 text-right text-slate-400 font-semibold cursor-pointer hover:text-[#005EA8]" onClick={() => handleSort('etp_calcule')}>
                                <div className="flex items-center justify-end gap-1">Cible <SortIcon col="etp_calcule" /></div>
                            </th>
                            <th className="px-3 py-2 cursor-pointer hover:text-[#005EA8] transition-colors text-right" onClick={() => handleSort('ecart')}>
                                <div className="flex items-center justify-end gap-1">Écart <SortIcon col="ecart" /></div>
                            </th>
                            <th className="px-3 py-2 text-center border-l border-slate-100">
                                Recommandation
                            </th>
                            <th className="px-2 py-2 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="text-[10px] text-slate-700 divide-y divide-slate-50 leading-tight">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-24"></div></td>
                                    <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-20"></div></td>
                                    <td className="px-3 py-2 border-l border-slate-50"><div className="h-3 bg-slate-100 rounded w-8 ml-auto"></div></td>
                                    <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-8 ml-auto"></div></td>
                                    <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-8 ml-auto"></div></td>
                                    <td className="px-3 py-2 border-l border-slate-50"><div className="h-3 bg-slate-100 rounded w-16 mx-auto"></div></td>
                                    <td className="px-2 py-2"></td>
                                </tr>
                            ))
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-3 py-8 text-center text-slate-400 italic">
                                    Aucun centre trouvé pour "{search}"
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
                                    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
                                    barColor: 'bg-emerald-500' 
                                };
                                
                                if (ratioLoad > 110) {
                                    decision = { 
                                        label: 'Recruter', 
                                        icon: UserPlus,
                                        color: 'bg-red-50 text-red-700 border-red-200', 
                                        barColor: 'bg-red-500' 
                                    };
                                } else if (ratioLoad > 102) {
                                    decision = { 
                                        label: 'Surveiller',
                                        icon: AlertTriangle,
                                        color: 'bg-orange-50 text-orange-700 border-orange-200', 
                                        barColor: 'bg-orange-400' 
                                    };
                                } else if (ratioLoad < 85) {
                                    decision = { 
                                        label: 'Optimiser', 
                                        icon: TrendingUp,
                                        color: 'bg-blue-50 text-blue-700 border-blue-200', 
                                        barColor: 'bg-blue-500' 
                                    };
                                }

                                const ecartColor = ecart > 0 ? "text-red-700 bg-red-50 border-red-200 font-bold" : ecart < 0 ? "text-blue-700 bg-blue-50 border-blue-200 font-bold" : "text-slate-400 bg-slate-50 border-slate-100";
                                const Icon = decision.icon;

                                return (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group cursor-default">
                                        <td className="px-3 py-2 font-semibold text-slate-800 truncate max-w-[140px]" title={row.label}>
                                            {row.label}
                                        </td>
                                        
                                        {/* Improved Charge Column */}
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                    <div 
                                                        className={`h - full rounded - full ${ decision.barColor } `} 
                                                        style={{ width: `${ Math.min(ratioLoad, 100) }% ` }} 
                                                    />
                                                </div>
                                                <span className={`text - [9px] font - bold w - 8 text - right ${
    ratioLoad > 110 ? 'text-red-600' :
        ratioLoad < 85 ? 'text-blue-600' : 'text-slate-600'
} `}>
                                                    {Math.round(ratioLoad)}%
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-3 py-2 text-right font-mono text-slate-500 border-l border-slate-50">{fmt(actuel)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-900 font-medium">{fmt(cible)}</td>
                                        
                                        <td className="px-3 py-2 text-right">
                                             <div className={`inline - flex items - center justify - center px - 1.5 py - 0.5 rounded text - [9px] border ${ ecartColor } min - w - [40px]`}>
                                                {ecart > 0 ? "+" : ""}{fmt(ecart)}
                                             </div>
                                        </td>

                                        <td className="px-3 py-2 text-center border-l border-slate-50">
                                            <span className={`inline - flex items - center gap - 1.5 px - 2 py - 0.5 rounded - full text - [9px] font - bold uppercase border shadow - sm ${ decision.color } `}>
                                                <Icon size={10} strokeWidth={3} />
                                                {decision.label}
                                            </span>
                                        </td>
                                        
                                        <td className="px-2 py-2 text-center">
                                            <button
                                                onClick={() => onOpenDetail(row)}
                                                className="p-1 rounded-md text-slate-300 hover:text-[#005EA8] hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Voir détails"
                                            >
                                                <Eye size={14} />
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
                    {sorted.length > 0 ? `${ Math.min((page - 1) * pageSize + 1, sorted.length) } - ${ Math.min(page * pageSize, sorted.length) } sur ${ sorted.length } ` : '0'}
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
```
