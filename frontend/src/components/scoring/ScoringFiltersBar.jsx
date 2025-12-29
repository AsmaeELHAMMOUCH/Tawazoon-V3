import React from 'react';
import { Filter, Search } from 'lucide-react';

export default function ScoringFiltersBar({
    filterStatus, setFilterStatus,
    filterClass, setFilterClass,
    globalFilter, setGlobalFilter
}) {
    return (
        <div className="p-2 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row gap-2 justify-between items-center">

            {/* Left: Filters Group */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">

                {/* Impact Filter */}
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded shadow-sm whitespace-nowrap">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-700 mr-1">Impact:</span>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="text-[10px] border-none bg-transparent focus:ring-0 text-slate-800 font-medium cursor-pointer py-0 pl-0 pr-5 outline-none"
                    >
                        <option value="all">Tous</option>
                        <option value="Promotion">Promotions</option>
                        <option value="Reclassement">Reclassements</option>
                        <option value="Stable">Stables</option>
                    </select>
                </div>

                {/* Class Filter */}
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded shadow-sm whitespace-nowrap">
                    <span className="text-[10px] font-semibold text-slate-700 mr-1">Classe:</span>
                    <select
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                        className="text-[10px] border-none bg-transparent focus:ring-0 text-slate-800 font-medium cursor-pointer py-0 pl-0 pr-5 outline-none"
                    >
                        <option value="all">Toutes</option>
                        <option value="Classe A">A</option>
                        <option value="Classe B">B</option>
                        <option value="Classe C">C</option>
                        <option value="Classe D">D</option>
                    </select>
                </div>

            </div>

            {/* Right: Search */}
            <div className="relative w-full md:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Rechercher..."
                    value={globalFilter ?? ""}
                    onChange={e => setGlobalFilter(e.target.value)}
                    className="w-full pl-8 pr-2 py-1 rounded border border-slate-200 text-[10px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all shadow-sm outline-none"
                />
            </div>
        </div>
    );
}
