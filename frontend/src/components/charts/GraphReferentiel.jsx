"use client";
import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { BarChart3, PieChart, Clock } from "lucide-react";

// Mini composants UI
const Tooltip = ({ title, children }) => <span title={title}>{children}</span>;
const SegBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`btn ${active ? "btn-primary" : ""} !px-3 !py-2`}
  >
    {children}
  </button>
);

// Minutes → affichage intelligent
// - <1 min → secondes
// - ≥1 min → minutes
const fmtSmart = (value) => {
  const v = Number(value || 0);
  if (v < 1) {
    const sec = Math.round(v * 60);
    return `${sec} sec`;
  }
  return `${v.toFixed(2)} min`;
};

export default function GraphReferentiel({
  referentiel = [],
  loading = false,
}) {
  const [mode, setMode] = useState("bar");

  const minutesParTache = useMemo(
    () =>
      (referentiel || []).map((r) => ({
        name: r.t || r.task || r.nom_tache || "N/A",
        value: Number(r.m ?? 0),
        unite: r.u || "unité",
      })),
    [referentiel]
  );

  const categories = useMemo(
    () => minutesParTache.map((d) => d.name),
    [minutesParTache]
  );

  const axisLabelFmt = { color: "#475569", fontSize: 12 };

  // ================= BAR =================
  const barOptions = {
    title: {
      text: "Durée par tâche",
      left: "center",
      bottom: 10,
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: "#475569",
      },
    },
    toolbox: {
      right: 8,
      top: 8,
      feature: {
        saveAsImage: {},
        dataView: { readOnly: true },
      },
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const data = params[0];
        const tache = minutesParTache.find((t) => t.name === data.name);
        return `
          <div style="min-width:220px;padding:8px">
            <div style="font-weight:700;margin-bottom:6px;color:#ffffff">${
              data.name
            }</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span>Durée :</span>
              <span style="font-weight:600">${fmtSmart(data.value)}</span>
            </div>
            ${
              tache?.unite
                ? `
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span>Unité :</span>
              <span style="font-weight:600">${tache.unite}</span>
            </div>
            `
                : ""
            }
          </div>
        `;
      },
    },
    grid: {
      left: 60,
      right: 24,
      bottom: 40,
      top: 48,
      containLabel: true,
    },
    yAxis: {
      type: "category",
      data: categories,
      axisTick: { show: false },
      axisLabel: {
        ...axisLabelFmt,
        lineHeight: 16,
        formatter: (value) =>
          value.length > 25 ? value.substring(0, 25) + "..." : value,
      },
    },
    xAxis: {
      type: "value",
      axisLabel: {
        ...axisLabelFmt,
        formatter: (v) => fmtSmart(v),
      },
      splitLine: {
        lineStyle: {
          type: "dashed",
          color: "#E2E8F0",
        },
      },
    },
    series: [
      {
        name: "Temps",
        type: "bar",
        data: minutesParTache.map((d) => d.value),
        showBackground: true,
        backgroundStyle: { color: "rgba(148,163,184,.12)" },
        barMaxWidth: 22,
        itemStyle: {
          color: "#005EA8",
          borderRadius: [0, 6, 6, 0],
          shadowBlur: 6,
          shadowColor: "rgba(0,94,168,.25)",
        },
        label: {
          show: true,
          position: "right",
          formatter: ({ value }) => fmtSmart(value),
          fontSize: 11,
          color: "#334155",
        },
      },
    ],
    animationDuration: 600,
    animationEasing: "cubicOut",
  };

  // ================= PIE (DONUT) =================
  const pieOptions = {
    title: {
      text: "Répartition de la durée par tâche",
      left: "center",
      bottom: 10,
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: "#475569",
      },
    },
    toolbox: {
      right: 8,
      top: 8,
      feature: {
        saveAsImage: {},
        dataView: { readOnly: true },
      },
    },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (params) => {
        const tache = minutesParTache.find((t) => t.name === params.name);
        return `
          <div style="min-width:240px;padding:8px">
            <div style="font-weight:700;margin-bottom:6px;color:#ffffff">${
              params.name
            }</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span>Durée :</span>
              <span style="font-weight:600">${fmtSmart(params.value)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span>Part :</span>
              <span style="font-weight:600">${params.percent}%</span>
            </div>
            ${
              tache?.unite
                ? `
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span>Unité :</span>
              <span style="font-weight:600">${tache.unite}</span>
            </div>
            `
                : ""
            }
          </div>
        `;
      },
    },
    legend: {
      type: "scroll",
      bottom: 32,
      icon: "circle",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: "#334155" },
      formatter: (name) =>
        name.length > 20 ? name.substring(0, 20) + "..." : name,
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "64%"],
        center: ["50%", "45%"],
        minAngle: 2,
        label: {
          formatter: ({ name, value, percent }) =>
            `{b|${name}}\n{v|${fmtSmart(value)}}  {p|${percent}%}`,
          rich: {
            b: {
              fontWeight: 700,
              color: "#0f172a", // 🔹 foncé, bien lisible
              lineHeight: 16,
              fontSize: 11,
            },
            // Durée (sous-titre)
            v: {
              color: "#334155", // 🔹 gris foncé
              fontSize: 10,
            },
            // Pourcentage (sous-titre)
            p: {
              color: "#64748b", // 🔹 gris moyen
              fontSize: 10,
            },
          },
        },
        labelLine: {
          show: true,
          length: 12,
          length2: 8,
          lineStyle: { width: 1, opacity: 0.75 },
        },
        data: minutesParTache,
      },
    ],
    animationDuration: 600,
    animationEasing: "cubicOut",
  };

  const isEmpty = minutesParTache.length === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 flex items-center gap-2">
          <Clock className="w-4 h-4 animate-spin" />
          Chargement du référentiel...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Contrôles */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-slate-600">
          {minutesParTache.length} tâche
          {minutesParTache.length > 1 ? "s" : ""} référencée
        </div>
        <div className="flex gap-2">
          <Tooltip title="Graphique en barres">
            <SegBtn active={mode === "bar"} onClick={() => setMode("bar")}>
              <BarChart3 className="w-4 h-4" />
            </SegBtn>
          </Tooltip>
          <Tooltip title="Camembert">
            <SegBtn active={mode === "pie"} onClick={() => setMode("pie")}>
              <PieChart className="w-4 h-4" />
            </SegBtn>
          </Tooltip>
        </div>
      </div>

      {/* Graph */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <Clock className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-lg font-medium mb-2">
            Aucune donnée de référentiel
          </p>
          <p className="text-sm text-center max-w-md">
            Le référentiel des tâches est vide
          </p>
        </div>
      ) : (
        <ReactECharts
          theme="tawazoon"
          option={mode === "bar" ? barOptions : pieOptions}
          notMerge
          style={{ height: 420, width: "100%" }}
        />
      )}
    </div>
  );
}
