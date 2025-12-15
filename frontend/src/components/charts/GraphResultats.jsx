"use client";
import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import useEchartAutoResize from "@/components/hooks/useEchartAutoResize";
import { BarChart3, PieChart, Gauge as GaugeIcon } from "lucide-react";

const Segmented = ({ value, onChange, items }) => (
  <div className="toggle-group">
    {items.map(({ value: val, label, icon: Icon }) => {
      const active = value === val;
      return (
        <button
          key={val}
          type="button"
          onClick={() => onChange?.(val)}
          className={`toggle-btn ${active ? "active" : ""}`}
        >
          {Icon ? <Icon className="w-4 h-4" /> : null}
          <span className="whitespace-nowrap">{label}</span>
        </button>
      );
    })}
  </div>
);

const shortLabel = (s, n = 18) =>
  (s ?? "").length > n ? s.slice(0, n - 1) + "…" : s;

const sep = (v) =>
  (typeof v === "number" ? v : Number(v)).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  });

export default function GraphResultats({
  resultats = [],
  totaux,
  loading,
  defaultMode = "barCap",
}) {
  const [mode, setMode] = useState(defaultMode); // "barCap" | "donut" | "gauge"
  const refChart = useEchartAutoResize();

  const heuresParTache = (resultats || []).map((r) => ({
    name: r.task || r.nom_tache || "N/A",
    value: Number(r.heures ?? 0),
  }));

  const sorted = [...heuresParTache].sort((a, b) => b.value - a.value);
  const categories = sorted.map((d) => d.name);
  const data = sorted.map((d) => d.value);

  const capacite = Math.max(0, Number(totaux?.heures_net ?? 8));

  const titleBase = (text) => ({
    text,
    left: "center",
    bottom: 10,
    textStyle: {
      fontSize: 14,
      fontWeight: 600,
      color: "#475569",
    },
  });

  const axisLabelFmt = { color: "#475569", fontSize: 11 };
  const valueFmtH = (v) => `${sep(v)} h`;

  /* ========================================================
     BARRES + CAPACITÉ
  ======================================================== */
  const barCapOptions = {
    title: titleBase("Heures par tâche (triées) + Capacité"),
    toolbox: {
      feature: { saveAsImage: {}, dataView: { readOnly: true } },
      right: 8,
      top: 8,
    },
    tooltip: { trigger: "axis", confine: true, valueFormatter: valueFmtH },
    grid: {
      left: 90,
      right: 24,
      bottom: 40,
      top: 48,
      containLabel: true,
    },
    xAxis: {
      type: "value",
      axisLabel: axisLabelFmt,
      splitLine: { lineStyle: { type: "dashed" } },
    },
    yAxis: {
      type: "category",
      data: categories.map((c) => shortLabel(c, 32)),
      axisLabel: { ...axisLabelFmt, lineHeight: 16 },
    },
    series: [
      {
        name: "Heures",
        type: "bar",
        data,
        showBackground: true,
        backgroundStyle: { color: "rgba(148,163,184,.12)" },
        barMaxWidth: 26,
        itemStyle: {
          color: "#005EA8",
          borderRadius: [6, 6, 6, 6],
          shadowBlur: 6,
          shadowColor: "rgba(0,94,168,.25)",
        },
        label: {
          show: true,
          position: "right",
          formatter: ({ value }) => valueFmtH(value),
          fontSize: 11,
          color: "#334155",
        },
        emphasis: { focus: "series" },
      },
    ],
    markLine: {
      symbol: "none",
      lineStyle: { type: "dashed", color: "#0ea5e9" },
      label: {
        color: "#0369a1",
        backgroundColor: "rgba(125,211,252,.15)",
        padding: [2, 6],
        borderRadius: 4,
      },
      data: [{ xAxis: capacite, name: `Capacité: ${capacite.toFixed(2)} h` }],
    },
  };

  /* ========================================================
     DONUT
  ======================================================== */
  const CAT_COLORS = [
    "#0B5CAD",
    "#0E6ECF",
    "#00A0E0",
    "#4CC9F0",
    "#90E0EF",
    "#8C510A",
    "#01665E",
    "#5E3C99",
    "#1B7837",
    "#762A83",
  ];

  const donutOptions = {
    title: titleBase("Répartition des heures par tâche"),
    tooltip: {
      trigger: "item",
      confine: false,
      formatter: (p) =>
        `<b>${p.name}</b><br/>${sep(p.value)} h — ${p.percent}%`,
    },
    legend: {
      type: "scroll",
      bottom: 32,
      textStyle: { color: "#334155" },
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "64%"],
        center: ["50%", "45%"],
        itemStyle: {
          color: (p) => CAT_COLORS[p.dataIndex % CAT_COLORS.length],
        },
        data: sorted,
      },
    ],
  };

  /* ========================================================
     GAUGE
  ======================================================== */
  const utilisation = Math.max(
    0,
    Math.min(
      100,
      +(
        ((totaux?.total_heures || 0) /
          Math.max(1e-9, capacite)) *
        100
      ).toFixed(1)
    )
  );

  const gaugeOptions = {
    title: titleBase("Taux d'Occupation"),
    toolbox: {
      feature: { saveAsImage: {} },
      right: 8,
      top: 8,
    },
    series: [
      {
        type: "gauge",
        min: 0,
        max: 100,
        radius: "92%",
        progress: {
          show: true,
          roundCap: true,
          width: 12,
          itemStyle: { color: "#00A0E0" },
        },
        detail: {
          formatter: (v) => `${v}%`,
          fontSize: 22,
          fontWeight: 700,
          offsetCenter: [0, "40%"],
        },
        data: [{ value: utilisation }],
      },
    ],
  };

  const option =
    mode === "barCap"
      ? barCapOptions
      : mode === "donut"
      ? donutOptions
      : gaugeOptions;

  if (loading)
    return <div className="px-3 py-2 text-slate-500">Calcul en cours…</div>;
  if (!resultats?.length)
    return <div className="px-3 py-2 text-slate-500">Aucune donnée.</div>;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Top right segmented */}
      <div className="flex justify-end">
        <Segmented
          value={mode}
          onChange={setMode}
          items={[
            { value: "barCap", label: "Barres + Capacité", icon: BarChart3 },
            { value: "donut", label: "Donut", icon: PieChart },
            { value: "gauge", label: "Jauge", icon: GaugeIcon },
          ]}
        />
      </div>

      {/* Chart full height */}
      <ReactECharts
        ref={refChart}
        notMerge
        opts={{ renderer: "canvas" }}
        theme="tawazoon"
        option={option}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
