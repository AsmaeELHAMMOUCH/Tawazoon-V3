import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import "@/styles/dialog-animations.css";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import {
  TrendingUp,
  Users,
  Calculator,
  Activity,
  CheckCircle2,
  XCircle,
  MinusCircle,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ─── Seuils ─────────────────────────────────────────────── */
const getStatus = (idx) => {
  if (idx === null || idx === undefined)
    return { label: "—", color: "#94a3b8", colorLight: "#f1f5f9", icon: MinusCircle, ring: "ring-slate-200" };
  if (idx >= 90 && idx <= 110)
    return { label: "Adéquat", color: "#10b981", colorLight: "#d1fae5", icon: CheckCircle2, ring: "ring-emerald-200" };
  return { label: "Non Adéquat", color: "#ef4444", colorLight: "#fee2e2", icon: XCircle, ring: "ring-red-200" };
};

/* ─── Gauge bar (0–200%, green zone 90–110%) ─────────────── */
const GaugeMini = ({ value }) => {
  const safeVal = Math.min(value ?? 0, 200);
  const pct = (safeVal / 200) * 100;
  const isOk = value !== null && value !== undefined && value >= 90 && value <= 110;
  const dotColor = isOk ? "#10b981" : "#ef4444";
  return (
    <div className="mt-1.5">
      <div className="relative h-5 mb-0.5">
        <div
          className="absolute -translate-x-1/2 flex flex-col items-center transition-all duration-700"
          style={{ left: `${pct}%` }}
        >
          <span
            className="text-[9px] font-black leading-none px-1.5 py-0.5 rounded-md border"
            style={{ color: dotColor, backgroundColor: isOk ? "#f0fdf4" : "#fff1f2", borderColor: isOk ? "#bbf7d0" : "#fecdd3" }}
          >
            {value ?? "—"}{value !== null && value !== undefined ? "%" : ""}
          </span>
          <div className="w-px h-1.5 mt-0.5" style={{ backgroundColor: dotColor + "88" }} />
        </div>
      </div>
      <div
        className="relative h-2 w-full rounded-full overflow-hidden"
        style={{ background: "linear-gradient(to right, #fca5a5 0%, #fca5a5 44.9%, #6ee7b7 45%, #6ee7b7 55%, #fca5a5 55.1%, #fca5a5 100%)" }}
      >
        <div
          className="absolute top-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg transition-all duration-700"
          style={{ left: `${pct}%`, transform: "translate(-50%, -50%)", backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}99` }}
        />
      </div>
      <div className="flex justify-between text-[7px] text-slate-400 mt-1 font-semibold">
        <span>0%</span><span>90%</span><span>110%</span><span>200%+</span>
      </div>
    </div>
  );
};

/* ─── KPI Card ───────────────────────────────────────────── */
const KPICard = ({ label, value, subtitle, accentColor, accentBg, IconComp, children }) => (
  <div
    className="relative overflow-hidden rounded-2xl bg-white flex flex-col transition-all duration-200 hover:-translate-y-0.5"
    style={{ border: `1px solid ${accentColor}28`, boxShadow: `0 2px 16px -4px ${accentColor}20` }}
  >
    <div
      className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
      style={{ background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}55)` }}
    />
    <div className="pl-5 pr-4 py-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: accentBg, boxShadow: `0 2px 8px -2px ${accentColor}44` }}
          >
            <IconComp className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-widest leading-none mb-0.5" style={{ color: accentColor }}>
              Indicateur
            </p>
            <p className="text-[13px] font-black text-slate-800 leading-none">{label}</p>
          </div>
        </div>
        <p className="text-2xl font-black" style={{ color: accentColor }}>{value}</p>
      </div>
      {subtitle && <p className="text-[9px] text-slate-400 font-medium">{subtitle}</p>}
      {children}
    </div>
  </div>
);

/* ─── Index badge ─────────────────────────────────────────── */
const IdxBadge = ({ value }) => {
  const status = getStatus(value);
  const StatusIcon = status.icon;
  if (value === null || value === undefined)
    return <span className="text-slate-400 text-[10px]">—</span>;
  return (
    <span
      className="dlg-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ring-1"
      style={{ backgroundColor: status.colorLight, color: status.color, "--tw-ring-color": status.color + "33" }}
    >
      <StatusIcon className="w-2.5 h-2.5 flex-shrink-0" />
      {value}%
    </span>
  );
};

/* ─── Composant principal ─────────────────────────────────── */
export default function AdequationDialog({ open, onOpenChange, simulationResults, postes, centreDetails, mode }) {
  const getActuelModValue = (p) => Number(p?.effectif_actuel_mod) || 0;

  const rows = useMemo(() => {
    if (!simulationResults || !postes) return [];
    const rpp = simulationResults.ressources_par_poste || {};
    const isMoi = (p) => {
      const type = (p.type_poste || "").toUpperCase();
      return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || !!p.is_moi;
    };
    return postes
      .filter((p) => !isMoi(p))
      .map((p) => {
        const label = (p.label || p.nom || "").trim();
        const actuel = getActuelModValue(p);
        const calcule = Math.round(rpp[label] || 0);
        const indice = actuel > 0 ? Math.round((calcule / actuel) * 100) : null;
        const status = getStatus(indice);
        return { label, actuel, calcule, indice, status };
      })
      .filter((r) => r.actuel > 0 || r.calcule > 0)
      .sort((a, b) => b.calcule - a.calcule);
  }, [simulationResults, postes]);

  const totalActuel  = useMemo(() => rows.reduce((s, r) => s + r.actuel,  0), [rows]);
  const totalCalcule = useMemo(() => rows.reduce((s, r) => s + r.calcule, 0), [rows]);
  const globalIndice = useMemo(() =>
    totalActuel === 0 ? null : Math.round((totalCalcule / totalActuel) * 100),
  [totalActuel, totalCalcule]);
  const globalStatus = getStatus(globalIndice);

  const countByStatus = useMemo(() => ({
    ok: rows.filter((r) => r.indice !== null && r.indice >= 90 && r.indice <= 110).length,
    ko: rows.filter((r) => r.indice !== null && (r.indice < 90 || r.indice > 110)).length,
  }), [rows]);

  const modeLabel = mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé";

  /* ── ECharts grouped bars ── */
  const barOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(15,23,42,.92)",
      borderWidth: 0,
      textStyle: { color: "#fff", fontSize: 11 },
      formatter: (params) => {
        const name = params[0].axisValue;
        return `<b style="font-size:11px">${name}</b><br/>${params.map((p) => `${p.marker}${p.seriesName}: <b>${p.value}</b>`).join("<br/>")}`;
      },
    },
    legend: { data: ["Actuel", modeLabel], bottom: 0, textStyle: { fontSize: 10, color: "#475569" }, itemWidth: 12, itemHeight: 8 },
    grid: { top: 14, left: 8, right: 8, bottom: 42, containLabel: true },
    xAxis: {
      type: "category",
      data: rows.map((r) => r.label),
      axisLabel: { fontSize: 9, rotate: rows.length > 4 ? 25 : 0, interval: 0, color: "#64748b" },
      axisLine: { lineStyle: { color: "rgba(148,163,184,.3)" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: { fontSize: 9, color: "#94a3b8" },
      splitLine: { lineStyle: { color: "rgba(148,163,184,.15)", type: "dashed" } },
    },
    series: [
      {
        name: "Actuel",
        type: "bar",
        barMaxWidth: 22,
        data: rows.map((r) => r.actuel),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#cbd5e1" },
            { offset: 1, color: "#94a3b8" },
          ]),
        },
      },
      {
        name: modeLabel,
        type: "bar",
        barMaxWidth: 22,
        data: rows.map((r) => r.calcule),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#7dd3fc" },
            { offset: 1, color: "#0284c7" },
          ]),
        },
      },
    ],
  }), [rows, modeLabel]);

  const [showChart, setShowChart] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (open) setAnimKey((k) => k + 1); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={animKey}
        className="dlg-enter max-w-[96vw] lg:max-w-6xl p-0 border-none shadow-sm rounded-2xl overflow-hidden"
        style={{ display: "flex", flexDirection: "column", height: "92vh", boxShadow: "0 32px 64px -12px rgba(0,0,0,0.35)" }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, borderRadius: "1rem", overflow: "hidden", background: "#f8fafc" }}>

          {/* ── HEADER ── */}
          <div
            className="dlg-header-enter relative overflow-hidden bg-gradient-to-r from-[#003d7a] via-[#005EA8] to-[#0077cc] px-6 py-4"
            style={{ flexShrink: 0 }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-white/10 blur-2xl dlg-blob-a" />
              <div className="absolute left-1/3 -bottom-8 w-32 h-32 rounded-full bg-white/8 blur-xl dlg-blob-b" />
              <div className="absolute right-1/4 top-1/2 w-20 h-20 rounded-full bg-cyan-300/10 blur-lg dlg-blob-c" />
            </div>

            <div className="relative flex items-center justify-between mr-8 gap-6">
              <div className="flex items-center gap-3">
                <div
                  className="dlg-icon-hover dlg-icon-enter w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg"
                  style={{ animationDelay: "0.1s" }}
                >
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="dlg-header-enter" style={{ animationDelay: "0.15s" }}>
                  <h2 className="text-lg font-black text-white tracking-tight leading-none">
                    Indice d&apos;Adéquation
                    {centreDetails?.centre_name && (
                      <span className="ml-2 text-sm font-bold text-blue-200">— {centreDetails.centre_name}</span>
                    )}
                  </h2>
                  <p className="text-[11px] text-blue-200/80 font-medium mt-0.5">
                    ETP {modeLabel} / Effectif Actuel × 100
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                {[
                  { label: "Postes analysés", value: rows.length, Icon: Users },
                  { label: "Adéquats", value: `${countByStatus.ok}/${rows.length}`, Icon: CheckCircle2 },
                  { label: "Non Adéquats", value: countByStatus.ko, Icon: XCircle },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="text-right hidden md:block">
                    <div className="flex items-center justify-end gap-1 mb-0.5">
                      <Icon className="w-3 h-3 text-blue-300" />
                      <p className="text-[9px] text-blue-300 font-bold uppercase tracking-widest">{label}</p>
                    </div>
                    <p className="text-xl font-black text-white leading-none">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div
            className="p-4 space-y-4"
            style={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
          >

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Colonne gauche : Effectif Actuel + ETP Calculé empilés */}
              <div className="flex flex-col gap-3">
                <div className="dlg-card-enter" style={{ animationDelay: "0.18s" }}>
                  <KPICard
                    label="Effectif Actuel"
                    value={totalActuel}
                    subtitle="agents en poste (base de données)"
                    accentColor="#64748b"
                    accentBg="#f1f5f9"
                    IconComp={Users}
                  />
                </div>

                <div className="dlg-card-enter" style={{ animationDelay: "0.26s" }}>
                  <KPICard
                    label={`ETP ${modeLabel}`}
                    value={totalCalcule}
                    subtitle={`résultat simulation — écart: ${totalCalcule >= totalActuel ? "+" : ""}${totalCalcule - totalActuel} vs actuel`}
                    accentColor="#0284c7"
                    accentBg="#e0f2fe"
                    IconComp={Calculator}
                  />
                </div>
              </div>

              {/* Colonne droite : Indice global (pleine hauteur) */}
              <div className="dlg-card-enter h-full" style={{ animationDelay: "0.34s" }}>
                <div
                  className="relative overflow-hidden rounded-2xl bg-white flex flex-col transition-all duration-200 hover:-translate-y-0.5 h-full"
                  style={{ border: `1px solid ${globalStatus.color}28`, boxShadow: `0 2px 16px -4px ${globalStatus.color}20` }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
                    style={{ background: `linear-gradient(to bottom, ${globalStatus.color}, ${globalStatus.color}55)` }}
                  />
                  <div className="pl-5 pr-4 py-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: globalStatus.colorLight, boxShadow: `0 2px 8px -2px ${globalStatus.color}44` }}
                        >
                          <Activity className="w-4 h-4" style={{ color: globalStatus.color }} />
                        </div>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-widest leading-none mb-0.5" style={{ color: globalStatus.color }}>
                            Indicateur
                          </p>
                          <p className="text-[13px] font-black text-slate-800 leading-none">Indice Global</p>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black border"
                        style={{ backgroundColor: globalStatus.colorLight, borderColor: globalStatus.color + "44", color: globalStatus.color }}
                      >
                        {globalIndice !== null && globalIndice >= 90 && globalIndice <= 110
                          ? <CheckCircle2 className="w-2.5 h-2.5" />
                          : <XCircle className="w-2.5 h-2.5" />
                        }
                        {globalStatus.label}
                      </div>
                    </div>
                    <GaugeMini value={globalIndice} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Table + toggle graphique ── */}
            <div
              className="dlg-table-enter rounded-2xl border border-white bg-white shadow-sm overflow-hidden"
              style={{ animationDelay: "0.38s" }}
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Détail par poste
                  </p>
                </div>
                <button
                  onClick={() => setShowChart((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                    showChart
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  {showChart ? "Voir le tableau" : "Visualiser en graphique"}
                  {showChart ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {showChart ? (
                <div className="px-5 pt-4 pb-5 bg-gradient-to-b from-slate-50/60 to-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                    Comparaison Actuel vs {modeLabel}
                  </p>
                  <ReactECharts option={barOption} style={{ height: 260 }} opts={{ renderer: "svg" }} />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th
                          className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200"
                          style={{ background: "#fff", borderTop: "3px solid #cbd5e1" }}
                        >
                          Poste
                        </th>
                        <th
                          className="text-center px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200"
                          style={{ background: "#fff", borderTop: "3px solid #94a3b8" }}
                        >
                          Actuel
                        </th>
                        <th
                          className="text-center px-3 py-3 text-[9px] font-black uppercase tracking-widest text-sky-600 border-b-2 border-sky-200"
                          style={{ background: "#fff", borderTop: "3px solid #0284c7" }}
                        >
                          ETP {modeLabel}
                        </th>
                        <th
                          className="text-center px-3 py-3 text-[9px] font-black uppercase tracking-widest text-sky-600 border-b-2 border-sky-200"
                          style={{ background: "#fff", borderTop: "3px solid #0284c7" }}
                        >
                          Indice
                        </th>
                        <th
                          className="text-center px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200"
                          style={{ background: "#fff", borderTop: "3px solid #94a3b8" }}
                        >
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400 text-[11px]">
                            Aucune donnée disponible
                          </td>
                        </tr>
                      ) : rows.map((r, i) => {
                        const StatusIcon = r.status.icon;
                        return (
                          <tr
                            key={i}
                            className="dlg-table-row dlg-row-enter"
                            style={{ animationDelay: `${0.4 + i * 0.04}s` }}
                          >
                            <td className="px-4 py-2.5 font-semibold text-slate-700 truncate max-w-[180px]" title={r.label}>{r.label}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-500 text-[11px]">{r.actuel}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-sky-700 text-[11px]">{r.calcule}</td>
                            <td className="px-3 py-2.5 text-center">
                              <IdxBadge value={r.indice} />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                                style={{ backgroundColor: r.status.colorLight, color: r.status.color }}
                              >
                                {StatusIcon && <StatusIcon className="w-2.5 h-2.5" />}
                                {r.status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {rows.length > 0 && (
                      <tfoot>
                        <tr
                          className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 dlg-row-enter"
                          style={{ animationDelay: `${0.4 + rows.length * 0.04 + 0.06}s` }}
                        >
                          <td className="px-4 py-3 font-black text-slate-700 text-[10px] uppercase tracking-wider">Total</td>
                          <td className="px-3 py-3 text-center font-black text-slate-700 text-[11px]">{totalActuel}</td>
                          <td className="px-3 py-3 text-center font-black text-sky-700 text-[11px] bg-sky-50/40">{totalCalcule}</td>
                          <td className="px-3 py-3 text-center bg-sky-50/40">
                            <IdxBadge value={globalIndice} />
                          </td>
                          <td className="px-3 py-3 text-center">
                            {(() => { const GIcon = globalStatus.icon; return (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                                style={{ backgroundColor: globalStatus.colorLight, color: globalStatus.color }}
                              >
                                {GIcon && <GIcon className="w-2.5 h-2.5" />}
                                {globalStatus.label}
                              </span>
                            ); })()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>

            {/* ── Légende seuils ── */}
            <div className="flex flex-wrap gap-4 px-1">
              {[
                { dot: "bg-emerald-400", label: "Adéquat", range: "90% – 110%" },
                { dot: "bg-red-400", label: "Non Adéquat", range: "< 90% ou > 110%" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.dot} flex-shrink-0`} />
                  <span className="text-[10px] font-bold text-slate-500">{s.range} — {s.label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
