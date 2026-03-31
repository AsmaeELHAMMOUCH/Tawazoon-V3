import React from "react";
import { User, CheckCircle2, TrendingUp } from "lucide-react";
import KPICardGlass from "@/components/wizard/KPICardGlass";
import EffectifFooter from "@/components/wizard/EffectifFooter";
import { safeNumber, formatSigned } from "@/lib/comparison-utils";

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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
      {/* ── DB Reference card (first column) ── */}
      {kpiDb && (
        <div className="relative overflow-hidden border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col transition-all duration-300 hover:shadow-[0_35px_80px_-20px_rgba(0,0,0,0.20)]">
          <div className="pointer-events-none absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl bg-gradient-to-br from-slate-200/20 to-transparent opacity-70" />

          {/* Header */}
          <div className="relative bg-gradient-to-r from-slate-50/50 to-white px-4 pt-3 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="items-center text-[12px] font-extrabold uppercase tracking-widest mt-3 px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600">Effectif Actuel</h3>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 text-opacity-70">ETP Total</div>
                <div className="text-xl font-black text-slate-800 leading-none">{safeNumber(kpiDb?.total)}</div>
              </div>
            </div>
            {maxEtp > 0 && (
              <div className="mt-2.5">
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full transition-all duration-700" style={{ width: `${dbPct}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 p-3.5 space-y-2.5">
            {isGlobalView && (
            <div className="flex gap-1.5">
              <div className="flex-1 rounded-xl bg-gradient-to-br from-blue-200 to-white/40 border border-blue-200/50 backdrop-blur-md px-1.5 py-2 text-center transition-all duration-300 hover:shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest mb-0.5 text-blue-600/90">MOD</div>
                <div className="text-[13px] font-black text-slate-900 leading-none">{Math.round(kpiDb.actualMOD)}</div>
              </div>
              <div className="flex-1 rounded-xl bg-gradient-to-br from-fuchsia-200 to-white/40 border border-fuchsia-200/50 backdrop-blur-md px-1.5 py-2 text-center transition-all duration-300 hover:shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest mb-0.5 text-fuchsia-600/90">MOI</div>
                <div className="text-[13px] font-black text-slate-900 leading-none">{Math.round(kpiDb.actualMOI)}</div>
              </div>
            </div>
            )}
            <div className="rounded-xl border border-slate-100/50 bg-slate-50/40 backdrop-blur-md px-3 py-2.5 flex items-center gap-3 transition-all duration-300 hover:bg-white/60 hover:shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-100">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5 leading-tight">Statutaire Total</div>
                <div className="text-lg font-black leading-none text-slate-900">{safeNumber(kpiDb?.actualStatutaire)}</div>
              </div>
            </div>
            {isGlobalView && (
            <div className="flex items-center justify-between px-1.5 pt-2 border-t border-slate-50">
              <span className="text-slate-400 font-black uppercase tracking-widest text-[7px]">Ressources APS</span>
              <span className="font-black text-emerald-700 bg-gradient-to-br from-emerald-200/60 to-white/20 border border-emerald-300/40 px-2.5 py-0.5 rounded-full backdrop-blur-sm text-[10px] shadow-sm">
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

        return (
          <div
            key={sc.key}
            className={`relative overflow-hidden border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col transition-all duration-300 hover:shadow-[0_45px_100px_-25px_rgba(0,0,0,0.25)]`}
          >
            {/* Decorative glow */}
            <div className={`pointer-events-none absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl bg-gradient-to-br ${sc.glowColor} to-transparent opacity-70`} />

            {/* Header */}
            <div className={`relative bg-gradient-to-r ${sc.headerGrad} px-4 pt-3 pb-3`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`items-center text-[12px] mt-3 font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md mb-1.5 shadow-sm ${sc.badgeColor}`}>{sc.badge}</h3>
                </div>
                {hasData && (
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 text-opacity-70">ETP Calc</div>
                    <div className={`text-xl font-black leading-none ${sc.themeColor}`}>{safeNumber(sc.kpi?.totalCalculated)}</div>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {hasData && maxEtp > 0 && (
                <div className="mt-2.5">
                  <div className={`w-full h-1 rounded-full overflow-hidden shadow-inner ${sc.barTrack}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${sc.barFill}`}
                      style={{ width: `${etpPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 p-3.5 space-y-2.5">
              {!hasData ? (
                <div className="text-center text-[8px] text-slate-400 py-6 uppercase tracking-widest font-bold">Inaccessible</div>
              ) : (
                <>
                  {/* MOD / MOI row */}
                  {isGlobalView && (
                  <div className="flex gap-1.5">
                    <div className={`flex-1 rounded-xl bg-gradient-to-br from-${sc.accentBg.replace('bg-', '')} to-white border border-${sc.accentText.split("-")[1]}-200/50 backdrop-blur-md px-1.5 py-2 text-center transition-all duration-300 hover:shadow-sm`}>
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${sc.accentText}`}>MOD</div>
                      <div className="text-[13px] font-black text-slate-900 leading-none">{Math.round(sc.kpi.targetCalculatedMOD)}</div>
                    </div>
                    <div className="flex-1 rounded-xl bg-gradient-to-br from-fuchsia-200 to-white border border-fuchsia-200/50 backdrop-blur-md px-1.5 py-2 text-center transition-all duration-300 hover:shadow-sm">
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 text-fuchsia-600/90`}>MOI</div>
                      <div className="text-[13px] font-black text-slate-900 leading-none">{Math.round(sc.kpi.targetCalculatedMOI)}</div>
                    </div>
                  </div>
                  )}

                  {/* Gap indicator (Improved Significance) */}
                  <div className={`group/gap rounded-xl border px-3 py-3 flex items-center gap-3 transition-all duration-300 hover:shadow-md ${gapNeutral
                    ? "bg-slate-50/50 border-slate-100/50"
                    : gapPositive
                      ? "bg-gradient-to-br from-rose-100/60 to-white border-rose-200/50"
                      : "bg-gradient-to-br from-emerald-100/60 to-white border-emerald-200/50"
                    }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover/gap:scale-105 ${gapNeutral ? "bg-slate-200/80" : gapPositive ? "bg-rose-100/80 shadow-rose-100" : "bg-emerald-100/80 shadow-emerald-100"
                      }`}>
                      {gapNeutral
                        ? <CheckCircle2 className="w-5 h-5 text-slate-500" />
                        : gapPositive
                          ? <TrendingUp className="w-5 h-5 text-rose-600" />
                          : <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      }
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5 leading-tight">Écart vs Actuel</div>
                      <div className={`text-lg font-black leading-none ${gapNeutral ? "text-slate-600" : gapPositive ? "text-rose-700" : "text-emerald-700"
                        }`}>
                        {formatSigned(gapVal)}
                        <span className="text-[9px] font-black ml-1.5 align-middle opacity-80 uppercase tracking-tight">
                          {gapPositive ? "Besoin" : !gapNeutral ? "Surplus" : ""}
                        </span>
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
