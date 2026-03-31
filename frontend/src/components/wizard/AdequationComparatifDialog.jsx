import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import "@/styles/dialog-animations.css";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Users,
  Activity,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ─── Helpers ────────────────────────────────────────────── */
const isMoiPoste = (p) => {
  const type = (p?.type_poste || "").toUpperCase();
  return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || !!p?.is_moi;
};

const toN = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const getStatus = (idx) => {
  if (idx === null || idx === undefined)
    return { label: "—", color: "#94a3b8", colorLight: "#f1f5f9", icon: MinusCircle, ring: "ring-slate-200" };
  if (idx >= 90 && idx <= 110)
    return { label: "Adéquat", color: "#10b981", colorLight: "#d1fae5", icon: CheckCircle2, ring: "ring-emerald-200" };
  return { label: "Non Adéquat", color: "#ef4444", colorLight: "#fee2e2", icon: XCircle, ring: "ring-red-200" };
};

/* ─── Mini gauge bar (0–200%, green zone 90-110%) ────────── */
const GaugeMini = ({ value }) => {
  const safeVal = Math.min(value ?? 0, 200);
  const pct = (safeVal / 200) * 100;
  const isOk = value !== null && value !== undefined && value >= 90 && value <= 110;
  const dotColor = isOk ? "#10b981" : "#ef4444";
  return (
    <div className="mt-2.5">
      {/* Label flottant au-dessus du point */}
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
      <div className="relative h-2 w-full rounded-full overflow-hidden"
        style={{ background: "linear-gradient(to right, #fca5a5 0%, #fca5a5 44.9%, #6ee7b7 45%, #6ee7b7 55%, #fca5a5 55.1%, #fca5a5 100%)" }}>
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

/* ─── Scenario KPI card ─────────────────────────────────── */
const ScenarioCard = ({ title, idx, value, accentColor, accentBg, IconComp }) => {
  const isOk   = idx !== null && idx !== undefined && idx >= 90 && idx <= 110;
  const hasIdx = idx !== null && idx !== undefined;
  const idxColor  = isOk ? "#10b981" : hasIdx ? "#ef4444" : "#94a3b8";
  const idxBg     = isOk ? "#f0fdf4" : hasIdx ? "#fff1f2" : "#f8fafc";
  const idxBorder = isOk ? "#bbf7d0" : hasIdx ? "#fecdd3" : "#e2e8f0";
  const gaugePct  = (Math.min(idx ?? 0, 200) / 200) * 100;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white flex flex-col transition-all duration-200 hover:-translate-y-0.5"
      style={{ border: `1px solid ${accentColor}28`, boxShadow: `0 2px 16px -4px ${accentColor}20` }}>

      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}55)` }} />

      <div className="pl-5 pr-4 py-4 flex flex-col gap-3">

        {/* Row 1 — icon + title | status badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: accentBg, boxShadow: `0 2px 8px -2px ${accentColor}44` }}>
              <IconComp className="w-4 h-4" style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest leading-none mb-0.5" style={{ color: accentColor }}>Scénario</p>
              <p className="text-[13px] font-black text-slate-800 leading-none">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black border"
            style={{ backgroundColor: idxBg, borderColor: idxBorder, color: idxColor }}>
            {isOk ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
            {isOk ? "Adéquat" : "Non adéquat"}
          </div>
        </div>

        {/* Row 3 — gauge bar with floating label */}
        <div>
          <div className="relative h-5 mb-0.5">
            <div className="absolute -translate-x-1/2 flex flex-col items-center transition-all duration-700"
              style={{ left: `${gaugePct}%` }}>
              <span className="text-[8px] font-black leading-none px-1.5 py-0.5 rounded-md border"
                style={{ color: idxColor, backgroundColor: idxBg, borderColor: idxBorder }}>
                {hasIdx ? `${idx}%` : "—"}
              </span>
              <div className="w-px h-1.5 mt-0.5" style={{ backgroundColor: idxColor + "88" }} />
            </div>
          </div>
          <div className="relative h-2 w-full rounded-full overflow-hidden"
            style={{ background: "linear-gradient(to right,#fca5a5 0%,#fca5a5 44.9%,#6ee7b7 45%,#6ee7b7 55%,#fca5a5 55.1%,#fca5a5 100%)" }}>
            <div className="absolute top-1/2 w-3.5 h-3.5 rounded-full border-2 border-white transition-all duration-700"
              style={{ left: `${gaugePct}%`, transform: "translate(-50%,-50%)", backgroundColor: idxColor, boxShadow: `0 0 6px ${idxColor}99` }} />
          </div>
          <div className="flex justify-between text-[7px] text-slate-400 mt-1 font-semibold">
            <span>0%</span><span>90%</span><span>110%</span><span>200%+</span>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ─── Index badge for table cells ───────────────────────── */
const IdxBadge = ({ value }) => {
  const status = getStatus(value);
  const StatusIcon = status.icon;
  if (value === null || value === undefined)
    return <span className="text-slate-400 text-[10px]">—</span>;
  return (
    <span className="dlg-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ring-1"
      style={{ backgroundColor: status.colorLight, color: status.color, "--tw-ring-color": status.color + "33" }}>
      <StatusIcon className="w-2.5 h-2.5 flex-shrink-0" />
      {value}%
    </span>
  );
};

/* ─── Component ─────────────────────────────────────────── */
export default function AdequationComparatifDialog({
  open,
  onOpenChange,
  postes,
  centreDetails,
  responseActuel,
  responseConsolide,
  responseOptimise,
  selectedPosteObj,
}) {
  const getActuelModValue = (p) => {
    return Number(p?.effectif_actuel_mod) || 0;
  };

  const rows = useMemo(() => {
    if (!postes?.length || !responseActuel) return [];

    const rActuel = responseActuel.ressources_par_poste || {};
    const rConsolide = responseConsolide?.ressources_par_poste || {};
    const rOptimise = responseOptimise?.ressources_par_poste || {};

    const selectedLabel = selectedPosteObj
      ? (selectedPosteObj.label || selectedPosteObj.nom || "").trim().toUpperCase()
      : null;

    return postes
      .filter((p) => !isMoiPoste(p))
      .filter((p) => {
        if (!selectedLabel) return true;
        const label = (p.label || p.nom || "").trim().toUpperCase();
        return label === selectedLabel;
      })
      .map((p) => {
        const label = (p.label || p.nom || "").trim();
        const actuel = Math.round(toN(getActuelModValue(p)));
        const calcActuel = Math.round(toN(rActuel[label]));
        const calcConsolide = Math.round(toN(rConsolide[label]));
        const calcOptimise = Math.round(toN(rOptimise[label]));

        const idxActuel = actuel > 0 ? Math.round((calcActuel / actuel) * 100) : null;
        const idxConsolide = actuel > 0 ? Math.round((calcConsolide / actuel) * 100) : null;
        const idxOptimise = actuel > 0 ? Math.round((calcOptimise / actuel) * 100) : null;

        return { label, actuel, calcActuel, calcConsolide, calcOptimise, idxActuel, idxConsolide, idxOptimise };
      })
      .filter((r) => r.actuel > 0 || r.calcActuel > 0 || r.calcConsolide > 0 || r.calcOptimise > 0)
      .sort((a, b) => b.calcActuel - a.calcActuel);
  }, [postes, responseActuel, responseConsolide, responseOptimise, selectedPosteObj]);

  const totals = useMemo(() => {
    const totalActuel = rows.reduce((s, r) => s + r.actuel, 0);
    const totalCalcActuel = rows.reduce((s, r) => s + r.calcActuel, 0);
    const totalCalcConsolide = rows.reduce((s, r) => s + r.calcConsolide, 0);
    const totalCalcOptimise = rows.reduce((s, r) => s + r.calcOptimise, 0);

    const idxActuel = totalActuel > 0 ? Math.round((totalCalcActuel / totalActuel) * 100) : null;
    const idxConsolide = totalActuel > 0 ? Math.round((totalCalcConsolide / totalActuel) * 100) : null;
    const idxOptimise = totalActuel > 0 ? Math.round((totalCalcOptimise / totalActuel) * 100) : null;

    const countOkCalc = rows.filter((r) => r.idxActuel !== null && r.idxActuel >= 90 && r.idxActuel <= 110).length;
    const countOkCons = rows.filter((r) => r.idxConsolide !== null && r.idxConsolide >= 90 && r.idxConsolide <= 110).length;
    const countOkOpt = rows.filter((r) => r.idxOptimise !== null && r.idxOptimise >= 90 && r.idxOptimise <= 110).length;

    return { totalActuel, totalCalcActuel, totalCalcConsolide, totalCalcOptimise, idxActuel, idxConsolide, idxOptimise, countOkCalc, countOkCons, countOkOpt };
  }, [rows]);

  /* ── ECharts: grouped bars + index line ── */
  const chartOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(15,23,42,.92)",
      borderWidth: 0,
      textStyle: { color: "#fff", fontSize: 11 },
      formatter: (params) => {
        const name = params[0]?.axisValue || "";
        const lines = params.map((p) => `${p.marker} ${p.seriesName}: <b>${p.value}</b>`).join("<br/>");
        return `<b style="font-size:11px">${name}</b><br/>${lines}`;
      },
    },
    legend: {
      data: ["Actuel (DB)", "Calculé", "Consolidé", "Optimisé"],
      bottom: 0,
      textStyle: { fontSize: 10, color: "#475569" },
      itemWidth: 12,
      itemHeight: 8,
    },
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
        name: "Actuel (DB)",
        type: "bar",
        barMaxWidth: 18,
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
        name: "Calculé",
        type: "bar",
        barMaxWidth: 18,
        data: rows.map((r) => r.calcActuel),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#7dd3fc" },
            { offset: 1, color: "#0284c7" },
          ]),
        },
      },
      {
        name: "Consolidé",
        type: "bar",
        barMaxWidth: 18,
        data: rows.map((r) => r.calcConsolide),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#fcd34d" },
            { offset: 1, color: "#d97706" },
          ]),
        },
      },
      {
        name: "Optimisé",
        type: "bar",
        barMaxWidth: 18,
        data: rows.map((r) => r.calcOptimise),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#6ee7b7" },
            { offset: 1, color: "#059669" },
          ]),
        },
      },
    ],
  }), [rows]);

  /* ── ECharts: index comparison (bar) ── */
  const idxChartOption = useMemo(() => {
    const isAdequat = (v) => v !== null && v !== undefined && v >= 90 && v <= 110;
    const barColor = (v) =>
      new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: isAdequat(v) ? "#34d399" : "#fca5a5" },
        { offset: 1, color: isAdequat(v) ? "#059669" : "#ef4444" },
      ]);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(15,23,42,.93)",
        borderWidth: 0,
        padding: [8, 12],
        textStyle: { color: "#fff", fontSize: 11 },
        formatter: (params) => {
          const name = params[0]?.axisValue || "";
          const lines = params
            .filter((p) => p.seriesType === "bar")
            .map((p) => {
              const ok = isAdequat(p.value);
              const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ok ? "#10b981" : "#ef4444"};margin-right:5px"></span>`;
              return `${dot}<b>${p.seriesName}</b>: ${p.value}% <span style="color:${ok ? "#6ee7b7" : "#fca5a5"};font-size:9px">${ok ? "✓ Adéquat" : "✗ Hors zone"}</span>`;
            })
            .join("<br/>");
          return `<div style="font-size:11px;font-weight:700;margin-bottom:6px;color:#e2e8f0">${name}</div>${lines}`;
        },
      },
      legend: {
        data: [
          { name: "Calculé",   icon: "roundRect", textStyle: { color: "#0284c7" } },
          { name: "Consolidé", icon: "roundRect", textStyle: { color: "#ca8a04" } },
          { name: "Optimisé",  icon: "roundRect", textStyle: { color: "#059669" } },
        ],
        bottom: 4,
        textStyle: { fontSize: 10 },
        itemWidth: 10,
        itemHeight: 10,
      },
      grid: { top: 16, left: 12, right: 20, bottom: 48, containLabel: true },
      xAxis: {
        type: "category",
        data: rows.map((r) => r.label),
        axisLabel: {
          fontSize: 9,
          rotate: rows.length > 4 ? 28 : 0,
          interval: 0,
          color: "#64748b",
          fontWeight: 600,
        },
        axisLine: { lineStyle: { color: "rgba(148,163,184,.25)" } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        axisLabel: { fontSize: 9, color: "#94a3b8", formatter: (v) => `${v}%` },
        splitLine: { lineStyle: { color: "rgba(148,163,184,.12)", type: "dashed" } },
      },
      series: [
        {
          name: "Calculé",
          type: "bar",
          barMaxWidth: 22,
          data: rows.map((r) => ({
            value: r.idxActuel ?? 0,
            itemStyle: { color: barColor(r.idxActuel), borderRadius: [5, 5, 0, 0] },
          })),
          label: { show: false },
        },
        {
          name: "Consolidé",
          type: "bar",
          barMaxWidth: 22,
          data: rows.map((r) => ({
            value: r.idxConsolide ?? 0,
            itemStyle: { color: barColor(r.idxConsolide), borderRadius: [5, 5, 0, 0] },
          })),
          label: { show: false },
        },
        {
          name: "Optimisé",
          type: "bar",
          barMaxWidth: 22,
          data: rows.map((r) => ({
            value: r.idxOptimise ?? 0,
            itemStyle: { color: barColor(r.idxOptimise), borderRadius: [5, 5, 0, 0] },
          })),
          label: { show: false },
        },
        {
          name: "_zone",
          type: "bar",
          barWidth: 0,
          silent: true,
          markArea: {
            silent: true,
            itemStyle: { color: "rgba(16,185,129,.06)" },
            data: [[{ yAxis: 90 }, { yAxis: 110 }]],
          },
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: 90,
                lineStyle: { color: "#10b981", type: "dashed", width: 1.5, opacity: 0.7 },
                label: { formatter: "90%", fontSize: 9, color: "#059669", fontWeight: 700, position: "insideEndBottom" },
              },
              {
                yAxis: 110,
                lineStyle: { color: "#10b981", type: "dashed", width: 1.5, opacity: 0.7 },
                label: { formatter: "110%", fontSize: 9, color: "#059669", fontWeight: 700, position: "insideEndTop" },
              },
            ],
          },
          data: [],
        },
      ],
    };
  }, [rows]);

  const [showChart, setShowChart] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (open) setAnimKey((k) => k + 1); }, [open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={animKey}
        className="dlg-enter max-w-[96vw] lg:max-w-6xl p-0 border-none shadow-sm rounded-2xl overflow-hidden"
        style={{ display: "flex", flexDirection: "column", height: "92vh", boxShadow: "0 32px 64px -12px rgba(0,0,0,0.35)" }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, borderRadius: "1rem", overflow: "hidden", background: "#f8fafc" }}>

          {/* ── HEADER ── */}
          <div className="dlg-header-enter relative overflow-hidden bg-gradient-to-r from-[#003d7a] via-[#005EA8] to-[#0077cc] px-6 py-4"
            style={{ flexShrink: 0 }}>
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-white/10 blur-2xl dlg-blob-a" />
              <div className="absolute left-1/3 -bottom-8 w-32 h-32 rounded-full bg-white/8 blur-xl dlg-blob-b" />
              <div className="absolute right-1/4 top-1/2 w-20 h-20 rounded-full bg-cyan-300/10 blur-lg dlg-blob-c" />
            </div>

            <div className="relative flex items-center justify-between mr-8 gap-6">
              <div className="flex items-center gap-3">
                <div className="dlg-icon-hover dlg-icon-enter w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg"
                  style={{ animationDelay: "0.1s" }}>
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div className="dlg-header-enter" style={{ animationDelay: "0.15s" }}>
                  <h2 className="text-lg font-black text-white tracking-tight leading-none">
                    Indice d&apos;Adéquation
                    {centreDetails?.centre_name && (
                      <span className="ml-2 text-sm font-bold text-blue-200">— {centreDetails.centre_name}</span>
                    )}
                  </h2>
                  <p className="text-[11px] text-blue-200/80 font-medium mt-0.5">
                    Comparatif des 3 scénarios · ETP Calculé / Actuel (DB) × 100
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                {[
                  { label: "Postes analysés", value: rows.length, Icon: Users },
                  { label: "Adéquats (Calculé)", value: `${totals.countOkCalc}/${rows.length}`, Icon: CheckCircle2 },
                  { label: "Adéquats (Consolidé)", value: `${totals.countOkCons}/${rows.length}`, Icon: Activity },
                  { label: "Adéquats (Optimisé)", value: `${totals.countOkOpt}/${rows.length}`, Icon: TrendingUp },
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
          <div className="p-4 space-y-4"
            style={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
          >

            {/* ── Scenario KPI cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="dlg-card-enter" style={{ animationDelay: "0.18s" }}>
                <ScenarioCard
                  title="Calculé"
                  idx={totals.idxActuel}
                  value={totals.totalCalcActuel}
                  accentColor="#0284c7"
                  accentBg="#e0f2fe"
                  IconComp={Activity}
                />
              </div>
              <div className="dlg-card-enter" style={{ animationDelay: "0.26s" }}>
                <ScenarioCard
                  title="Consolidé"
                  idx={totals.idxConsolide}
                  value={totals.totalCalcConsolide}
                  accentColor="#ca8a04"
                  accentBg="#fef9c3"
                  IconComp={TrendingUp}
                />
              </div>
              <div className="dlg-card-enter" style={{ animationDelay: "0.34s" }}>
                <ScenarioCard
                  title="Optimisé"
                  idx={totals.idxOptimise}
                  value={totals.totalCalcOptimise}
                  accentColor="#059669"
                  accentBg="#d1fae5"
                  IconComp={CheckCircle2}
                />
              </div>
            </div>

            {/* ── Table + toggle graphique ── */}
            <div className="dlg-table-enter rounded-2xl border border-white bg-white shadow-sm overflow-hidden"
              style={{ animationDelay: "0.38s" }}>
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

              {/* Vue graphique OU tableau selon le toggle */}
              {showChart ? (
                <div className="px-5 pt-4 pb-5 bg-gradient-to-b from-slate-50/60 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                          Indices d&apos;adéquation (%)
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                          ETP Calculé / Actuel × 100 — zone adéquate : 90–110%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                        <span className="text-[9px] font-bold text-slate-500">Adéquat (90–110%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
                        <span className="text-[9px] font-bold text-slate-500">Non adéquat</span>
                      </div>
                    </div>
                  </div>
                  <ReactECharts option={idxChartOption} style={{ height: 260 }} opts={{ renderer: "svg" }} />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[700px] border-collapse">
                    <thead>
                      {/* Ligne 1 — groupes */}
                      <tr>
                        <th rowSpan={2} className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200 w-[180px]"
                          style={{ background: "#fff", borderTop: "3px solid #cbd5e1" }}>
                          Poste
                        </th>
                        <th rowSpan={2} className="text-center px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200"
                          style={{ background: "#fff", borderTop: "3px solid #94a3b8" }}>
                          Actuel DB
                        </th>
                        <th colSpan={2} className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-sky-600 border-b border-sky-200"
                          style={{ background: "#fff", borderTop: "3px solid #0284c7" }}>
                          Calculé
                        </th>
                        <th colSpan={2} className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-yellow-600 border-b border-yellow-200"
                          style={{ background: "#fff", borderTop: "3px solid #eab308" }}>
                          Consolidé
                        </th>
                        <th colSpan={2} className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 border-b border-emerald-200"
                          style={{ background: "#fff", borderTop: "3px solid #059669" }}>
                          Optimisé
                        </th>
                      </tr>
                      {/* Ligne 2 — sous-colonnes */}
                      <tr>
                        <th className="text-center px-3 py-1.5 text-[8px] font-bold text-sky-500 border-b-2 border-sky-200" style={{ background: "#fff" }}>ETP</th>
                        <th className="text-center px-3 py-1.5 text-[8px] font-bold text-sky-500 border-b-2 border-sky-200 border-r border-sky-100" style={{ background: "#fff" }}>Idx</th>
                        <th className="text-center px-3 py-1.5 text-[8px] font-bold text-yellow-600 border-b-2 border-yellow-200" style={{ background: "#fff" }}>ETP</th>
                        <th className="text-center px-3 py-1.5 text-[8px] font-bold text-yellow-600 border-b-2 border-yellow-200 border-r border-yellow-100" style={{ background: "#fff" }}>Idx</th>
                        <th className="text-center px-3 py-1.5 text-[8px] font-bold text-emerald-500 border-b-2 border-emerald-200" style={{ background: "#fff" }}>ETP</th>
                        <th className="text-center px-3 py-1.5 text-[8px] font-bold text-emerald-500 border-b-2 border-emerald-200" style={{ background: "#fff" }}>Idx</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-slate-400 text-[11px]">
                            Aucune donnée disponible
                          </td>
                        </tr>
                      ) : rows.map((r, i) => (
                        <tr
                          key={`${r.label}-${i}`}
                          className="dlg-table-row dlg-row-enter"
                          style={{ animationDelay: `${0.4 + i * 0.04}s` }}
                        >
                          <td className="px-4 py-2.5 font-semibold text-slate-700 truncate max-w-[180px]" title={r.label}>{r.label}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-500 text-[11px]">
                            {r.actuel}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-600 text-[11px]">
                            {r.calcActuel}
                          </td>
                          <td className="px-3 py-2.5 text-center border-r border-sky-100">
                            <IdxBadge value={r.idxActuel} />
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-600 text-[11px]">
                            {r.calcConsolide}
                          </td>
                          <td className="px-3 py-2.5 text-center border-r border-yellow-100">
                            <IdxBadge value={r.idxConsolide} />
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-600 text-[11px]">
                            {r.calcOptimise}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <IdxBadge value={r.idxOptimise} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {rows.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 dlg-row-enter"
                          style={{ animationDelay: `${0.4 + rows.length * 0.04 + 0.06}s` }}>
                          <td className="px-4 py-3 font-black text-slate-700 text-[10px] uppercase tracking-wider">Total</td>
                          <td className="px-3 py-3 text-center font-black text-slate-700 text-[11px]">{totals.totalActuel}</td>
                          <td className="px-3 py-3 text-center font-black text-sky-700 text-[11px] bg-sky-50/40">{totals.totalCalcActuel}</td>
                          <td className="px-3 py-3 text-center bg-sky-50/40 border-r border-sky-100"><IdxBadge value={totals.idxActuel} /></td>
                          <td className="px-3 py-3 text-center font-black text-slate-700 text-[11px] bg-yellow-50/40">{totals.totalCalcConsolide}</td>
                          <td className="px-3 py-3 text-center bg-yellow-50/40 border-r border-yellow-100"><IdxBadge value={totals.idxConsolide} /></td>
                          <td className="px-3 py-3 text-center font-black text-slate-700 text-[11px] bg-emerald-50/40">{totals.totalCalcOptimise}</td>
                          <td className="px-3 py-3 text-center bg-emerald-50/40"><IdxBadge value={totals.idxOptimise} /></td>
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
