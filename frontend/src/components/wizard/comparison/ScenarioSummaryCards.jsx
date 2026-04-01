import React from "react";
import { User, CheckCircle2, TrendingUp } from "lucide-react";
import { safeNumber, formatSigned } from "@/lib/comparison-utils";

/** MOD/MOI : dégradés très doux, dominante blanc + légère teinte bleue */
const MOD_MOI_BY_SCENARIO = {
  actuel: {
    modShell: "from-slate-50/90 via-white to-blue-50/25 border-slate-200/45",
    modLabel: "text-blue-700/90",
    moiShell: "from-blue-50/50 via-white to-slate-50/40 border-blue-100/50",
    moiLabel: "text-blue-800/85",
  },
  consolide: {
    modShell: "from-blue-50/70 via-white to-slate-50/30 border-[#005EA8]/12",
    modLabel: "text-[#005EA8]",
    moiShell: "from-sky-50/40 via-white to-blue-50/20 border-blue-200/35",
    moiLabel: "text-blue-900/90",
  },
  optimise: {
    modShell: "from-slate-50/80 via-blue-50/35 to-white border-blue-200/30",
    modLabel: "text-blue-900/90",
    moiShell: "from-blue-50/55 via-white to-slate-50/25 border-blue-300/25",
    moiLabel: "text-[#0A2A4A]/95",
  },
};

/**
 * Scenario Summary Cards component.
 * Displays the 4-column overview of DB Reference and the 3 Simulation Scenarios.
 * v2.1 - Intensive KPI Badges Corrected.
 */
const ScenarioSummaryCards = ({
  kpiDb,
  dbPct,
  maxEtp,
  scenarios = [],
  isGlobalView,
}) => {
  const cardShell =
    "relative overflow-hidden rounded-2xl border border-slate-200/40 bg-white/95 backdrop-blur-sm flex flex-col transition-all duration-500 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-16px_rgba(15,23,42,0.08)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_20px_56px_-18px_rgba(15,23,42,0.11)] hover:border-slate-200/60";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
      {/* ── DB Reference card (first column) ── */}
      {kpiDb && (
        <div className={cardShell}>
          <div className="pointer-events-none absolute -top-24 -right-20 w-44 h-44 rounded-full blur-3xl bg-gradient-to-br from-[#005EA8]/8 via-slate-200/10 to-transparent" />

          {/* Header */}
          <div className="relative bg-gradient-to-br from-slate-50/70 via-white to-blue-50/15 px-4 pt-3.5 pb-3 border-b border-slate-100/80">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="inline-flex items-center text-[11px] font-extrabold uppercase tracking-[0.14em] mt-2 px-2 py-1 rounded-lg bg-slate-100/80 text-slate-600 border border-slate-200/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  Effectif Actuel
                </h3>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">ETP Total</div>
                <div className="text-xl font-black text-slate-800 leading-none tabular-nums">{safeNumber(kpiDb?.total)}</div>
              </div>
            </div>
            {maxEtp > 0 && (
              <div className="mt-3">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden ring-1 ring-slate-200/30">
                  <div className="h-full rounded-full bg-gradient-to-r from-slate-300/90 to-slate-400/80 transition-all duration-700" style={{ width: `${dbPct}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 p-4 space-y-3">
            {isGlobalView && (
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl bg-gradient-to-br from-blue-50/80 via-white to-slate-50/30 border border-blue-100/40 shadow-sm px-2 py-2 text-center transition-all duration-300 hover:border-blue-200/50">
                <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-blue-600/80">MOD</div>
                <div className="text-[13px] font-black text-slate-900 leading-none tabular-nums">{Math.round(kpiDb.actualMOD)}</div>
              </div>
              <div className="flex-1 rounded-xl bg-gradient-to-br from-sky-50/50 via-white to-blue-50/20 border border-sky-100/35 shadow-sm px-2 py-2 text-center transition-all duration-300 hover:border-sky-200/40">
                <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-blue-700/75">MOI</div>
                <div className="text-[13px] font-black text-slate-900 leading-none tabular-nums">{Math.round(kpiDb.actualMOI)}</div>
              </div>
            </div>
            )}
            <div className="rounded-xl border border-slate-100/80 bg-slate-50/25 px-3 py-2.5 flex items-center gap-3 transition-all duration-300 hover:bg-slate-50/45">
              <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center shrink-0 shadow-sm border border-slate-100/90">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 leading-tight">Statutaire Total</div>
                <div className="text-lg font-black leading-none text-slate-900 tabular-nums">{safeNumber(kpiDb?.actualStatutaire)}</div>
              </div>
            </div>
            {isGlobalView && (
            <div className="flex items-center justify-between px-0.5 pt-1 border-t border-slate-100/90">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[7px]">Ressources APS</span>
              <span className="font-black text-[#005EA8] bg-blue-50/90 border border-blue-100/70 px-2.5 py-0.5 rounded-full text-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                {Math.round(kpiDb.actualAPS)}
              </span>
            </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mapping through the 3 Scenarios ── */}
      {scenarios.map((sc) => {
        const hasData = sc.kpi !== null && sc.kpi !== undefined;
        const etpPct = maxEtp > 0 ? Math.min(100, ((sc.etp ?? 0) / maxEtp) * 100) : 0;
        const gapVal = sc.kpi?.totalGap;
        const gapPositive = gapVal > 0;
        const gapNeutral = gapVal === 0 || gapVal === null || gapVal === undefined;
        const mm = MOD_MOI_BY_SCENARIO[sc.key] || MOD_MOI_BY_SCENARIO.actuel;

        return (
          <div key={sc.key} className={cardShell}>
            <div
              className={`pointer-events-none absolute -top-24 -right-20 w-44 h-44 rounded-full blur-3xl bg-gradient-to-br ${sc.glowColor} to-transparent opacity-80`}
            />

            {/* Header */}
            <div className={`relative bg-gradient-to-br ${sc.headerGrad} px-4 pt-3.5 pb-3 border-b border-slate-100/70`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    className={`inline-flex items-center text-[11px] mt-2 font-extrabold uppercase tracking-[0.12em] px-2 py-1 rounded-lg mb-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ${sc.badgeColor}`}
                  >
                    {sc.badge}
                  </h3>
                </div>
                {hasData && (
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">ETP Calc</div>
                    <div className={`text-xl font-black leading-none tabular-nums ${sc.themeColor}`}>
                      {safeNumber(sc.kpi?.totalCalculated)}
                    </div>
                  </div>
                )}
              </div>

              {hasData && maxEtp > 0 && (
                <div className="mt-3">
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ring-1 ring-slate-200/25 ${sc.barTrack}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${sc.barFill}`}
                      style={{ width: `${etpPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 p-4 space-y-3">
              {!hasData ? (
                <div className="text-center text-[9px] text-slate-400 py-8 uppercase tracking-widest font-semibold">Inaccessible</div>
              ) : (
                <>
                  {isGlobalView && (
                  <div className="flex gap-2">
                    <div className={`flex-1 rounded-xl bg-gradient-to-br ${mm.modShell} shadow-sm px-2 py-2 text-center transition-all duration-300`}>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${mm.modLabel}`}>MOD</div>
                      <div className="text-[13px] font-black text-slate-900 leading-none tabular-nums">
                        {Math.round(sc.kpi.targetCalculatedMOD)}
                      </div>
                    </div>
                    <div className={`flex-1 rounded-xl bg-gradient-to-br ${mm.moiShell} shadow-sm px-2 py-2 text-center transition-all duration-300`}>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${mm.moiLabel}`}>MOI</div>
                      <div className="text-[13px] font-black text-slate-900 leading-none tabular-nums">
                        {Math.round(sc.kpi.targetCalculatedMOI)}
                      </div>
                    </div>
                  </div>
                  )}

                  <div
                    className={`group/gap rounded-xl border px-3 py-3 flex items-center gap-3 transition-all duration-300 ${
                      gapNeutral
                        ? "bg-slate-50/35 border-slate-100/80"
                        : gapPositive
                          ? "bg-gradient-to-br from-red-50/70 via-white to-red-50/15 border-red-100/80"
                          : "bg-gradient-to-br from-emerald-50/65 via-white to-emerald-50/15 border-emerald-100/70"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover/gap:scale-[1.03] ${
                        gapNeutral
                          ? "bg-white border-slate-200/80 shadow-sm"
                          : gapPositive
                            ? "bg-red-50/90 border-red-100/80"
                            : "bg-emerald-50/90 border-emerald-100/80"
                      }`}
                    >
                      {gapNeutral ? (
                        <CheckCircle2 className="w-[18px] h-[18px] text-slate-400" />
                      ) : gapPositive ? (
                        <TrendingUp className="w-[18px] h-[18px] text-red-600" />
                      ) : (
                        <CheckCircle2 className="w-[18px] h-[18px] text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 leading-tight">Écart vs Actuel</div>
                      <div
                        className={`text-lg font-black leading-none tabular-nums ${
                          gapNeutral ? "text-slate-600" : gapPositive ? "text-red-800" : "text-emerald-700"
                        }`}
                      >
                        {formatSigned(gapVal)}
                        {!gapNeutral && (
                          <span
                            className={`text-[9px] font-bold ml-1.5 align-middle uppercase tracking-tight ${
                              gapPositive ? "text-red-700" : "text-emerald-700"
                            }`}
                          >
                            {gapPositive ? "Besoin" : "Surplus"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScenarioSummaryCards;
