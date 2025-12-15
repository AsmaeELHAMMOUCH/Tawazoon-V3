import React from "react";
import { Building2, Calculator, CheckCircle2, TrendingUp, TrendingDown, Users } from "lucide-react";
import { fmt } from "../../utils/formatters";

// --- Local sub-components for KPIs ---

const KPI = ({ title, value, note, icon: Icon, colorClass }) => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 flex flex-col items-center text-center hover:shadow-md transition-shadow">
        <div className={`p-1.5 rounded-full mb-2 bg-slate-50 ${colorClass}`}>
            <Icon size={16} />
        </div>
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
            {title}
        </div>
        <div className="text-lg font-bold text-slate-800 leading-none mb-1">
            {value}
        </div>
        {note && (
            <div className="text-[10px] text-slate-500 font-medium bg-slate-50 px-1.5 py-0.5 rounded-full">
                {note}
            </div>
        )}
    </div>
);

export default function DirectionHeader({
    directions = [],
    selectedId,
    onSelect,
    kpis = {}
}) {
    const delta = kpis.ecart ?? 0;

    return (
        <div className="space-y-4 mb-4">
            {/* 1. Selector Bar */}
            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="bg-[#005EA8]/10 p-2 rounded-lg">
                        <Building2 className="text-[#005EA8]" size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Vue Direction</h2>
                        <p className="text-[11px] text-slate-500">Sélectionnez une direction régionale</p>
                    </div>
                </div>

                <div className="h-8 w-px bg-slate-200 mx-2"></div>

                <select
                    className="flex-1 max-w-md h-9 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 focus:border-[#005EA8] focus:ring-1 focus:ring-[#005EA8] outline-none transition-all"
                    value={selectedId || ""}
                    onChange={(e) => onSelect(e.target.value)}
                >
                    <option value="">-- Choisir une direction --</option>
                    {directions.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.label}
                        </option>
                    ))}
                </select>

                {selectedId && (
                    <div className="ml-auto text-xs text-slate-500">
                        Direction ID: <span className="font-mono font-medium text-slate-700">{selectedId}</span>
                    </div>
                )}
            </div>

            {/* 2. KPIs Grid */}
            {selectedId && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KPI
                        title="Centres"
                        value={kpis.nb_centres || 0}
                        note="Sous direction"
                        icon={Users}
                        colorClass="text-slate-600"
                    />
                    <KPI
                        title="ETP Actuel"
                        value={fmt(kpis.etp_actuel || 0)}
                        note="Effectif présent"
                        icon={Calculator}
                        colorClass="text-blue-600"
                    />
                    <KPI
                        title="ETP Calculé"
                        value={fmt(kpis.etp_calcule || 0)}
                        note="Selon normes"
                        icon={CheckCircle2}
                        colorClass="text-amber-600"
                    />
                    <KPI
                        title="Écart Global"
                        value={`${delta > 0 ? "+" : ""}${fmt(delta)}`}
                        note={delta >= 0 ? "Sur-effectif" : "Sous-effectif"}
                        icon={delta >= 0 ? TrendingUp : TrendingDown}
                        colorClass={delta >= 0 ? "text-emerald-600" : "text-rose-600"}
                    />
                </div>
            )}
        </div>
    );
}
