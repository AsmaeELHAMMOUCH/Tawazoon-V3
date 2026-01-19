"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Info,
  BarChart3,
  Table,
  Play,
  MapPin,
  Tag,
  Building,
  User,
  Archive,
  Package,
  Mail,
  Gauge,
  Clock,
  FileDown,
  Shield,
  Sliders,
  RefreshCw,
  PieChart,
  LineChart,
  TrendingDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { initChartsTheme } from "./chartsTheme";
initChartsTheme();
import * as echarts from "echarts";
import HelpPopover from "@/components/HelpPopover";
import { motion } from "framer-motion";
import DataTable from "@/components/DataTable";
import { createColumnHelper } from "@tanstack/react-table";
import FluxNavbar from "@/components/FluxNavbar";
import ReactECharts from "echarts-for-react";
import useEchartAutoResize from "@/components/hooks/useEchartAutoResize";

import HeaderSimulation from "@/layout/HeaderSimulation";
import VueIntervenant from "@/components/views/VueIntervenant";
import VueCentre from "@/components/views/VueCentre";
import VueDirectionSim from "@/components/views/VueDirection";
import VueNationale from "@/components/views/VueNationale";
import VueSiege from "@/components/views/VueSiege";
export function PageDirection() {
  return <VueDirectionSim api={api} />;
}

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useLocation } from "react-router-dom";
import { useSimulationParams } from "@/hooks/usePersistedState";

// Using local Segmented/Tooltip components and lucide icons instead of antd
const fadeCard = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.35, ease: "easeOut" },
};

const floatIcon = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut", delay: 0.1 },
};

// --- ID spécial pour "Tous"
const ALL_ID = "__ALL__";

export function EmptyStateFirstRun() {
  return (
    <div className="h-[320px] grid place-items-center bg-gradient-to-br from-slate-50 to-white">
      <motion.div
        initial={fadeCard.initial}
        animate={fadeCard.animate}
        transition={fadeCard.transition}
        className="text-center max-w-md px-6 py-6 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,.06)]"
      >
        <motion.div
          initial={floatIcon.initial}
          animate={floatIcon.animate}
          transition={floatIcon.transition}
          className="mx-auto w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3"
        >
          <Play className="w-6 h-6 text-[#005EA8]" />
        </motion.div>

        <h3 className="text-lg font-semibold text-slate-900">
          Prêt à démarrer
        </h3>
        <p className="mt-1.5 text-sm text-slate-600">
          Configure les paramètres ci-dessus puis clique sur{" "}
          <span className="font-semibold text-[#005EA8]">
            Lancer Simulation
          </span>{" "}
          pour afficher les résultats ici.
        </p>
      </motion.div>
    </div>
  );
}

export function EmptyStateDirty() {
  return (
    <div className="h-[320px] grid place-items-center bg-gradient-to-br from-slate-50 to-white">
      <motion.div
        initial={fadeCard.initial}
        animate={fadeCard.animate}
        transition={fadeCard.transition}
        className="text-center max-w-md px-6 py-6 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,.06)]"
      >
        <motion.div
          initial={floatIcon.initial}
          animate={floatIcon.animate}
          transition={floatIcon.transition}
          className="mx-auto w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3"
        >
          <Sliders className="w-6 h-6 text-[#005EA8]" />
        </motion.div>

        <h3 className="text-lg font-semibold text-slate-900">
          Paramètres modifiés
        </h3>
        <p className="mt-1.5 text-sm text-slate-600">
          Les résultats précédents ont été réinitialisés. Appuie sur{" "}
          <span className="font-semibold text-[#005EA8]">
            Lancer Simulation
          </span>{" "}
          (en haut) pour obtenir des chiffres à jour.
        </p>
      </motion.div>
    </div>
  );
}

// --- utilitaires d'affichage
const shortLabel = (s, n = 18) =>
  (s ?? "").length > n ? s.slice(0, n - 1) + "…" : s;

const sep = (v) =>
  (typeof v === "number" ? v : Number(v)).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  });

////////// RÈGLES DE GESTION DES CHAMPS PAR CATÉGORIE //////////
const FIELD_KEYS = ["sacs", "colis", "courrier", "ebarkia", "lrh"];

const CATEGORY_RULES = {
  default: new Set(FIELD_KEYS),
  "AM-Agence Messagerie": new Set(["sacs", "colis"]),
  "CD - Centre de Distribution": new Set(["sacs", "colis"]),
  "Centre Unique": new Set(FIELD_KEYS), // 🆕 Tous les champs activés pour Centre Unique (cat8)
  "CCC": new Set(FIELD_KEYS), // 🆕 Tous les champs activés pour CCC
  "CTD - Centre de Traitement et Distribution": new Set(["sacs", "colis"]),
};

function isFieldEnabled(categoryLabel, fieldKey) {
  if (fieldKey === "sacs") return true;
  const allowed = CATEGORY_RULES[categoryLabel] || CATEGORY_RULES.default;
  return allowed.has(fieldKey);
}

function fieldUiState(categoryLabel, fieldKey) {
  const enabled = isFieldEnabled(categoryLabel, fieldKey);
  return {
    disabled: !enabled,
    className: !enabled ? "bg-slate-100 cursor-not-allowed" : undefined,
  };
}

function GraphReferentiel({ referentiel = [] }) {
  const [mode, setMode] = useState("bar");

  const minutesParTache = useMemo(
    () =>
      (referentiel || []).map((r) => ({
        name: r.t || r.task || r.nom_tache || "N/A",
        value: Number(r.m ?? 0),
      })),
    [referentiel]
  );

  const categories = useMemo(
    () => minutesParTache.map((d) => d.name),
    [minutesParTache]
  );

  const axisLabelFmt = { color: "#475569", fontSize: 12 };
  const valueFmtMin = (v) =>
    (typeof v === "number" ? v : Number(v)).toLocaleString("fr-FR", {
      maximumFractionDigits: 2,
    }) + " min";

  const barOptions = useMemo(
    () => ({
      title: {
        text: "Minutes par tâche",
        left: "center",
        top: 16,
        textStyle: { fontSize: 18, fontWeight: 700, color: "#0f172a" },
      },
      toolbox: {
        right: 8,
        feature: { saveAsImage: {}, dataView: { readOnly: true } },
      },
      tooltip: {
        trigger: "axis",
        confine: true,
        axisPointer: { type: "shadow" },
        valueFormatter: valueFmtMin,
      },
      grid: { left: 60, right: 24, bottom: 56, top: 64, containLabel: true },
      yAxis: {
        type: "category",
        data: categories,
        axisTick: { show: false },
        axisLabel: { ...axisLabelFmt, lineHeight: 16 },
      },
      xAxis: {
        type: "value",
        axisLabel: { ...axisLabelFmt, formatter: (v) => `${v}` },
        splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } },
      },
      series: [
        {
          name: "Minutes",
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
            formatter: ({ value }) => valueFmtMin(value),
            fontSize: 11,
            color: "#334155",
          },
        },
      ],
      animationDuration: 600,
      animationEasing: "cubicOut",
    }),
    [categories, minutesParTache]
  );

  const pieOptions = useMemo(
    () => ({
      title: {
        text: "Répartition des minutes",
        left: "center",
        top: 16,
        textStyle: { fontSize: 18, fontWeight: 700, color: "#0f172a" },
      },
      toolbox: {
        right: 8,
        feature: { saveAsImage: {}, dataView: { readOnly: true } },
      },
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: (p) =>
          `${p.name}<br/><b>${valueFmtMin(p.value)}</b> — ${p.percent}%`,
      },
      legend: {
        type: "scroll",
        bottom: 0,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: "#334155" },
      },
      series: [
        {
          type: "pie",
          radius: ["42%", "64%"],
          center: ["50%", "52%"],
          minAngle: 2,
          label: { formatter: "{b}\n{c} min  {d}%" },
          data: minutesParTache,
        },
      ],
      animationDuration: 600,
      animationEasing: "cubicOut",
    }),
    [minutesParTache]
  );

  const isEmpty = minutesParTache.length === 0;

  return (
    <div>
      <div className="flex justify-end mb-3 gap-2">
        <Tooltip title="Barres">
          <button
            onClick={() => setMode("bar")}
            className={`btn ${mode === "bar" ? "btn-primary" : ""} !px-3 !py-2`}
            aria-label="Afficher en barres"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip title="Camembert">
          <button
            onClick={() => setMode("pie")}
            className={`btn ${mode === "pie" ? "btn-primary" : ""} !px-3 !py-2`}
            aria-label="Afficher en camembert"
          >
            <PieChart className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {isEmpty ? (
        <div className="text-slate-500 p-6">Aucune donnée à afficher.</div>
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

/////////////////////////////////////////////
// === BEGIN PATCH: GraphResultats (style/ergonomie) ===
function GraphResultats({
  resultats = [],
  totaux,
  loading,
  defaultMode = "barCap",
}) {
  const [mode, setMode] = useState(defaultMode);
  const refChart = useEchartAutoResize();

  // ---- Préparation des données
  const resultatsArray = useMemo(() => (Array.isArray(resultats) ? resultats : []), [resultats]);

  const heuresParTache = resultatsArray.map((r) => ({
    name: r.task || r.nom_tache || "N/A",
    value: Number(r.heures ?? 0),
  }));

  const sorted = [...heuresParTache].sort((a, b) => b.value - a.value);
  const categories = sorted.map((d) => d.name);
  const data = sorted.map((d) => d.value);

  const capacite = Math.max(0, Number(totaux?.heures_net ?? 8));
  const total = Math.max(
    1e-9,
    data.reduce((s, v) => s + v, 0)
  );

  const titleBase = (text) => ({
    text,
    left: "center",
    textStyle: { fontSize: 14, fontWeight: 600, color: "#0f172a" },
  });
  const axisLabelFmt = { color: "#475569", fontSize: 11 };
  const valueFmtH = (v) => `${sep(v)} h`;

  const barCapOptions = {
    title: titleBase("Heures par tâche (triées) + Capacité"),
    toolbox: {
      feature: { saveAsImage: {}, dataView: { readOnly: true } },
      right: 8,
    },
    tooltip: { trigger: "axis", confine: true, valueFormatter: valueFmtH },
    grid: { left: 90, right: 24, bottom: 40, top: 56, containLabel: true },
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
    title: { text: "Répartition des heures", left: "center", top: 8 },
    tooltip: {
      trigger: "item",
      renderMode: "html",
      appendTo: "body",
      confine: false,
      enterable: true,
      extraCssText: [
        "z-index:9999999",
        "background:rgba(17,24,39,.98)",
        "color:#fff",
        "border:0",
        "border-radius:12px",
        "padding:10px 12px",
        "box-shadow:0 12px 34px rgba(2,6,23,.25)",
      ].join(";"),
      position: function (pt, params, dom, rect, size) {
        const pad = 16;
        const w = dom.offsetWidth || 220;
        const h = dom.offsetHeight || 80;
        const maxX = size.viewSize[0] - w - pad;
        const maxY = size.viewSize[1] - h - pad;
        return [Math.min(pt[0] + pad, maxX), Math.min(pt[1] + pad, maxY)];
      },
      formatter: (p) => `
      <div style="min-width:220px">
        <div style="font-weight:700;margin-bottom:6px">${p.name}</div>
        <div style="display:flex;justify-content:space-between;gap:12px">
          <span>${sep(p.value)} h</span><b>${p.percent}%</b>
        </div>
      </div>`,
    },
    legend: {
      type: "scroll",
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: "#334155" },
      formatter: (name) => {
        const total =
          resultatsArray.reduce((s, r) => s + Number(r.heures || 0), 0) || 1;
        const item = resultatsArray.find(
          (r) => (r.task || r.nom_tache) === name
        );
        const v = item ? Number(item.heures || 0) : 0;
        const p = Math.round((v / total) * 100);
        const short = shortLabel(name, 26);
        return `${short} (${p}%)`;
      },
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "64%"],
        center: ["50%", "52%"],
        minAngle: 2,
        avoidLabelOverlap: true,
        labelLayout: { moveOverlap: "shiftY", hideOverlap: true },
        labelLine: {
          show: true,
          length: 12,
          length2: 8,
          lineStyle: { width: 1, opacity: 0.75 },
        },
        label: {
          formatter: (p) =>
            `{b|${p.name}}\n{v|${sep(p.value)} h}  {p|${p.percent}%}`,
          rich: {
            b: { fontWeight: 700, color: "#0f172a", lineHeight: 16 },
            v: { color: "#334155" },
            p: { color: "#64748b" },
          },
        },
        emphasis: {
          focus: "self",
          blurScope: "coordinateSystem",
          scale: true,
          scaleSize: 6,
          itemStyle: { shadowBlur: 14, shadowColor: "rgba(0,94,168,.35)" },
          label: { fontWeight: 800 },
        },
        blur: { itemStyle: { opacity: 0.25 }, label: { opacity: 0.25 } },
        itemStyle: {
          color: (p) => CAT_COLORS[p.dataIndex % CAT_COLORS.length],
          borderColor: "#fff",
          borderWidth: 2,
          shadowBlur: 8,
          shadowColor: "rgba(2,6,23,.08)",
        },
        data: sorted,
      },
    ],
    animationDuration: 600,
    animationEasing: "cubicOut",
    universalTransition: true,
  };

  const cumulHeures = data.reduce((s, v) => s + v, 0);
  const reste = +(capacite - cumulHeures).toFixed(2);
  const lastLabel = reste >= 0 ? "Reste de capacité" : "Dépassement";
  const wfCats = [...categories, lastLabel];
  const wfData = [...data, Math.abs(reste)];
  const waterfallOptions = {
    title: titleBase("Cascade des heures vs capacité"),
    toolbox: { feature: { saveAsImage: {} }, right: 8 },
    tooltip: { trigger: "axis", confine: true, valueFormatter: valueFmtH },
    grid: { left: 90, right: 24, bottom: 48, top: 56, containLabel: true },
    xAxis: {
      type: "category",
      data: wfCats.map((c) => shortLabel(c, 22)),
      axisLabel: { ...axisLabelFmt, rotate: 28 },
    },
    yAxis: {
      type: "value",
      axisLabel: axisLabelFmt,
      splitLine: { lineStyle: { type: "dashed" } },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 26,
        showBackground: true,
        backgroundStyle: { color: "rgba(148,163,184,.10)" },
        data: wfData.map((v, i) => ({
          value: v,
          itemStyle: {
            color:
              i === wfData.length - 1
                ? reste >= 0
                  ? "#16a34a"
                  : "#dc2626"
                : "#005EA8",
            borderRadius: [6, 6, 0, 0],
          },
          label: {
            show: i === wfData.length - 1,
            position: "top",
            formatter: lastLabel,
            color: "#334155",
          },
        })),
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
      data: [{ yAxis: capacite, name: `Capacité ${capacite.toFixed(2)} h` }],
    },
  };

  const utilisation = Math.max(
    0,
    Math.min(
      100,
      +(((totaux?.total_heures || 0) / Math.max(1e-9, capacite)) * 100).toFixed(
        1
      )
    )
  );
  const gaugeOptions = {
    title: { ...titleBase("Taux d'Occupation"), top: 10, bottom: 20 },
    toolbox: { feature: { saveAsImage: {} }, right: 8 },
    series: [
      {
        type: "gauge",
        min: 0,
        max: 100,
        radius: "92%",
        startAngle: 200,
        endAngle: -20,
        progress: {
          show: true,
          roundCap: true,
          width: 12,
          itemStyle: { color: "#00A0E0" },
        },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.8, "#E2E8F0"],
              [1, "#FEE2E2"],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: {
          show: true,
          icon: "path://M1 0 L-1 0 L0 -30 Z",
          length: "55%",
          width: 6,
          itemStyle: { color: "#0f172a" },
        },
        anchor: { show: true, size: 6, itemStyle: { color: "#0f172a" } },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, "40%"],
          formatter: (v) => `${v}%`,
          color: "#0f172a",
          fontSize: 22,
          fontWeight: 700,
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
        : mode === "gauge"
          ? gaugeOptions
          : barCapOptions;

  if (loading)
    return <div className="px-3 py-2 text-slate-500">Calcul en cours…</div>;
  if (resultatsArray.length === 0)
    return <div className="px-3 py-2 text-slate-500">Aucune donnée.</div>;

  return (
    <div className="flex flex-col gap-3 h-[420px]">
      <div className="flex justify-end">
        <Segmented
          value={mode}
          onChange={setMode}
          items={[
            {
              value: "barCap",
              label: (
                <Tooltip title="Barres + Capacité">
                  <BarChart3 className="w-4 h-4" />
                </Tooltip>
              ),
            },
            {
              value: "donut",
              label: (
                <Tooltip title="Donut">
                  <PieChart className="w-4 h-4" />
                </Tooltip>
              ),
            },
            {
              value: "gauge",
              label: (
                <Tooltip title="Jauge">
                  <Gauge className="w-4 h-4" />
                </Tooltip>
              ),
            },
          ]}
        />
      </div>

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
// === END PATCH ===

/* ---------------- UI PRIMITIVES ---------------- */
function Card({ title, actions, children, bodyClassName = "" }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-lg">
      {(title || actions) && (
        <header className="h-10 px-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {actions}
        </header>
      )}
      <div className={["p-2.5", bodyClassName].join(" ").trim()}>
        {children}
      </div>
    </section>
  );
}

function KpiGlass({ title, icon: Icon, children }) {
  return (
    <div className="relative rounded-2xl p-4 border border-white/40 bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-xl shadow-lg ring-1 ring-slate-900/5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-[#00A0E0]" />}
      </div>
      {children}
      <div className="absolute inset-0 rounded-2xl pointer-events-none [mask-image:radial-gradient(circle_at_20%_0%,rgba(255,255,255,.6),transparent_60%)]" />
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] font-medium text-slate-600 tracking-wide flex items-center justify-center md:justify-start gap-1.5 text-center md:text-left">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#005EA8]" />}
        <span className="truncate">{label}</span>
      </span>
      {children}
    </label>
  );
}

function Select(props) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={`h-9 w-full rounded-md border border-slate-300 px-2 text-[12px]
                 bg-white disabled:bg-slate-50
                 focus:ring-2 focus:ring-[#005EA8] focus:border-[#005EA8]
                 text-left [text-align-last:left] truncate ${className}`}
    />
  );
}

function Input(props) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`h-9 w-full rounded-md border border-slate-300 px-2 text-[12.5px]
                 text-center bg-white disabled:bg-slate-50
                 focus:ring-2 focus:ring-[#005EA8] focus:border-[#005EA8] ${className}`}
    />
  );
}

function Segmented({ value, onChange, items }) {
  return (
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
}

function Tooltip({ title, children }) {
  return <span title={title}>{children}</span>;
}

export function PillBadgeLuminous({
  children = "Données sécurisées & centralisées",
  className = "",
  ...props
}) {
  return (
    <motion.div
      {...props}
      initial={false}
      whileHover={{ y: -1 }}
      className={[
        "relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full",
        "text-white text-[13px] font-medium",
        "bg-gradient-to-r from-[#0E6ECF] via-[#0B5CAD] to-[#09509A]",
        "ring-1 ring-white/10 backdrop-blur-[2px]",
        "shadow-[0_6px_18px_rgba(0,94,168,0.35)]",
        "transition-all duration-200",
        className,
      ].join(" ")}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-6px] rounded-[999px] -z-10
          bg-[radial-gradient(40%_60%_at_50%_50%,rgba(0,94,168,0.35),rgba(0,94,168,0)_70%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 h-1/2 rounded-[999px]
          bg-[linear-gradient(to_bottom,rgba(255,255,255,0.38),rgba(255,255,255,0))]
          mix-blend-screen"
      />
      <Shield className="w-4 h-4 opacity-95" />
      <span>{children}</span>
    </motion.div>
  );
}

/* ---------------- KPI COMPONENTS ---------------- */
function KpiStat({
  title,
  value,
  subtitle,
  delta,
  positive = true,
  icon: Icon,
}) {
  return (
    <div
      className="relative rounded-2xl p-4 bg-white/60 backdrop-blur-xl
                    border border-white/40 shadow-lg ring-1 ring-slate-900/5
                    before:absolute before:inset-0 before:rounded-2xl
                    before:[background:linear-gradient(135deg,rgba(0,94,168,.15),rgba(0,160,224,.10))]
                    before:pointer-events-none"
    >
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-sky-500" />}
      </div>
      <div className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
      )}
      {typeof delta !== "undefined" && (
        <div
          className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text[11px] font-medium ${positive
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700"
            }`}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

function KpiGauge({ title, percent, icon: Icon }) {
  const p = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className="rounded-2xl p-4 bg-white/70 backdrop-blur-xl shadow-lg ring-1 ring-slate-900/5 border border-white/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-sky-500" />}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(#00A0E0 ${p * 3.6}deg, #E6F4FA 0deg)`,
            }}
          />
          <div className="absolute inset-2 rounded-full bg-white grid place-items-center text-lg font-bold text-sky-600">
            {p}%
          </div>
        </div>
        <div className="text-sm text-slate-600">
          <div>
            Objectif: <span className="font-medium">100%</span>
          </div>
          <div>
            Sous Charge: <span className="font-medium">{100 - p}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiSpark({ title, value, data = [], icon: Icon }) {
  const option = {
    tooltip: { trigger: "axis", axisPointer: { type: "line" }, confine: true },
    grid: { left: 0, right: 0, top: 10, bottom: 0 },
    xAxis: { type: "category", show: false, data: data.map((_, i) => i) },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "line",
        data,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: "#00A0E0" },
        areaStyle: { color: "rgba(0,160,224,.15)" },
      },
    ],
  };
  return (
    <div className="rounded-2xl p-4 bg-white/70 backdrop-blur-xl shadow-lg ring-1 ring-slate-900/5 border border-white/40">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-sky-500" />}
      </div>
      <div className="text-3xl font-extrabold text-slate-900">{value}</div>
      <div className="h-16 mt-2">
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}

/* ---------------- PDF Helpers ---------------- */
const pxToMm = (px) => (px * 25.4) / 96;
const addCanvasAsPages = (pdf, canvas, marginMm = 10) => {
  const pageWidth = 210,
    pageHeight = 297; // A4 mm
  const maxWidth = pageWidth - marginMm * 2;
  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;
  const imgWidthMm = pxToMm(imgWidthPx);
  const imgHeightMm = pxToMm(imgHeightPx);
  const scale = maxWidth / imgWidthMm;
  const scaledWidthMm = imgWidthMm * scale;
  const scaledHeightMm = imgHeightMm * scale;
  const pageInnerHeightMm = pageHeight - marginMm * 2;
  const sliceHeightPx = Math.floor((pageInnerHeightMm / scale) * (96 / 25.4));
  const tmp = document.createElement("canvas");
  const ctx = tmp.getContext("2d");
  let offsetPx = 0;
  let first = true;
  while (offsetPx < imgHeightPx) {
    const h = Math.min(sliceHeightPx, imgHeightPx - offsetPx);
    tmp.width = imgWidthPx;
    tmp.height = h;
    ctx.clearRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, offsetPx, imgWidthPx, h, 0, 0, imgWidthPx, h);
    const imgData = tmp.toDataURL("image/png");
    if (!first) pdf.addPage();
    first = false;
    pdf.addImage(
      imgData,
      "PNG",
      marginMm,
      marginMm,
      scaledWidthMm,
      (h / imgHeightPx) * scaledHeightMm
    );
    offsetPx += h;
  }
};



const ComparatifRegional = () => {
  // On réutilise la même logique DR pour garder la cohérence
  const baseDirections = [
    {
      code: "CASA_SETTAT",
      nom: "DR Casa - Settat",
      centres: 40,
      etpActuel: 766,
      etpRecommande: 800,
    },
    {
      code: "FES_MEKNES_OUJDA",
      nom: "DR Fès - Meknès - Oujda",
      centres: 35,
      etpActuel: 424,
      etpRecommande: 450,
    },
    {
      code: "MARRAKECH_AGADIR",
      nom: "DR Marrakech - Agadir",
      centres: 30,
      etpActuel: 408,
      etpRecommande: 430,
    },
    {
      code: "RABAT_TANGER",
      nom: "DR Rabat - Tanger",
      centres: 32,
      etpActuel: 575,
      etpRecommande: 600,
    },
    {
      code: "LAAYOUNE_DAKHLA",
      nom: "DR Laâyoune - Dakhla",
      centres: 10,
      etpActuel: 71,
      etpRecommande: 80,
    },
    {
      code: "SIEGE",
      nom: "Siège",
      centres: 1,
      etpActuel: 105,
      etpRecommande: 110,
    },
  ];

  const regionsData = baseDirections.map((d) => {
    const taux =
      d.etpRecommande > 0
        ? Math.round((d.etpActuel / d.etpRecommande) * 100)
        : 0;
    return { ...d, tauxOccupation: taux, etpCalcule: d.etpRecommande };
  });

  const kpiData = {
    totalETP: regionsData.reduce((sum, r) => sum + r.etpActuel, 0),
    totalRecommande: regionsData.reduce((sum, r) => sum + r.etpRecommande, 0),
    ecartTotal: regionsData.reduce(
      (sum, r) => sum + (r.etpRecommande - r.etpActuel),
      0
    ),
    tauxMoyen: (
      regionsData.reduce((sum, r) => sum + r.tauxOccupation, 0) /
      regionsData.length
    ).toFixed(1),
  };

  const barOptions = {
    title: {
      text: "Comparaison ETP Actuel vs Recommandé (par DR)",
      left: "center",
    },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: ["ETP Actuel", "ETP Recommandé"], top: 20 },
    grid: { left: "3%", right: "4%", bottom: "12%", containLabel: true },
    xAxis: {
      type: "category",
      data: regionsData.map((r) => r.nom),
      axisLabel: {
        interval: 0, // ✅ affiche tous les labels
        rotate: 15, // optionnel : penche un peu
        formatter: (v) => shortLabel(v, 24), // optionnel : coupe les textes
      },
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "ETP Actuel",
        type: "bar",
        data: regionsData.map((r) => r.etpActuel),
        itemStyle: { color: "#005EA8" },
      },
      {
        name: "ETP Recommandé",
        type: "bar",
        data: regionsData.map((r) => r.etpRecommande),
        itemStyle: { color: "#00A0E0" },
      },
    ],
  };

  const lineOptions = {
    title: { text: "Taux d'Occupation par Direction Régionale (%)", left: "center" },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: regionsData.map((r) => r.nom),
      boundaryGap: false,          // ✅ la courbe commence au 1er point
      axisLabel: {
        interval: 0,
        rotate: 15,
        formatter: (v) => shortLabel(v, 26),
      },
    },
    yAxis: { type: "value", min: 0, max: 110 },
    series: [
      {
        name: "Taux d'Occupation",
        type: "line",
        data: regionsData.map((r) => r.tauxOccupation),

        // ✅ ici la magie :
        symbol: "circle",
        symbolSize: 8,
        showAllSymbol: true,       // ← affiche un point pour CHAQUE DR

        itemStyle: { color: "#00A0E0" },
        areaStyle: { color: "rgba(0,160,224,0.2)" },
        smooth: true,
      },
    ],
  };


  const pieOptions = {
    title: {
      text: "Répartition des ETP par Direction Régionale",
      left: "center",
    },
    tooltip: { trigger: "item" },
    legend: { orient: "vertical", left: "left" },
    series: [
      {
        name: "Effectifs",
        type: "pie",
        radius: "50%",
        data: regionsData.map((r) => ({ value: r.etpActuel, name: r.nom })),
        itemStyle: {
          color: (params) => {
            const colors = [
              "#005EA8",
              "#00A0E0",
              "#4682B4",
              "#5F9EA0",
              "#B0C4DE",
              "#87CEEB",
            ];
            return colors[params.dataIndex % colors.length];
          },
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Comparatif Régional</h2>
      <p className="text-sm text-slate-600">
        Tableaux et graphiques comparatifs des directions régionales
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStat
          title="Total ETP Régional"
          value={kpiData.totalETP}
          subtitle={
            <span className="text-slate-600">
              Recommandé&nbsp;:{" "}
              <span className="text-sky-600 font-semibold">
                {kpiData.totalRecommande}
              </span>
            </span>
          }
          delta={`${kpiData.ecartTotal >= 0 ? "+" : ""}${kpiData.ecartTotal
            } (surplus)`}
          positive={kpiData.ecartTotal >= 0}
          icon={User}
        />
        <KpiGauge
          title="Taux d'Occupation Moyen"
          percent={Number(kpiData.tauxMoyen)}
          icon={Gauge}
        />
        <KpiSpark
          title="Évolution des ETP"
          value={kpiData.totalETP}
          data={[2200, 2250, 2300, 2320, 2349]}
          icon={BarChart3}
        />
      </div>

      <Card title="Tableau Comparatif des Directions Régionales">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-2 text-left">Direction</th>
                <th className="px-4 py-2 text-right">Centres</th>
                <th className="px-4 py-2 text-right">ETP Actuel</th>
                <th className="px-4 py-2 text-right">ETP Calculé</th>
                <th className="px-4 py-2 text-right">ETP Recommandé</th>
                <th className="px-4 py-2 text-right">Écart</th>
                <th className="px-4 py-2 text-right">Taux Occupation</th>
              </tr>
            </thead>
            <tbody>
              {regionsData.map((region, index) => (
                <tr
                  key={region.code}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="px-4 py-2 font-medium">{region.nom}</td>
                  <td className="px-4 py-2 text-right">{region.centres}</td>
                  <td className="px-4 py-2 text-right">{region.etpActuel}</td>
                  <td className="px-4 py-2 text-right">{region.etpCalcule}</td>
                  <td className="px-4 py-2 text-right">
                    {region.etpRecommande}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={
                        region.etpRecommande - region.etpActuel >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {region.etpRecommande - region.etpActuel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {region.tauxOccupation}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-medium">
              <tr>
                <td className="px-4 py-2 text-right" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-2 text-right">{kpiData.totalETP}</td>
                <td className="px-4 py-2 text-right">-</td>
                <td className="px-4 py-2 text-right">
                  {kpiData.totalRecommande}
                </td>
                <td className="px-4 py-2 text-right">{kpiData.ecartTotal}</td>
                <td className="px-4 py-2 text-right">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Comparaison des ETP par Direction Régionale">
          <div className="h-80">
            <ReactECharts
              option={barOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>
        <Card title="Taux d'Occupation par Direction Régionale">
          <div className="h-80">
            <ReactECharts
              option={lineOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>
      </div>

      <Card title="Répartition des ETP par Direction Régionale">
        <div className="h-80">
          <ReactECharts
            option={pieOptions}
            style={{ height: "100%", width: "100%" }}
          />
        </div>
      </Card>
    </div>
  );
};

/* ---------------- PAGE PRINCIPALE ---------------- */
export default function SimulationEffectifs() {
  const location = useLocation();

  // UI state
  const [display, setDisplay] = useState("tableau");
  const [refDisplay, setRefDisplay] = useState("tableau");
  const [mode, setMode] = useState("actuel");
  const [activeFlux, setActiveFlux] = useState(() => {
    const fromQuery = new URLSearchParams(location.search).get("flux");
    const fromState = (location.state || {}).flux;
    return fromState || fromQuery || "national";
  });

  // Sync state from location updates (Sidebar navigation)
  useEffect(() => {
    const stateFlux = (location.state || {}).flux;
    const stateMode = (location.state || {}).mode;
    if (stateFlux) {
      setActiveFlux(stateFlux);
    }
    if (stateMode) {
      setMode(stateMode);
    }
  }, [location]);

  // ✅ Utiliser le hook de persistance pour tous les champs de saisie
  const {
    region, setRegion,
    centre, setCentre,
    poste, setPoste,
    productivite, setProductivite,
    idleMinutes, setIdleMinutes,
    tauxComplexite, setTauxComplexite,
    natureGeo, setNatureGeo,
    edPercent, setEdPercent,
    colisAmanaParSac, setColisAmanaParSac,
    courriersParSac, setCourriersParSac,
    colisParCollecte, setColisParCollecte,
    nbrCoSac, setNbrCoSac,
    nbrCrSac, setNbrCrSac,
    sacs, setSacs,
    colis, setColis,
    courrier, setCourrier,
    scelle, setScelle,
    courrierOrdinaire, setCourrierOrdinaire,
    courrierRecommande, setCourrierRecommande,
    ebarkia, setEbarkia,
    lrh, setLrh,
    amana, setAmana,
    volumesFluxGrid, setVolumesFluxGrid,
    pctAxesArrivee, setPctAxesArrivee,
    pctAxesDepart, setPctAxesDepart,
  } = useSimulationParams();

  const [categorie, setCategorie] = useState("Activité Postale");
  const [heuresNet, setHeuresNet] = useState(8);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Lookups
  const [regions, setRegions] = useState([]);
  const [centres, setCentres] = useState([]);
  const [postesList, setPostesList] = useState([]);
  const postesOptions = useMemo(() => {
    const cleaned = (postesList ?? [])
      .filter((p) => p && p.id !== ALL_ID && (p.label ?? p.name) !== "Tous" && !((p.label || p.name) || "").toLowerCase().includes("chef de centre"))
      .sort((a, b) =>
        (a.label ?? a.name).localeCompare(b.label ?? b.name, "fr", {
          ignorePunctuation: true,
          sensitivity: "base",
        })
      );
    return [...cleaned, { id: ALL_ID, label: "Tous" }];
  }, [postesList]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [centreCategorie, setCentreCategorie] = useState("");

  // --- Données Nationales (Real) ---
  const [nationalScenario, setNationalScenario] = useState("Standard");
  const [regionsData, setRegionsData] = useState([]);
  const [kpisNationaux, setKpisNationaux] = useState({
    etpActuelTotal: 0,
    etpRecommandeTotal: 0,
    surplusDeficit: 0,
    tauxProductiviteMoyen: 100,
    fte_calcule: 0,
    volumes: { sacs: 0, colis: 0, courrier: 0 },
  });

  useEffect(() => {
    if (activeFlux === "national") {
      let cancelled = false;
      setLoading((prev) => ({ ...prev, simulation: true }));

      api.nationalSimulation({
        productivite: Number(productivite),
        heures_par_jour: Number(heuresNet),
        scenario: nationalScenario,
        year: 2024
      })
        .then((res) => {
          if (cancelled) return;

          // MODIFICATION : On initialise l'Effectif Calculé à 0 par défaut
          // pour ne pas afficher de résidus de base de données (ex: 11.04).
          // L'utilisateur partira d'une page vierge pour sa simulation.
          const initialRegionsData = (res.regionsData || []).map(r => ({
            ...r,
            etpRecommande: 0,
            surplusDeficit: 0 - (r.etpActuel || 0), // L'écart est donc purement le manque d'effectif vs 0 (soit -Actuel)
            heures_totales: 0
          }));

          setRegionsData(initialRegionsData);

          // On met aussi à jour les KPIs globaux pour refléter ces zéros
          setKpisNationaux({
            ...(res.kpisNationaux || {}),
            etpRecommandeTotal: 0,
            surplusDeficit: 0 - (res.kpisNationaux?.etpActuelTotal || 0),
            fte_calcule: 0,
            heures_totales: 0
          });
        })
        .catch((e) => {
          if (cancelled) return;
          console.error("National sim error", e);
          // Only set error if not already handled
          setErr(e);
        })
        .finally(() => {
          if (!cancelled) setLoading((prev) => ({ ...prev, simulation: false }));
        });

      return () => { cancelled = true; };
    }
  }, [activeFlux, productivite, heuresNet, nationalScenario, refreshTrigger]);

  const handleImportNational = async (parsedCentres) => {
    try {
      console.log("Données importées (National):", parsedCentres);

      setLoading((prev) => ({ ...prev, simulation: true }));

      // parsedCentres est un array de centres avec leurs volumes
      // Format: [{ nom_centre: "...", volumes: [{flux_id, sens_id, segment_id, volume}] }]

      // Récupérer tous les centres pour faire le matching
      const centresResponse = await fetch('/api/centres');
      const allCentres = await centresResponse.json();

      // Transformer les données pour l'API de simulation
      const volumesData = parsedCentres.flatMap(centreData => {
        // Trouver le centre correspondant
        const centre = allCentres.find(c =>
          c.label === centreData.nom_centre ||
          c.nom === centreData.nom_centre
        );

        if (!centre) {
          console.warn(`Centre non trouvé: ${centreData.nom_centre}`);
          return [];
        }

        // Retourner les volumes avec l'ID du centre
        return centreData.volumes.map(vol => ({
          centre_id: centre.id,
          centre_label: centre.label || centre.nom,
          flux_id: vol.flux_id !== null && vol.flux_id !== undefined ? vol.flux_id : null,
          sens_id: vol.sens_id,
          segment_id: vol.segment_id,
          volume: vol.volume
        }));
      });

      console.log("Volumes transformés pour simulation nationale:", volumesData);

      // Lancer la simulation nationale avec les volumes matriciels
      if (volumesData.length > 0) {
        const payload = {
          mode: "data_driven",
          volumes_matriciels: volumesData,
          global_params: {
            productivite: productivite || 100,
            heures_par_jour: heuresNet || 7.5,
            idle_minutes: 0,
            taux_complexite: 0,
            nature_geo: 0
          }
        };

        console.log("Payload simulation nationale:", payload);

        // Appeler l'endpoint de simulation nationale
        const response = await fetch('/api/simulation/national', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Résultat simulation nationale:", result);

        // Mettre à jour les KPIs nationaux
        setKpisNationaux({
          etpActuelTotal: 0, // On n'a pas l'effectif actuel dans la simulation
          etpRecommandeTotal: result.kpis_nationaux.etp_total,
          surplusDeficit: result.kpis_nationaux.etp_total, // Positif si on a besoin de plus
          tauxProductiviteMoyen: productivite || 100,
          fte_calcule: result.kpis_nationaux.etp_total,
          volumes: { sacs: 0, colis: 0, courrier: 0 }, // TODO: calculer depuis volumes_matriciels
        });

        // Mettre à jour regionsData avec les directions
        // Transformer les directions en format regionsData
        // et préserver/ajouter les coordonnées géographiques pour la carte
        // Helper pour normaliser les strings (supprimer accents, minuscule)
        function normalize(str) {
          return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
        }

        // --- FUSION DES RÉSULTATS ---
        // on parcourt les régions existantes (qui contiennent déjà les coordonnées et l'effectif actuel)
        // et on met à jour uniquement celles qui ont été simulées.
        const newRegionsData = regionsData.map(region => {
          // Chercher si cette région fait partie des résultats de la simulation
          const match = result.directions.find(d =>
            d.direction_id === region.id ||
            normalize(d.direction_label) === normalize(region.nom)
          );

          if (match) {
            console.log(`🔄 Mise à jour Direction: ${region.nom}`);

            // C'est une direction simulée : on met à jour avec les résultats
            return {
              ...region,
              etpRecommande: match.etp_total, // Remplacement STRICT
              surplusDeficit: match.etp_total - (region.etpActuel || 0),
              heures_totales: match.heures_totales
            };
          }

          // ⚠️ CORRECTION : Si la direction n'est pas dans l'import, on la remet à 0
          // pour ne pas polluer le résultat total avec des anciennes données (le fameux 11.04)
          return {
            ...region,
            etpRecommande: 0,
            surplusDeficit: 0 - (region.etpActuel || 0),
            heures_totales: 0
          };
        });

        // Debug du résultat final
        const matchedRegion = newRegionsData.find(r => r.etpRecommande === 49.27 || r.nom.includes("FÈS"));
        if (matchedRegion) {
          console.log("✅ Vérification post-fusion pour Fès:", matchedRegion.etpRecommande);
        } else {
          console.warn("⚠️ Attention: La valeur 49.27 n'a pas été trouvée dans regionsData après fusion !");
        }

        // Mise à jour de regionsData
        setRegionsData(newRegionsData);

        // --- RECALCUL DES KPIS NATIONAUX ---
        // On recalcule les totaux basés sur la nouvelle vue consolidée (newRegionsData)
        // pour que "Total National" reflète l'ensemble (Simulé + Non Simulé)

        const totalActuel = newRegionsData.reduce((sum, r) => sum + (r.etpActuel || 0), 0);
        const totalRecommande = newRegionsData.reduce((sum, r) => sum + (r.etpRecommande || 0), 0);

        setKpisNationaux(prev => ({
          ...prev,
          etpActuelTotal: totalActuel,
          etpRecommandeTotal: totalRecommande,
          surplusDeficit: totalRecommande - totalActuel,
          fte_calcule: totalRecommande,
          volumes: prev.volumes || { sacs: 0, colis: 0, courrier: 0 }
        }));

        alert(`✅ Simulation réussie !\n\n` +
          `📊 ${result.centres_simules} centres simulés\n` +
          `📍 ${result.kpis_nationaux.directions_total} directions\n` +
          `👥 ETP Total: ${result.kpis_nationaux.etp_total}\n` +
          `⏱️ Heures Totales: ${result.kpis_nationaux.heures_totales.toFixed(2)}h`);

        // Pas besoin de trigger refresh car on a déjà mis à jour les states
      } else {
        alert("Aucun volume valide trouvé pour la simulation");
      }

    } catch (e) {
      console.error("Import error", e);
      setErr(e);
      alert("Erreur lors de l'import : " + e.message);
    } finally {
      setLoading((prev) => ({ ...prev, simulation: false }));
    }
  };

  const getColor = (d) =>
    d > 95 ? "#7f1d1d" : d > 90 ? "#b91c1c" : d > 85 ? "#dc2626" : d > 80 ? "#ef4444" : d > 75 ? "#f97316" : d > 70 ? "#facc15" : "#22c55e";

  // Data
  const [referentiel, setReferentiel] = useState([]);
  const [resultats, setResultats] = useState([]); // Peux être un tableau (legacy) ou un objet (data-driven)
  const tasks = useMemo(() => (Array.isArray(resultats) ? resultats : resultats?.details_taches || []), [resultats]);
  const [totaux, setTotaux] = useState(null);
  const [hasSimulated, setHasSimulated] = useState(false);
  const [simDirty, setSimDirty] = useState(false);
  const firstLoadRef = useRef(true);

  const handleSimulerIntervenant = (overrides = {}) => onSimuler(overrides);

  // Status
  const [loading, setLoading] = useState({
    regions: false,
    centres: false,
    postes: false,
    categories: false,
    referentiel: false,
    simulation: false,
  });
  const [err, setErr] = useState(null);

  // Refs
  const reportRef = useRef(null);

  /* ---------- Export PDF ---------- */
  const exportRapportPDF = async () => {
    if (!reportRef.current) {
      console.error("Référence du rapport introuvable");
      return;
    }
    try {
      const element = reportRef.current;
      element.style.position = "absolute";
      element.style.left = "0";
      element.style.top = "0";
      element.style.zIndex = "-1";
      await new Promise((resolve) => setTimeout(resolve, 300));
      document.querySelectorAll(".echarts-for-react").forEach((node) => {
        try {
          const instance = echarts.getInstanceByDom(node);
          if (instance) instance.resize();
        } catch (error) {
          console.warn("Impossible de redimensionner un graphique:", error);
        }
      });
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
        windowHeight: element.scrollHeight,
      });
      element.style.position = "fixed";
      element.style.left = "-9999px";
      element.style.zIndex = "auto";
      const pdf = new jsPDF("p", "mm", "a4");
      addCanvasAsPages(pdf, canvas, 10);
      const fileName = `rapport_simulation_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      pdf.save(fileName);
      alert("✓ Rapport PDF exporté avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      alert(
        "✗ Erreur lors de l'export du PDF. Vérifiez la console pour plus de détails."
      );
    }
  };

  // ✅ Marquer les résultats “obsolètes” quand un paramètre change (version unique)
  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    setSimDirty(true);
    setResultats([]);
    setTotaux(null);
  }, [
    sacs,
    colis,
    courrier,
    productivite,
    region,
    centre,
    poste,
    ebarkia,
    lrh,
    amana,
    courrierOrdinaire,
    courrierRecommande,
    scelle,
  ]);

  /* ---------- Load lookups ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading((l) => ({ ...l, regions: true, categories: true }));
        const [regs, cats] = await Promise.allSettled([
          api.regions(),
          api.categories(),
        ]);
        if (cancelled) return;
        if (regs.status === "fulfilled" && Array.isArray(regs.value))
          setRegions(regs.value);
        if (cats.status === "fulfilled" && Array.isArray(cats.value))
          setCategoriesList(cats.value);
        else if (cats.status === "fulfilled") setCategoriesList([]);
      } catch (e) {
        if (!cancelled) setErr(e);
      } finally {
        if (!cancelled)
          setLoading((l) => ({ ...l, regions: false, categories: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Charger les centres quand région change ---------- */
  useEffect(() => {
    if (
      activeFlux === "siege" ||
      activeFlux === "centre" ||
      activeFlux === "poste"
    ) {
      if (!region) {
        setCentres([]);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          setLoading((l) => ({ ...l, centres: true }));
          const selectedRegion = regions.find(
            (r) => String(r.id) === String(region)
          );
          if (!selectedRegion) return;
          const data = await api.centres(selectedRegion.id);
          console.log("🔍 [DEBUG API CENTRES] Données reçues:", data);
          if (data && data.length > 0) {
            console.log("🔍 [DEBUG API CENTRES] Premier centre:", data[0]);
            console.log("🔍 [DEBUG API CENTRES] Champs du premier centre:", Object.keys(data[0]));
          }
          if (!cancelled) setCentres(Array.isArray(data) ? data : []);
        } catch (e) {
          if (!cancelled) setCentres([]);
        } finally {
          if (!cancelled) setLoading((l) => ({ ...l, centres: false }));
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [activeFlux, region, regions]);

  /* ---------- Charger les postes quand centre change ---------- */
  useEffect(() => {
    if (activeFlux === "centre" || activeFlux === "poste") {
      if (!centre) {
        setPostesList([]);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          setLoading((l) => ({ ...l, postes: true }));
          const data = await api.postes(centre);
          if (!cancelled) {
            const rawData = Array.isArray(data) ? data : [];
            setPostesList(rawData);
          }
        } catch (e) {
          if (!cancelled) {
            setPostesList([]);
            setErr(e);
          }
        } finally {
          if (!cancelled) setLoading((l) => ({ ...l, postes: false }));
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [activeFlux, centre]);

  /* ---------- Catégorie du centre sélectionné ---------- */
  useEffect(() => {
    if (!(activeFlux === "centre" || activeFlux === "poste")) return;
    if (!centre) {
      setCentreCategorie("");
      return;
    }
    const selectedCentre = centres.find((c) => String(c.id) === String(centre));
    if (!selectedCentre) {
      setCentreCategorie("");
      return;
    }
    const directLabel =
      selectedCentre.categorie ||
      selectedCentre.category ||
      selectedCentre.categorie_label ||
      selectedCentre.category_label ||
      null;
    if (directLabel) {
      setCentreCategorie(directLabel);
      return;
    }
    const rawCatId =
      selectedCentre.categorie_id ??
      selectedCentre.categorieId ??
      selectedCentre.category_id ??
      selectedCentre.categoryId ??
      null;
    if (!rawCatId) {
      setCentreCategorie("Non définie");
      return;
    }
    const foundCat = categoriesList.find(
      (cat) => String(cat.id) === String(rawCatId)
    );
    if (foundCat) {
      setCentreCategorie(foundCat.label || foundCat.name || "Non définie");
    } else {
      setCentreCategorie("Non définie");
    }
  }, [activeFlux, centre, centres, categoriesList]);

  /* ---------- Référentiel des tâches quand poste change ---------- */
  useEffect(() => {
    if (activeFlux === "poste" && centre) {
      let cancelled = false;
      (async () => {
        try {
          setLoading((l) => ({ ...l, referentiel: true }));
          const posteId =
            poste && poste !== ALL_ID && !Number.isNaN(Number(poste))
              ? Number(poste)
              : null;
          const data = await api.taches({ centreId: centre, posteId });

          if (!cancelled && Array.isArray(data)) {
            setReferentiel(
              data.map((r) => {
                const minutes = (r.avg_sec ?? 0) / 60;
                const taskName = r.task || r.nom_tache || r.tache || "N/A";
                const produit = r.produit || r.product || "";

                // Si plusieurs tâches ont le même nom, ajouter le produit pour différencier
                const displayName = produit ? `${taskName} (${produit})` : taskName;

                return {
                  id: r.id || r.task_id || r.tache_id, // ✅ Ajout ID unique
                  famille: r.famille || r.famille_uo || "", // ✅ Mappage famille
                  etat: r.etat || "A", // ✅ Mappage état
                  t: displayName, // ✅ Nom avec produit si nécessaire
                  ph: r.phase || r.ph || r.etape || "N/A",
                  u: r.unit || r.unite_mesure || r.unite || "N/A",
                  m: +minutes.toFixed(2), // ✅ nombre
                  produit: produit, // ✅ Conserver produit original
                  base_calcul: r.base_calcul || 100 // ✅ Conserver base
                };
              })
            );
          }
        } catch (e) {
          console.error("Erreur simulate:", e);
          setReferentiel([]);
          setErr(
            e?.response?.data?.detail ||
            e?.message ||
            "Erreur lors du chargement des tâches"
          );
        } finally {
          if (!cancelled) setLoading((l) => ({ ...l, referentiel: false }));
        }
      })();
      return () => {
        cancelled = true;
      };
    } else {
      setReferentiel([]);
    }
  }, [activeFlux, centre, poste]);

  useEffect(() => {
    // Exemple : productivité (%) convertie en heures net sur 8h de base
    const baseHeures = 8;
    const calcul = (productivite / 100) * baseHeures;
    setHeuresNet(calcul);
  }, [productivite]);

  /* ---------- Simulation ---------- */
  const onSimuler = async (overrides = {}) => {
    setLoading((l) => ({ ...l, simulation: true }));
    setErr(null);

    // --- LOGS DE DÉBUT ---
    console.log("%c🚀 Lancement de la simulation...", "color: #005EA8; font-weight: bold; font-size: 14px;");
    console.log("📍 Flux Actif:", activeFlux);
    console.log("👤 Poste sélectionné:", poste);
    console.log("🔧 Overrides reçus:", overrides);

    const overrideVolumes = overrides.volumes || {};

    const heures_net_calculees =
      heuresNet && !Number.isNaN(Number(heuresNet))
        ? Number(heuresNet)
        : (8 * productivite) / 100;

    // -------------------------------------------------------------------------
    // 🆕 NOUVEAU : MODE DATA-DRIVEN (Vue Intervenant : Poste spécifique OU Tous les postes)
    // -------------------------------------------------------------------------
    const pid = poste && poste !== ALL_ID && !Number.isNaN(Number(poste)) ? Number(poste) : null;

    // ✅ MODIFICATION: Utiliser DATA-DRIVEN pour la vue Intervenant (Poste spécifique) ET la vue Centre (Tous les postes)
    // La vue Direction utilisera toujours le moteur LEGACY pour l'instant
    if (activeFlux === 'poste' || activeFlux === 'centre') {
      const resolvedID = pid ? (postesList.find(p => Number(p.id) === pid)?.centre_poste_id || pid) : null;
      const centreID = centre ? Number(centre) : null;

      console.log(`%c⚙️ Utilisation du moteur DATA-DRIVEN (${pid ? 'Poste' : 'Tous les postes'})`, "color: #2e7d32; font-weight: bold;");
      if (pid) console.log("📍 ID Poste initial:", pid, "➡️ ID Poste résolu:", resolvedID);
      else console.log("📍 Simulation Centre complet (tous postes), Centre ID:", centreID);

      // 1. Préparation du payload VolumesUIInput (Commun)
      const volumes_flux = overrides.volumes_flux || [];
      const uiPayload = {
        flux_arrivee: {
          amana: { GLOBAL: amana || 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          co: { GLOBAL: courrierOrdinaire || 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          cr: { GLOBAL: courrierRecommande || 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          ebarkia: { GLOBAL: ebarkia || 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          lrh: { GLOBAL: lrh || 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 }
        },
        guichet: { DEPOT: 0, RECUP: 0 },
        flux_depart: {
          amana: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          co: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          cr: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          ebarkia: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          lrh: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 }
        },
        colis_amana_par_sac: Number(colisAmanaParSac || 5),
        courriers_par_sac: Number(courriersParSac || 4500),
        colis_par_collecte: Number(colisParCollecte || 1),
        // 🆕 Paramètres Axes (Conversion % -> decimal)
        pct_axes_arrivee: Number(pctAxesArrivee ?? 40) / 100.0,
        pct_axes_depart: Number(pctAxesDepart ?? 30) / 100.0,

        // 🆕 Coefficients de complexité (priorité aux overrides venant de VueIntervenant)
        taux_complexite: overrides.taux_complexite !== undefined ? Number(overrides.taux_complexite) : Number(tauxComplexite || 1),
        nature_geo: overrides.nature_geo !== undefined ? Number(overrides.nature_geo) : Number(natureGeo || 1),

        nb_jours_ouvres_an: 264,
        volumes_flux: volumes_flux // ✅ AJOUT : Nécessaire pour le contexte par famille
      };

      // Injection des granularités (si saisies dans le tableau)
      volumes_flux.forEach(v => {
        const f = v.flux.toLowerCase() === 'eb' ? 'ebarkia' : v.flux.toLowerCase();
        const s = v.sens;
        const seg = v.segment === 'PARTICULIER' ? 'PART' : v.segment === 'PROFESSIONNEL' ? 'PRO' : v.segment;

        if (s === 'ARRIVEE' && uiPayload.flux_arrivee[f]) uiPayload.flux_arrivee[f][seg] = v.volume;
        else if (s === 'DEPART' && uiPayload.flux_depart[f]) uiPayload.flux_depart[f][seg] = v.volume;
        else if (s === 'DEPOT') uiPayload.guichet.DEPOT = v.volume;
        else if (s === 'RECUPERATION') uiPayload.guichet.RECUP = v.volume;
      });

      console.log("📦 Payload construit (Data-Driven):", uiPayload);

      try {
        const params = {
          productivite: Number(productivite),
          heures_par_jour: 8.0,
          idle_minutes: overrides.idle_minutes !== undefined ? Number(overrides.idle_minutes) : Number(idleMinutes || 0),
          ed_percent: overrides.ed_percent !== undefined ? Number(overrides.ed_percent || 0) : Number(edPercent || 0),
          debug: true
        };

        let res;
        // ✅ DISPATCH: Poste unique OU Centre complet
        if (pid) {
          res = await api.simulateDataDriven(resolvedID, uiPayload, params);
        } else {
          if (!centreID) throw new Error("Aucun centre sélectionné pour la simulation Data-Driven");
          res = await api.simulateDataDrivenCentre(centreID, uiPayload, params);
        }

        console.log(`%c✅ Résultats reçus (Data-Driven ${pid ? 'Poste' : 'Centre'}):`, "color: #2e7d32; font-weight: bold;", res);

        const details_taches = Array.isArray(res?.details_taches) ? res.details_taches : [];

        // Pour "Tous les postes", on peut recevoir une structure agrégée ou différente.
        // Adapter l'affichage selon le retour.
        const tot = {
          total_heures: res.total_heures ?? 0,
          fte_calcule: res.fte_calcule ?? 0,
          fte_arrondi: res.fte_arrondi ?? 0,
          heures_net: res.heures_net_jour ?? heures_net_calculees,
        };

        // 🔌 ADAPTATEUR: Convertir la réponse Data-Driven vers le format attendu par VueCentre (qui attend 'postes' array)
        let finalRes = { ...res, details_taches };

        console.log("🔍 [DEBUG CONDITION ADAPTATEUR]");
        console.log("   - activeFlux:", activeFlux);
        console.log("   - poste (raw):", poste);
        console.log("   - ALL_ID:", ALL_ID);
        console.log("   - pid (computed):", pid);
        console.log("   - Condition (!pid && activeFlux === 'centre'):", (!pid && activeFlux === 'centre'));

        if (!pid) {
          // On est en mode Centre complet (Vue Centre), il faut reconstruire la liste 'postes' pour les cartes KPI
          // Peu importe activeFlux, si on est ici c'est qu'on a fait une simu DD Centre.

          if (res.postes && Array.isArray(res.postes) && res.postes.length > 0) {
            console.log("✅ [BACKEND DD V2] Utilisation directe de res.postes fournis par le backend:", res.postes);
            finalRes = { ...finalRes, postes: res.postes };
          } else {
            // FALLBACK (Ancienne méthode)
            // On est en mode Centre complet, il faut reconstruire la liste 'postes' pour les cartes KPI
            const currentCentreId = centreID; // défini plus haut
            const centrePostes = postesList.filter(p => String(p.centre_id) === String(currentCentreId));

            console.log("🔍 [ADAPTATEUR DEBUG]");
            console.log("   Backend ETP Keys:", Object.keys(res.etp_par_poste || {}));
            console.log("   Referentiel Frontend (extrait 10):", centrePostes.map(p => `ID:${p.id} / CP:${p.centre_poste_id}`).slice(0, 10));

            const postesAdapte = centrePostes.map((p, index) => {
              // CORRECTION: Le backend renvoie les résultats indexés par centre_poste_id (ou id?)
              // On essaie plusieurs clés pour être sûr
              const keysToTry = [
                String(p.centre_poste_id),
                String(p.id),
                p.centre_poste_id,
                p.id
              ];

              let etpCalc = 0;
              let hrsCalc = 0;
              let matchedKey = null;

              if (res.etp_par_poste) {
                for (const k of keysToTry) {
                  if (k !== undefined && k !== null && res.etp_par_poste[k] !== undefined) {
                    etpCalc = res.etp_par_poste[k];
                    hrsCalc = res.heures_par_poste[k];
                    matchedKey = k;
                    break;
                  }
                }
              }

              if (index < 5 && etpCalc > 0) {
                console.log(`🔎 Poste Ref ID:${p.id} CP:${p.centre_poste_id} -> Keys tried:`, keysToTry, " -> MATCH:", matchedKey, " Value:", etpCalc);
              }

              return {
                id: p.id,
                poste_id: p.id,
                centre_poste_id: p.centre_poste_id,
                poste_label: p.label,
                etp_calcule: etpCalc,
                etp_arrondi: Math.round(etpCalc),
                total_heures: hrsCalc,
                effectif_actuel: 0,
                ecart: 0 - etpCalc,
                type_poste: "MOD",
                // Ajouter champs manquants pour éviter bugs UI
                effectif_statutaire: 0,
                effectif_aps: 0,
                etp_statutaire: 0,
                etp_aps: 0
              };
            });

            // Ajouter les postes qui seraient dans le résultat mais pas dans la liste (cas rares ?)
            // ... (optionnel)

            finalRes = { ...finalRes, postes: postesAdapte };
          }
          finalRes.centre_label = centres.find(c => String(c.id) === String(centreID))?.label || "Centre Inconnu";
          console.log("🔌 Données adaptées pour VueCentre:", finalRes.postes);
        }

        setResultats(finalRes);
        setTotaux(tot);
        setHasSimulated(true);
        setSimDirty(false);

        // Logs détaillés par tâche
        console.group(`📝 Détails des calculs par tâche (${details_taches.length} tâches)`);
        details_taches.forEach(t => {
          console.log(`- ${t.task.padEnd(40)} | Volume: ${String(t.nombre_unite).padStart(8)} | Heures: ${t.heures.toFixed(3)}h`);
        });
        console.groupEnd();

        setLoading((l) => ({ ...l, simulation: false }));
        return;
      } catch (e) {
        console.error("❌ Erreur Simulation Data-Driven:", e);
        setErr(e?.message || "Erreur simulation Data-Driven");
        setLoading((l) => ({ ...l, simulation: false }));
        return;
      }
    }

    // -------------------------------------------------------------------------
    // 👴 LOGIQUE LEGACY (Pour Centre / Direction / National)
    // -------------------------------------------------------------------------
    // Cette partie ne sera atteinte que si activeFlux !== 'poste' (ex: vue Centre globale, Direction, etc.)
    console.log("%c🏛️ Utilisation du moteur LEGACY", "color: #f57c00; font-weight: bold;");

    const courrier_journalier =
      overrideVolumes.courrier !== undefined
        ? Number(overrideVolumes.courrier || 0)
        : Number(courrier ?? 0);

    const colis_journalier =
      overrideVolumes.colis !== undefined
        ? Number(overrideVolumes.colis || 0)
        : Number(colis ?? 0);

    const colisCollecteOverride =
      overrides.colis_par_collecte ?? overrideVolumes.colis_par_collecte;
    const colisCollecteVal =
      colisCollecteOverride !== undefined
        ? Number(colisCollecteOverride || 0)
        : Number(colisParCollecte || 0);

    const colisAmanaOverride =
      overrides.colis_amana_par_sac ?? overrideVolumes.colis_amana_par_sac;
    const colisAmanaFinal =
      colisAmanaOverride !== undefined
        ? Number(colisAmanaOverride || 0)
        : Number(colisAmanaParSac || 0);

    const courriersParSacOverride =
      overrides.courriers_par_sac ?? overrideVolumes.courriers_par_sac;
    const courriersParSacFinal =
      courriersParSacOverride !== undefined
        ? Number(courriersParSacOverride || 0)
        : Number(courriersParSac ?? 0);

    const payload = {
      centre_id: centre ? Number(centre) : null,
      poste_id: pid,
      productivite: Number(productivite),
      heures_net: Number(heures_net_calculees),
      idle_minutes:
        overrides.idle_minutes !== undefined
          ? Number(overrides.idle_minutes || 0)
          : undefined,
      volumes: {
        sacs: Number(
          overrideVolumes.sacs !== undefined ? overrideVolumes.sacs || 0 : sacs ?? 0
        ),
        colis: Number(colis_journalier),
        courrier: Number(courrier_journalier),
        scelle: Number(
          overrideVolumes.scelle !== undefined
            ? overrideVolumes.scelle || 0
            : scelle ?? 0
        ),
        colis_amana_par_sac: colisAmanaFinal,
        courriers_par_sac: Number(courriersParSacFinal),
        colis_par_collecte: colisCollecteVal || 1,
      },
      volumes_annuels: {
        courrier_ordinaire: Number(courrierOrdinaire ?? 0),
        courrier_recommande: Number(courrierRecommande ?? 0),
        ebarkia: Number(ebarkia ?? 0),
        lrh: Number(lrh ?? 0),
        amana: Number(amana ?? 0),
        idle_minutes: overrides.idle_minutes !== undefined ? Number(overrides.idle_minutes || 0) : Number(idleMinutes || 0),
        ed_percent: overrides.ed_percent !== undefined ? Number(overrides.ed_percent || 0) : Number(edPercent || 0), // 🆕 ED%
        taux_complexite: Number(tauxComplexite || 1), // 🆕 Coef Circulation
        nature_geo: Number(natureGeo || 1), // 🆕 Coef Géo
        pct_axes_arrivee: Number(pctAxesArrivee || 0.40),
        pct_axes_depart: Number(pctAxesDepart || 0.30),
      },
    };

    try {
      // ✅ MODIFICATION: Appeler l'endpoint approprié selon le flux actif
      let res;

      if (activeFlux === 'centre') {
        // Vue Centre: utiliser l'endpoint /vue-centre-optimisee
        console.log("📍 Appel endpoint: /vue-centre-optimisee");
        res = await api.vueCentreOptimisee(payload);

        // Normalisation des résultats pour VueCentre
        const details_taches = Array.isArray(res?.details_taches) ? res.details_taches : [];
        const tot = {
          total_heures: res.total_heures ?? 0,
          fte_calcule: res.total_etp_calcule ?? 0,
          fte_arrondi: res.total_etp_arrondi ?? 0,
          heures_net: res.heures_net ?? heures_net_calculees,
        };

        // Pour VueCentre, on garde la structure complète avec .postes
        setResultats(res);
        setTotaux(tot);
        setHasSimulated(true);
        setSimDirty(false);
        console.log("%c✅ Résultats LEGACY (Vue Centre) reçus:", "color: #f57c00; font-weight: bold;", res);
      } else {
        // Vue Intervenant (avec __ALL__): utiliser l'endpoint /simulate
        console.log("📍 Appel endpoint: /simulate");
        res = await api.simulate(payload);

        const details_taches = Array.isArray(res?.details_taches)
          ? res.details_taches
          : [];
        const tot = res
          ? {
            total_heures: res.total_heures ?? 0,
            fte_calcule: res.fte_calcule ?? 0,
            fte_arrondi: res.fte_arrondi ?? 0,
            heures_net: res.heures_net_jour ?? heures_net_calculees,
          }
          : null;

        setResultats(details_taches);
        setTotaux(tot);
        setHasSimulated(true);
        setSimDirty(false);
        console.log("%c✅ Résultats LEGACY (Vue Intervenant) reçus:", "color: #f57c00; font-weight: bold;", res);
      }
    } catch (e) {
      console.error("Erreur simulate:", e);
      setResultats([]);
      setTotaux(null);
      setErr(
        e?.response?.data?.detail ||
        e?.message ||
        "Erreur lors du calcul de simulation"
      );
    } finally {
      setLoading((l) => ({ ...l, simulation: false }));
    }
  };

  /* ---------- hasPhase (colonne Phase dynamique) ---------- */
  const hasPhase = useMemo(() => {
    return referentiel.some((r) => {
      if (r.ph === undefined || r.ph === null) return false;
      const val = String(r.ph).trim().toLowerCase();
      return val !== "" && val !== "n/a";
    });
  }, [referentiel]);

  /* ---------- Render ---------- */
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-transparent w-full">
        <div className="px-0">
          <FluxNavbar activeFlux={activeFlux} onFluxChange={setActiveFlux} />
        </div>
      </div>

      <HeaderSimulation mode={mode} setMode={setMode} scope={activeFlux} />

      <div className="w-full px-2 pt-2 pb-4 space-y-2 -mt-1">
        {activeFlux === "national" && (
          <VueNationale
            kpisNationaux={kpisNationaux}
            regionsData={regionsData}
            getColor={getColor}
            scenario={nationalScenario}
            setScenario={setNationalScenario}
            onImport={handleImportNational}
            // Props ajoutées pour les paramètres
            productivite={productivite}
            setProductivite={setProductivite}
            heuresNet={heuresNet}
            setHeuresNet={setHeuresNet} // Si on veut le modifier, sinon juste passer la valeur
            idleMinutes={idleMinutes}
            setIdleMinutes={setIdleMinutes}
            tauxComplexite={tauxComplexite}
            setTauxComplexite={setTauxComplexite}
            natureGeo={natureGeo}
            setNatureGeo={setNatureGeo}
          />
        )}

        {activeFlux === "direction" && <VueDirectionSim api={api} />}

        {activeFlux === "regional" && <ComparatifRegional />}

        {(activeFlux === "siege" || activeFlux === "Siège") && <VueSiege api={api} />}

        {activeFlux === "centre" && (
          <VueCentre
            regions={regions}
            centres={centres}
            loading={loading}
            centreCategorie={centreCategorie}
            region={region}
            setRegion={setRegion}
            centre={centre}
            setCentre={setCentre}
            sacs={sacs}
            setSacs={setSacs}
            colis={colis}
            setColis={setColis}
            colisParCollecte={colisParCollecte}
            setColisParCollecte={setColisParCollecte}
            colisAmanaParSac={colisAmanaParSac}
            setColisAmanaParSac={setColisAmanaParSac}
            courriersParSac={courriersParSac}
            setCourriersParSac={setCourriersParSac}
            amana={amana}
            setAmana={setAmana}
            courrier={courrier}
            setCourrier={setCourrier}
            productivite={productivite}
            setProductivite={setProductivite}
            idleMinutes={idleMinutes}
            setIdleMinutes={setIdleMinutes}
            edPercent={edPercent}
            setEdPercent={setEdPercent}
            heuresNet={heuresNet}
            fieldUiState={fieldUiState}
            Card={Card}
            Field={Field}
            Input={Input}
            Select={Select}
            onSimuler={onSimuler}
            resultats={resultats} // VueCentre gère l'objet avec .postes
            totaux={totaux}
            hasSimulated={hasSimulated}
            simDirty={simDirty}
            cOrd={courrierOrdinaire}
            setCOrd={setCourrierOrdinaire}
            cReco={courrierRecommande}
            setCReco={setCourrierRecommande}
            eBarkia={ebarkia}
            setEBarkia={setEbarkia}
            lrh={lrh}
            setLrh={setLrh}
            setScelle={setScelle}
            volumesFluxGrid={volumesFluxGrid}
            setVolumesFluxGrid={setVolumesFluxGrid}
            nbrCoSac={nbrCoSac}
            setNbrCoSac={setNbrCoSac}
            nbrCrSac={nbrCrSac}
            setNbrCrSac={setNbrCrSac}
            pctAxesArrivee={pctAxesArrivee}
            setPctAxesArrivee={setPctAxesArrivee}
            pctAxesDepart={pctAxesDepart}
            setPctAxesDepart={setPctAxesDepart}
            EmptyStateFirstRun={EmptyStateFirstRun}
            EmptyStateDirty={EmptyStateDirty}
          />
        )}

        {/* Vue par Poste */}
        {activeFlux === "poste" && (
          <VueIntervenant
            regions={regions}
            centres={centres}
            postesOptions={postesList}
            loading={loading}
            region={region}
            setRegion={setRegion}
            centre={centre}
            setCentre={setCentre}
            centreCategorie={centreCategorie}
            poste={poste}
            setPoste={setPoste}
            sacs={sacs}
            setSacs={setSacs}
            colis={colis}
            setColis={setColis}
            colisParCollecte={colisParCollecte}
            setColisParCollecte={setColisParCollecte}
            courrier={courrier}
            setCourrier={setCourrier}
            ebarkia={ebarkia}
            setEbarkia={setEbarkia}
            lrh={lrh}
            setLrh={setLrh}
            courrierOrdinaire={courrierOrdinaire}
            setCourrierOrdinaire={setCourrierOrdinaire}
            courrierRecommande={courrierRecommande}
            setCourrierRecommande={setCourrierRecommande}
            amana={amana}
            setAmana={setAmana}
            scelle={scelle}
            setScelle={setScelle}
            colisAmanaParSac={colisAmanaParSac}
            setColisAmanaParSac={setColisAmanaParSac}
            courriersParSac={courriersParSac}
            setCourriersParSac={setCourriersParSac}
            productivite={productivite}
            setProductivite={setProductivite}
            idleMinutes={idleMinutes}
            setIdleMinutes={setIdleMinutes}
            heuresNet={heuresNet}
            setHeuresNet={setHeuresNet}
            onSimuler={handleSimulerIntervenant}
            display={display}
            setDisplay={setDisplay}
            refDisplay={refDisplay}
            setRefDisplay={setRefDisplay}
            hasPhase={hasPhase}
            referentiel={referentiel}
            resultats={tasks} // VueIntervenant attend un tableau
            totaux={totaux}
            hasSimulated={hasSimulated}
            simDirty={simDirty}
            Card={Card}
            Field={Field}
            Input={Input}
            Select={Select}
            Segmented={Segmented}
            EmptyStateFirstRun={EmptyStateFirstRun}
            EmptyStateDirty={EmptyStateDirty}
            GraphReferentiel={GraphReferentiel}
            GraphResultats={GraphResultats}
            volumesFluxGrid={volumesFluxGrid}
            setVolumesFluxGrid={setVolumesFluxGrid}
            edPercent={edPercent}
            setEdPercent={setEdPercent}
            nbrCoSac={nbrCoSac}
            setNbrCoSac={setNbrCoSac}
            nbrCrSac={nbrCrSac}
            setNbrCrSac={setNbrCrSac}
            pctAxesArrivee={pctAxesArrivee}
            setPctAxesArrivee={setPctAxesArrivee}
            pctAxesDepart={pctAxesDepart}
            setPctAxesDepart={setPctAxesDepart}
          />
        )}

        {(activeFlux === "centre" || activeFlux === "poste") && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* emplacements supplémentaires si besoin */}
          </div>
        )}

        {!!err && (
          <div className="text-sm text-red-600">
            {err?.message || err?.detail || "Erreur inconnue"}
          </div>
        )}
      </div>

      {/* Rapport imprimable (caché) */}
      <div
        ref={reportRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: "794px",
          padding: "24px",
          backgroundColor: "#ffffff",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xl font-bold">
              Rapport de Simulation des Effectifs
            </div>
            <div className="text-sm text-slate-600">
              {new Date().toLocaleDateString()} • Mode:{" "}
              {mode === "actuel" ? "Processus Actuel" : "Processus Recommandé"}
            </div>
          </div>
        </div>

        <div className="text-sm grid grid-cols-2 gap-2 mb-12">
          <div>
            <b>Région:</b>{" "}
            {regions.find((r) => String(r.id) === String(region))?.label || "-"}
          </div>
          <div>
            <b>Catégorie:</b> {centreCategorie || "-"}
          </div>
          <div>
            <b>Centre:</b>{" "}
            {centres.find((c) => String(c.id) === String(centre))?.label || "-"}
          </div>
          <div>
            <b>Poste:</b>{" "}
            {poste === ALL_ID
              ? "Tous"
              : postesOptions.find((p) => String(p.id) === String(poste))
                ?.label ?? poste}
          </div>
          <div>
            <b>Sacs/j:</b> {sacs}
          </div>
          <div>
            <b>Colis/j:</b> {colis}
          </div>
          <div>
            <b>Courrier/j:</b> {courrier}
          </div>
          <div>
            <b>Productivité:</b> {productivite}% • <b>Heures net/j:</b>{" "}
            {heuresNet}
          </div>
        </div>

        <div className="mb-10">
          <div className="font-semibold mb-2">
            Référentiel des tâches (Centre/Intervenant)
          </div>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-2 py-1 border-b">Tâche</th>
                {hasPhase && (
                  <th className="text-left px-2 py-1 border-b">Phase</th>
                )}
                <th className="text-left px-2 py-1 border-b">Unité</th>
                <th className="text-center px-2 py-1 border-b">
                  Moyenne (min)
                </th>
              </tr>
            </thead>
            <tbody>
              {referentiel.length === 0 ? (
                <tr>
                  <td
                    colSpan={hasPhase ? 4 : 3}
                    className="px-2 py-2 text-left text-slate-500"
                  >
                    Aucune donnée.
                  </td>
                </tr>
              ) : (
                referentiel.map((r, i) => (
                  <tr key={i} className={i % 2 ? "bg-slate-50" : undefined}>
                    <td className="px-2 py-1">{r.t}</td>
                    {hasPhase && (
                      <td className="px-2 py-1">
                        {r.ph && String(r.ph).trim().toLowerCase() !== "n/a"
                          ? r.ph
                          : ""}
                      </td>
                    )}
                    <td className="px-2 py-1">{r.u}</td>
                    <td className="px-2 py-1 text-center">
                      {Number(r.m ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mb-10">
          <div className="font-semibold mb-2">Résultats de simulation</div>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2">Seq</th>
                <th className="text-left px-3 py-2">Tâche</th>
                <th className="text-left px-3 py-2">Nombre d'unité</th>
                <th className="text-center px-3 py-2">Heures</th>
              </tr>
            </thead>
            <tbody>
              {loading.simulation ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-left text-slate-500"
                  >
                    Calcul en cours...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-left text-slate-500"
                  >
                    Aucune donnée.
                  </td>
                </tr>
              ) : (
                tasks.map((r, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">
                      {r.task || r.nom_tache || "N/A"}
                    </td>
                    <td className="px-3 py-2 text-center">{r.nombre_unite}</td>
                    <td className="px-3 py-2 text-center">{r.heures}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <div className="font-semibold mb-2">Visualisation</div>
          <div className="h-60 border border-dashed border-slate-300 grid place-items-center text-slate-500">
            {tasks.length
              ? "Graphe de comparaison (à intégrer)"
              : "Aucun graphe"}
          </div>
        </div>

        <div className="text-[10px] text-slate-500 mt-8">
          Rapport généré automatiquement — {new Date().toLocaleString()}
        </div>
      </div>
    </main>
  );
}
