"use client";
import React from "react";
import {
  Users,
  Calculator,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

/* UI compact identique à ta page */
const Card = ({ title, subtitle, actions, children, className = "" }) => (
  <section
    className={`bg-white/80 backdrop-blur-xl rounded-xl border border-white/60 
    shadow-[0_4px_20px_-10px_rgba(2,6,23,0.12)] hover:shadow-[0_8px_30px_-14px_rgba(2,6,23,0.18)] 
    transition-all duration-400 ${className}`}
  >
    {(title || actions) && (
      <header className="px-3 pt-3 pb-2 border-b border-white/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </header>
    )}
    <div className="px-3 py-2.5">{children}</div>
  </section>
);

/* KpiTile compact (copié de ta logique mais réduit) */
const KpiTile = ({ title, value, note, icon: Icon, theme = "sky" }) => {
  const themeConfig = {
    sky: {
      gradient: "from-sky-50/80 via-white to-white",
      border: "border-sky-100/60",
      accent: "bg-sky-500",
      iconColor: "text-sky-600",
    },
    cyan: {
      gradient: "from-cyan-50/80 via-white to-white",
      border: "border-cyan-100/60",
      accent: "bg-cyan-500",
      iconColor: "text-cyan-600",
    },
    amber: {
      gradient: "from-amber-50/80 via-white to-white",
      border: "border-amber-100/60",
      accent: "bg-amber-500",
      iconColor: "text-amber-600",
    },
    emerald: {
      gradient: "from-emerald-50/80 via-white to-white",
      border: "border-emerald-100/60",
      accent: "bg-emerald-500",
      iconColor: "text-emerald-600",
    },
    rose: {
      gradient: "from-rose-50/80 via-white to-white",
      border: "border-rose-100/60",
      accent: "bg-rose-500",
      iconColor: "text-rose-600",
    },
  };
  const t = themeConfig[theme];

  return (
    <div
      className={`
        group relative rounded-xl p-4 bg-gradient-to-br ${t.gradient}
        border ${t.border}
        shadow-[0_6px_20px_-10px_rgba(2,6,23,0.12)]
        hover:shadow-[0_10px_30px_-14px_rgba(2,6,23,0.18)]
        transition-all duration-400 hover:scale-[1.01]
        overflow-hidden
        flex flex-col items-center text-center
      `}
    >
      <div
        className={`absolute top-0 right-0 w-16 h-16 ${t.accent} opacity-5 rounded-full -translate-y-6 translate-x-6`}
      />

      {Icon && (
        <div
          className={`p-1.5 rounded-lg ${t.accent} bg-opacity-10 w-8 h-8 flex items-center justify-center mb-2`}
        >
          <Icon className={`w-4 h-4 ${t.iconColor}`} />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-0.5">
          {title}
        </div>
        <div className="text-lg font-bold text-slate-900 mb-1">{value}</div>

        {note && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${t.accent}`} />
            <span>{note}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ========== Section KPIs extraite ========== */
export default function IndicateursDirection({ currentDir, kpis, fmt }) {
  const dirLabel = currentDir?.label || "Sélectionnez une direction";
  const delta = kpis?.delta ?? 0;

  return (
    <Card
      title={`Indicateurs - ${dirLabel}`}
      subtitle="Vue d'ensemble des effectifs et besoins"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          title="Nombres Centres"
          value={fmt(kpis.centers)}
          note="Centres sous direction"
          icon={Users}
          theme="sky"
        />
        <KpiTile
          title="ETP Actuel"
          value={fmt(kpis.fte)}
          note="Effectif présent"
          icon={Calculator}
          theme="cyan"
        />
        <KpiTile
          title="ETP Calculé"
          value={fmt(kpis.etp)}
          note="Selon normes métier"
          icon={CheckCircle2}
          theme="amber"
        />
        <KpiTile
          title="Écart Global"
          value={`${delta > 0 ? "+" : ""}${fmt(delta)}`}
          note={delta >= 0 ? "Sur-effectif" : "Sous-effectif"}
          icon={delta >= 0 ? TrendingUp : TrendingDown}
          theme={delta >= 0 ? "emerald" : "rose"}
        />
      </div>
    </Card>
  );
}
