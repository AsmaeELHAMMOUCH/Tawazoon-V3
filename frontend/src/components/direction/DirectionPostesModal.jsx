import React from "react";
import { X, Minus } from "lucide-react";
import { fmt } from "../../utils/formatters";

// Minimal Modal wrapper
const Modal = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-white/50 overflow-hidden flex flex-col max-h-[85vh]">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md">
                    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-0 flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default function DirectionPostesModal({ open, onClose, centre, postes = [] }) {
    if (!open || !centre) return null;

    return (
        <Modal open={open} onClose={onClose} title={`Analyse Détaillée : ${centre.label}`}>
            <div className="flex flex-col h-full bg-slate-50/50">
                {/* --- FULL DATA TABLE --- */}
                <div className="flex-1 overflow-auto bg-white p-4">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Tous les postes</h5>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="px-2 py-1 border-b border-slate-200">Poste RH</th>
                                <th className="px-2 py-1 border-b border-slate-200 text-center">Type</th>
                                <th className="px-2 py-1 border-b border-slate-200 text-center">Effectif Actuel</th>
                                <th className="px-2 py-1 border-b border-slate-200 text-center">Effectif Calculé</th>
                                <th className="px-2 py-1 border-b border-slate-200 text-center">Écart</th>
                            </tr>
                        </thead>
                        <tbody className="text-[11px] text-slate-700 divide-y divide-slate-50">
                            {postes.length === 0 ? (
                                <tr><td colSpan={5} className="px-2 py-6 text-center text-slate-400 italic">Aucun poste trouvé.</td></tr>
                            ) : (
                                postes.map((p, idx) => {
                                    const ecart = p.ecart || 0;

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 group transition-colors">
                                            <td className="px-2 py-1 font-medium text-slate-800">{p.label}</td>
                                            <td className="px-2 py-1 text-center text-slate-500 font-bold">
                                                <span className={`px-2 py-0.5 rounded ${p.type_poste === 'MOI' ? 'bg-blue-100 text-blue-700' : p.type_poste === 'MOD' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {p.type_poste || "-"}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1 text-center font-mono text-slate-500">{fmt(p.effectif_actuel)}</td>
                                            <td className="px-2 py-1 text-center font-mono text-slate-700 font-semibold">{fmt(p.etp_calcule)}</td>
                                            <td className={`px-2 py-1 text-center font-mono font-bold ${ecart > 0 ? "text-rose-600" : ecart < 0 ? "text-blue-600" : "text-slate-300"}`}>
                                                {ecart > 0 ? "+" : ""}{fmt(ecart)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {/* Ligne de Total */}
                        {postes.length > 0 && (
                            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                                <tr className="font-bold text-[11px]">
                                    <td className="px-2 py-2 text-slate-800 uppercase">Total</td>
                                    <td className="px-2 py-2 text-center text-slate-500">-</td>
                                    <td className="px-2 py-2 text-center font-mono text-slate-700">
                                        {fmt(postes.reduce((sum, p) => sum + (p.effectif_actuel || 0), 0))}
                                    </td>
                                    <td className="px-2 py-2 text-center font-mono text-blue-700 font-bold">
                                        {fmt(postes.reduce((sum, p) => sum + (p.etp_calcule || 0), 0))}
                                    </td>
                                    <td className={`px-2 py-2 text-center font-mono font-bold ${postes.reduce((sum, p) => sum + (p.ecart || 0), 0) > 0
                                            ? "text-rose-600"
                                            : postes.reduce((sum, p) => sum + (p.ecart || 0), 0) < 0
                                                ? "text-blue-600"
                                                : "text-slate-500"
                                        }`}>
                                        {(() => {
                                            const totalEcart = postes.reduce((sum, p) => sum + (p.ecart || 0), 0);
                                            return (totalEcart > 0 ? "+" : "") + fmt(totalEcart);
                                        })()}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div >
        </Modal >
    );
}
