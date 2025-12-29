import React, { useMemo } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getSortedRowModel
} from "@tanstack/react-table";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

const Badge = ({ children, variant = "neutral", className = "" }) => {
    const styles = {
        neutral: "bg-slate-100 text-slate-700 border-slate-200",
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        danger: "bg-rose-50 text-rose-700 border-rose-200",
        cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
        blue: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${styles[variant]} ${className}`}>
            {children}
        </span>
    );
};

export default function CentresScoringTable({ data, onSelectCentre }) {

    const columnHelper = createColumnHelper();

    const columns = useMemo(() => [
        columnHelper.accessor("centre_label", {
            header: "Centre",
            cell: info => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-xs">{info.getValue()}</span>
                    <span className="text-[10px] text-slate-400 font-mono">CODE: {info.row.original.code || "-"}</span>
                </div>
            )
        }),
        columnHelper.accessor("region_id", {
            header: "Région",
            cell: info => <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Reg. {info.getValue()}</span>
        }),
        columnHelper.accessor("current_classe", {
            header: "Classe Actuelle",
            cell: info => <Badge variant="neutral">{info.getValue()}</Badge>
        }),
        columnHelper.accessor("global_score", {
            header: "Score Calculé",
            cell: info => (
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, (info.getValue() / 10) * 100)}%` }}></div>
                    </div>
                    <span className="font-mono font-bold text-slate-700 text-xs">{info.getValue().toFixed(2)}</span>
                </div>
            )
        }),
        columnHelper.accessor("simulated_classe", {
            header: "Classe Simulée",
            cell: info => {
                const cls = info.getValue();
                const colorMap = { "Classe A": "bg-emerald-100 text-emerald-800", "Classe B": "bg-blue-100 text-blue-800", "Classe C": "bg-amber-100 text-amber-800", "Classe D": "bg-rose-100 text-rose-800" };
                const specificClass = colorMap[cls] || "";
                return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border border-transparent shadow-sm ${specificClass}`}>{cls}</span>
            }
        }),
        columnHelper.accessor("impact", {
            header: "Impact",
            cell: info => {
                const s = info.getValue();
                if (s === "Promotion") return <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase"><ArrowUpRight className="w-3 h-3" /> Promotion</div>;
                if (s === "Reclassement") return <div className="flex items-center gap-1 text-rose-600 font-bold text-[10px] uppercase"><ArrowDownRight className="w-3 h-3" /> Reclassement</div>;
                return <div className="flex items-center gap-1 text-slate-400 text-[10px]"><Minus className="w-3 h-3" /> Stable</div>;
            }
        }),
        columnHelper.display({
            id: "actions",
            cell: info => (
                <button
                    onClick={() => onSelectCentre(info.row.original)}
                    className="text-[10px] font-semibold text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 px-3 py-1.5 rounded transition-colors border border-transparent hover:border-cyan-100"
                >
                    Voir Détails
                </button>
            )
        })
    ], [onSelectCentre]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        initialState: { pagination: { pageSize: 50 } }
    });

    return (
        <div className="flex-1 flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100" onClick={header.column.getToggleSortingHandler()}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted()] ?? null}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-cyan-50/40 transition-colors group">
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-3 py-1.5 text-xs text-slate-700 align-middle">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {table.getRowModel().rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                                    Aucun centre trouvé.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between mt-auto">
                <div className="text-[10px] text-slate-500">
                    Affichage de {table.getRowModel().rows.length} centres
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                        className="px-2 py-1 text-[10px] font-medium bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 shadow-sm"
                    >Précédent</button>
                    <span className="flex items-center text-[10px] text-slate-400">
                        Page {table.getState().pagination.pageIndex + 1}
                    </span>
                    <button
                        onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                        className="px-2 py-1 text-[10px] font-medium bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 shadow-sm"
                    >Suivant</button>
                </div>
            </div>
        </div>
    );
}
