import React, { useMemo } from "react";
import { Download, Layers } from "lucide-react";
import { fmt } from "../../utils/formatters";
import * as XLSX from "xlsx";

export default function DirectionConsolideTable({
    rows = [],
    totals = {},
    loading = false,
    onViewDistribution
}) {

    const exportExcel = () => {
        const data = rows.map(r => ({
            "Poste": r.label,
            "Type": r.type_poste || "-",
            "ETP Total": r.etp_total,
            "ETP Requis": r.etp_requis,
            "Écart": r.ecart
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Consolide");
        XLSX.writeFile(wb, "consolide_postes.xlsx");
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm mt-2 flex flex-col overflow-hidden">
            <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-[#005EA8]" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Consolidé par Poste</h3>
                </div>
                <button
                    onClick={exportExcel}
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                >
                    <Download size={10} />
                    XLSX
                </button>
            </div>

            <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[8px] uppercase text-slate-500 font-bold tracking-wide sticky top-0 z-10 shadow-sm border-b border-slate-100">
                        <tr>
                            <th className="px-2 py-1 border-b border-slate-200 bg-slate-50">Poste RH</th>
                            <th className="px-2 py-1 border-b border-slate-200 text-center bg-slate-50">Type</th>
                            <th className="px-2 py-1 border-b border-slate-200 text-right bg-slate-50">Actuel</th>
                            <th className="px-2 py-1 border-b border-slate-200 text-right bg-slate-50">Effectif</th>
                            <th className="px-2 py-1 border-b border-slate-200 text-right bg-slate-50">Écart</th>
                        </tr>
                    </thead>
                    <tbody className="text-[9px] text-slate-700 divide-y divide-slate-50 leading-tight">
                        {loading ? (
                            <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400">Chargement...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400 italic">Aucune donnée consolidée.</td></tr>
                        ) : (
                            rows.map((r, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-2 py-1 font-medium truncate max-w-[120px]" title={r.label}>{r.label}</td>
                                    <td className="px-2 py-1 text-center">
                                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${(r.type_poste || "").toUpperCase() === "MOD"
                                            ? "bg-blue-50 text-blue-700"
                                            : "bg-purple-50 text-purple-700"
                                            }`}>
                                            {r.type_poste || "-"}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1 text-right font-mono">{fmt(r.etp_total)}</td>
                                    <td className="px-2 py-1 text-right font-mono">{fmt(r.etp_requis)}</td>
                                    <td className={`px-2 py-1 text-right font-mono font-bold ${r.ecart > 0 ? "text-rose-600" : r.ecart < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                                        {r.ecart > 0 ? "+" : ""}{fmt(r.ecart)}
                                    </td>
                                </tr>
                            ))
                        )}
                        {/* Footer Totals */}
                        {!loading && rows.length > 0 && (
                            <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                <td className="px-2 py-1.5">TOTAL</td>
                                <td className="px-2 py-1.5"></td>
                                <td className="px-2 py-1.5 text-right font-mono text-slate-900">{fmt(totals.etp_total)}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-slate-900">{fmt(totals.etp_requis)}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-slate-900">{fmt(totals.ecart)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
