"use client";
import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import useEchartAutoResize from "@/components/hooks/useEchartAutoResize";
import { BarChart3, PieChart, Gauge as GaugeIcon, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

const Segmented = ({ value, onChange, items }) => (
  <div className="toggle-group text-[10px]">
    {items.map(({ value: val, label, icon: Icon }) => {
      const active = value === val;
      return (
        <button
          key={val}
          type="button"
          onClick={() => onChange?.(val)}
          className={`toggle-btn ${active ? "active" : ""} !px-2 !py-1`}
        >
          {Icon ? <Icon className="w-3 h-3" /> : null}
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
    maximumFractionDigits: 1,
  });

const fmtHours = (v) => `${sep(v)} h`;

export default function GraphResultats({
  resultats = [],
  totaux,
  loading,
  defaultMode = "barCap",
}) {
  const [mode, setMode] = useState(defaultMode);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState("all"); // 'all', 'critical', 'normal'
  const refChart = useEchartAutoResize();

  const heuresParTache = useMemo(
    () =>
      (resultats || []).map((r) => ({
        name: r.task || r.nom_tache || "N/A",
        value: Number(r.heures ?? 0),
      })),
    [resultats]
  );

  const sorted = useMemo(
    () => [...heuresParTache].sort((a, b) => b.value - a.value),
    [heuresParTache]
  );

  const capacite = Math.max(0, Number(totaux?.heures_net ?? 8));

  // Filtrage : tâches critiques (au-dessus de la capacité moyenne)
  const avgHours = useMemo(() => {
    if (sorted.length === 0) return 0;
    const sum = sorted.reduce((acc, d) => acc + d.value, 0);
    return sum / sorted.length;
  }, [sorted]);

  const filteredData = useMemo(() => {
    if (filter === "critical") {
      return sorted.filter((d) => d.value > avgHours);
    } else if (filter === "normal") {
      return sorted.filter((d) => d.value <= avgHours);
    }
    return sorted;
  }, [sorted, filter, avgHours]);

  // Limitation à Top 10 ou tout
  const displayData = useMemo(() => {
    if (showAll) return filteredData;
    return filteredData.slice(0, 10);
  }, [filteredData, showAll]);

  const categories = displayData.map((d) => d.name);
  const data = displayData.map((d) => d.value);

  // Couleur selon le niveau de charge vs capacité
  const getBarColor = (value) => {
    if (value > capacite * 1.2) return "#DC2626"; // Rouge : très au-dessus
    if (value > capacite) return "#F59E0B"; // Orange : au-dessus
    if (value > capacite * 0.7) return "#3B82F6"; // Bleu : proche
    return "#94A3B8"; // Gris : faible
  };

  const titleBase = (text) => ({
    text,
    left: "center",
    top: 8,
    textStyle: {
      fontSize: 12,
      fontWeight: 600,
      color: "#475569",
    },
  });

  const axisLabelFmt = { color: "#475569", fontSize: 10 };

  /* ========================================================
     BARRES + CAPACITÉ
  ======================================================== */
  const barCapOptions = {
    toolbox: {
      feature: { saveAsImage: { title: "Télécharger" } },
      right: 8,
      top: 8,
      iconStyle: {
        borderWidth: 0,
      },
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: "#005EA8", // Style Bleu unifié
      borderRadius: 8,
      padding: [8, 12],
      borderWidth: 0,
      textStyle: {
        color: "#fff",
        fontSize: 12,
      },
      extraCssText: "box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);",
      formatter: (params) => {
        const data = params[0];
        const task = displayData.find((t) => t.name === data.name);
        const overCapacity = task.value > capacite;
        const ratio = ((task.value / capacite) * 100).toFixed(0);
        return `
          <div style="text-align: left;">
            <div style="font-weight:600;margin-bottom:4px;font-size:12px;color:white">${data.name}</div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px;font-size:11px;color:white">
              <span>Charge :</span>
              <span style="font-weight:500">${fmtHours(data.value)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px;font-size:11px;color:white">
              <span>Capacité :</span>
              <span style="font-weight:500">${fmtHours(capacite)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;font-size:11px;color:white">
              <span>Ratio :</span>
              <span style="font-weight:600;color:${overCapacity ? "#FCA5A5" : "#86EFAC"
          }">${ratio}%</span>
            </div>
            ${overCapacity
            ? `<div style="margin-top:4px;padding:3px 6px;background:rgba(220,38,38,0.2);border-radius:4px;font-size:9px;color:#FCA5A5;text-align:center">⚠ Surcharge</div>`
            : ""
          }
          </div>
        `;
      },
    },
    grid: {
      left: 10,
      right: 60,
      bottom: 30,
      top: 40,
      containLabel: true,
    },
    xAxis: {
      type: "value",
      axisLabel: {
        ...axisLabelFmt,
        fontSize: 9,
        formatter: (v) => fmtHours(v),
      },
      splitLine: {
        lineStyle: {
          type: "dashed",
          color: "#E2E8F0",
          opacity: 0.5,
        },
      },
      axisLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: categories.map((c) => shortLabel(c, 22)),
      axisLabel: {
        ...axisLabelFmt,
        fontSize: 9,
        lineHeight: 14,
      },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        name: "Heures",
        type: "bar",
        data: displayData.map((d) => ({
          value: d.value,
          itemStyle: {
            color: getBarColor(d.value),
            borderRadius: [0, 4, 4, 0],
          },
        })),
        showBackground: true,
        backgroundStyle: { color: "rgba(148,163,184,.08)" },
        barMaxWidth: 18,
        label: {
          show: true,
          position: "right",
          formatter: ({ value }) => fmtHours(value),
          fontSize: 9,
          color: "#334155",
          fontWeight: 600,
        },
        emphasis: { focus: "series" },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: {
            type: "dashed",
            color: "#0ea5e9",
            width: 2,
          },
          label: {
            color: "#0369a1",
            backgroundColor: "rgba(125,211,252,.2)",
            padding: [3, 6],
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 600,
            formatter: `Capacité: ${fmtHours(capacite)}`,
          },
          data: [{ xAxis: capacite }],
        },
      },
    ],
    animationDuration: 500,
    animationEasing: "cubicOut",
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
    tooltip: {
      trigger: "item",
      confine: false,
      backgroundColor: "#005EA8", // Style Bleu unifié
      borderRadius: 8,
      padding: [8, 12],
      borderWidth: 0,
      textStyle: {
        color: "#fff",
        fontSize: 12,
      },
      extraCssText: "box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);",
      formatter: (p) =>
        `<div style="font-weight:600;font-size:12px;color:white;margin-bottom:2px">${p.name}</div><div style="font-size:11px;color:white">${fmtHours(p.value)} — ${p.percent}%</div>`,
    },
    legend: {
      type: "scroll",
      bottom: 5,
      textStyle: { color: "#334155", fontSize: 9 },
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      formatter: (name) => shortLabel(name, 18),
    },
    series: [
      {
        type: "pie",
        radius: ["35%", "55%"],
        center: ["50%", "50%"],
        itemStyle: {
          color: (p) => CAT_COLORS[p.dataIndex % CAT_COLORS.length],
        },
        label: {
          fontSize: 9,
          formatter: ({ name, value, percent }) =>
            `{b|${shortLabel(name, 15)}}\\n{v|${fmtHours(value)}}  {p|${percent}%}`,
          rich: {
            b: {
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 14,
              fontSize: 9,
            },
            v: {
              color: "#334155",
              fontSize: 8,
            },
            p: {
              color: "#64748b",
              fontSize: 8,
            },
          },
        },
        labelLine: {
          show: true,
          length: 10,
          length2: 6,
          lineStyle: { width: 1, opacity: 0.6 },
        },
        data: displayData,
      },
    ],
    animationDuration: 500,
    animationEasing: "cubicOut",
  };

  /* ========================================================
     GAUGE
  ======================================================== */
  const utilisation = Math.max(
    0,
    Math.min(
      100,
      +((totaux?.total_heures || 0) / Math.max(1e-9, capacite) * 100).toFixed(1)
    )
  );

  const gaugeColor =
    utilisation > 120 ? "#DC2626" : utilisation > 100 ? "#F59E0B" : "#10B981";

  const gaugeOptions = {
    toolbox: {
      feature: { saveAsImage: { title: "Télécharger" } },
      right: 8,
      top: 8,
      iconStyle: {
        borderWidth: 0,
      },
    },
    series: [
      {
        type: "gauge",
        min: 0,
        max: 150,
        radius: "85%",
        progress: {
          show: true,
          roundCap: true,
          width: 14,
          itemStyle: { color: gaugeColor },
        },
        axisLine: {
          lineStyle: {
            width: 14,
            color: [[1, "#E5E7EB"]],
          },
        },
        axisTick: { show: false },
        splitLine: {
          length: 8,
          lineStyle: {
            width: 1,
            color: "#94A3B8",
          },
        },
        axisLabel: {
          distance: 20,
          color: "#64748b",
          fontSize: 10,
        },
        detail: {
          formatter: (v) => `${v}%`,
          fontSize: 24,
          fontWeight: 700,
          color: gaugeColor,
          offsetCenter: [0, "50%"],
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
    return (
      <div className="px-3 py-2 text-slate-500 text-[10px]">
        Calcul en cours…
      </div>
    );
  if (!resultats?.length)
    return (
      <div className="px-3 py-2 text-slate-500 text-[10px]">
        Aucune donnée.
      </div>
    );

  const criticalCount = sorted.filter((d) => d.value > capacite).length;

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Zone 1: Titre */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
        <h3 className="text-[11px] font-semibold text-slate-700">
          {mode === "barCap"
            ? `Top ${displayData.length} tâches${filter === "critical"
              ? " (critiques)"
              : filter === "normal"
                ? " (normales)"
                : ""
            }`
            : mode === "donut"
              ? `Répartition${filter === "critical"
                ? " (critiques)"
                : filter === "normal"
                  ? " (normales)"
                  : ""
              }`
              : "Taux d'Occupation"}
        </h3>
        <div className="text-[9px] text-slate-500">
          {mode !== "gauge" && (
            <>
              {displayData.length} / {filteredData.length} tâche
              {filteredData.length > 1 ? "s" : ""}
            </>
          )}
        </div>
      </div>

      {/* Zone 2: Contrôles */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded text-[9px] font-semibold">
              <AlertTriangle className="w-3 h-3" />
              {criticalCount} critique{criticalCount > 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="flex gap-1.5 items-center flex-wrap">
          {/* Filtre */}
          {mode === "barCap" && (
            <div className="flex rounded border border-slate-300 overflow-hidden">
              <button
                onClick={() => setFilter("all")}
                className={`px-2 py-1 text-[10px] font-medium transition-colors ${filter === "all" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilter("critical")}
                className={`px-2 py-1 text-[10px] font-medium transition-colors border-l border-slate-300 ${filter === "critical" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Critiques
              </button>
              <button
                onClick={() => setFilter("normal")}
                className={`px-2 py-1 text-[10px] font-medium transition-colors border-l border-slate-300 ${filter === "normal" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Normales
              </button>
            </div>
          )}

          {/* Toggle Vue */}
          {/* Toggle Vue */}
          <div className="flex rounded border border-slate-300 overflow-hidden ml-2">
            <button
              onClick={() => setMode("barCap")}
              className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 ${mode === "barCap" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <BarChart3 className="w-3 h-3" /> Barres
            </button>
            <button
              onClick={() => setMode("donut")}
              className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 border-l border-slate-300 ${mode === "donut" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <PieChart className="w-3 h-3" /> Donut
            </button>
            <button
              onClick={() => setMode("gauge")}
              className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 border-l border-slate-300 ${mode === "gauge" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <GaugeIcon className="w-3 h-3" /> Jauge
            </button>
          </div>

          {/* Voir tout */}
          {mode !== "gauge" && filteredData.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-2 py-0.5 text-[9px] font-medium text-[#005EA8] hover:text-[#005191] hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Top 10
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Voir tout
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Chart full height */}
      <ReactECharts
        ref={refChart}
        notMerge
        opts={{ renderer: "canvas" }}
        theme="tawazoon"
        option={option}
        style={{
          height:
            mode === "barCap"
              ? Math.max(280, displayData.length * 22 + 80)
              : mode === "gauge"
                ? 280
                : "100%",
          width: "100%",
        }}
      />
    </div>
  );
}
