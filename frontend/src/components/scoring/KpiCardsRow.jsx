import React from 'react';
import { Building2, ArrowLeftRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Metric = ({ label, value, subtext, color = "slate", icon: Icon }) => (
    <div className={`bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 transition-transform hover:-translate-y-0.5`}>
        <div className={`p-2 bg-${color}-50 rounded-lg text-${color}-600`}>
            {Icon && <Icon className="w-4 h-4" />}
        </div>
        <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">{label}</span>
            <span className={`text-lg font-bold text-slate-800 leading-tight`}>{value}</span>
            {subtext && <div className="text-[9px] text-slate-400 mt-0.5">{subtext}</div>}
        </div>
    </div>
);

export default function KpiCardsRow({ stats }) {
    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Metric
                label="Centres Analysés"
                value={stats.total}
                subtext="Périmètre actif"
                icon={Building2}
                color="slate"
            />
            <Metric
                label="Centres Impactés"
                value={stats.impacted}
                subtext={stats.total > 0 ? `${Math.round((stats.impacted / stats.total) * 100)}% du réseau` : "0%"}
                icon={ArrowLeftRight}
                color="amber"
            />
            <Metric
                label="Promotions"
                value={stats.promotions}
                subtext="Passage catégorie supérieure"
                icon={ArrowUpRight}
                color="emerald"
            />
            <Metric
                label="Reclassements"
                value={stats.downgrades}
                subtext="Passage catégorie inférieure"
                icon={ArrowDownRight}
                color="rose"
            />
        </div>
    );
}
