import React, { memo } from "react";
import {
  Users,
  Calculator,
  TrendingUp,
  AlertCircle,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2
} from "lucide-react";

/**
 * Composant KPICard harmonisé avec la page Direction V2
 * Style: Compact Premium
 */
const KPICard = memo(({ title, value, icon: Icon, trend, trendValue, colorClass, delay }) => (
  <div
    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 relative overflow-hidden group h-full flex flex-col items-center justify-center text-center"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`absolute -top-2 -right-2 p-2 opacity-5 group-hover:opacity-10 transition-opacity ${colorClass}`}>
      <Icon className="w-16 h-16" />
    </div>
    <div className="relative z-10 flex flex-col items-center w-full">
      <div className="flex items-center gap-2 mb-1.5 justify-center">
        <div className={`p-1.5 rounded-md ${colorClass && colorClass.replace('text-', 'bg-').replace('600', '50').replace('500', '50')} ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{title}</p>
      </div>

      <div className="flex items-baseline gap-2 justify-center">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h2>
        {trend && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${trend === 'up' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  </div>
));

function IndicateursDirection({ currentDir, kpis, fmt }) {
  // Calculs KPIs
  const delta = kpis?.delta ?? 0;
  const fteTotal = kpis?.fte ?? 0;

  // Calcul tendance (en %)
  const trendPercent = fteTotal > 0 ? Math.round(Math.abs(delta / fteTotal) * 100) : 0;
  const trendLabel = `${trendPercent}%`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-in fade-in duration-500">

      {/* 1. CENTRES */}
      <KPICard
        title={currentDir?.label ? `Centres : ${currentDir.label}` : "Centres Gérés"}
        value={fmt(kpis.centers)}
        icon={LayoutDashboard}
        colorClass="text-slate-600"
        delay={0}
      />

      {/* 2. EFFECTIF ACTUEL */}
      <KPICard
        title="Effectif Actuel"
        value={fmt(kpis.fte)}
        icon={Users}
        colorClass="text-slate-600"
        delay={50}
      />

      {/* 3. CIBLE */}
      <KPICard
        title="Effectif Calculé"
        value={fmt(kpis.etp)}
        icon={TrendingUp}
        colorClass="text-blue-600"
        delay={100}
      />

      {/* 4. ECART */}
      <KPICard
        title="Écart Net"
        value={`${delta > 0 ? "+" : ""}${fmt(delta)}`}
        icon={AlertCircle}
        colorClass={delta > 0 ? "text-red-500" : delta < -0.1 ? "text-emerald-500" : "text-amber-500"}
        trend={delta > 0 ? 'up' : 'down'}
        trendValue={trendLabel}
        delay={150}
      />

    </div>
  );
}

export default memo(IndicateursDirection);
