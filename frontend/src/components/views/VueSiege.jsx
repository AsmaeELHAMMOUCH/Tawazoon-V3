"use client";
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import {
  Search,
  Users,
  Calculator,
  CheckCircle2,
  Gauge,
  Minus,
  Info,
  BarChart3,
  Package,
} from "lucide-react";
import DistributionUnites from "../siege/DistributionUnites";
import AnalyseUniteTable from "../siege/AnalyseUniteTable";
import ConsolidePosteTable from "../siege/ConsolidePosteTable";

/* ===================== UTIL ===================== */
const cx = (...c) => c.filter(Boolean).join(" ");

/* ===================== UI / STYLES (PRO) ===================== */
const S = {
  page:
    "min-h-screen w-full max-w-none " +
    "bg-[radial-gradient(1200px_circle_at_10%_-10%,#E0F2FE,transparent_55%),radial-gradient(900px_circle_at_90%_0%,#EEF2FF,transparent_55%),linear-gradient(to_br,#F8FAFC,#F1F5F9)] " +
    "px-4 sm:px-6 lg:px-8 pb-8 pt-2",

  card:
    "relative w-full rounded-2xl border border-white/70 bg-white/70 backdrop-blur-xl " +
    "shadow-[0_10px_30px_-16px_rgba(2,6,23,0.35)] ring-1 ring-slate-200/60 overflow-hidden " +
    "transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_18px_50px_-20px_rgba(2,6,23,0.45)]",

  cardHeader:
    "px-5 sm:px-6 pt-4 pb-3 border-b border-slate-200/70 flex items-center justify-between bg-white/40",

  cardBody: "px-5 sm:px-6 pt-4 pb-5",

  select:
    "h-9 sm:h-10 rounded-xl border border-slate-300/80 bg-white px-3 text-[13px] sm:text-[14px] text-slate-800 " +
    "focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 shadow-sm",

  inputWrap: "relative",

  input:
    "h-9 sm:h-10 rounded-xl border border-slate-300/80 bg-white pl-9 pr-3 text-[13px] sm:text-[14px] text-slate-800 " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 shadow-sm",

  th: "px-4 py-2.5 text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider",

  pill: "px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200",

  tableBox:
    "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
};

/* ===================== CARD ===================== */
const Card = ({ title, subtitle, actions, children, className }) => (
  <section className={cx(S.card, className)}>
    <div className="pointer-events-none absolute -top-24 -right-24 h-60 w-60 rounded-full bg-sky-400/10 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-indigo-500/10 blur-3xl" />

    {(title || actions) && (
      <header className={S.cardHeader}>
        <div className="space-y-0.5">
          <h3 className="text-[15px] sm:text-[16px] font-extrabold text-slate-900 tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] sm:text-[12px] text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={S.cardBody}>{children}</div>
  </section>
);

/* ===================== BUTTON ===================== */
const Button = ({
  children,
  icon: Icon,
  variant = "primary",
  className,
  ...p
}) => {
  const base =
    "h-9 sm:h-10 px-3.5 rounded-xl font-semibold text-[12px] sm:text-[13px] inline-flex items-center gap-2 " +
    "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-50 disabled:cursor-not-allowed";
  const v = {
    primary:
      "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md " +
      "hover:shadow-lg hover:brightness-[1.03] active:scale-[0.98]",
    secondary:
      "bg-white border border-slate-300 text-slate-800 shadow-sm " +
      "hover:bg-slate-50 hover:border-slate-400",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  };
  return (
    <button {...p} className={cx(base, v[variant], className)}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

/* ========== Icône Excel ========== */
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

import { api } from "@/lib/api";

/* ===================== API FUNCTIONS ===================== */
const fetchAnalyseUnite = async () => {
  return await api.analyseUnite();
};

const fetchConsolideSiege = async () => {
  return await api.consolideSiege();
};

const fetchSiegePostes = async (uniteId) => {
  return await api.siegePostes(uniteId);
};

/* ===================== KPI TILE (PRO) ===================== */
const KPI_THEME = {
  corporate: {
    tint: "from-[#E6F0FA]/90 via-white/80 to-white/70",
    border: "border-[#C0D7EA]/80",
    accent: "bg-[#005EA8]",
  },
  analytic: {
    tint: "from-[#E0F7FF]/90 via-white/80 to-white/70",
    border: "border-[#B6E6F5]/80",
    accent: "bg-sky-500",
  },
  neutral: {
    tint: "from-slate-100/90 via-white/80 to-white/70",
    border: "border-slate-200/80",
    accent: "bg-slate-500",
  },
  emerald: {
    tint: "from-emerald-50/90 via-white/80 to-white/70",
    border: "border-emerald-100/80",
    accent: "bg-emerald-500",
  },
  amber: {
    tint: "from-amber-50/90 via-white/80 to-white/70",
    border: "border-amber-100/80",
    accent: "bg-amber-500",
  },
  rose: {
    tint: "from-rose-50/90 via-white/80 to-white/70",
    border: "border-rose-100/80",
    accent: "bg-rose-500",
  },
};

const KpiTile = ({
  title,
  value,
  note,
  icon: Icon,
  theme = "corporate",
  wrapperProps = {},
}) => {
  const t = KPI_THEME[theme] || KPI_THEME.corporate;
  return (
    <div
      {...wrapperProps}
      className={cx(
        "group relative rounded-2xl px-3.5 py-3 bg-gradient-to-br",
        t.tint,
        "border",
        t.border,
        "backdrop-blur-xl min-h-[86px] flex flex-col items-center justify-center text-center",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),_0_8px_22px_-12px_rgba(2,6,23,0.30)]",
        "hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),_0_12px_30px_-14px_rgba(2,6,23,0.40)] transition-all duration-300"
      )}
    >
      <div className="pointer-events-none absolute inset-x-2 top-2 h-7 rounded-xl bg-white/50 blur-md opacity-70" />
      {Icon && (
        <div
          className={cx(
            "relative z-10 mb-1.5 h-9 w-9 rounded-xl flex items-center justify-center ring-1 ring-white/70 shadow-inner",
            t.accent,
            "bg-opacity-25"
          )}
        >
          <Icon className="w-4 h-4 text-slate-900" />
        </div>
      )}
      <div className="text-[9.5px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-wider">
        {title}
      </div>
      <div className="text-[18px] sm:text-[20px] font-extrabold text-slate-900 leading-tight mt-0.5">
        {value}
      </div>
      {note && (
        <div className="mt-1 flex items-center gap-1.5 text-[9.5px] sm:text-[10px] text-slate-600">
          <span
            className={cx("inline-block w-1.5 h-1.5 rounded-full", t.accent)}
          />
          <span>{note}</span>
        </div>
      )}
    </div>
  );
};

/* ===================== INFO / TOGGLE ===================== */
const ToggleSwitch = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={cx(
      "relative inline-flex items-center h-5 w-9 rounded-full transition-colors duration-300 shadow-inner",
      checked ? "bg-sky-500" : "bg-slate-300"
    )}
  >
    <span
      className={cx(
        "inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300",
        checked ? "translate-x-4.5" : "translate-x-0.5"
      )}
    />
  </button>
);

const InfoBanner = () => (
  <div className="relative group">
    {/* Icône seule */}
    <div className="p-2 rounded-xl bg-sky-50 border border-sky-200/70 cursor-pointer">
      <Info className="w-4 h-4 text-sky-700" />
    </div>

    {/* Tooltip */}
    <div
      className="
        absolute right-0 mt-2 w-[320px] sm:w-[420px]
        opacity-0 group-hover:opacity-100 pointer-events-none 
        transition-opacity duration-200 z-20
        bg-white border border-sky-200 rounded-2xl shadow-xl p-4
      "
    >
      <div className="font-extrabold text-slate-900 text-[14px]">
        Lecture RH – Siège (MOI)
      </div>
      <div className="text-[12px] text-slate-600 mb-2">
        Objectif & mode de lecture
      </div>

      <ul className="list-disc pl-5 space-y-1 text-[12px] text-slate-700">
        <li>
          Cette vue présente uniquement <b>l'ETP actuel du siège</b>, basé sur
          les postes réellement occupés.
        </li>
        <li>
          Aucun besoin théorique n'est calculé pour la main d'œuvre indirecte.
          L'objectif est d'analyser <b>la répartition structurelle</b> des
          effectifs.
        </li>
      </ul>
    </div>
  </div>
);

/* ===================== MODAL (PRO) ===================== */
const Modal = ({ open, onClose, title, subtitle, actions, children }) => {
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
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white/95 backdrop-blur-xl rounded-2xl border border-white/70 shadow-2xl overflow-hidden">
        <header className="px-5 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-white to-slate-50/80">
          <div className="space-y-0.5">
            <h3 className="text-[16px] sm:text-[18px] font-extrabold text-slate-900 tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[12px] sm:text-[13px] text-slate-600">
                {subtitle}
              </p>
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
        <div className="p-4 sm:p-6 overflow-auto max-h-[calc(90vh-95px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ===================== HELPERS ===================== */
const fmt = (v) =>
  v === null || v === undefined
    ? "—"
    : Number.isFinite(v)
      ? v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
      : v;

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
  } else s = s.replace(/,/g, ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const getFteMoyenMeta = (fteMoyen, nbUnites) => {
  let theme = "emerald",
    label = "Structure équilibrée",
    detail =
      "Les unités ont une taille moyenne cohérente. Pas d'anomalie structurelle apparente.";
  if (fteMoyen >= 7 && fteMoyen <= 10) {
    theme = "amber";
    label = "Structure plutôt lourde";
    detail = "Certaines unités commencent à devenir 'gonflées'. À surveiller.";
  }
  if (fteMoyen > 10) {
    theme = "rose";
    label = "Structure très lourde";
    detail = "Le siège semble sur-staffé en moyenne. Probables doublons.";
  }
  return {
    theme,
    note:
      nbUnites > 5
        ? `Moyenne sur ${nbUnites} unités`
        : "Moyenne sur les unités du Siège",
    tooltip: `Interprétation: ${label}. ${detail}`,
  };
};

const getCategorieFromLabel = (label = "") => {
  const L = label.toUpperCase();
  if (L.startsWith("DIRECTION")) return "Direction";
  if (L.startsWith("DIVISION")) return "Division";
  if (L.startsWith("SERVICE")) return "Service";
  if (L.startsWith("POLE") || L.startsWith("PÔLE")) return "Pôle";
  return "Autre";
};

const normalizeSiege = (row) => {
  const r = lower(row);
  const id = r.id ?? r.siege_id ?? r.sid ?? Math.random();
  const label =
    r.label ?? r.libelle ?? r.name ?? r.siege_label ?? `Siège ${id}`;
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

  const categorie = getCategorieFromLabel(label);
  const ecart =
    etp_calcule != null && fte_actuel != null ? etp_calcule - fte_actuel : null;

  return { id, label, categorie, postes, fte_actuel, etp_calcule, ecart };
};

const normalizePoste = (row) => {
  const r = lower(row);
  const id = r.poste_id ?? r.id ?? r.pid ?? Math.random();
  const label =
    r.poste_label ?? r.label ?? r.libelle ?? r.name ?? `Poste ${id}`;
  const type_poste =
    (r.type_poste ?? r.type ?? r.typ ?? "").toString().toUpperCase() || "MOI";

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

  return { id, label, type_poste, effectif_actuel };
};

/* ===================== COMPOSANT VUE SIÈGE ===================== */
export default function VueSiege() {
  const [siegeData, setSiegeData] = useState([]);
  const [posteCache, setPosteCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [searchRaw, setSearchRaw] = useState("");
  const [search, setSearch] = useState("");
  const [categorieFilter, setCategorieFilter] = useState("tous");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchRaw), 180);
    return () => clearTimeout(t);
  }, [searchRaw]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSiege, setModalSiege] = useState(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [consLoading, setConsLoading] = useState(false);
  const [consolideRows, setConsolideRows] = useState([]);
  const [consolideTotals, setConsolideTotals] = useState({ etp_total: 0 });
  const [postTypeFilter, setPostTypeFilter] = useState("tous");
  const [showLectureRH, setShowLectureRH] = useState(true);

  const buildConsolide = async () => {
    setConsLoading(true);
    try {
      const data = await fetchConsolideSiege();
      setConsolideRows(data);
      setConsolideTotals({
        etp_total: data.reduce((s, r) => s + (r.etp_total || 0), 0),
      });
    } catch {
      const mock = [
        { key: "poste1", label: "Directeur", type_poste: "MOI", etp_total: 15 },
        {
          key: "poste2",
          label: "Chef de Division",
          type_poste: "MOI",
          etp_total: 25,
        },
        {
          key: "poste3",
          label: "Chef de Service",
          type_poste: "MOI",
          etp_total: 35,
        },
        { key: "poste4", label: "Assistant", type_poste: "MOI", etp_total: 20 },
        {
          key: "poste5",
          label: "Chargé de Mission",
          type_poste: "MOI",
          etp_total: 18,
        },
        {
          key: "poste6",
          label: "Gestionnaire",
          type_poste: "MOI",
          etp_total: 22,
        },
      ];
      setConsolideRows(mock);
      setConsolideTotals({
        etp_total: mock.reduce((s, r) => s + r.etp_total, 0),
      });
    } finally {
      setConsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchAnalyseUnite();
        const normalizedData = data.map((item) =>
          normalizeSiege({
            id: item.id,
            label: item.unite,
            postes: item.postes,
            fte_actuel: item.fte_actuel,
            etp_calcule: item.fte_calcule,
          })
        );
        setSiegeData(normalizedData);
        await buildConsolide();
      } catch (e) {
        setErr(e?.message || "Erreur lors du chargement des données siège");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const rowsSansTotal = useMemo(
    () => siegeData.filter((r) => (r.label || "").toUpperCase() !== "SIEGE"),
    [siegeData]
  );

  const kpis = useMemo(() => {
    const nbUnites = rowsSansTotal.length;
    const fteTotal = rowsSansTotal.reduce(
      (s, c) => s + (numOrNull(c.fte_actuel) ?? 0),
      0
    );
    const totalPostes = rowsSansTotal.reduce(
      (s, c) => s + (numOrNull(c.postes) ?? 0),
      0
    );
    const fteMoyen = nbUnites ? fteTotal / nbUnites : 0;
    return { nbUnites, fteTotal, totalPostes, fteMoyen };
  }, [rowsSansTotal]);

  const fteMoyenMeta = useMemo(
    () => getFteMoyenMeta(kpis.fteMoyen, kpis.nbUnites),
    [kpis.fteMoyen, kpis.nbUnites]
  );

  const statsParCategorie = useMemo(() => {
    const acc = {
      Direction: 0,
      Division: 0,
      Service: 0,
      Pôle: 0,
      Projet: 0,
      Autre: 0,
    };
    rowsSansTotal.forEach(
      (r) => (acc[r.categorie] = (acc[r.categorie] || 0) + 1)
    );
    return [
      { label: "Directions", valeur: acc.Direction },
      { label: "Divisions", valeur: acc.Division },
      { label: "Pôles", valeur: acc["Pôle"] },
      { label: "Services", valeur: acc.Service + acc.Autre },
    ];
  }, [rowsSansTotal]);

  const totalUnitesStats = useMemo(
    () => statsParCategorie.reduce((sum, s) => sum + s.valeur, 0),
    [statsParCategorie]
  );

  const [sort, setSort] = useState({ key: "label", dir: "asc" });
  const filteredSiege = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    let rows = rowsSansTotal;
    if (categorieFilter !== "tous")
      rows = rows.filter((r) => r.categorie === categorieFilter);
    if (q) rows = rows.filter((c) => (c.label || "").toLowerCase().includes(q));
    return rows;
  }, [search, rowsSansTotal, categorieFilter]);

  const sortedSiege = useMemo(() => {
    const rows = [...filteredSiege].map((c) => ({
      ...c,
      __fte: c.fte_actuel ?? null,
      __postes: numOrNull(c.postes) ?? 0,
    }));
    const dir = sort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const k = sort.key;
      const av =
        k === "fte" ? a.__fte : k === "postes" ? a.__postes : a.label ?? "";
      const bv =
        k === "fte" ? b.__fte : k === "postes" ? b.__postes : b.label ?? "";
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av > bv ? dir : av < bv ? -dir : 0;
    });
    return rows;
  }, [filteredSiege, sort]);

  const totalPages = Math.ceil(sortedSiege.length / rowsPerPage) || 1;
  const currentSiege = sortedSiege.slice(
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
      className="inline-flex items-center gap-1 hover:underline text-[11px] sm:text-[12px] font-bold text-slate-700 uppercase tracking-wide"
    >
      {children}
      {sort.key === col && (
        <span className="text-[10px]">{sort.dir === "asc" ? "▲" : "▼"}</span>
      )}
    </button>
  );

  const getTopPostesForUnite = (uniteLabel) => {
    const unite = siegeData.find(
      (u) => (u.label || "").trim() === (uniteLabel || "").trim()
    );
    if (!unite) return [];
    const postes = posteCache[unite.id] || [];
    return [...postes]
      .map((p) => ({ label: p.label, eff: numOrNull(p.effectif_actuel) ?? 0 }))
      .sort((a, b) => b.eff - a.eff)
      .slice(0, 3);
  };

  const top10Fte = useMemo(() => {
    const onlyUnites = [...rowsSansTotal].filter(
      (r) => r.categorie && r.categorie !== "Autre"
    );
    const map = new Map();
    onlyUnites.forEach((r) => {
      const label = (r.label || "").trim();
      if (!label) return;
      const fte = numOrNull(r.fte_actuel) ?? 0;
      map.set(label, (map.get(label) ?? 0) + fte);
    });

    return [...map.entries()]
      .map(([label, fte_actuel]) => ({
        label,
        fte_actuel,
        fte_safe: fte_actuel,
      }))
      .filter((r) => (r.fte_actuel ?? 0) > 0)
      .sort((a, b) => (b.fte_actuel ?? 0) - (a.fte_actuel ?? 0))
      .slice(0, 10);
  }, [rowsSansTotal]);

  const filteredConsolideRows = useMemo(() => {
    if (postTypeFilter === "tous") return consolideRows;
    const want = postTypeFilter.toUpperCase();
    return consolideRows.filter(
      (row) => (row.type_poste || "").toUpperCase() === want
    );
  }, [consolideRows, postTypeFilter]);

  const filteredTotals = useMemo(() => {
    if (postTypeFilter === "tous") return consolideTotals;
    return filteredConsolideRows.reduce(
      (acc, row) => ({ etp_total: acc.etp_total + row.etp_total }),
      { etp_total: 0 }
    );
  }, [filteredConsolideRows, postTypeFilter, consolideTotals]);

  const onExportConsolideExcel = () => {
    const rows = consolideRows.map((r) => ({
      Poste: r.label,
      "ETP total": r.etp_total,
      "% du total": consolideTotals.etp_total
        ? r.etp_total / consolideTotals.etp_total
        : 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consolide");
    XLSX.writeFile(wb, "consolide_siege.xlsx");
  };

  const onExportExcel = () => {
    const rows = sortedSiege.map((c) => ({
      Unite: c.label,
      Categorie: c.categorie,
      Postes: c.postes ?? "",
      "FTE (actuel)": c.fte_actuel,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siege");
    XLSX.writeFile(wb, "resultats_siege.xlsx");
  };

  const openPostsModal = async (siege) => {
    setModalSiege(siege);
    setModalSearch("");
    setModalOpen(true);
    setModalLoading(true);
    try {
      const postesData = await fetchSiegePostes(siege.id);
      setPosteCache((m) => ({
        ...m,
        [siege.id]: postesData.map(normalizePoste),
      }));
    } catch {
      const mockPostes = [
        {
          id: 1,
          label: "Responsable Administratif",
          type_poste: "MOI",
          effectif_actuel: 1,
          etp_calcule: 1,
          etp_arrondi: 1,
        },
        {
          id: 2,
          label: "Assistant",
          type_poste: "MOI",
          effectif_actuel: 1,
          etp_calcule: 1.2,
          etp_arrondi: 1,
        },
      ];
      setPosteCache((m) => ({
        ...m,
        [siege.id]: mockPostes.map(normalizePoste),
      }));
    } finally {
      setModalLoading(false);
    }
  };

  const closePostsModal = () => {
    setModalOpen(false);
    setModalSiege(null);
    setModalSearch("");
  };

  const modalRows = useMemo(() => {
    const list = modalSiege ? posteCache[modalSiege.id] || [] : [];
    const q = (modalSearch || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        (p.label || "").toLowerCase().includes(q) ||
        (p.type_poste || "").toLowerCase().includes(q)
    );
  }, [modalSiege, posteCache, modalSearch]);

  const modalTotals = useMemo(() => {
    const acc = { effectif: 0, etpArrondi: 0 };
    modalRows.forEach((p) => {
      const eff = p.effectif_actuel ?? 0;
      const arr = p.etp_arrondi ?? p.etp_calcule ?? 0;
      acc.effectif += eff;
      acc.etpArrondi += arr;
    });
    return acc;
  }, [modalRows]);

  const pagesToShow = useMemo(() => {
    const max = 5;
    if (totalPages <= max)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + max - 1);
    const realStart = Math.max(1, end - max + 1);
    return Array.from({ length: end - realStart + 1 }, (_, i) => realStart + i);
  }, [totalPages, currentPage]);
  const PAGE_SCALE = 0.8; //

  /* ===================== RENDER ===================== */
  return (
    <div className={S.page}>
      {/* ✅ DEZOOM GLOBAL SANS DÉCALAGE */}
      <div
        className="w-full space-y-4"
        style={{
          zoom: PAGE_SCALE, // ✅ réduit tout sans casser les largeurs
        }}
      >
        {err && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {err}
          </div>
        )}

        <Card
          title="Indicateurs RH - Siège (MOI)"
          subtitle="Synthèse des effectifs actuels"
          actions={
            <InfoBanner
              open={showLectureRH}
              onToggle={() => setShowLectureRH((v) => !v)}
            />
          }
        >
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 sm:col-span-6 xl:col-span-3">
              <KpiTile
                title="Nombre d'unités Siège"
                value={fmt(kpis.nbUnites)}
                note="Structure siège"
                icon={Users}
              />
            </div>
            <div className="col-span-12 sm:col-span-6 xl:col-span-3">
              <KpiTile
                title="Nombre de métiers"
                value={fmt(kpis.totalPostes)}
                note="Nb postes"
                icon={CheckCircle2}
                theme="analytic"
              />
            </div>
            <div className="col-span-12 sm:col-span-6 xl:col-span-3">
              <KpiTile
                title="ETP actuel (Siège)"
                value={fmt(kpis.fteTotal)}
                note="Total ETP actuel"
                icon={Calculator}
                theme="neutral"
              />
            </div>
            <div className="col-span-12 sm:col-span-6 xl:col-span-3">
              <KpiTile
                title="ETP moyen / unité"
                value={fmt(kpis.fteMoyen)}
                note={fteMoyenMeta.note}
                icon={Gauge}
                theme={fteMoyenMeta.theme}
                wrapperProps={{ title: fteMoyenMeta.tooltip }}
              />
            </div>
          </div>
        </Card>

        {/* 2 grosses cartes en 12 colonnes */}
        <DistributionUnites
          Card={Card}
          cx={cx}
          fmt={fmt}
          statsParCategorie={statsParCategorie}
          totalUnitesStats={totalUnitesStats}
          top10Fte={top10Fte}
          getTopPostesForUnite={getTopPostesForUnite}
        />

        {/* Table Analyse */}
        <AnalyseUniteTable
          Card={Card}
          Button={Button}
          S={S}
          cx={cx}
          HeaderSort={HeaderSort}
          sortedSiege={sortedSiege}
          currentSiege={currentSiege}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          totalPages={totalPages}
          pagesToShow={pagesToShow}
          categorieFilter={categorieFilter}
          setCategorieFilter={setCategorieFilter}
          searchRaw={searchRaw}
          setSearchRaw={setSearchRaw}
          setCurrentPage={setCurrentPage}
          openPostsModal={openPostsModal}
          fmt={fmt}
          onExportExcel={onExportExcel}
          loading={loading}
        />

        {/* Consolidé */}
        <ConsolidePosteTable
          Card={Card}
          Button={Button}
          S={S}
          cx={cx}
          fmt={fmt}
          postTypeFilter={postTypeFilter}
          setPostTypeFilter={setPostTypeFilter}
          buildConsolide={buildConsolide}
          consLoading={consLoading}
          consolideRows={consolideRows}
          consolideTotals={consolideTotals}
          ExcelIcon={ExcelIcon}
          onExportConsolideExcelProp={onExportConsolideExcel}
        />
      </div>

      {/* Modal Postes */}
      <Modal
        open={modalOpen}
        onClose={closePostsModal}
        title={modalSiege?.label || "Détail des postes"}
        subtitle="Répartition détaillée par type de poste (MOI)"
        actions={
          modalLoading && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Chargement...
            </div>
          )
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un poste..."
                className={cx(S.input, "w-full")}
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                autoFocus
              />
            </div>
            <span className="text-[12px] text-slate-500 whitespace-nowrap">
              {modalRows.length} poste{modalRows.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 border-b border-slate-200 text-[12px] font-bold text-slate-700">
              <span>Poste</span>
              <span className="text-center">Type</span>
              <span className="text-right">FTE Actuel</span>
              <span className="text-right">ETP Arrondi</span>
            </div>

            <div className="max-h-80 overflow-auto">
              {modalRows.map((poste) => (
                <div
                  key={poste.id}
                  className="grid grid-cols-4 gap-3 p-3 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-slate-200 transition-colors">
                      <Package className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="font-semibold text-slate-900 text-[13px] sm:text-[14px]">
                      {poste.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                      {poste.type_poste || "N/A"}
                    </span>
                  </div>

                  <div className="text-right text-slate-700 font-semibold text-[13px] sm:text-[14px]">
                    {fmt(poste.effectif_actuel)}
                  </div>

                  <div className="text-right text-slate-900 font-extrabold text-[13px] sm:text-[14px]">
                    {fmt(poste.etp_arrondi ?? poste.etp_calcule)}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 border-t border-slate-200 text-[13px] sm:text-[14px] font-extrabold text-slate-900">
              <span>Total</span>
              <span />
              <span className="text-right">{fmt(modalTotals.effectif)}</span>
              <span className="text-right">{fmt(modalTotals.etpArrondi)}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
