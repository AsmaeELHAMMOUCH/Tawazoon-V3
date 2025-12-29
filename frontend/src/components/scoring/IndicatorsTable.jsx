import React, { useState } from "react";
import { HelpCircle, ArrowUp, ArrowDown } from "lucide-react";

/**
 * Tableau détaillé des indicateurs de scoring
 * Props:
 *  - details: Array returned by calculateGlobalScore().details
 */
export default function IndicatorsTable({ details }) {
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });

    // Sorting logic
    const sortedData = [...details].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ colKey }) => {
        if (sortConfig.key !== colKey) return <div className="w-3 h-3 opacity-0 group-hover:opacity-30" />; // invisible placeholder
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
    };

    const Th = ({ label, colKey, align = "left" }) => (
        <th
            className={`px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors group select-none text-${align}`}
            onClick={() => requestSort(colKey)}
        >
            <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""}`}>
                {label}
                <SortIcon colKey={colKey} />
            </div>
        </th>
    );

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <Th label="Indicateur" colKey="label" />
                            <Th label="Valeur" colKey="value" align="center" />
                            <Th label="Palier (Ref)" colKey="tier_range" align="center" />
                            <Th label="Points" colKey="points" align="center" />
                            <Th label="Poids" colKey="weight" align="center" />
                            <Th label="Score Pondéré" colKey="score" align="center" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {sortedData.map((row, idx) => (
                            <tr key={row.key} className="hover:bg-blue-50/40 transition-colors">
                                <td className="px-3 py-2.5 font-medium text-slate-700">
                                    {row.label}
                                    <div className="text-[10px] text-slate-400 font-normal scale-95 origin-left tracking-tight">{row.unit}</div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono text-slate-700 font-medium">
                                    {Number(row.value).toLocaleString('fr-FR')}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                    <span
                                        className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600 border border-slate-200 font-mono shadow-sm cursor-help hover:bg-slate-200 transition-colors"
                                        title={`Règle : Si la valeur est comprise dans ${row.tier_range}, alors ${row.points} points sont attribués.`}
                                    >
                                        {row.tier_range}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold text-[#005EA8]">
                                    {row.points}
                                </td>
                                <td className="px-3 py-2.5 text-center text-slate-500 font-medium text-[11px]">
                                    × {row.weight.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                    <span
                                        className={`inline-block font-bold px-2.5 py-1 rounded text-xs border ${row.score >= 1.5 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            row.score >= 0.5 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}
                                        title={`Points (${row.points}) × Poids (${row.weight}) = ${row.score.toFixed(2)}`}
                                    >
                                        {row.score.toFixed(2)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-xs">
                        <tr>
                            <td colSpan={5} className="px-3 py-2 text-right text-slate-600 uppercase">Score Global</td>
                            <td className="px-3 py-2.5 text-center text-[#005EA8] text-sm">
                                {sortedData.reduce((sum, item) => sum + item.score, 0).toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
