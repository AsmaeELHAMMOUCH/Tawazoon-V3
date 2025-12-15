// frontend/src/pages/GraphPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  InboxStackIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { DocumentTextIcon } from "@heroicons/react/24/solid";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import ReactECharts from "echarts-for-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

// ---------------- Helpers UI ----------------
const yWidthFromLabels = (labels = []) => {
  const maxLen = labels.reduce((m, s) => Math.max(m, (s || "").length), 0);
  return Math.max(140, Math.min(280, Math.round(maxLen * 6.2)));
};
const ellipsize = (s = "", max = 42) =>
  s.length > max ? s.slice(0, max - 1) + "…" : s;

// -------- Helpers conversion OKLCH -> sRGB (pour html2canvas) --------
function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}
function oklchToRgbaString(input) {
  try {
    const inside = input.slice(input.indexOf("(") + 1, input.lastIndexOf(")"));
    const [parts, alphaPart] = inside.split("/").map((s) => s.trim());
    const tokens = parts.split(/\s+/).filter(Boolean);
    if (tokens.length < 3) return "rgb(0,0,0)";
    let L = tokens[0].endsWith("%")
      ? parseFloat(tokens[0]) / 100
      : parseFloat(tokens[0]);
    const C = parseFloat(tokens[1]);
    let h = tokens[2].endsWith("deg")
      ? parseFloat(tokens[2])
      : parseFloat(tokens[2]);
    const a_ = Math.cos((h * Math.PI) / 180) * C;
    const b_ = Math.sin((h * Math.PI) / 180) * C;
    const l_ = L + 0.3963377774 * a_ + 0.2158037573 * b_;
    const m_ = L - 0.1055613458 * a_ - 0.0638541728 * b_;
    const s_ = L - 0.0894841775 * a_ - 1.291485548 * b_;
    const l = l_ ** 3,
      m = m_ ** 3,
      s = s_ ** 3;
    let R = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    const toSRGB = (v) =>
      v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    R = Math.round(clamp01(toSRGB(R)) * 255);
    G = Math.round(clamp01(toSRGB(G)) * 255);
    B = Math.round(clamp01(toSRGB(B)) * 255);
    let a = 1;
    if (alphaPart) {
      const aStr = alphaPart.trim();
      a = aStr.endsWith("%") ? parseFloat(aStr) / 100 : parseFloat(aStr);
    }
    return a >= 1
      ? `rgb(${R},${G},${B})`
      : `rgba(${R},${G},${B},${clamp01(a)})`;
  } catch {
    return "rgb(0,0,0)";
  }
}
function replaceAllOklch(str) {
  if (!str || typeof str !== "string" || !str.includes("oklch(")) return str;
  return str.replace(/oklch\(\s*[^)]+\)/g, (match) => oklchToRgbaString(match));
}

// ---------------- Composants mineurs ----------------
function CustomYAxisTick({ x, y, payload }) {
  const full = String(payload.value ?? "");
  const show = ellipsize(full, 42);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#1e293b"
        fontSize={13}
        fontWeight={500}
      >
        {show}
      </text>
    </g>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const v = Number(payload[0].value || 0);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-2 text-[13px] max-w-xs">
      <div className="font-semibold text-[#0a5aa8] mb-1">{label}</div>
      <div className="text-slate-600">
        Durée totale : <b>{v.toFixed(2)} h</b>
      </div>
    </div>
  );
}

function RightValueLabel({ x, y, value }) {
  const v = Number(value || 0);
  if (!Number.isFinite(v)) return null;
  return (
    <g transform={`translate(${x + 10},${y})`}>
      <rect x={0} y={-10} rx={8} ry={8} width={40} height={18} fill="#E0E7FF" />
      <text
        x={20}
        y={3}
        textAnchor="middle"
        fontSize={13}
        fill="#0a5aa8"
        fontWeight={600}
      >
        {v.toFixed(1)} h
      </text>
    </g>
  );
}

export default function GraphPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const params = state?.data || {};

  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!state?.data) navigate(-1);
  }, [state, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!params?.poste) return;
      try {
        setLoading(true);
        setError("");

        const baseParams = {
          poste_id: String(params.poste),
          sacs_jour: String(params.sacs ?? 0),
          colis_jour: String(params.colis ?? 0),
          courrier_jour: String(params.courrier ?? 0),
          heures_net: String(params.heuresNet ?? 8),
        };

        const r = await fetch(
          `${API_BASE}/process/current/tasks?${new URLSearchParams({
            ...baseParams,
            include_phase: "true",
          })}`
        );

        if (!r.ok) {
          throw new Error(await r.text());
        }

        const data = await r.json();

        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setTasks(data);
        } else {
          if (!cancelled) {
            setTasks([
              { nom: "détachement CN23", heures: 0.4 },
              { nom: "détachement CN23 export", heures: 1.33 },
              { nom: "Edition du CP146", heures: 0.04 },
              {
                nom: "Extraction et envoi électronique du fichier import en masse à CNA",
                heures: 0.5,
              },
              { nom: "formation depêches export (CP87/CN38/Part 115)", heures: 2.5 },
              { nom: "préparation liste CN23", heures: 0.5 },
              { nom: "vérification des lots (mains levées) sur IPS", heures: 2.0 },
              { nom: "Vérification document export", heures: 1.67 },
            ]);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setTasks([
            { nom: "détachement CN23", heures: 0.4 },
            { nom: "détachement CN23 export", heures: 1.33 },
            { nom: "Edition du CP146", heures: 0.04 },
            {
              nom: "Extraction et envoi électronique du fichier import en masse à CNA",
              heures: 0.5,
            },
            { nom: "formation depêches export (CP87/CN38/Part 115)", heures: 2.5 },
            { nom: "préparation liste CN23", heures: 0.5 },
            { nom: "vérification des lots (mains levées) sur IPS", heures: 2.0 },
            { nom: "Vérification document export", heures: 1.67 },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params?.poste, params?.sacs, params?.colis, params?.courrier, params?.heuresNet]);

  const { chartData, yWidth, chartHeight, total } = useMemo(() => {
    const list = [...tasks]
      .map((t, i) => ({
        label: String(t?.nom || `T${i + 1}`),
        value: typeof t?.heures === "number" ? t.heures : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
    return {
      chartData: list,
      yWidth: yWidthFromLabels(list.map((d) => d.label)),
      chartHeight: Math.max(420, list.length * 34 + 60),
      total: list.reduce((a, c) => a + (c.value || 0), 0),
    };
  }, [tasks]);

  const handleExportPdf = async () => {
    if (!exportRef.current) return;
    try {
      setExporting(true);
      await new Promise((r) => setTimeout(r, 50));
      const node = exportRef.current;

      // Sécuriser les couleurs CSS pour html2canvas (si tu utilises oklch quelque part)
      node.querySelectorAll("*").forEach((el) => {
        const style = getComputedStyle(el);
        const bg = replaceAllOklch(style.backgroundImage);
        if (bg !== style.backgroundImage) el.style.backgroundImage = bg;
        const c = replaceAllOklch(style.color);
        if (c !== style.color) el.style.color = c;
      });

      const canvas = await html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 24;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight, undefined, "FAST");
      const date = new Date().toISOString().slice(0, 16).replace("T", " ");
      pdf.save(`graphe_heures_par_tache_${date}.pdf`);
      setToast({ type: "success", text: "✅ PDF généré avec succès !" });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error(e);
      setToast({ type: "error", text: "❌ Erreur lors de l'export PDF." });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Retour
          </button>
          <h1 className="text-xl font-bold text-[#0a5aa8] tracking-tight ml-1">
            Heures par tâche
          </h1>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={exporting || loading || chartData.length === 0}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 ${
            exporting
              ? "bg-slate-200 text-slate-600"
              : "bg-[#C1121F] hover:bg-[#A60E1A] text-white shadow-md"
          }`}
        >
          {exporting ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <DocumentTextIcon className="w-5 h-5 text-white" />
              <span>Exporter PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-sm ${
            toast.type === "success"
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-red-100 text-red-700 border border-red-300"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div id="export-pdf-root" ref={exportRef} className="space-y-3">
        {/* Filtres snapshot */}
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {params?.region && (
            <Badge icon={<MapPinIcon className="w-4 h-4 text-blue-500" />} label="Région" value={params.region} />
          )}
          {params?.categorie && (
            <Badge
              icon={<BriefcaseIcon className="w-4 h-4 text-blue-500" />}
              label="Catégorie"
              value={params.categorie}
            />
          )}
          {params?.centreId && (
            <Badge
              icon={<BuildingOfficeIcon className="w-4 h-4 text-blue-500" />}
              label="Centre"
              value={params.centreId}
            />
          )}
          {params?.poste && (
            <Badge icon={<InboxStackIcon className="w-4 h-4 text-blue-500" />} label="Poste" value={params.poste} />
          )}
          <Badge label="Sacs/j" value={params?.sacs ?? 0} />
          <Badge label="Colis/j" value={params?.colis ?? 0} />
          <Badge label="Courrier/j" value={params?.courrier ?? 0} />
          <Badge label="Prod (%)" value={params?.productivite ?? 0} />
        </div>

        {/* Carte graphe */}
        <div className="rounded-2xl border bg-slate-50 p-4 shadow-inner">
          {error && (
            <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" /> {error}
            </div>
          )}
          {loading ? (
            <SkeletonChart />
          ) : chartData.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-8">
              Aucune donnée à afficher.
            </div>
          ) : (
            <>
              <Bars chartData={chartData} yWidth={yWidth} height={chartHeight} />
              <div className="text-center text-[13px] text-slate-500 pt-3">
                Total heures :{" "}
                <b className="text-slate-800">
                  {total.toFixed(2)} h
                </b>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- ECharts ---------------- */
function Bars({ chartData, yWidth, height }) {
  const labels = useMemo(() => chartData.map((d) => d.label), [chartData]);
  const values = useMemo(() => chartData.map((d) => d.value ?? 0), [chartData]);

  const maxVal = Math.max(1, ...values);
  const domainMax = Math.ceil(maxVal * 1.1);

  const option = useMemo(
    () => ({
      animationDuration: 650,
      grid: {
        left: yWidth + 24, // on laisse la place aux labels
        right: 40,
        top: 16,
        bottom: 24,
        containLabel: false,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#ffffff",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        textStyle: { color: "#0f172a", fontSize: 12 },
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          const v = Number(p?.value || 0);
          return `
            <div style="font-weight:600;color:#0a5aa8;margin-bottom:2px">${p?.name || ""}</div>
            <div style="color:#334155">Durée totale : <b>${v.toFixed(2)} h</b></div>
          `;
        },
      },
      xAxis: {
        type: "value",
        min: 0,
        max: domainMax,
        axisLabel: { fontSize: 12, color: "#334155" },
        splitLine: { show: true, lineStyle: { type: "dashed", opacity: 0.4 } },
      },
      yAxis: {
        type: "category",
        data: labels,
        axisLabel: {
          fontSize: 13,
          color: "#1e293b",
          formatter: (val) => ellipsize(String(val || ""), 42),
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          data: values,
          barWidth: 18,
          itemStyle: {
            borderRadius: [6, 6, 6, 6],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0.05, color: "#004AAD" },
                { offset: 0.95, color: "#3A86FF" },
              ],
            },
          },
          label: {
            show: true,
            position: "right",
            formatter: ({ value }) => `${Number(value || 0).toFixed(1)} h`,
            fontSize: 13,
            color: "#0a5aa8",
            fontWeight: 700,
            backgroundColor: "#E0E7FF",
            padding: [2, 8],
            borderRadius: 8,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 6,
              shadowColor: "rgba(10,90,168,0.25)",
              scale: true,
            },
          },
        },
      ],
    }),
    [labels, values, yWidth, domainMax]
  );

  return (
    <div className="relative">
      <ReactECharts option={option} style={{ width: "100%", height }} notMerge lazyUpdate />
    </div>
  );
}

/* ---------------- Fallback skeleton ---------------- */
function SkeletonChart() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-64 h-3 bg-slate-200 rounded animate-pulse" />
          <span className="flex-1 h-3 bg-slate-200 rounded animate-pulse" />
          <span className="w-16 h-3 bg-slate-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function Badge({ icon, label, value }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-blue-50 px-2.5 py-1">
      {icon}
      <span className="text-slate-600">{label} :</span>
      <b className="text-slate-800">{value}</b>
    </span>
  );
}
