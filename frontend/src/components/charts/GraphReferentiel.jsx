"use client";
import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { BarChart3, PieChart, Clock, ChevronDown, ChevronUp, Filter } from "lucide-react";

// Mini composants UI
const Tooltip = ({ title, children }) => <span title={title}>{children}</span>;
const SegBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`btn ${active ? "btn-primary" : ""} !px-2 !py-1 text-[10px]`}
  >
    {children}
  </button>
);

// Minutes → affichage intelligent
const fmtSmart = (value) => {
  const v = Number(value || 0);
  if (v < 1) {
    const sec = Math.round(v * 60);
    return `${sec} sec`;
  }
  return `${v.toFixed(1)} min`;
};

export default function GraphReferentiel({
  referentiel = [],
  loading = false,
}) {
  const [mode, setMode] = useState("bar");
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState("all"); // 'all', 'long', 'short'

  const minutesParTache = useMemo(
    () =>
      (referentiel || []).map((r) => ({
        name: r.t || r.task || r.nom_tache || "N/A",
        value: Number(r.m ?? 0),
        unite: r.u || "unité",
      })),
    [referentiel]
  );

  // Tri par durée décroissante
  const sortedData = useMemo(
    () => [...minutesParTache].sort((a, b) => b.value - a.value),
    [minutesParTache]
  );

  // Calcul de la moyenne
  const avgDuration = useMemo(() => {
    if (sortedData.length === 0) return 0;
    const sum = sortedData.reduce((acc, d) => acc + d.value, 0);
    return sum / sortedData.length;
  }, [sortedData]);

  // Filtrage
  const filteredData = useMemo(() => {
    if (filter === "long") {
      return sortedData.filter(d => d.value >= avgDuration);
    } else if (filter === "short") {
      return sortedData.filter(d => d.value < avgDuration);
    }
    return sortedData;
  }, [sortedData, filter, avgDuration]);

  // Limitation à Top 10 ou tout
  const displayData = useMemo(() => {
    if (showAll) return filteredData;
    return filteredData.slice(0, 10);
  }, [filteredData, showAll]);

  const categories = useMemo(
    () => displayData.map((d) => d.name),
    [displayData]
  );

  // Couleurs graduées selon la durée
  const getBarColor = (value, maxValue) => {
    const ratio = value / maxValue;
    if (ratio > 0.7) return "#DC2626"; // Rouge pour les plus longues
    if (ratio > 0.4) return "#F59E0B"; // Orange pour moyennes-longues
    if (ratio > 0.2) return "#3B82F6"; // Bleu pour moyennes
    return "#94A3B8"; // Gris pour courtes
  };

  const maxValue = displayData.length > 0 ? displayData[0].value : 1;

  const axisLabelFmt = { color: "#475569", fontSize: 10 };

  // ================= BAR =================
  const barOptions = {
    toolbox: {
      right: 8,
      top: 8,
      feature: {
        saveAsImage: { title: "Télécharger" },
      },
      iconStyle: {
        borderWidth: 0,
      },
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      axisPointer: { type: "shadow" },
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
        const tache = displayData.find((t) => t.name === data.name);
        return `
          <div style="text-align: left;">
            <div style="font-weight:600;margin-bottom:4px;font-size:12px;color:white">${data.name}</div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px;font-size:11px;color:white">
              <span>Durée :</span>
              <span style="font-weight:500">${fmtSmart(data.value)}</span>
            </div>
            ${tache?.unite
            ? `
            <div style="display:flex;justify-content:space-between;gap:16px;font-size:11px;color:rgba(255,255,255,0.9)">
              <span>Unité :</span>
              <span style="font-weight:500">${tache.unite}</span>
            </div>
            `
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
    yAxis: {
      type: "category",
      data: categories,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        ...axisLabelFmt,
        fontSize: 9,
        lineHeight: 14,
        formatter: (value) =>
          value.length > 22 ? value.substring(0, 22) + "..." : value,
      },
    },
    xAxis: {
      type: "value",
      axisLabel: {
        ...axisLabelFmt,
        fontSize: 9,
        formatter: (v) => fmtSmart(v),
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
    series: [
      {
        name: "Temps",
        type: "bar",
        data: displayData.map((d) => ({
          value: d.value,
          itemStyle: {
            color: getBarColor(d.value, maxValue),
            borderRadius: [0, 4, 4, 0],
          },
        })),
        showBackground: true,
        backgroundStyle: { color: "rgba(148,163,184,.08)" },
        barMaxWidth: 18,
        label: {
          show: true,
          position: "right",
          formatter: ({ value }) => fmtSmart(value),
          fontSize: 9,
          color: "#334155",
          fontWeight: 600,
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: {
            color: "#005EA8",
            type: "dashed",
            width: 1.5,
          },
          label: {
            formatter: "Moyenne: " + fmtSmart(avgDuration),
            fontSize: 9,
            color: "#005EA8",
            fontWeight: 600,
          },
          data: [{ xAxis: avgDuration }],
        },
      },
    ],
    animationDuration: 500,
    animationEasing: "cubicOut",
  };

  // ================= PIE (DONUT) =================
  const pieOptions = {
    toolbox: {
      right: 8,
      top: 8,
      feature: {
        saveAsImage: { title: "Télécharger" },
      },
      iconStyle: {
        borderWidth: 0,
      },
    },
    tooltip: {
      trigger: "item",
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
        const tache = displayData.find((t) => t.name === params.name);
        return `
          <div style="text-align: left;">
            <div style="font-weight:600;margin-bottom:4px;font-size:12px;color:white">${params.name}</div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px;font-size:11px;color:white">
              <span>Durée :</span>
              <span style="font-weight:500">${fmtSmart(params.value)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px;font-size:11px;color:white">
              <span>Part :</span>
              <span style="font-weight:500">${params.percent}%</span>
            </div>
            ${tache?.unite
            ? `
            <div style="display:flex;justify-content:space-between;gap:16px;font-size:11px;color:rgba(255,255,255,0.9)">
              <span>Unité :</span>
              <span style="font-weight:500">${tache.unite}</span>
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
      bottom: 28,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: "#334155", fontSize: 9 },
      formatter: (name) =>
        name.length > 18 ? name.substring(0, 18) + "..." : name,
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "62%"],
        center: ["50%", "42%"],
        minAngle: 2,
        label: {
          fontSize: 9,
          formatter: ({ name, value, percent }) =>
            `{b|${name.length > 15 ? name.substring(0, 15) + "..." : name}}\\n{v|${fmtSmart(value)}}  {p|${percent}%}`,
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

  const isEmpty = minutesParTache.length === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 flex items-center gap-2 text-[10px]">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Zone 1: Titre */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
        <h3 className="text-[11px] font-semibold text-slate-700">
          {mode === "bar"
            ? `Top ${displayData.length} tâches${filter === "long"
              ? " (longues)"
              : filter === "short"
                ? " (courtes)"
                : ""
            }`
            : `Répartition${filter === "long"
              ? " (longues)"
              : filter === "short"
                ? " (courtes)"
                : ""
            }`}
        </h3>
        <div className="text-[9px] text-slate-500">
          {displayData.length} / {filteredData.length} tâche{filteredData.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Zone 2: Contrôles */}
      <div className="flex justify-between items-center mb-2 gap-2">
        <div className="flex gap-1.5 items-center flex-wrap">
          {/* Filtre */}
          <div className="flex rounded border border-slate-300 overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-1 text-[10px] font-medium transition-colors ${filter === "all" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter("long")}
              className={`px-2 py-1 text-[10px] font-medium transition-colors border-l border-slate-300 ${filter === "long" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              Longues
            </button>
            <button
              onClick={() => setFilter("short")}
              className={`px-2 py-1 text-[10px] font-medium transition-colors border-l border-slate-300 ${filter === "short" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              Courtes
            </button>
          </div>

          {/* Toggle Vue */}
          <div className="flex rounded border border-slate-300 overflow-hidden ml-2">
            <Tooltip content="Graphique en barres">
              <button
                className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center justify-center ${mode === "bar" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                onClick={() => setMode("bar")}
              >
                <BarChart3 className="w-3 h-3" />
              </button>
            </Tooltip>
            <Tooltip content="Camembert">
              <button
                className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center justify-center border-l border-slate-300 ${mode === "pie" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                onClick={() => setMode("pie")}
              >
                <PieChart className="w-3 h-3" />
              </button>
            </Tooltip>
          </div>

          {/* Voir tout */}
          {filteredData.length > 10 && (
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

      {/* Graph */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <Clock className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-sm font-medium mb-1">
            Aucune donnée de référentiel
          </p>
          <p className="text-[10px] text-center max-w-md">
            Le référentiel des tâches est vide
          </p>
        </div>
      ) : (
        <ReactECharts
          theme="tawazoon"
          option={mode === "bar" ? barOptions : pieOptions}
          notMerge
          style={{ height: mode === "bar" ? Math.max(280, displayData.length * 22 + 80) : 280, width: "100%" }}
        />
      )}
    </div>
  );
}
