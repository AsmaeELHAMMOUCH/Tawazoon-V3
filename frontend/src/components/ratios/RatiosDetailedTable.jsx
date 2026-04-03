import { Table as TableIcon, Users } from "lucide-react";

const fmtVol = (v) => (typeof v === "number" ? Math.round(v).toLocaleString() : "0");
const fmtRatio = (v) => (typeof v === "number" ? v.toFixed(2) : "0.00");

const headerClass =
    "sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 backdrop-blur-md";
const subHeaderClass =
    "sticky top-[41px] z-10 border-b border-slate-200 bg-white/90 px-3 py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest backdrop-blur-md";

const colLabels = ["Actuel", "Calculé", "Recommandé"];
const groupCols = [
    { label: "Vol. / Mois", bgColor: "bg-blue-50/50" },
    { label: "Vol. / Jour", bgColor: "bg-indigo-50/50" },
    { label: "Vol. / Heure", bgColor: "bg-emerald-50/50" },
];

const RatiosDetailedTable = ({ rows }) => {
    if (!rows) return null;

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/40">
            {/* Table Header Section */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                        <TableIcon size={18} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">DATA GRID</p>
                        <h3 className="text-sm font-black text-slate-900 leading-tight tracking-tight">Analyse détaillée par Position</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-blue-700">
                    <Users size={12} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{rows.length} Postes analysés</span>
                </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full text-sm border-separate border-spacing-0">
                    <thead>
                        <tr>
                            <th
                                className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)]"
                                rowSpan={2}
                            >
                                POSITION
                            </th>
                            {groupCols.map(({ label, bgColor }) => (
                                <th
                                    key={label}
                                    className={`${headerClass} ${bgColor} border-l border-slate-200/50`}
                                    colSpan={3}
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {groupCols.map(({ label }) =>
                                colLabels.map((subLabel) => (
                                    <th key={`${label}-${subLabel}`} className={`${subHeaderClass} border-l first:border-l-0 border-slate-100`}>
                                        {subLabel}
                                    </th>
                                ))
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.map((row, i) => (
                            <tr
                                key={row.position}
                                className="group transition-all hover:bg-blue-50/30"
                            >
                                <td className="sticky left-0 z-20 border-r border-slate-100 bg-white/95 px-6 py-2.5 text-left text-[11px] font-black text-slate-700 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.08)] group-hover:bg-blue-50/50 transition-colors">
                                    {row.position}
                                </td>

                                {/* Mois */}
                                <td className="px-4 py-2.5 text-right font-mono text-[10px] text-slate-500 border-l border-slate-50/50">{fmtVol(row.volume_moyen_mois_actuel)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-[10px] font-bold text-blue-600 bg-blue-50/10 group-hover:bg-blue-50/20">{fmtVol(row.volume_moyen_mois_calcule)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-[10px] font-black text-[#072956] bg-blue-50/20 group-hover:bg-blue-50/30">{fmtVol(row.volume_moyen_mois_recommande)}</td>

                                {/* Jour */}
                                <td className="px-4 py-2.5 text-right font-mono text-[10px] text-slate-500 border-l border-slate-100">{fmtRatio(row.volume_moyen_jour_actuel)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50/10 group-hover:bg-indigo-50/20">{fmtRatio(row.volume_moyen_jour_calcule)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-[10px] font-black text-indigo-900 bg-indigo-50/20 group-hover:bg-indigo-50/30">{fmtRatio(row.volume_moyen_jour_recommande)}</td>

                                {/* Heure */}
                                <td className="px-4 py-2.5 text-right font-mono text-[10px] text-slate-500 border-l border-slate-100">{fmtRatio(row.volume_moyen_heure_actuel)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-[10px] font-bold text-emerald-600 bg-emerald-50/10 group-hover:bg-emerald-50/20">{fmtRatio(row.volume_moyen_heure_calcule)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-[10px] font-black text-emerald-900 bg-emerald-50/20 group-hover:bg-emerald-50/30">{fmtRatio(row.volume_moyen_heure_recommande)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State in Table */}
            {rows.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                        <TableIcon size={24} className="opacity-20" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest">Lancez la simulation pour charger les données</p>
                </div>
            )}
        </div>
    );
};

export default RatiosDetailedTable;
