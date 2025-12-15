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
import VueSiege from "@/components/views/VueSiege";
export function PageDirection() {
  return <VueDirectionSim api={api} />;
}

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useLocation } from "react-router-dom";

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
  "Centre Unique": new Set(["sacs", "colis"]),
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
  const heuresParTache = (resultats || []).map((r) => ({
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
          (resultats || []).reduce((s, r) => s + Number(r.heures || 0), 0) || 1;
        const item = (resultats || []).find(
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
  if (!resultats?.length)
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

/* ---------------- COMPOSANTS DE VUE ---------------- */
const VueNationale = ({
  sacs,
  setSacs,
  colis,
  setColis,
  courrier,
  setCourrier,
  productivite,
  setProductivite,
  heuresNet,
  setHeuresNet,
}) => {
  // --- Données DR nationales (mock cohérent avec ton ETP actuel national)
  const baseDirections = [
    {
      code: "CASA_SETTAT",
      nom: "DR Casa - Settat",
      centres: 40,
      etpActuel: 766,
      etpRecommande: 800,
      lat: 33.5731,
      lng: -7.5898,
    },
    {
      code: "FES_MEKNES_OUJDA",
      nom: "DR Fès - Meknès - Oujda",
      centres: 35,
      etpActuel: 424,
      etpRecommande: 450,
      lat: 34.0181,
      lng: -5.0078,
    },
    {
      code: "MARRAKECH_AGADIR",
      nom: "DR Marrakech - Agadir",
      centres: 30,
      etpActuel: 408,
      etpRecommande: 430,
      lat: 31.6295,
      lng: -7.9811,
    },
    {
      code: "RABAT_TANGER",
      nom: "DR Rabat - Tanger",
      centres: 32,
      etpActuel: 575,
      etpRecommande: 600,
      lat: 34.0209,
      lng: -6.8416,
    },
    {
      code: "LAAYOUNE_DAKHLA",
      nom: "DR Laâyoune - Dakhla",
      centres: 10,
      etpActuel: 71,
      etpRecommande: 80,
      lat: 27.1567,
      lng: -13.2021,
    },
    {
      code: "SIEGE",
      nom: "Siège",
      centres: 1,
      etpActuel: 105,
      etpRecommande: 110,
      lat: 34.0209,
      lng: -6.8416,
    },
  ];

  // On dérive les champs calculés (ETP calculé, taux d’occupation)
  const regionsData = baseDirections.map((d) => {
    const taux =
      d.etpRecommande > 0
        ? Math.round((d.etpActuel / d.etpRecommande) * 100)
        : 0;
    return {
      ...d,
      etpCalcule: d.etpRecommande, // pour le mock, on aligne sur recommandé
      tauxOccupation: taux,
    };
  });

  const kpisNationaux = {
    etpActuelTotal: regionsData.reduce((s, r) => s + r.etpActuel, 0),
    etpRecommandeTotal: regionsData.reduce((s, r) => s + r.etpRecommande, 0),
    surplusDeficit: regionsData.reduce(
      (s, r) => s + (r.etpRecommande - r.etpActuel),
      0
    ),
    tauxProductiviteMoyen: 88,
    volumes: { sacs: 20000, colis: 12000, courrier: 80000 },
  };

  const getColor = (d) =>
    d > 95
      ? "#7f1d1d"
      : d > 90
        ? "#b91c1c"
        : d > 85
          ? "#dc2626"
          : d > 80
            ? "#ef4444"
            : d > 75
              ? "#f97316"
              : d > 70
                ? "#facc15"
                : "#22c55e";

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

      // ✅ IMPORTANT : on force l’affichage de TOUS les labels
      axisLabel: {
        interval: 0,                        // ← n’en saute aucun
        rotate: 15,                         // ← tourne un peu les textes
        formatter: (v) => shortLabel(v, 24) // ← coupe si trop long
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
    title: {
      text: "Taux d'Occupation par Direction Régionale (%)",
      left: "center",
    },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: regionsData.map((r) => r.nom),
      boundaryGap: false,
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

        // ✅ un point visible pour CHAQUE DR
        symbol: "circle",
        symbolSize: 8,
        showAllSymbol: true,

        itemStyle: { color: "#00A0E0" },
        areaStyle: { color: "rgba(0,160,224,0.2)" },
        smooth: true,
      },
    ],
  };


  const pieOptions = {
    title: {
      text: "Répartition des Effectifs par Direction Régionale",
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
          color: (p) => {
            const colors = [
              "#005EA8",
              "#00A0E0",
              "#4682B4",
              "#5F9EA0",
              "#B0C4DE",
              "#87CEEB",
            ];
            return colors[p.dataIndex % colors.length];
          },
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <Card
        title="Paramètres de simulation"
        actions={
          <button onClick={() => { }} className="btn-cta">
            <Play className="w-3.5 h-3.5" />
            Lancer Simulation
          </button>
        }
      >
        <div className="grid gap-4 place-items-center grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Field label="Sacs / Jour" icon={Archive}>
            <Input
              type="number"
              value={sacs}
              onChange={(e) => setSacs(Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Colis / Jour" icon={Package}>
            <Input
              type="number"
              value={colis}
              onChange={(e) => setColis(Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Courrier / Jour" icon={Mail}>
            <Input
              type="number"
              value={courrier}
              onChange={(e) => setCourrier(Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Productivité (%)" icon={Gauge}>
            <Input
              type="number"
              value={productivite}
              onChange={(e) => setProductivite(Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Heures net / Jour" icon={Clock}>
            <Input
              type="text"
              value={Number(heuresNet).toFixed(2).replace(".", ",")}
              readOnly
              disabled
              title="Calculé automatiquement d'après la productivité"
            />
          </Field>
        </div>
      </Card>

      <h2 className="text-2xl font-bold text-slate-800">
        Vue Globale Nationale
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStat
          title="Total ETP National"
          value={kpisNationaux.etpActuelTotal}
          subtitle={
            <span className="text-slate-600">
              Recommandé&nbsp;:{" "}
              <span className="text-sky-600 font-semibold">{"2150"}</span>
            </span>
          }
          delta={`${kpisNationaux.surplusDeficit >= 0 ? "" : ""
            }${''} `}
          positive={kpisNationaux.surplusDeficit >= 0}
          icon={User}
        />
        <KpiGauge
          title="Taux de Productivité (moyen)"
          percent={kpisNationaux.tauxProductiviteMoyen}
          icon={Gauge}
        />
        <KpiSpark
          title="Volumes (Sacs / jour)"
          value={kpisNationaux.volumes.sacs}
          data={[18000, 19000, 20000, 19800, 20200, 20000]}
          icon={Archive}
        />
      </div>

      <Card title="Récapitulatif par Direction Régionale">
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
              {regionsData.map((r, i) => (
                <tr
                  key={r.code}
                  className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="px-4 py-2 font-medium">{r.nom}</td>
                  <td className="px-4 py-2 text-right">{r.centres}</td>
                  <td className="px-4 py-2 text-right">{r.etpActuel}</td>
                  <td className="px-4 py-2 text-right">{r.etpCalcule}</td>
                  <td className="px-4 py-2 text-right">{r.etpRecommande}</td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={
                        r.etpRecommande - r.etpActuel >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {r.etpRecommande - r.etpActuel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{r.tauxOccupation}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-medium">
              <tr>
                <td className="px-4 py-2 text-right" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-2 text-right">
                  {kpisNationaux.etpActuelTotal}
                </td>
                <td className="px-4 py-2 text-right">-</td>
                <td className="px-4 py-2 text-right">
                  {kpisNationaux.etpRecommandeTotal}
                </td>
                <td className="px-4 py-2 text-right">
                  {kpisNationaux.surplusDeficit}
                </td>
                <td className="px-4 py-2 text-right">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Comparaison ETP Actuel vs Recommandé">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Distribution des Effectifs sur la carte">
          <div className="h-80">
            <MapContainer
              center={[31.7917, -7.0926]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {regionsData.map((r) => (
                <CircleMarker
                  key={r.code}
                  center={[r.lat, r.lng]}
                  radius={Math.sqrt(r.etpActuel) * 0.3}
                  pathOptions={{
                    color: getColor(r.tauxOccupation),
                    fillOpacity: 0.7,
                  }}
                >
                  <Popup>
                    <div>
                      <p className="font-bold">{r.nom}</p>
                      <p>ETP Actuel: {r.etpActuel}</p>
                      <p>ETP Recommandé: {r.etpRecommande}</p>
                      <p>Taux d'occupation: {r.tauxOccupation}%</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </Card>
        <Card title="Répartition des Effectifs par DR">
          <div className="h-80">
            <ReactECharts
              option={pieOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
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
  // Filters
  const [region, setRegion] = useState("");
  const [categorie, setCategorie] = useState("Activité Postale");
  const [centre, setCentre] = useState("");
  const [poste, setPoste] = useState(ALL_ID); // valeur par défaut = "Tous"

  // Inputs
  const [sacs, setSacs] = useState(0);
  const [colis, setColis] = useState(0);
  const [courrier, setCourrier] = useState(0);
  const [ebarkia, setEbarkia] = useState(0);
  const [lrh, setLrh] = useState(0);
  const [scelle, setScelle] = useState(0);
  const [colisParCollecte, setColisParCollecte] = useState(1);
  const [colisAmanaParSac, setColisAmanaParSac] = useState(5);
  const [courriersParSac, setCourriersParSac] = useState(4500);
  const [productivite, setProductivite] = useState(100);
  const [heuresNet, setHeuresNet] = useState(8);

  // ✅ États manquants ajoutés
  const [courrierOrdinaire, setCourrierOrdinaire] = useState(0);
  const [courrierRecommande, setCourrierRecommande] = useState(0);
  const [amana, setAmana] = useState(0);

  // Lookups
  const [regions, setRegions] = useState([]);
  const [centres, setCentres] = useState([]);
  const [postesList, setPostesList] = useState([]);
  const postesOptions = useMemo(() => {
    const cleaned = (postesList ?? [])
      .filter((p) => p && p.id !== ALL_ID && (p.label ?? p.name) !== "Tous")
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

  // Data
  const [referentiel, setReferentiel] = useState([]);
  const [resultats, setResultats] = useState([]);
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
          if (!cancelled) setPostesList(Array.isArray(data) ? data : []);
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
          console.log("Données des tâches :", data);
          if (!cancelled && Array.isArray(data)) {
            setReferentiel(
              data.map((r) => {
                const minutes = (r.avg_sec ?? 0) / 60;
                return {
                  t: r.task || r.nom_tache || r.tache || "N/A",
                  ph: r.phase || r.ph || r.etape || "N/A",
                  u: r.unit || r.unite_mesure || r.unite || "N/A",
                  m: +minutes.toFixed(2), // ✅ nombre
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

    const overrideVolumes = overrides.volumes || {};

    console.log(
      "DEBUG colisAmanaParSac state =",
      colisAmanaParSac,
      "override =",
      overrides.colis_amana_par_sac,
      "override.volumes =",
      overrideVolumes.colis_amana_par_sac
    );

    const heures_net_calculees =
      heuresNet && !Number.isNaN(Number(heuresNet))
        ? Number(heuresNet)
        : (8 * productivite) / 100;

    const courrier_total =
      overrideVolumes.courrier !== undefined
        ? Number(overrideVolumes.courrier || 0)
        : Number(courrier ?? 0) +
        Number(ebarkia ?? 0) +
        Number(lrh ?? 0) +
        Number(courrierOrdinaire ?? 0) +
        Number(courrierRecommande ?? 0);

    const colis_total =
      overrideVolumes.colis !== undefined
        ? Number(overrideVolumes.colis || 0)
        : Number(colis ?? 0) + Number(amana ?? 0);

    const pid =
      poste && poste !== ALL_ID && !Number.isNaN(Number(poste))
        ? Number(poste)
        : null;

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
        colis: Number(colis_total),
        courrier: Number(courrier_total),
        scelle: Number(
          overrideVolumes.scelle !== undefined
            ? overrideVolumes.scelle || 0
            : scelle ?? 0
        ),
        colis_amana_par_sac: colisAmanaFinal,
        courriers_par_sac: Number(courriersParSacFinal),
        colis_par_collecte: colisCollecteVal || 1,
      },
    };

    console.log("[DEBUG front payload]", JSON.stringify(payload, null, 2));

    try {
      const res = await api.simulate(payload);
      console.log("Résultat de la simulation :", res);

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

      <div className="w-full px-4 pt-4 pb-6 space-y-2 -mt-1">
        {activeFlux === "national" && (
          <VueNationale
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
            courrier={courrier}
            setCourrier={setCourrier}
            productivite={productivite}
            setProductivite={setProductivite}
            heuresNet={heuresNet}
            setHeuresNet={setHeuresNet}
          />
        )}

        {activeFlux === "direction" && <VueDirectionSim api={api} />}

        {activeFlux === "regional" && <ComparatifRegional />}

        {activeFlux === "siege" && <VueSiege api={api} />}

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
            heuresNet={heuresNet}
            fieldUiState={fieldUiState}
            Card={Card}
            Field={Field}
            Input={Input}
            Select={Select}
            onSimuler={onSimuler}
          />
        )}

        {/* Vue par Poste */}
        {activeFlux === "poste" && (
          <VueIntervenant
            regions={regions}
            centres={centres}
            postesOptions={postesOptions}
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
            heuresNet={heuresNet}
            setHeuresNet={setHeuresNet}
            onSimuler={handleSimulerIntervenant}
            display={display}
            setDisplay={setDisplay}
            refDisplay={refDisplay}
            setRefDisplay={setRefDisplay}
            hasPhase={hasPhase}
            referentiel={referentiel}
            resultats={resultats}
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
              ) : resultats.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-left text-slate-500"
                  >
                    Aucune donnée.
                  </td>
                </tr>
              ) : (
                resultats.map((r, i) => (
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
            {resultats.length
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
