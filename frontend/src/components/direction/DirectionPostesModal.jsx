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

    // 1. Analyze Data
    // Ecart = Cible - Actuel ? No, usually Ecart in this app is (Cible - Actuel) or (Actuel - Cible)?
    // Let's check formatters or previous code.
    // In VueDirection table: ecart = etp_calcule - etp_actuel.
    // If Ecart > 0 => Manque de monde (Deficit / Sous-effectif). 
    // If Ecart < 0 => Trop de monde (Surplus / Sur-effectif).
    // WAIT. In previous steps, "Surplus" was shown as positive?
    // Let's check Table Logic in Step 622: 
    // `isPos = ecart > 0.1` (Surplus badge colored Red?).
    // Table logic: `ecart > 0 ? 'text-red'`. Usually Red means "Bad" or "Missing"?
    // If `etp_calcule` (Need) > `etp_actuel` (Have) => `ecart` is positive. YES.
    // So Positive Ecart = UNDERSTAFFED (Need more).
    // Negative Ecart = OVERSTAFFED (Have too many).

    // Let's re-read colors in Table (Step 622):
    // `ecart > 0 ? bg-red ... text-red`. Red usually means "Warning: Missing People".
    // `decision = Recruter` if ratioLoad > 110 (which means Cible > Actuel).

    // So:
    // Ecart > 0 : SOUS-EFFECTIF (Manque) -> Action: Recruter
    // Ecart < 0 : SUR-EFFECTIF (Trop) -> Action: Optimiser

    const sorted = [...postes].sort((a, b) => (b.ecart || 0) - (a.ecart || 0)); // Descending Ecart

    // Analysis
    const sousEffectif = sorted.filter(p => (p.ecart || 0) > 0.1).slice(0, 3); // Top Positive (Missing most)
    const surEffectif = sorted.filter(p => (p.ecart || 0) < -0.1).reverse().slice(0, 3); // Top Negative (Most negative first)

    return (
        <Modal open={open} onClose={onClose} title={`Analyse Détaillée : ${centre.label}`}>
            <div className="flex flex-col h-full bg-slate-50/50">
                {/* --- INTELLIGENT SUMMARY --- */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-200 bg-white">
                    {/* Colonne GAUCHE : Sous-effectif (Urgence) */}
                    <div className="bg-rose-50 rounded-xl border border-rose-100 p-4 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-16 h-16 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
                        </div>
                        <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            🚫 Priorité : Combler les manques
                        </h4>
                        <div className="space-y-2 relative z-10">
                            {sousEffectif.length > 0 ? (
                                sousEffectif.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-white/60 p-2 rounded-lg border border-rose-100">
                                        <span className="font-medium text-slate-700">{p.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-rose-700 font-bold">+{fmt(p.ecart)}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-200 text-rose-800 font-bold uppercase">Recruter</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-rose-400 italic">Aucun sous-effectif critique identifié.</div>
                            )}
                        </div>
                    </div>

                    {/* Colonne DROITE : Sur-effectif (Opportunité) */}
                    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-16 h-16 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                        </div>
                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            💎 Opportunité : Redistribution / Formation
                        </h4>
                        <div className="space-y-2 relative z-10">
                            {surEffectif.length > 0 ? (
                                surEffectif.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-white/60 p-2 rounded-lg border border-blue-100">
                                        <span className="font-medium text-slate-700">{p.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-700 font-bold">{fmt(p.ecart)}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-200 text-blue-800 font-bold uppercase">Redéployer</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-blue-400 italic">Effectifs optimisés. Aucun surplus d'effectif majeur.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- FULL DATA TABLE --- */}
                <div className="flex-1 overflow-auto bg-white p-4">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Tous les postes</h5>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2 border-b border-slate-200">Poste RH</th>
                                <th className="px-4 py-2 border-b border-slate-200 text-right">Effectif Actuel</th>
                                <th className="px-4 py-2 border-b border-slate-200 text-right">Effectif Calculé</th>
                                <th className="px-4 py-2 border-b border-slate-200 text-right">Écart</th>
                                <th className="px-4 py-2 border-b border-slate-200 text-center">Recommandation</th>
                            </tr>
                        </thead>
                        <tbody className="text-[11px] text-slate-700 divide-y divide-slate-50">
                            {postes.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">Aucun poste trouvé.</td></tr>
                            ) : (
                                postes.map((p, idx) => {
                                    const ecart = p.ecart || 0;
                                    let actionLabel = "—";
                                    let actionColor = "text-slate-300";

                                    if (ecart > 0.1) {
                                        actionLabel = "Recruter";
                                        actionColor = "text-rose-600 font-bold";
                                    } else if (ecart < -0.1) {
                                        actionLabel = "Mobilité / Formation";
                                        actionColor = "text-blue-600 font-bold";
                                    }

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 group transition-colors">
                                            <td className="px-4 py-2 font-medium text-slate-800">{p.label}</td>
                                            <td className="px-4 py-2 text-right font-mono text-slate-500">{fmt(p.effectif_actuel)}</td>
                                            <td className="px-4 py-2 text-right font-mono text-slate-700 font-semibold">{fmt(p.etp_calcule)}</td>
                                            <td className={`px-4 py-2 text-right font-mono font-bold ${ecart > 0 ? "text-rose-600" : ecart < 0 ? "text-blue-600" : "text-slate-300"}`}>
                                                {ecart > 0 ? "+" : ""}{fmt(ecart)}
                                            </td>
                                            <td className={`px-4 py-2 text-center text-[10px] uppercase ${actionColor}`}>
                                                {actionLabel}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}
