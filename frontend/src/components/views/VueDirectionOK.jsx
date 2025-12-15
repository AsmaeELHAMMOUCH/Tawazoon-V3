"use client";
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import * as XLSX from "xlsx";
import ReactECharts from "echarts-for-react";
import DonutMoiMod from "../charts/DonutMoiMod";
import DonutModPostes from "../charts/DonutModPostes";
import ParametreSimulation from "../direction/ParametreSimulation";
import IndicateursDirection from "../direction/IndicateursDirection";


import {
  Gauge,
  Clock,
  Building,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info,
  Users,
  Calculator,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Search,
  Package,
  BarChart3,
  Download,
  Filter,
  ChevronLeft,
  Plus,
  Minus,
} from "lucide-react";

/* ========== Icône Excel (SVG inline) ========== */
const ExcelIcon = ({ className = "" }) => (
  <svg
    viewBox="0 0 256 256"
    aria-hidden="true"
    className={className}
    role="img"
  >
    <path
      d="M168 24h48a16 16 0 0 1 16 16v176a16 16 0 0 1 16 16h-48a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8Z"
      fill="#21a366"
    />
    <path
      d="M160 24H96a8 8 0 0 0-8 8v192a8 8 0 0 0 8 8h64V24Z"
      fill="#107c41"
    />
    <path
      d="M168 64h48v16h-48zM168 96h48v16h-48zM168 128h48v16h-48zM168 160h48v16h-48z"
      fill="#33c481"
    />
    <rect x="16" y="64" width="96" height="128" rx="8" fill="#185c37" />
    <path
      d="M40 88h16l16 24 16-24h16l-24 36 26 36h-16l-18-26-18 26H38l26-36-24-36Z"
      fill="#fff"
    />
  </svg>
);

/* ========== COMPOSANTS UI (réduits) ========== */
const Card = ({ title, subtitle, actions, children, className = "" }) => (
  <section
    className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_6px_30px_-12px_rgba(2,6,23,0.12)] hover:shadow-[0_12px_45px_-18px_rgba(2,6,23,0.2)] transition-all duration-500 ${className}`}
  >
    {(title || actions) && (
      <header className="px-4 pt-4 pb-2 border-b border-white/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-600 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className="px-4 py-3">{children}</div>
  </section>
);

const Box = ({ children, className = "" }) => (
  <div
    className={`rounded-xl border border-slate-200/80 bg-white/60 backdrop-blur-sm p-3 ${className}`}
  >
    {children}
  </div>
);

const Field = ({ label, icon: Icon, children }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[11px] font-semibold text-slate-700/90 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-cyan-600" />}
      {label}
    </span>
    {children}
  </label>
);

const Input = (props) => (
  <input
    {...props}
    className="h-9 w-full rounded-lg border border-slate-300/80 bg-white/80 px-2.5 text-[13px] focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500 transition-all duration-200"
  />
);

const Select = (props) => (
  <select
    {...props}
    className="h-9 w-full rounded-lg border border-slate-300/80 bg-white/80 px-2.5 text-[13px] focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500 transition-all duration-200"
  />
);

const Button = ({ children, icon: Icon, variant = "primary", ...props }) => {
  const baseClasses =
    "h-9 px-3 rounded-lg font-medium text-[13px] flex items-center gap-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40";

  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95",
    secondary:
      "bg-white/80 border border-slate-300/80 text-slate-700 hover:bg-white hover:border-slate-400 hover:shadow-sm",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-800",
  };

  return (
    <button
      {...props}
      className={`${baseClasses} ${variants[variant]} ${props.className || ""}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
};

/* ========== KPI TILE (réduit) ========== */
const KpiTile = ({ title, value, note, icon: Icon, theme = "sky" }) => {
  const themeConfig = {
    sky: {
      gradient: "from-sky-50/80 via-white to-white",
      border: "border-sky-100/60",
      accent: "bg-sky-500",
      iconColor: "text-sky-600",
    },
    cyan: {
      gradient: "from-cyan-50/80 via-white to-white",
      border: "border-cyan-100/60",
      accent: "bg-cyan-500",
      iconColor: "text-cyan-600",
    },
    amber: {
      gradient: "from-amber-50/80 via-white to-white",
      border: "border-amber-100/60",
      accent: "bg-amber-500",
      iconColor: "text-amber-600",
    },
    emerald: {
      gradient: "from-emerald-50/80 via-white to-white",
      border: "border-emerald-100/60",
      accent: "bg-emerald-500",
      iconColor: "text-emerald-600",
    },
    rose: {
      gradient: "from-rose-50/80 via-white to-white",
      border: "border-rose-100/60",
      accent: "bg-rose-500",
      iconColor: "text-rose-600",
    },
  };

  const t = themeConfig[theme];

  return (
    <div
      className={`
        group relative rounded-xl p-4 bg-gradient-to-br ${t.gradient}
        border ${t.border}
        shadow-[0_6px_22px_-12px_rgba(2,6,23,0.12)]
        hover:shadow-[0_12px_35px_-18px_rgba(2,6,23,0.2)]
        transition-all duration-500 hover:scale-[1.015]
        overflow-hidden
        flex flex-col items-center text-center
      `}
    >
      <div
        className={`absolute top-0 right-0 w-16 h-16 ${t.accent} opacity-5 rounded-full -translate-y-6 translate-x-6`}
      />
      {Icon && (
        <div
          className={`p-1.5 rounded-lg ${t.accent} bg-opacity-10 w-8 h-8 flex items-center justify-center mb-2`}
        >
          <Icon className={`w-4 h-4 ${t.iconColor}`} />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-1">
          {title}
        </div>
        <div className="text-lg font-bold text-slate-900 mb-1.5">{value}</div>

        {note && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${t.accent}`}
            />
            <span>{note}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ========== MODAL (réduit) ========== */
const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  actions,
  children,
  className = "",
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-5xl max-h-[90vh] bg-white/90 backdrop-blur-xl rounded-2xl border border-white/60 shadow-2xl overflow-hidden ${className}`}
      >
        <header className="px-4 py-3 border-b border-white/50 flex items-center justify-between bg-gradient-to-r from-white to-slate-50/80">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button
              icon={Minus}
              variant="ghost"
              onClick={onClose}
              className="!p-1.5 !h-8 !w-8"
              aria-label="Fermer"
            />
          </div>
        </header>

        <div className="p-4 overflow-auto max-h-[calc(90vh-100px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ========== Utils ========== */
const fmt = (v) =>
  v === null || v === undefined
    ? "—"
    : Number.isFinite(v)
    ? v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
    : v;

const n = (v) => Number(v || 0);

const lower = (o) =>
  Object.fromEntries(
    Object.entries(o || {}).map(([k, v]) => [String(k).toLowerCase(), v])
  );

const numOrNull = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  let s = String(val)
    .replace(/\s|[\u00A0\u202F]/g, "")
    .replace(/[^0-9.,-]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    const decIsComma = lastComma > lastDot;
    s = s.replace(/[.,]/g, "");
    if (decIsComma) {
      const decLen = String(val).length - lastComma - 1;
      if (decLen > 0) s = s.slice(0, -decLen) + "." + s.slice(-decLen);
    }
  } else {
    s = s.replace(/,/g, ".");
  }
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
};

const normalizeCentre = (row) => {
  const r = lower(row);
  const label = r.label ?? r.libelle ?? r.name ?? r.centre_label ?? `Centre`;
  const id =
    r.id ?? r.centre_id ?? r.cid ?? `${r.direction_id ?? "X"}-${label}`;

  const type = r.type ?? r.type_poste ?? r.typ ?? r.categorie ?? "";
  const postes = r.postes ?? r.nb_postes ?? "";
  const fte_actuel = numOrNull(
    r.effectif_actuel ??
      r.effectif ??
      r.headcount ??
      r.fte_actuel ??
      r.fte_reel ??
      r.fte ??
      r.nb_etp ??
      r.nb_effectif
  );

  let etp_calcule = numOrNull(r.etp_calcule ?? r.fte_calcule ?? r.etp ?? null);

  if (etp_calcule === null && fte_actuel !== null) {
    const variation = 0.8 + Math.random() * 0.4;
    etp_calcule = Math.round(fte_actuel * variation * 10) / 10;
  } else if (etp_calcule === null) {
    etp_calcule = Math.round((1 + Math.random() * 19) * 10) / 10;
  }

  const region_id = r.region_id ?? null;
  const direction_id = r.direction_id ?? null;

  return {
    id,
    label,
    type,
    postes,
    fte_actuel,
    etp_calcule,
    region_id,
    direction_id,
  };
};

const normalizePoste = (row) => {
  const r = lower(row);
  const id = r.poste_id ?? r.id ?? r.pid ?? Math.random();
  const label =
    r.poste_label ?? r.label ?? r.libelle ?? r.name ?? `Poste ${id}`;
  const type_poste =
    (r.type_poste ?? r.type ?? r.typ ?? "").toString().toUpperCase() || null;
  const effectif_actuel = numOrNull(
    r.effectif_actuel ??
      r.effectif ??
      r.headcount ??
      r.fte_actuel ??
      r.fte_reel ??
      r.fte ??
      r.nb_etp ??
      r.nb_effectif
  );
  const etp_calcule = numOrNull(r.etp_calcule ?? r.fte_calcule ?? null);
  const etp_arrondi = numOrNull(r.etp_arrondi ?? null);
  const ecart =
    numOrNull(r.ecart) ??
    (etp_arrondi != null && effectif_actuel != null
      ? etp_arrondi - effectif_actuel
      : null);
  const total_heures = numOrNull(r.total_heures ?? null);
  return {
    id,
    label,
    type_poste,
    effectif_actuel,
    etp_calcule,
    etp_arrondi,
    ecart,
    total_heures,
  };
};

/* ========== COMPOSANT DISTRIBUTION MODAL (réduit) ========== */
const DistributionModal = ({ open, onClose, data, title }) => {
  if (!open || !data) return null;

  const barChartOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => `${params[0].name}: ${fmt(params[0].value)}`,
    },
    xAxis: {
      type: "category",
      data: ["ETP Total", "ETP Calculé", "Écart"],
      axisLabel: { rotate: 0, fontSize: 11, fontWeight: "bold" },
    },
    yAxis: {
      type: "value",
      name: "Valeurs",
      nameTextStyle: { fontSize: 10, fontWeight: "bold" },
      axisLabel: { fontSize: 10 },
    },
    grid: {
      left: "5%",
      right: "5%",
      bottom: "10%",
      top: "15%",
      containLabel: true,
    },
    series: [
      {
        name: "Distribution",
        data: [
          {
            value: data.etp_total,
            name: "ETP Total",
            itemStyle: { color: "#5470c6" },
          },
          {
            value: data.etp_requis,
            name: "ETP Requis",
            itemStyle: { color: "#91cc75" },
          },
          {
            value: data.ecart,
            name: "Écart",
            itemStyle: { color: data.ecart >= 0 ? "#ee6666" : "#73c0de" },
          },
        ],
        type: "bar",
        barWidth: "55%",
        label: {
          show: true,
          position: "top",
          formatter: (params) => fmt(params.value),
          fontSize: 11,
          fontWeight: "bold",
        },
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Visualisation des données de distribution"
      className="!max-w-[1100px]"
      actions={
        <Button
          icon={Download}
          variant="secondary"
          onClick={() => {
            const ws = XLSX.utils.json_to_sheet([data]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Distribution");
            XLSX.writeFile(
              wb,
              `distribution_${title.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`
            );
          }}
        >
          Exporter
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-blue-600">
              {fmt(data.etp_total)}
            </div>
            <div className="text-[11px] text-blue-700 mt-0.5">ETP Actuel</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-green-600">
              {fmt(data.etp_requis)}
            </div>
            <div className="text-[11px] text-green-700 mt-0.5">ETP Calculé</div>
          </div>
          <div
            className={`rounded-xl p-3 text-center ${
              data.ecart > 0 ? "bg-red-50" : "bg-emerald-50"
            }`}
          >
            <div
              className={`text-lg font-bold ${
                data.ecart > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {data.ecart > 0 ? "+" : ""}
              {fmt(data.ecart)}
            </div>
            <div
              className={`text-[11px] ${
                data.ecart > 0 ? "text-red-700" : "text-emerald-700"
              } mt-0.5`}
            >
              Écart
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <h4 className="font-semibold text-slate-900 mb-3 text-sm">
            Répartition des ETP
          </h4>
          <div className="h-72 w-full">
            <ReactECharts
              option={barChartOption}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

/* ========== Component ========== */
export default function VueDirection({ api }) {
  const safeApi = useMemo(() => {
    if (
      !api ||
      typeof api.directions !== "function" ||
      typeof api.centresByDirection !== "function" ||
      typeof api.simulate !== "function"
    ) {
      throw new Error(
        "L'API doit exposer: directions(), centresByDirection(id), simulate(payload)."
      );
    }
    if (typeof api.postesByCentre !== "function") {
      console.warn(
        "[VueDirection] api.postesByCentre(centreId) manquant : le popup postes dépendra du cache."
      );
    }
    if (typeof api.consolidePostes !== "function") {
      console.warn(
        "[VueDirection] api.consolidePostes(params) manquant : le consolidé par poste ne pourra pas être calculé côté backend."
      );
    }
    return api;
  }, [api]);

  const [openCenterId, setOpenCenterId] = useState(null);
  const [distributionModal, setDistributionModal] = useState({
    open: false,
    data: null,
    title: "",
  });

  const toggleVolumes = (centreId) => {
    setOpenCenterId((prev) => (prev === centreId ? null : centreId));
  };

  const [dirs, setDirs] = useState([]);
  const [dirId, setDirId] = useState(null);
  const [centres, setCentres] = useState([]);
  const [posteCache, setPosteCache] = useState({});
  const [loading, setLoading] = useState({
    dirs: false,
    centres: false,
    sim: false,
  });
  const [err, setErr] = useState(null);

  // Recherche avec debounce
  const [searchRaw, setSearchRaw] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchRaw), 180);
    return () => clearTimeout(t);
  }, [searchRaw]);

  const [productivite, setProductivite] = useState(100);
  const heuresNet = useMemo(() => (n(productivite) / 100) * 8, [productivite]);

  const [vol, setVol] = useState({
    sociom: 0,
    co: 0,
    cr: 0,
    ebarkia: 0,
    lrh: 0,
    amana: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalCentre, setModalCentre] = useState(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalSimLoading, setModalSimLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Import Excel
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({
    success: false,
    message: "",
  });

  /* ====== Consolidé par poste ====== */
  const [consLoading, setConsLoading] = useState(false);
  const [consScope, setConsScope] = useState("direction");
  const [consolideRows, setConsolideRows] = useState([]);
  const [consolideTotals, setConsolideTotals] = useState({
    etp_total: 0,
    etp_requis: 0,
    ecart: 0,
    nb_centres: 0,
  });
  const [postTypeFilter, setPostTypeFilter] = useState("tous");

  const filteredConsolideRows = useMemo(() => {
    if (postTypeFilter === "tous") return consolideRows;
    const want = (postTypeFilter || "").toString().toUpperCase();
    return consolideRows.filter(
      (row) => (row.type_poste || "").toString().toUpperCase() === want
    );
  }, [consolideRows, postTypeFilter]);

  const filteredTotals = useMemo(() => {
    if (postTypeFilter === "tous") return consolideTotals;

    return filteredConsolideRows.reduce(
      (acc, row) => ({
        etp_total: acc.etp_total + row.etp_total,
        etp_requis: acc.etp_requis + row.etp_requis,
        ecart: acc.ecart + row.ecart,
      }),
      { etp_total: 0, etp_requis: 0, ecart: 0 }
    );
  }, [filteredConsolideRows, postTypeFilter, consolideTotals]);

  const getPostesForCentreSilent = async (centreId) => {
    const cached = posteCache[centreId];
    if (Array.isArray(cached)) return cached.map(normalizePoste);

    if (typeof safeApi.postesByCentre === "function") {
      try {
        const raw = await safeApi.postesByCentre(centreId);
        return (Array.isArray(raw) ? raw : []).map(normalizePoste);
      } catch {
        return [];
      }
    }
    return [];
  };

  const buildConsolide = useCallback(
    async (scope = "direction") => {
      setConsScope(scope);
      setConsLoading(true);
      try {
        const params = { scope };
        if (scope === "direction" && dirId) params.direction_id = dirId;
        const result = await safeApi.consolidePostes(params);

        let rows = [];
        let totals = { etp_total: 0, etp_requis: 0, ecart: 0, nb_centres: 0 };

        if (result && result.rows) {
          rows = result.rows;
          totals = result.totals || totals;
        } else if (Array.isArray(result)) {
          rows = result;
          totals = {
            etp_total: rows.reduce((s, r) => s + (r.etp_total || 0), 0),
            etp_requis: rows.reduce((s, r) => s + (r.etp_requis || 0), 0),
            ecart: rows.reduce((s, r) => s + (r.ecart || 0), 0),
            nb_centres: 0,
          };
        }

        setConsolideRows(rows);
        setConsolideTotals(totals);
      } catch (e) {
        console.error("Erreur consolidePostes:", e);
        setErr(e?.message || "Erreur lors du chargement du consolidé");
        setConsolideRows([]);
        setConsolideTotals({ etp_total: 0, etp_requis: 0, ecart: 0, nb_centres: 0 });
      } finally {
        setConsLoading(false);
      }
    },
    [dirId, safeApi]
  );

  const onExportConsolideExcel = () => {
    const rows = consolideRows.map((r) => ({
      Poste: r.label,
      "ETP total": r.etp_total,
      "ETP requis": r.etp_requis,
      Écart: r.ecart,
      "% du total": consolideTotals.etp_total
        ? r.etp_total / consolideTotals.etp_total
        : 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consolide");
    XLSX.writeFile(wb, `consolide_${consScope}_${dirId ?? "ALL"}.xlsx`);
  };

  const onDownloadTemplate = () => {
    const headers = [
      "Nom du Centre",
      "Sacs / an",
      "C. ordinaire / an",
      "C. recommandé / an",
      "E-Barkia / an",
      "LRH / an",
      "Amana / an",
    ];
    const sample = [
      {
        "Nom du Centre": "OUJDA CENTRE DE DISTRIBUTION",
        "Sacs / an": 0,
        "C. ordinaire / an": 0,
        "C. recommandé / an": 0,
        "E-Barkia / an": 0,
        "LRH / an": 0,
        "Amana / an": 0,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
    ws["!rows"] = [{ hpt: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_volumes.xlsx");
  };

  const nSumVolumes = (c) => {
    const v = c?.volumes;
    if (!v) return 0;
    return (
      n(v.sociom) + n(v.co) + n(v.cr) + n(v.ebarkia) + n(v.lrh) + n(v.amana)
    );
  };
  const hasImportedVolumes = (c) => nSumVolumes(c) > 0;

  const validateExcelData = (jsonData) => {
    const requiredColumns = [
      "Nom du Centre",
      "Sacs / an",
      "C. ordinaire / an",
      "C. recommandé / an",
      "E-Barkia / an",
      "LRH / an",
      "Amana / an",
    ];
    const firstRow = jsonData[0] || {};
    const missing = requiredColumns.filter((c) => !(c in firstRow));
    if (missing.length > 0)
      return {
        valid: false,
        message: `Colonnes manquantes : ${missing.join(", ")}`,
      };

    const rowsWithoutCentreName = jsonData.filter(
      (row) => !row["Nom du Centre"]
    );
    if (rowsWithoutCentreName.length > 0)
      return {
        valid: false,
        message: `Certaines lignes n'ont pas de nom de centre`,
      };

    const invalid = [];
    jsonData.forEach((row, i) => {
      requiredColumns.slice(1).forEach((column) => {
        const value = row[column];
        if (value === undefined || value === null || value === "") return;
        const parsed = numOrNull(value);
        if (parsed === null)
          invalid.push(`Ligne ${i + 2} / ${column} : "${value}"`);
      });
    });
    if (invalid.length > 0)
      return {
        valid: false,
        message: `Valeurs invalides:\n${invalid.join("\n")}`,
      };

    return { valid: true, message: "Fichier valide" };
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportStatus({ success: false, message: "" });
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const validation = validateExcelData(jsonData);
      if (!validation.valid) {
        setImportStatus({ success: false, message: validation.message });
        return;
      }

      const updatedCentres = centres.map((centre) => {
        const row = jsonData.find(
          (r) =>
            r["Nom du Centre"] &&
            r["Nom du Centre"].toLowerCase().trim() ===
              centre.label.toLowerCase().trim()
        );
        if (row) {
          const volumes = {
            sociom: Math.max(0, numOrNull(row["Sacs / an"]) || 0),
            co: Math.max(0, numOrNull(row["C. ordinaire / an"]) || 0),
            cr: Math.max(0, numOrNull(row["C. recommandé / an"]) || 0),
            ebarkia: Math.max(0, numOrNull(row["E-Barkia / an"]) || 0),
            lrh: Math.max(0, numOrNull(row["LRH / an"]) || 0),
            amana: Math.max(0, numOrNull(row["Amana / an"]) || 0),
          };
          return { ...centre, volumes };
        }
        return {
          ...centre,
          volumes: centre.volumes || {
            sociom: 0,
            co: 0,
            cr: 0,
            ebarkia: 0,
            lrh: 0,
            amana: 0,
          },
        };
      });

      setCentres(updatedCentres);

      const newVolumes = {
        sociom: 0,
        co: 0,
        cr: 0,
        ebarkia: 0,
        lrh: 0,
        amana: 0,
      };
      updatedCentres.forEach((c) => {
        if (c.volumes) {
          newVolumes.sociom += c.volumes.sociom;
          newVolumes.co += c.volumes.co;
          newVolumes.cr += c.volumes.cr;
          newVolumes.ebarkia += c.volumes.ebarkia;
          newVolumes.lrh += c.volumes.lrh;
          newVolumes.amana += c.volumes.amana;
        }
      });
      setVol(newVolumes);

      setImportStatus({
        success: true,
        message: `Importation réussie ! ${
          updatedCentres.filter((c) => c.volumes).length
        } centres mis à jour.`,
      });
    } catch (error) {
      console.error(error);
      setImportStatus({
        success: false,
        message: error.message?.includes("Failed to fetch")
          ? "Erreur réseau lors de la lecture du fichier."
          : "Erreur lors de l'importation. Vérifiez le format Excel.",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ===== Data API ===== */
  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading((l) => ({ ...l, dirs: true }));
        const list = await safeApi.directions();
        const arr = Array.isArray(list) ? list : [];
        setDirs(arr);
        setDirId(arr?.[0]?.id ?? null);
      } catch (e) {
        setErr(e?.message || "Erreur lors du chargement des directions");
      } finally {
        setLoading((l) => ({ ...l, dirs: false }));
      }
    })();
  }, [safeApi]);

  useEffect(() => {
    if (!dirId) {
      setCentres([]);
      return;
    }
    (async () => {
      try {
        setErr(null);
        setLoading((l) => ({ ...l, centres: true }));
        const data = await safeApi.centresByDirection(dirId);
        const rows = (Array.isArray(data) ? data : []).map(normalizeCentre);

        setCentres(rows);
        setPosteCache({});

        try {
          setLoading((l) => ({ ...l, postes: true }));
          if (typeof safeApi.postesByCentre === "function") {
            const ids = rows.map((c) => c.id).filter(Boolean);
            const fetched = await Promise.all(
              ids.map(async (id) => {
                try {
                  const list = await getPostesForCentreSilent(id);
                  return [id, list];
                } catch {
                  return [id, []];
                }
              })
            );
            setPosteCache((m) => {
              const next = { ...m };
              for (const [id, list] of fetched) next[id] = list;
              return next;
            });
          }
        } finally {
          setLoading((l) => ({ ...l, postes: false }));
        }

        setConsolideRows([]);
        setConsolideTotals({
          etp_total: 0,
          etp_requis: 0,
          ecart: 0,
          nb_centres: 0,
        });
      } catch (e) {
        setErr(e?.message || "Erreur lors du chargement des centres");
        setCentres([]);
      } finally {
        setLoading((l) => ({ ...l, centres: false }));
      }
    })();
  }, [dirId, safeApi]);

  useEffect(() => {
    if (!dirId) return;
    if (!Array.isArray(centres) || centres.length === 0) return;
    if (!consLoading && consolideRows.length === 0) buildConsolide("direction");
  }, [dirId, centres, consLoading, consolideRows.length, buildConsolide]);

  const currentDir = useMemo(
    () => (dirs || []).find((d) => d.id === dirId) || null,
    [dirs, dirId]
  );

  const centresStrict = useMemo(() => {
    const rows = (centres || []).filter(
      (c) =>
        c &&
        (c.direction_id == null || Number(c.direction_id) === Number(dirId))
    );
    const seen = new Set();
    const out = [];
    for (const c of rows) {
      const key =
        c.id ??
        (c.label
          ? c.label
              .normalize?.("NFD")
              .replace(/[\u00B7\u0300-\u036f]/g, "")
              .toLowerCase()
              .trim()
          : "");
      if (!seen.has(key)) {
        seen.add(key);
        out.push(c);
      }
    }
    return out;
  }, [centres, dirId]);

  const centresDirection = centresStrict;

  const kpis = useMemo(() => {
    const centersTotal = centresDirection.length;
    const fteDirection = centresDirection.reduce(
      (s, c) => s + (numOrNull(c.fte_actuel) ?? 0),
      0
    );
    const etpDirection = centresDirection.reduce(
      (s, c) => s + (numOrNull(c.etp_calcule) ?? 0),
      0
    );
    const delta = fteDirection - etpDirection;

    if (centersTotal === 0) {
      return { centers: 0, fte: 0, etp: 0, delta: 0 };
    }
    return {
      centers: centersTotal,
      fte: fteDirection,
      etp: etpDirection,
      delta,
    };
  }, [centresDirection]);

  const onSimuler = async () => {
    setErr(null);
    setLoading((l) => ({ ...l, sim: true }));
    try {
      const payload = {
        mode: "single",
        direction_id: Number(dirId),
        volume: {
          sacs: Math.round(n(vol.sociom) / 300 || 0),
          colis: Math.round(n(vol.amana) / 300 || 0),
          courrier: Math.round(
            (n(vol.co) + n(vol.cr) + n(vol.ebarkia) + n(vol.lrh)) / 300 || 0
          ),
          scelles: 0,
        },
        productivite_pct: n(productivite),
        heures_net_jour: (n(productivite) / 100) * 8,
      };
      const r = await safeApi.simulate(payload);
      const byId = {};
      const arr = Array.isArray(r?.par_centre)
        ? r.par_centre
        : Array.isArray(r?.centres)
        ? r.centres
        : [];
      arr.forEach((x) => {
        const rr = lower(x);
        const cid = x.centre_id ?? x.id;
        byId[cid] = numOrNull(
          rr.etp_calcule ?? rr.fte_calcule ?? rr.fte_arrondi ?? rr.fte
        );
      });
      setCentres((prev) =>
        prev.map((c) => ({ ...c, etp_calcule: byId[c.id] ?? c.etp_calcule }))
      );
    } catch (e) {
      setErr(e?.message || "Erreur lors de la simulation");
    } finally {
      setLoading((l) => ({ ...l, sim: false }));
    }
  };

  const [showOnlyWithVolumes, setShowOnlyWithVolumes] = useState(false);
  const [sort, setSort] = useState({ key: "label", dir: "asc" });

  const filteredCentres = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    let rows = centresStrict;
    if (q) rows = rows.filter((c) => (c.label || "").toLowerCase().includes(q));
    if (showOnlyWithVolumes) rows = rows.filter((c) => hasImportedVolumes(c));
    return rows;
  }, [search, centresStrict, showOnlyWithVolumes]);

  const sortedCentres = useMemo(() => {
    const rows = [...filteredCentres].map((c) => {
      const fte = c.fte_actuel;
      const etp = c.etp_calcule;
      return {
        ...c,
        __fte: fte ?? null,
        __etp: etp ?? null,
        __delta: fte != null && etp != null ? fte - etp : null,
      };
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const k = sort.key;
      const av =
        k === "fte"
          ? a.__fte
          : k === "etp"
          ? a.__etp
          : k === "delta"
          ? a.__delta
          : k === "postes"
          ? numOrNull(a.postes) ?? 0
          : a.label ?? "";
      const bv =
        k === "fte"
          ? b.__fte
          : k === "etp"
          ? b.__etp
          : k === "delta"
          ? b.__delta
          : k === "postes"
          ? numOrNull(b.postes) ?? 0
          : b.label ?? "";
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av > bv ? dir : av < bv ? -dir : 0;
    });
    return rows;
  }, [filteredCentres, sort]);

  const totalPages = Math.ceil(sortedCentres.length / rowsPerPage) || 1;
  const currentCentres = sortedCentres.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const HeaderSort = ({ children, col }) => (
    <button
      onClick={() =>
        setSort((s) =>
          s.key === col
            ? { key: col, dir: s.dir === "asc" ? "desc" : "asc" }
            : { key: col, dir: "asc" }
        )
      }
      className="inline-flex items-center gap-1 hover:underline text-[11px] font-semibold text-slate-700 uppercase tracking-wide"
      title="Trier"
    >
      {children}
      {sort.key === col && (
        <span className="text-[9px]">{sort.dir === "asc" ? "▲" : "▼"}</span>
      )}
    </button>
  );

  const onExportExcel = () => {
    const rows = sortedCentres.map((c) => {
      const fte = c.fte_actuel;
      const etp = c.etp_calcule;
      const delta = fte != null && etp != null ? fte - etp : null;
      return {
        Centre: c.label,
        Postes: c.postes ?? "",
        "FTE (actuel)": fte,
        "ETP (besoin)": etp,
        "Δ (FTE - ETP)": delta,
        "Volumes (total)": nSumVolumes(c) || null,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Centres");
    XLSX.writeFile(wb, `resultats_direction_${dirId ?? "NA"}.xlsx`);
  };

  const distributeCentreNeedToPosts = (centreNeed, posts) => {
    const weights =
      posts.map((p) => ({
        id: p.id,
        label: p.label,
        w:
          (p.total_heures ?? 0) > 0
            ? p.total_heures
            : (p.etp_calcule ?? 0) > 0
            ? p.etp_calcule
            : (p.effectif_actuel ?? 0) > 0
            ? p.effectif_actuel
            : 1,
      })) || [];
    const sumW = weights.reduce((s, x) => s + (x.w || 0), 0) || 1;
    return posts.map((p) => {
      const w = weights.find((x) => x.id === p.id)?.w ?? 1;
      const etp_calcule = (centreNeed * w) / sumW;
      const etp_arrondi = etp_calcule;
      const ecart =
        p.effectif_actuel != null && etp_arrondi != null
          ? etp_arrondi - p.effectif_actuel
          : null;
      return { ...p, etp_calcule, etp_arrondi, ecart };
    });
  };

  const runCentreSimulationForModal = async (centre) => {
    const v = centre?.volumes || {
      sociom: 0,
      amana: 0,
      co: 0,
      cr: 0,
      ebarkia: 0,
      lrh: 0,
    };
    const courrierAn = n(v.co) + n(v.cr) + n(v.ebarkia) + n(v.lrh);
    const payload = {
      mode: "single",
      centre_id: Number(centre.id),
      direction_id: Number(dirId),
      volume: {
        sacs: Math.round(n(v.sociom) / 300 || 0),
        colis: Math.round(n(v.amana) / 300 || 0),
        courrier: Math.round(courrierAn / 300 || 0),
        scelles: 0,
      },
      productivite_pct: n(productivite),
      heures_net_jour: (n(productivite) / 100) * 8,
    };

    try {
      const r = await safeApi.simulate(payload);

      const postesSim = Array.isArray(r?.par_poste)
        ? r.par_poste
        : Array.isArray(r?.postes)
        ? r.postes
        : null;

      const centreNeed =
        numOrNull(
          r?.etp_calcule ?? r?.fte_calcule ?? r?.fte_arrondi ?? r?.fte
        ) ??
        numOrNull(
          r?.par_centre?.find?.((x) => (x.centre_id ?? x.id) === centre.id)
            ?.etp_calcule
        );

      const posts = (posteCache[centre.id] || []).map(normalizePoste);

      if (postesSim && posts.length > 0) {
        const byId = new Map();
        const byLabel = new Map();
        postesSim.forEach((pp) => {
          const pid = pp.poste_id ?? pp.id;
          if (pid != null) byId.set(pid, pp);
          const lab = (pp.poste_label ?? pp.label ?? "")
            .toString()
            .trim()
            .toLowerCase();
          if (lab) byLabel.set(lab, pp);
        });

        const updated = posts.map((p) => {
          const sim =
            byId.get(p.id) ||
            byLabel.get((p.label || "").toString().trim().toLowerCase());
          if (!sim) return p;
          const rr = lower(sim);
          const etp_calcule = numOrNull(
            rr.etp_calcule ?? rr.fte_calcule ?? rr.fte ?? rr.etp
          );
          const etp_arrondi = numOrNull(rr.etp_arrondi ?? etp_calcule);
          const ecart =
            p.effectif_actuel != null && etp_arrondi != null
              ? etp_arrondi - p.effectif_actuel
              : null;
          return { ...p, etp_calcule, etp_arrondi, ecart };
        });

        if (centreNeed != null) {
          const sumEtp = updated.reduce(
            (s, p) => s + (p.etp_arrondi ?? p.etp_calcule ?? 0),
            0
          );
          const residu = centreNeed - sumEtp;
          if (Math.abs(residu) > 1e-6) {
            const base = updated.map((p) => ({
              id: p.id,
              w: (p.etp_calcule ?? 0) > 0 ? p.etp_calcule : 1,
            }));
            const sumW = base.reduce((s, x) => s + x.w, 0) || 1;
            for (let i = 0; i < updated.length; i++) {
              const w = base[i].w;
              const add = (residu * w) / sumW;
              const newEtp = (updated[i].etp_calcule ?? 0) + add;
              updated[i].etp_calcule = newEtp;
              updated[i].etp_arrondi = newEtp;
              updated[i].ecart =
                updated[i].effectif_actuel != null
                  ? newEtp - updated[i].effectif_actuel
                  : updated[i].ecart ?? null;
            }
          }
        }
        setPosteCache((m) => ({ ...m, [centre.id]: updated }));
        return;
      }

      if (centreNeed != null && (posteCache[centre.id] || []).length > 0) {
        const distributed = distributeCentreNeedToPosts(
          centreNeed,
          posteCache[centre.id]
        );
        setPosteCache((m) => ({ ...m, [centre.id]: distributed }));
      }
    } catch (e) {
      console.error("simulate(centre) error:", e);
    }
  };

  const openPostsModal = async (centre) => {
    setModalCentre(centre);
    setModalSearch("");
    setModalOpen(true);

    if (
      !posteCache[centre.id] &&
      typeof safeApi.postesByCentre === "function"
    ) {
      try {
        const raw = await safeApi.postesByCentre(centre.id);
        const rows = (Array.isArray(raw) ? raw : []).map(normalizePoste);
        setPosteCache((m) => ({ ...m, [centre.id]: rows }));
      } catch (e) {
        console.error("postesByCentre error:", e);
        setPosteCache((m) => ({ ...m, [centre.id]: [] }));
      }
    }

    setModalSimLoading(true);
    await runCentreSimulationForModal(centre);
    setModalSimLoading(false);
  };

  const closePostsModal = () => {
    setModalOpen(false);
    setModalCentre(null);
    setModalSearch("");
  };

  const openDistributionModal = (row) => {
    setDistributionModal({
      open: true,
      data: {
        etp_total: row.etp_total,
        etp_requis: row.etp_requis,
        ecart: row.ecart,
      },
      title: `Distribution - ${row.label}`,
    });
  };

  const closeDistributionModal = () => {
    setDistributionModal({ open: false, data: null, title: "" });
  };

  const modalRows = useMemo(() => {
    const list = modalCentre ? posteCache[modalCentre.id] || [] : [];
    const q = (modalSearch || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        (p.label || "").toLowerCase().includes(q) ||
        (p.type_poste || "").toLowerCase().includes(q)
    );
  }, [modalCentre, posteCache, modalSearch]);

  const modalTotals = useMemo(() => {
    const acc = {
      effectif: 0,
      etpCalcule: 0,
      etpArrondi: 0,
      ecart: 0,
      heures: 0,
    };
    modalRows.forEach((p) => {
      acc.effectif += p.effectif_actuel ?? 0;
      acc.etpCalcule += p.etp_calcule ?? 0;
      acc.etpArrondi += p.etp_arrondi ?? 0;
      acc.ecart += p.ecart ?? 0;
      acc.heures += p.total_heures ?? 0;
    });
    return acc;
  }, [modalRows]);

  /* ========== Render ========== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-4">
      <div className="space-y-6">
        {/* Sélecteur de direction */}
        <div className="w-full bg-white/80 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col">
            <label className="text-[12px] font-semibold text-slate-700 mb-1">
              Choisir une direction :
            </label>
            <select
              className="h-10 w-full sm:w-80 rounded-lg border border-slate-300 bg-white px-3 text-[13px] focus:ring-2 focus:ring-cyan-500/60"
              value={dirId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setDirId(v === "" ? null : Number(v));
              }}
            >
              <option value="">Toutes les directions</option>
              {dirs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label || d.name || d.code || `Direction ${d.id}`}
                </option>
              ))}
            </select>
          </div>

          {err && (
            <div className="text-rose-600 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {err}
            </div>
          )}
        </div>

        {/* Section Paramètres */}
        <ParametreSimulation
          productivite={productivite}
          setProductivite={setProductivite}
          heuresNet={heuresNet}
          dirs={dirs}
          dirId={dirId}
          setDirId={setDirId}
          loadingDirs={loading.dirs}
        />

        {/* Section KPIs */}
       <IndicateursDirection
  currentDir={currentDir}
  kpis={kpis}
  fmt={fmt}
/>


        {/* Section Volumes */}
        <Card
          title="Volumes Annuels"
          subtitle="Importez vos données"
          actions={
            <div className="flex gap-2">
              <Button
                icon={UploadCloud}
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? "Import..." : "Importer Excel"}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
            </div>
          }
        >
          {importStatus.message && (
            <div
              className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
                importStatus.success
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-rose-50 border border-rose-200"
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span className="text-[12px]">{importStatus.message}</span>
            </div>
          )}

          <Box className="bg-blue-50/50 border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1.5 text-sm">
                  Format requis
                </h4>
                <ul className="text-[12px] text-blue-700 space-y-1">
                  <li>
                    • Colonnes :{" "}
                    <strong>
                      Nom du Centre, Sacs / an, C. ordinaire / an, C. recommandé
                      / an, E-Barkia / an, LRH / an, Amana / an
                    </strong>
                  </li>
                  <li>• Noms de centres exacts</li>
                  <li>• Valeurs numériques</li>
                </ul>
                <button
                  onClick={onDownloadTemplate}
                  className="text-blue-600 hover:text-blue-700 text-[12px] font-medium mt-2 inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger le modèle
                </button>
              </div>
            </div>
          </Box>
        </Card>

        {/* Section Centres */}
        <Card
          title="Analyse par Centre"
          subtitle={`${sortedCentres.length} centres analysés`}
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un centre..."
                  className="h-9 w-64 rounded-lg border border-slate-300/80 bg-white/80 pl-8 pr-3 text-[13px] focus:ring-2 focus:ring-cyan-500/60"
                  value={searchRaw}
                  onChange={(e) => {
                    setSearchRaw(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <Button icon={Filter} variant="secondary">
                Filtres
              </Button>

              <Button
                icon={ExcelIcon}
                variant="secondary"
                onClick={onExportExcel}
              >
                Exporter
              </Button>
            </div>
          }
        >
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/60">
            {loading.centres ? (
              <div className="p-4 text-slate-600 text-sm">Chargement des centres...</div>
            ) : err ? (
              <div className="p-4 text-rose-600 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {err}
              </div>
            ) : currentCentres.length === 0 ? (
              <div className="p-4 text-slate-500 text-sm">Aucune donnée disponible.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200">
                    <th className="px-4 py-3 text-left">
                      <HeaderSort col="label">Centre</HeaderSort>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <HeaderSort col="postes">Nombre de métiers</HeaderSort>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <HeaderSort col="fte">FTE Actuel</HeaderSort>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <HeaderSort col="etp">ETP Besoin</HeaderSort>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <HeaderSort col="delta">Écart</HeaderSort>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200/80">
                  {currentCentres.map((centre) => {
                    const fte = centre.fte_actuel;
                    const etp = centre.etp_calcule;
                    const delta = fte != null && etp != null ? fte - etp : null;
                    const hasVol = hasImportedVolumes(centre);

                    return (
                      <tr
                        key={centre.id}
                        className="hover:bg-white/80 transition-colors duration-200 group"
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-cyan-100/50 group-hover:bg-cyan-100/80 transition-colors">
                                <Building className="w-3.5 h-3.5 text-cyan-600" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-900 text-[13px]">
                                  {centre.label}
                                </div>
                                {hasVol && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                    <span className="text-[11px] text-amber-600">
                                      Volumes importés
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <Button
                              icon={ChevronRight}
                              variant="ghost"
                              className="!p-1.5 !h-8 !w-8"
                              onClick={() => openPostsModal(centre)}
                            />
                          </div>
                        </td>

                        <td className="px-4 py-2 text-center text-[13px] text-slate-600">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <span>{fmt(centre.postes)}</span>
                            <Button
                              icon={Eye}
                              variant="ghost"
                              className="!p-1.5 !h-8 !w-8"
                              onClick={() => openPostsModal(centre)}
                            />
                          </div>
                        </td>

                        <td className="px-4 py-2 text-center text-[13px] font-semibold text-slate-900">
                          {fmt(centre.fte_actuel)}
                        </td>

                        <td className="px-4 py-2 text-center text-[13px] font-semibold text-blue-600">
                          {fmt(centre.etp_calcule)}
                        </td>

                        <td className="px-4 py-2 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${
                              delta > 0
                                ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                : delta < 0
                                ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                                : "bg-slate-100 text-slate-800 ring-1 ring-slate-200"
                            }`}
                          >
                            {delta > 0 ? "+" : ""}
                            {fmt(delta)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 px-1">
            <div className="text-[12px] text-slate-600">
              Affichage de {(currentPage - 1) * rowsPerPage + 1} à{" "}
              {Math.min(currentPage * rowsPerPage, sortedCentres.length)} sur{" "}
              {sortedCentres.length}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                icon={ChevronLeft}
                variant="secondary"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="!p-1.5 !h-8 !w-8"
              />
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 w-8 rounded-lg text-[12px] font-medium transition-all ${
                        currentPage === page
                          ? "bg-cyan-600 text-white shadow"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <Button
                icon={ChevronRight}
                variant="secondary"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="!p-1.5 !h-8 !w-8"
              />
            </div>
          </div>
        </Card>

        {/* Donuts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card
            title="Répartition MOI/MOD"
            subtitle="Distribution Main d'Œuvre Indirecte/Directe"
          >
            <div className="min-h-[320px]">
              <DonutMoiMod
                data={centresDirection}
                isCurrentDirection
                posteCache={posteCache}
                loading={Boolean(loading.centres || loading.postes)}
              />
            </div>
          </Card>

          <Card
            title="Top 10 Postes MOD"
            subtitle="Postes MOD les plus importants"
          >
            <div className="min-h-[320px]">
              <DonutModPostes
                data={centresDirection}
                isCurrentDirection
                posteCache={posteCache}
                loading={Boolean(loading.centres || loading.postes)}
              />
            </div>
          </Card>
        </div>

        {/* Consolidé */}
        <Card
          title="Consolidé par Poste"
          subtitle="Vue agrégée des besoins"
          actions={
            <div className="flex items-center gap-2">
              <Select
                value={postTypeFilter}
                onChange={(e) => setPostTypeFilter(e.target.value)}
                className="min-w-[120px]"
              >
                <option value="tous">Tous</option>
                <option value="MOI">MOI</option>
                <option value="MOD">MOD</option>
              </Select>

              <Button
                onClick={() => buildConsolide("direction")}
                disabled={consLoading}
                variant="secondary"
              >
                Direction
              </Button>
              <Button
                onClick={() => buildConsolide("global")}
                disabled={consLoading}
                variant="secondary"
              >
                Global
              </Button>
              <Button
                icon={ExcelIcon}
                onClick={onExportConsolideExcel}
                disabled={consLoading || consolideRows.length === 0}
                variant="primary"
              >
                Export
              </Button>
            </div>
          }
        >
          {consLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-9 h-9 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-[12px] text-slate-600">
                  Calcul du consolidé...
                </p>
              </div>
            </div>
          ) : consolideRows.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-[12px] text-slate-500">
                Aucune donnée consolidée
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cliquez sur un bouton pour générer
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/60">
              {postTypeFilter !== "tous" && (
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                  <p className="text-[12px] text-blue-700">
                    <span className="font-semibold">Filtre:</span>{" "}
                    {postTypeFilter}{" "}
                    <span className="ml-1 text-blue-600">
                      ({filteredConsolideRows.length})
                    </span>
                  </p>
                </div>
              )}

              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                      Poste
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                      ETP Total
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                      ETP Calculé
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                      Écart
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                      % Total
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                      Distribution
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200/80">
                  {filteredConsolideRows.map((row) => {
                    const pct = filteredTotals.etp_total
                      ? (row.etp_total / filteredTotals.etp_total) * 100
                      : 0;

                    return (
                      <tr
                        key={row.key}
                        className="hover:bg-white/80 transition-colors"
                      >
                        <td className="px-4 py-2 font-medium text-slate-900 text-[13px]">
                          {row.label}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              row.type_poste === "MOI"
                                ? "bg-purple-100 text-purple-800 ring-1 ring-purple-200"
                                : "bg-orange-100 text-orange-800 ring-1 ring-orange-200"
                            }`}
                          >
                            {row.type_poste || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-[13px] text-slate-600">
                          {fmt(row.etp_total)}
                        </td>
                        <td className="px-4 py-2 text-center text-[13px] font-semibold text-blue-600">
                          {fmt(row.etp_requis)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${
                              row.ecart > 0
                                ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                : row.ecart < 0
                                ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                                : "bg-slate-100 text-slate-800 ring-1 ring-slate-200"
                            }`}
                          >
                            {row.ecart > 0 ? "+" : ""}
                            {fmt(row.ecart)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-[12px] text-slate-600">
                          {pct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            icon={BarChart3}
                            variant="ghost"
                            className="!p-1.5 !h-8 !w-8 hover:scale-110 transition-transform"
                            onClick={() => openDistributionModal(row)}
                            title="Voir la distribution"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-50/90 border-t border-slate-200">
                    <td className="px-4 py-3 font-bold text-slate-900 text-[13px]">
                      Total{" "}
                      {consScope === "direction"
                        ? "direction"
                        : "toutes directions"}
                      {postTypeFilter !== "tous" && ` (${postTypeFilter})`}
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-center text-[13px] font-semibold text-slate-900">
                      {fmt(filteredTotals.etp_total)}
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] font-semibold text-blue-700">
                      {fmt(filteredTotals.etp_requis)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-bold ${
                          filteredTotals.ecart > 0
                            ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                            : filteredTotals.ecart < 0
                            ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                            : "bg-slate-100 text-slate-800 ring-1 ring-slate-200"
                        }`}
                      >
                        {filteredTotals.ecart > 0 ? "+" : ""}
                        {fmt(filteredTotals.ecart)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[12px] text-slate-700">
                      100%
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full w-full" />
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Modal Postes */}
      <Modal
        open={modalOpen}
        onClose={closePostsModal}
        title={modalCentre?.label || "Détail des postes"}
        subtitle="Répartition détaillée"
        actions={
          modalSimLoading && (
            <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              Calcul...
            </div>
          )
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un poste..."
                className="h-9 w-full rounded-lg border border-slate-300/80 bg-white/80 pl-8 pr-3 text-[13px] focus:ring-2 focus:ring-cyan-500/60"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                autoFocus
              />
            </div>
            <span className="text-[12px] text-slate-500 whitespace-nowrap">
              {modalRows.length} poste{modalRows.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="bg-white/60 rounded-xl border border-slate-200/80 overflow-hidden">
            <div className="grid grid-cols-6 gap-3 p-3 bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200 text-[12px] font-semibold text-slate-700">
              <span>Poste</span>
              <span className="text-center">Type</span>
              <span className="text-right">FTE Actuel</span>
              <span className="text-right">ETP Calculé</span>
              <span className="text-right">ETP Arrondi</span>
              <span className="text-right">Écart</span>
            </div>

            <div className="max-h-80 overflow-auto">
              {modalRows.map((poste) => (
                <div
                  key={poste.id}
                  className="grid grid-cols-6 gap-3 p-3 border-b border-slate-200/50 last:border-b-0 hover:bg-white/50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                      <Package className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <span className="font-medium text-slate-900 text-[13px]">
                      {poste.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-center">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        poste.type_poste === "MOI"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {poste.type_poste || "N/A"}
                    </span>
                  </div>

                  <div className="text-right text-slate-600 font-medium text-[13px]">
                    {fmt(poste.effectif_actuel)}
                  </div>

                  <div className="text-right text-blue-600 font-semibold text-[13px]">
                    {fmt(poste.etp_calcule)}
                  </div>

                  <div className="text-right text-slate-900 font-bold text-[13px]">
                    {fmt(poste.etp_arrondi)}
                  </div>

                  <div
                    className={`text-right font-bold text-[13px] ${
                      (poste.ecart ?? 0) > 0
                        ? "text-rose-600"
                        : (poste.ecart ?? 0) < 0
                        ? "text-emerald-600"
                        : "text-slate-600"
                    }`}
                  >
                    {poste.ecart > 0 ? "+" : ""}
                    {fmt(poste.ecart)}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-6 gap-3 p-3 bg-slate-50/80 border-t border-slate-200 text-[12px] font-bold text-slate-900">
              <span>Total</span>
              <span></span>
              <span className="text-right">{fmt(modalTotals.effectif)}</span>
              <span className="text-right text-blue-600">
                {fmt(modalTotals.etpCalcule)}
              </span>
              <span className="text-right">{fmt(modalTotals.etpArrondi)}</span>
              <span
                className={`text-right ${
                  modalTotals.ecart > 0
                    ? "text-rose-600"
                    : modalTotals.ecart < 0
                    ? "text-emerald-600"
                    : "text-slate-600"
                }`}
              >
                {modalTotals.ecart > 0 ? "+" : ""}
                {fmt(modalTotals.ecart)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Distribution */}
      <DistributionModal
        open={distributionModal.open}
        onClose={closeDistributionModal}
        data={distributionModal.data}
        title={distributionModal.title}
      />
    </div>
  );
}
