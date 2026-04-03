import { Calendar, Sun, Clock, Users, ChevronRight } from "lucide-react";

const fmtRatio = (v) => (typeof v === "number" ? v.toFixed(2) : "0.00");
const fmtVol = (v) => (typeof v === "number" ? Math.round(v).toLocaleString() : "0");
const fmtInt = (v) => (typeof v === "number" ? Math.round(v).toString() : "0");

const Section = ({ label, actuel, calcule, recommande, bgColor, accentColor, icon: Icon, formatter = fmtRatio }) => (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-100 ${bgColor} p-4 transition-all hover:shadow-lg hover:shadow-slate-200/50`}>
        <div className="relative z-10 flex items-center gap-2 mb-2">
            <div className={`p-1 rounded-lg bg-white shadow-sm ${accentColor}`}>
                <Icon size={12} />
            </div>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${accentColor}`}>{label}</p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2">
            {[
                { sub: "Actuel", val: actuel, tw: "text-slate-600 bg-white/40" },
                { sub: "Calculé", val: calcule, tw: "text-blue-700 bg-blue-50/50 font-bold" },
                { sub: "Recommandé", val: recommande, tw: "text-indigo-900 bg-indigo-50/50 font-black" },
            ].map(({ sub, val, tw }) => (
                <div key={sub} className={`rounded-xl p-2 text-center transition-all group-hover:bg-white/60 ${tw}`}>
                    <p className="text-[7px] uppercase tracking-widest opacity-50 mb-0.5">{sub}</p>
                    <p className="font-mono text-xs tracking-tighter">{formatter(val)}</p>
                </div>
            ))}
        </div>
    </div>
);

const RatiosSummaryTable = ({ summary }) => {
    if (!summary) return null;

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
            {/* Main Title Section */}
            <div className="flex items-center justify-between border-b border-slate-50 bg-white px-5 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                        <Users size={16} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 leading-none">RÉSUMÉ ANALYTIQUE</p>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight leading-none mt-1">Vue Globale du Centre</h3>
                    </div>
                </div>
                <div className="h-6 flex items-center gap-2 px-3 rounded-full bg-slate-900 text-[9px] font-black text-white uppercase tracking-widest shadow-lg shadow-slate-900/10">
                    <span className="opacity-60">SCOPE:</span>
                    {summary.position}
                </div>
            </div>

            {/* Quick Stats: Effectifs Total */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-50 bg-slate-50/30">
                {[
                    { label: "Staff Actuel", value: summary.effectif_actuel, color: "text-slate-600", sub: "Collaborateurs" },
                    { label: "Staff Calculé", value: summary.effectif_calcule, color: "text-blue-600 font-bold", sub: "Théorique" },
                    { label: "Staff Recommandé", value: summary.effectif_recommande, color: "text-indigo-900 font-black", sub: "Optimisé" },
                ].map(({ label, value, color, sub }) => (
                    <div key={label} className="px-5 py-3 flex flex-col items-center text-center group hover:bg-white transition-colors">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">{label}</p>
                        <p className={`font-mono text-xl tracking-tighter ${color}`}>{fmtInt(value)}</p>
                        <p className="text-[7px] font-medium text-slate-400 mt-0.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {sub} <ChevronRight size={6} />
                        </p>
                    </div>
                ))}
            </div>

            {/* Detailed KPIs Grid */}
            <div className="grid gap-4 p-4 md:grid-cols-3 bg-white">
                <Section
                    label="Flux Mensuel"
                    icon={Calendar}
                    actuel={summary.volume_moyen_mois_actuel}
                    calcule={summary.volume_moyen_mois_calcule}
                    recommande={summary.volume_moyen_mois_recommande}
                    bgColor="bg-blue-50/30"
                    accentColor="text-blue-600"
                    formatter={fmtVol}
                />
                <Section
                    label="Flux Journalier"
                    icon={Sun}
                    actuel={summary.volume_moyen_jour_actuel}
                    calcule={summary.volume_moyen_jour_calcule}
                    recommande={summary.volume_moyen_jour_recommande}
                    bgColor="bg-indigo-50/30"
                    accentColor="text-indigo-600"
                />
                <Section
                    label="Flux Horaire"
                    icon={Clock}
                    actuel={summary.volume_moyen_heure_actuel}
                    calcule={summary.volume_moyen_heure_calcule}
                    recommande={summary.volume_moyen_heure_recommande}
                    bgColor="bg-emerald-50/30"
                    accentColor="text-emerald-600"
                />
            </div>
        </div>
    );
};

export default RatiosSummaryTable;
