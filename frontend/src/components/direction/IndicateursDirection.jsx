"use client";
import React from "react";
import {
  Users,
  Calculator,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

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
const Card = ({ title, children, className = "" }) => (
  <section
    className={`bg-white rounded-lg border border-slate-200 
    shadow-sm ${className}`}
  >
    <header className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-lg">
      <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide leading-none">
        {title}
      </h3>
    </header>
    <div className="p-1.5">{children}</div>
  </section>
);

/* KpiTile Ultra Compact Horizontal */
const KpiTile = ({ title, value, note, icon: Icon, theme = "sky" }) => {
  const themeConfig = {
    sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-100", icon: "text-sky-600", accent: "bg-sky-500" },
    cyan: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-100", icon: "text-cyan-600", accent: "bg-cyan-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", icon: "text-amber-600", accent: "bg-amber-500" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", icon: "text-emerald-600", accent: "bg-emerald-500" },
    rose: { bg: "bg-red-50", text: "text-red-700", border: "border-red-100", icon: "text-red-600", accent: "bg-red-500" },
  };
  const t = themeConfig[theme] || themeConfig.sky;

  return (
    <div
      className={`
        relative rounded-md px-2 py-1.5 ${t.bg} border ${t.border}
        flex items-center justify-between gap-2
      `}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <div className={`p-1 rounded-md bg-white ${t.icon}`}>
            <Icon size={14} />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight leading-none mb-0.5">{title}</span>
          <span className={`text-xs font-bold ${t.text} leading-none`}>{value}</span>
        </div>
      </div>

      {note && (
        <div className="hidden sm:flex items-center gap-1 opacity-80">
          <span className={`w-1 h-1 rounded-full ${t.accent}`}></span>
          <span className="text-[8px] text-slate-500 font-medium">{note}</span>
        </div>
      )}
    </div>
  );
};

/* ========== Section KPIs extraite ========== */
export default function IndicateursDirection({ currentDir, kpis, fmt }) {
  const dirLabel = currentDir?.label || "Sélection";
  const delta = kpis?.delta ?? 0;

  return (
    <Card title={`Synthèse - ${dirLabel}`}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KpiTile
          title="Centres"
          value={fmt(kpis.centers)}
          note="Total"
          icon={Users}
          theme="sky"
        />
        <KpiTile
          title="Actuel"
          value={fmt(kpis.fte)}
          note="ETP Présent"
          icon={Calculator}
          theme="cyan"
        />
        <KpiTile
          title="Cible"
          value={fmt(kpis.etp)}
          note="ETP Requis"
          icon={CheckCircle2}
          theme="amber"
        />
        <KpiTile
          title="Écart"
          value={`${delta > 0 ? "+" : ""}${fmt(delta)}`}
          note={delta >= 0 ? "Sur-effectif" : "Sous-effectif"}
          icon={delta >= 0 ? TrendingUp : TrendingDown}
          theme={delta >= 0 ? "emerald" : "rose"}
        />
      </div>
    </Card>
  );
}
