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
                <div className="flex-1 overflow-auto p-0">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default function DirectionPostesModal({ open, onClose, centre, postes = [] }) {
    if (!open || !centre) return null;

    return (
        <Modal open={open} onClose={onClose} title={`Détail Postes : ${centre.label}`}>
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold sticky top-0 z-10">
                    <tr>
                        <th className="px-4 py-2 border-b border-slate-200">Poste</th>
                        <th className="px-4 py-2 border-b border-slate-200 text-right">Effectif Actuel</th>
                        <th className="px-4 py-2 border-b border-slate-200 text-right">ETP Calculé</th>
                        <th className="px-4 py-2 border-b border-slate-200 text-right">Arrondi</th>
                        <th className="px-4 py-2 border-b border-slate-200 text-right">Écart</th>
                    </tr>
                </thead>
                <tbody className="text-[11px] text-slate-700 divide-y divide-slate-50">
                    {postes.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">Aucun poste trouvé pour ce centre.</td></tr>
                    ) : (
                        postes.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-800">{p.label}</td>
                                <td className="px-4 py-2 text-right font-mono">{fmt(p.effectif_actuel)}</td>
                                <td className="px-4 py-2 text-right font-mono">{fmt(p.etp_calcule)}</td>
                                <td className="px-4 py-2 text-right font-mono">{fmt(p.etp_arrondi)}</td>
                                <td className={`px-4 py-2 text-right font-mono font-bold ${(p.ecart || 0) > 0 ? "text-rose-600" : (p.ecart || 0) < 0 ? "text-emerald-600" : "text-slate-300"
                                    }`}>
                                    {(p.ecart || 0) > 0 ? "+" : ""}{fmt(p.ecart)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </Modal>
    );
}
