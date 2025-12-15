// chartsTheme.jsx
// Use this once at app startup: initChartsTheme()

import * as echarts from "echarts/core";

/* ======================
 *  Palette & helpers
 * ====================== */
export const PALETTE = [
  "#005EA8", // brand blue
  "#00A0E0", // sky
  "#4682B4",
  "#5F9EA0",
  "#B0C4DE",
  "#ADD8E6",
  "#87CEEB",
  "#87CEFA",
  "#1E90FF",
  "#6495ED",
];

export const c = (i) => PALETTE[i % PALETTE.length];

export const rgba = (hex, a = 0.15) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

/* ======================
 *  Theme definition
 * ====================== */
export const TAWAZOON_THEME_NAME = "tawazoon";

const tawazoonTheme = {
  color: PALETTE,
  textStyle: {
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    color: "#0f172a",
  },
  grid: { containLabel: true },
  toolbox: { iconStyle: { borderColor: "#475569" } },
  tooltip: {
    backgroundColor: "rgba(15,23,42,.92)", // slate-900/92
    borderWidth: 0,
    textStyle: { color: "#fff" },
    extraCssText: "box-shadow: 0 8px 24px rgba(2,6,23,.24);",
  },
  legend: {
    textStyle: { color: "#475569" }, // slate-600
    pageIconColor: "#64748b",
    pageTextStyle: { color: "#64748b" },
  },
  // Axes
  categoryAxis: {
    axisLine: { lineStyle: { color: "#94a3b8" } }, // slate-400
    axisTick: { show: false },
    axisLabel: { color: "#475569" }, // slate-600
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#475569" },
    splitLine: { lineStyle: { color: "rgba(148,163,184,.28)" } }, // slate-400/28
  },
  // Series defaults
  bar: {
    itemStyle: { borderRadius: [4, 4, 0, 0] },
  },
  line: {
    symbol: "circle",
    symbolSize: 6,
    lineStyle: { width: 2 },
    areaStyle: { opacity: 0.18 },
  },
  pie: {
    label: {
      color: "#334155", // slate-700
      fontSize: 12,
    },
    labelLine: { length: 12, length2: 8 },
  },
  gauge: {
    axisLine: { lineStyle: { width: 12 } },
    splitLine: { lineStyle: { color: "#cbd5e1" } }, // slate-300
    axisTick: { lineStyle: { color: "#cbd5e1" } },
    axisLabel: { color: "#475569" },
    detail: { color: "#0f172a", fontWeight: 700 },
  },
  dataset: {},
};

/* ======================
 *  Init / register once
 * ====================== */
let _registered = false;

export function initChartsTheme() {
  if (_registered) return;
  echarts.registerTheme(TAWAZOON_THEME_NAME, tawazoonTheme);
  _registered = true;
}

/* ======================
 *  Small convenience API
 * ====================== */
// For charts with a single series color, e.g. lines:
//   const option = { color: single(1), ... }
export const single = (i = 0) => [c(i)];

// Example areaStyle helper (same hue as line color):
export const softArea = (i = 1, alpha = 0.18) => ({ color: rgba(c(i), alpha) });
