"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  MapPin,
  Building,
  Tag,
  Package,
  Mail,
  Gauge,
  Clock,
  Play,
  AlertCircle,
  UserRound,
  Calculator,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

/* ===================== Helpers ===================== */
const sanitize = (val) =>
  String(val ?? "")
    .replace(/\s|[\u00A0\u202F]/g, "")
    .replace(/[^0-9.,-]/g, "")
    .replace(/[,]/g, ".");

const parseNonNeg = (val) => {
  const s = sanitize(val);
  if (s === "") return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const toInput = (v) =>
  v === 0 || v === null || v === undefined ? "" : String(v);

const monthly = (v) => {
  const n = typeof v === "number" ? v : parseNonNeg(v);
  return n === undefined ? undefined : n / 12;
};

const formatInt = (n) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));

const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return "0.00";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(decimals).replace(".", ",");
};

const formatSmallNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return "0,00";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num)) return "0,00";
  return num.toFixed(decimals).replace(".", ",");
};

/** ✅ Utilisé maintenant pour activer/désactiver les champs */
const getEffectiveFluxMode = (categorie, key) => {
  const cat = String(categorie || "").trim().toUpperCase();
  if (cat === "CM") {
   return key === "amana" ? "input" : "na";
  }
  if (cat === "CTD - CENTRE DE TRAITEMENT ET DISTRIBUTION") return "input";
  if (cat === "CD") return "input";
  if (cat === "AM- AGENCE MESSAGERIE") {
    return key === "amana" ? "input" : "na";
  }
  if (key === "amana") return "input";
  return "na";
};

/* ===================== Compact mode ===================== */
const COMPACT = true;
const UI = {
  cardPad: COMPACT ? "p-4" : "p-5",
  cardTitle: COMPACT ? "text-base" : "text-lg",
  cardSubtitle: COMPACT ? "text-xs" : "text-sm",
  fieldLabel: COMPACT ? "text-xs" : "text-sm",
  fieldIcon: COMPACT ? 14 : 16,
  inputText: COMPACT ? "text-xs" : "sm:text-sm",
  inputPad: COMPACT ? "p-1.5" : "p-2",
  inputH: COMPACT ? "h-8" : "h-9",
  selectText: COMPACT ? "text-xs" : "sm:text-sm",
  selectPad: COMPACT ? "p-1.5" : "p-2",
  selectH: COMPACT ? "h-8" : "h-9",
  gridGap: COMPACT ? "gap-3" : "gap-4",
};

/* ===================== Group posts ===================== */
const groupPostsByMainPost = (postes) => {
  const grouped = {};
  postes.forEach((poste) => {
    const mainPost =
      poste.intitule_rh || poste.poste_principal || poste.poste_label;

    if (!grouped[mainPost]) {
      grouped[mainPost] = {
        mainPost,
        equivalents: [],
        totalEffectifActuel: 0,
        totalETPCalcule: 0,
        totalETPArrondi: 0,
        totalHeures: 0,
        totalEcart: 0,
      };
    }

    const equivalentLabel =
      poste.poste_label !== mainPost ? poste.poste_label : mainPost;

    grouped[mainPost].equivalents.push({
      equivalent: equivalentLabel,
      effectif_actuel: poste.effectif_actuel || 0,
      etp_calcule: poste.etp_calcule || 0,
      etp_arrondi: poste.etp_arrondi || 0,
      ecart: poste.ecart || 0,
      total_heures: poste.total_heures || 0,
      type_poste: poste.type_poste || "MOD",
      intitule_rh: poste.intitule_rh,
    });

    grouped[mainPost].totalEffectifActuel += poste.effectif_actuel || 0;
    grouped[mainPost].totalETPCalcule += poste.etp_calcule || 0;
    grouped[mainPost].totalETPArrondi += poste.etp_arrondi || 0;
    grouped[mainPost].totalHeures += poste.total_heures || 0;
    grouped[mainPost].totalEcart += poste.ecart || 0;
  });

  return Object.values(grouped);
};

/* ===================== UI ===================== */
const Card = ({ title, subtitle, className = "", children }) => (
  <div
    className={`bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 
    shadow-[0_10px_40px_-10px_rgba(2,6,23,0.18)] ${UI.cardPad} mb-5 ${className}`}
  >
    {title && (
      <h3 className={`${UI.cardTitle} font-semibold text-slate-800 mb-2`}>
        {title}
      </h3>
    )}
    {subtitle && (
      <p className={`${UI.cardSubtitle} text-slate-600 mb-3`}>{subtitle}</p>
    )}
    {children}
  </div>
);

const Field = ({ label, icon: Icon, children }) => (
  <div>
    <label
      className={`flex items-center gap-1.5 ${UI.fieldLabel} font-medium text-slate-700 mb-1`}
    >
      {Icon && <Icon size={UI.fieldIcon} />}
      {label}
    </label>
    {children}
  </div>
);

const Input = ({
  type,
  value,
  onChange,
  min,
  max,
  className = "",
  ...props
}) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    min={min}
    max={max}
    className={`mt-1 block w-full rounded-lg border border-white/40 bg-white/60 
    backdrop-blur-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 
    ${UI.inputText} ${UI.inputPad} ${UI.inputH} ${className}`}
    {...props}
  />
);

const Select = ({ value, onChange, children, className = "" }) => (
  <select
    value={value}
    onChange={onChange}
    className={`mt-1 block w-full rounded-lg border border-white/40 bg-white/60
    backdrop-blur-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500
    ${UI.selectText} ${UI.selectPad} ${UI.selectH} ${className}`}
  >
    {children}
  </select>
);

/* ===================== KPI ===================== */
const KPICardGlass = ({
  label,
  value,
  icon: Icon,
  tone = "cyan",
  emphasize = false,
  footer,
}) => {
  const T = {
    cyan: {
      ring: "ring-cyan-300/60",
      halo: "from-cyan-400/25",
      text: "text-cyan-600",
      dot: "bg-cyan-500",
    },
    amber: {
      ring: "ring-amber-300/60",
      halo: "from-amber-400/25",
      text: "text-amber-600",
      dot: "bg-amber-500",
    },
    green: {
      ring: "ring-emerald-300/60",
      halo: "from-emerald-400/25",
      text: "text-emerald-600",
      dot: "bg-emerald-500",
    },
    slate: {
      ring: "ring-slate-300/60",
      halo: "from-slate-400/20",
      text: "text-slate-700",
      dot: "bg-slate-500",
    },
    red: {
      ring: "ring-rose-300/60",
      halo: "from-rose-400/25",
      text: "text-rose-600",
      dot: "bg-rose-500",
    },
  }[tone];

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border border-white/50 bg-white/55 backdrop-blur-xl",
        COMPACT ? "p-3" : "p-4",
        "ring-1",
        T.ring,
        "shadow-[0_18px_55px_-18px_rgba(2,6,23,0.20)] transition-all duration-300",
      ].join(" ")}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full blur-2xl bg-gradient-to-br ${T.halo} to-transparent`}
      />
      {Icon && (
        <Icon
          aria-hidden
          className={`pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 
          ${COMPACT ? "w-20 h-20" : "w-24 h-24"} opacity-15 text-slate-700`}
        />
      )}

      <div className="text-[11px] font-medium text-slate-600">{label}</div>
      <div
        className={`mt-1 ${
          emphasize
            ? COMPACT
              ? "text-[24px]"
              : "text-[30px]"
            : COMPACT
            ? "text-[22px]"
            : "text-[26px]"
        } font-extrabold tracking-tight text-slate-900`}
      >
        <span className={emphasize ? T.text : ""}>
          {typeof value === "number"
            ? value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
            : value}
        </span>
      </div>

      <div className="mt-2.5 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      {footer && (
        <div className="mt-2.5 inline-flex items-center gap-2 text-[11px] text-slate-600">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${T.dot}`} />
          {footer}
        </div>
      )}
    </div>
  );
};

/* ===================== Composant principal ===================== */
export default function VueCentre({
  regions = [],
  centres = [],
  loading = {},
  centreCategorie = "",
  region,
  setRegion = () => {},
  centre,
  setCentre = () => {},
  sacs = 0,
  setSacs = () => {},
  colis = 0,
  setColis = () => {},
  scelle = 0,
  setScelle = () => {},
  productivite = 100,
  setProductivite = () => {},
  heuresNet = 0, // (non utilisé directement, on calcule heuresNetCalcule)
  cOrd = 0,
  setCOrd = () => {},
  cReco = 0,
  setCReco = () => {},
  eBarkia = 0,
  setEBarkia = () => {},
  lrh = 0,
  setLrh = () => {},
  amana = 0,
  setAmana = () => {},
  apiBaseUrl = "http://localhost:8000/api",
}) {
  const [resultats, setResultats] = useState(null);
  const [loadingSimu, setLoadingSimu] = useState(false);
  const [error, setError] = useState("");

  const [partParticuliers, setPartParticuliers] = useState(75);
  const partProfessionnels = 100 - partParticuliers;

  const [colisAmanaParSac, setColisAmanaParSac] = useState(5);
  const [courriersParSac, setCourriersParSac] = useState(4500);

  // ✅ centre peut être un id OU un objet
  const centreId = useMemo(() => {
    if (!centre) return null;
    if (typeof centre === "object") {
      return Number(centre.id ?? centre.value ?? centre.code ?? 0) || null;
    }
    return Number(centre) || null;
  }, [centre]);

  const centreObj = useMemo(() => {
    if (!centre) return null;
    if (typeof centre === "object") return centre;
    return (
      centres.find((c) => String(c.id ?? c.value ?? c.code) === String(centre)) ||
      null
    );
  }, [centre, centres]);

  const effectiveCentreCategorie =
    centreCategorie ||
    centreObj?.categorie ||
    centreObj?.category ||
    centreObj?.categorie_label ||
    "";

  const splitFlux = (total) => {
    const v = Number(total ?? 0);
    const ratioPart = partParticuliers / 100;
    const ratioProf = 1 - ratioPart;
    return { part: v * ratioPart, prof: v * ratioProf };
  };

  const heuresNetCalcule = useMemo(() => {
    const base = 8.0;
    const p = Number(productivite ?? 100);
    if (p > 0) return base * (p / 100);
    return base;
  }, [productivite]);

  const [annualInputs, setAnnualInputs] = useState({
    cOrd: toInput(cOrd),
    cReco: toInput(cReco),
    eBarkia: toInput(eBarkia),
    lrh: toInput(lrh),
    amana: toInput(amana),
  });

  const [annualParsed, setAnnualParsed] = useState({
    cOrd: parseNonNeg(cOrd) ?? 0,
    cReco: parseNonNeg(cReco) ?? 0,
    eBarkia: parseNonNeg(eBarkia) ?? 0,
    lrh: parseNonNeg(lrh) ?? 0,
    amana: parseNonNeg(amana) ?? 0,
  });

  useEffect(() => {
    setResultats(null);
    setError("");
    setAnnualInputs({
      cOrd: toInput(cOrd),
      cReco: toInput(cReco),
      eBarkia: toInput(eBarkia),
      lrh: toInput(lrh),
      amana: toInput(amana),
    });
    setAnnualParsed({
      cOrd: parseNonNeg(cOrd) ?? 0,
      cReco: parseNonNeg(cReco) ?? 0,
      eBarkia: parseNonNeg(eBarkia) ?? 0,
      lrh: parseNonNeg(lrh) ?? 0,
      amana: parseNonNeg(amana) ?? 0,
    });
  }, [centre, cOrd, cReco, eBarkia, lrh, amana]);

  const handleAnnualChange = useCallback(
    (key) => (e) => setAnnualInputs((p) => ({ ...p, [key]: e.target.value })),
    []
  );

  const handleAnnualBlur = useCallback(
    (key, setter) => (e) => {
      const n = parseNonNeg(e.target.value);
      if (n === undefined)
        return setAnnualInputs((p) => ({ ...p, [key]: "" }));
      setter(n);
      setAnnualParsed((p) => ({ ...p, [key]: n }));
    },
    []
  );

  // 🔧 FIX: garder les décimales sur le /mois (comme VueIntervenant)
  const renderMonthlyHint = useCallback((raw, lastValid) => {
    const live = monthly(raw);
    const m = live === undefined ? monthly(lastValid) : live;
    const val = m ?? 0;
    return (
      <div className="text-[10px] text-slate-500 mt-1 min-h-[1rem]">
        ≈ {formatNumber(val, 2)} / mois
      </div>
    );
  }, []);

  /* ===================== SIMULER (API POST) ===================== */
  const handleSimuler = useCallback(async () => {
    if (!centreId) {
      setError("Veuillez sélectionner un centre");
      return;
    }

    try {
      setError("");
      setLoadingSimu(true);

      const allowedAnnual = (fieldKey, value) => {
        const mode = getEffectiveFluxMode(effectiveCentreCategorie, fieldKey);
        return mode === "input" ? Number(value || 0) : 0;
      };

      const body = {
        centre_id: Number(centreId),
        productivite: Number(productivite || 100),
        heures_net: Number(heuresNetCalcule || 8),

        volumes: {
          sacs: Number(sacs || 0),
          colis: Number(colis || 0),
          scelle: Number(scelle || 0),
          colis_amana_par_sac: Number(colisAmanaParSac || 5),
          courriers_par_sac: Number(courriersParSac || 4500),
        },

        volumes_annuels: {
          courrier_ordinaire: allowedAnnual("cOrd", annualParsed.cOrd),
          courrier_recommande: allowedAnnual("cReco", annualParsed.cReco),
          ebarkia: allowedAnnual("eBarkia", annualParsed.eBarkia),
          lrh: allowedAnnual("lrh", annualParsed.lrh),
          amana: allowedAnnual("amana", annualParsed.amana),
        },
      };

      const res = await fetch(`${apiBaseUrl}/vue-centre-optimisee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const data = await res.json();

      // Log côté front : détails des tâches calculées
      const detailsLog = data.details_taches || [];
      if (Array.isArray(detailsLog) && detailsLog.length > 0) {
        console.groupCollapsed("VueCentre - Tâches calculées");
        detailsLog.forEach((d, idx) => {
          console.log(
            `#${idx + 1} | ${d.task || d.tache_label || "N/A"} | unit=${d.unit || d.unite || "N/A"} | vol_jour=${d.nombre_unite ?? d.volume_jour ?? "?"} | heures=${d.heures ?? "?"}`
          );
        });
        console.groupEnd();
      }

      setResultats({
        centre_id: data.centre_id,
        centre_label: data.centre_label,
        heures_net: Number(
          data.heures_net || data.heures_net_jour || heuresNetCalcule || 8
        ),
        total_heures: Number(data.total_heures || 0),
        total_effectif_actuel: Number(data.total_effectif_actuel || 0),
        total_etp_calcule: Number(
          data.total_etp_calcule || data.fte_calcule || 0
        ),
        total_etp_arrondi: Number(
          data.total_etp_arrondi || data.fte_arrondi || 0
        ),
        total_ecart: Number(data.total_ecart || 0),
        postes: data.postes || [],
        details_taches: data.details_taches || [],
      });
    } catch (e) {
      console.error("💥 Erreur générale:", e);
      setError("Impossible de calculer les effectifs. Vérifiez l’API.");
    } finally {
      setLoadingSimu(false);
    }
  }, [
    centreId,
    sacs,
    colis,
    scelle,
    annualParsed,
    productivite,
    heuresNetCalcule,
    colisAmanaParSac,
    courriersParSac,
    apiBaseUrl,
    effectiveCentreCategorie,
  ]);

  /* ✅ OPTION export si tu gardes un GET backend */
  const handleExportCSV = useCallback(() => {
    if (!centreId) return;

    const allowedAnnual = (fieldKey, value) => {
      const mode = getEffectiveFluxMode(effectiveCentreCategorie, fieldKey);
      return mode === "input" ? Number(value || 0) : 0;
    };

    const params = new URLSearchParams({
      centre_id: String(centreId),
      sacs: String(Number(sacs || 0)),
      colis: String(Number(colis || 0)),
      scelle: String(Number(scelle || 0)),
      courrier_ordinaire: String(allowedAnnual("cOrd", annualParsed.cOrd)),
      courrier_recommande: String(allowedAnnual("cReco", annualParsed.cReco)),
      ebarkia: String(allowedAnnual("eBarkia", annualParsed.eBarkia)),
      lrh: String(allowedAnnual("lrh", annualParsed.lrh)),
      amana: String(allowedAnnual("amana", annualParsed.amana)),
      colis_amana_par_sac: String(Number(colisAmanaParSac || 5)),
      courriers_par_sac: String(Number(courriersParSac || 4500)),
      productivite: String(productivite || 100),
      heures_net: String(heuresNetCalcule || 8),
    });

    window.open(
      `${apiBaseUrl}/vue-centre-optimisee/export?${params.toString()}`,
      "_blank"
    );
  }, [
    centreId,
    sacs,
    colis,
    scelle,
    annualParsed,
    colisAmanaParSac,
    courriersParSac,
    apiBaseUrl,
    productivite,
    heuresNetCalcule,
    effectiveCentreCategorie,
  ]);

  /* ===== Tables MOD / MOI + Totaux ===== */
  const { rowsMOD, rowsMOI, totalsMOD, totalsMOI } = useMemo(() => {
    if (!resultats?.postes)
      return {
        rowsMOD: [],
        rowsMOI: [],
        totalsMOD: {},
        totalsMOI: {},
      };

    const MOD = [];
    const MOI = [];
    let totalEffectifMOD = 0;
    let totalETPCalculeMOD = 0;
    let totalHeuresMOD = 0;
    let totalEffectifMOI = 0;
    let totalHeuresMOI = 0;

    resultats.postes.forEach((poste) => {
      const posteData = {
        ...poste,
        intitule_rh: poste.intitule_rh || poste.poste_label,
      };

      if ((poste.type_poste || "").toUpperCase() === "MOI") {
        MOI.push(posteData);
        totalEffectifMOI += poste.effectif_actuel || 0;
        totalHeuresMOI += poste.total_heures || 0;
      } else {
        MOD.push(posteData);
        totalEffectifMOD += poste.effectif_actuel || 0;
        totalETPCalculeMOD += poste.etp_calcule || 0;
        totalHeuresMOD += poste.total_heures || 0;
      }
    });

    const etpArrondiMOD = Math.ceil(totalETPCalculeMOD || 0);

    return {
      rowsMOD: MOD,
      rowsMOI: MOI,
      totalsMOD: {
        effectif: totalEffectifMOD,
        etpCalcule: totalETPCalculeMOD,
        etpArrondi: etpArrondiMOD, // ✅ arrondi sur total MOD
        ecart: etpArrondiMOD - totalEffectifMOD,
        heures: totalHeuresMOD,
      },
      totalsMOI: {
        effectif: totalEffectifMOI,
        heures: totalHeuresMOI,
      },
    };
  }, [resultats]);

  /* ===================== KPI FIX ===================== 
     ✅ KPI alignés avec le tableau MOD (même périmètre)
  */
  const kpi = useMemo(() => {
    const eff = totalsMOD.effectif ?? 0;
    const etpCalc = totalsMOD.etpCalcule ?? 0;
    const etpArr = totalsMOD.etpArrondi ?? Math.ceil(etpCalc || 0);
    const ecart = totalsMOD.ecart ?? etpArr - eff;
    return { eff, etpCalc, etpArr, ecart };
  }, [totalsMOD]);

  const Table = ({
    rows,
    showCalc = false,
    showHours = true,
    totals = null,
    emptyLabel = "Aucune donnée",
  }) => {
    const groupedRows = groupPostsByMainPost(rows);

    return (
      <div className="overflow-auto rounded-2xl border border-white/50 bg-white/60 backdrop-blur shadow-[0_10px_30px_-10px_rgba(2,6,23,0.15)]">
        <table className="min-w-full text-xs">
          <thead className="bg-white/70">
            <tr className="text-left">
              <th className="px-2.5 py-1.5">Poste</th>
              <th className="px-2.5 py-1.5 text-center">Équivalent</th>
              <th className="px-2.5 py-1.5 text-center">Type</th>
              <th className="px-2.5 py-1.5 text-right">Effectif actuel</th>
              {showCalc && (
                <>
                  <th className="px-2.5 py-1.5 text-right">ETP calculé</th>
                  <th className="px-2.5 py-1.5 text-right">ETP arrondi</th>
                  <th className="px-2.5 py-1.5 text-right">Écart</th>
                </>
              )}
              {showHours && (
                <th className="px-2.5 py-1.5 text-right">Total heures</th>
              )}
            </tr>
          </thead>
          <tbody>
            {groupedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={showCalc ? (showHours ? 8 : 7) : showHours ? 5 : 4}
                  className="px-2.5 py-6 text-center text-slate-500"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              groupedRows.map((group) =>
                group.equivalents.map((equivalent, eqIndex) => (
                  <tr
                    key={`${group.mainPost}-${eqIndex}`}
                    className="border-t border-white/70 hover:bg-white/70"
                  >
                    {eqIndex === 0 ? (
                      <td
                        rowSpan={group.equivalents.length}
                        className="px-2.5 py-1.5 font-bold text-slate-800 bg-slate-50/50 align-top"
                      >
                        {group.mainPost}
                      </td>
                    ) : null}

                    <td className="px-2.5 py-1.5 font-medium text-slate-700">
                      {equivalent.equivalent}
                    </td>

                    <td className="px-2.5 py-1.5 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          (equivalent.type_poste || "").toUpperCase() === "MOD"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-fuchsia-100 text-fuchsia-800"
                        }`}
                      >
                        {equivalent.type_poste || "MOD"}
                      </span>
                    </td>

                    <td className="px-2.5 py-1.5 text-right">
                      {equivalent.effectif_actuel}
                    </td>

                    {showCalc && (
                      <>
                        <td className="px-2.5 py-1.5 text-right font-semibold text-sky-600">
                          {formatSmallNumber(equivalent.etp_calcule)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-bold">
                          {equivalent.etp_arrondi}
                        </td>
                        <td
                          className={`px-2.5 py-1.5 text-right font-bold ${
                            equivalent.ecart > 0
                              ? "text-rose-600"
                              : equivalent.ecart < 0
                              ? "text-emerald-600"
                              : "text-slate-600"
                          }`}
                        >
                          {equivalent.ecart > 0 ? "+" : ""}
                          {equivalent.ecart}
                        </td>
                      </>
                    )}

                    {showHours && (
                      <td className="px-2.5 py-1.5 text-right text-slate-600">
                        {formatNumber(equivalent.total_heures)}
                      </td>
                    )}
                  </tr>
                ))
              )
            )}

            {totals && groupedRows.length > 0 && (
              <tr className="border-t-2 border-white bg-white/80 font-bold">
                <td className="px-2.5 py-1.5" colSpan={3}>
                  TOTAL
                </td>
                <td className="px-2.5 py-1.5 text-right">{totals.effectif}</td>
                {showCalc && (
                  <>
                    <td className="px-2.5 py-1.5 text-right text-sky-600">
                      {formatSmallNumber(totals.etpCalcule)}
                    </td>
                    <td className="px-2.5 py-1.5 text-right">
                      {totals.etpArrondi}
                    </td>
                    <td
                      className={`px-2.5 py-1.5 text-right ${
                        totals.ecart > 0
                          ? "text-rose-600"
                          : totals.ecart < 0
                          ? "text-emerald-600"
                          : "text-slate-600"
                      }`}
                    >
                      {totals.ecart > 0 ? "+" : ""}
                      {totals.ecart}
                    </td>
                  </>
                )}
                {showHours && (
                  <td className="px-2.5 py-1.5 text-right font-bold">
                    {formatNumber(totals.heures)}
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  /* ===================== Rendu ===================== */
  return (
    <>
      {/* Paramètres principaux */}
      <Card title="Paramètres principaux">
        <div
          className={`grid ${UI.gridGap} grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`}
        >
          <Field label="Région" icon={MapPin}>
            <Select
              value={region ?? ""}
              onChange={(e) => setRegion(e.target.value || null)}
            >
              <option value="">Toutes</option>
              {regions.map((r) => (
                <option
                  key={r.value ?? r.id ?? r.code}
                  value={r.value ?? r.id ?? r.code}
                >
                  {r.label ?? r.name ?? r.libelle ?? r.code}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Centre" icon={Building}>
            <Select
              value={centre ?? ""}
              onChange={(e) => setCentre(e.target.value || null)}
            >
              <option value="">
                {loading.centres ? "Chargement..." : "Sélectionner"}
              </option>
              {centres.map((c) => (
                <option
                  key={c.value ?? c.id ?? c.code}
                  value={c.value ?? c.id ?? c.code}
                >
                  {c.label ?? c.name ?? c.libelle ?? c.code}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Catégorie" icon={Tag}>
            <Input
              type="text"
              value={effectiveCentreCategorie || ""}
              readOnly
              disabled
            />
          </Field>
        </div>
      </Card>

      {/* Productivité */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">
              Paramètres de Productivité
            </span>
          </div>
        }
      >
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${UI.gridGap} p-3`}
        >
          <Field label="Productivité (%)" icon={Gauge}>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={200}
                value={toInput(productivite)}
                placeholder="100"
                onChange={(e) =>
                  setProductivite(parseNonNeg(e.target.value) ?? 100)
                }
                className="pr-8 text-center"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                %
              </span>
            </div>
          </Field>

          <Field label="Heures net / Jour" icon={Clock}>
            <Input
              type="text"
              readOnly
              disabled
              value={heuresNetCalcule.toFixed(2).replace(".", ",")}
              className="bg-slate-50 border-slate-200 text-center cursor-not-allowed"
              title="Calculé automatiquement à partir de la productivité"
            />
          </Field>

          <div className="lg:col-span-2">
            <div className={`grid grid-cols-2 ${UI.gridGap}`}>
              <div className="flex items-end gap-2">
                <button
                  disabled={!centreId || loadingSimu}
                  onClick={handleSimuler}
                  className="w-full h-9 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium text-xs transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5" />
                  {loadingSimu ? "Calcul..." : "Simuler"}
                </button>

                <button
                  disabled={!centreId}
                  onClick={handleExportCSV}
                  className="hidden md:inline-flex h-9 px-3 items-center justify-center gap-2 border border-cyan-200 text-cyan-700 bg-white rounded-lg text-xs font-medium hover:bg-cyan-50 disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-2 flex items-center gap-2 text-xs text-rose-600">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}
      </Card>

      {/* Paramètres de volume */}
      <Card title="Paramètres de volume">
        <div className="px-2 pb-2 space-y-3">
          {/* Ratios dynamiques */}
          <div className="border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${UI.gridGap}`}>
              <Field
                label={
                  <span className="text-[11px] font-semibold text-slate-700">
                    Colis AMANA par sac
                  </span>
                }
                icon={Package}
              >
                <Input
                  type="number"
                  min={0}
                  value={toInput(colisAmanaParSac)}
                  onChange={(e) =>
                    setColisAmanaParSac(parseNonNeg(e.target.value) ?? 0)
                  }
                  className="text-center h-8 text-xs"
                />
              </Field>

              <Field
                label={
                  <span className="text-[11px] font-semibold text-slate-700">
                    Courriers par sac
                  </span>
                }
                icon={Mail}
              >
                <Input
                  type="number"
                  min={0}
                  value={toInput(courriersParSac)}
                  onChange={(e) =>
                    setCourriersParSac(parseNonNeg(e.target.value) ?? 0)
                  }
                  className="text-center h-8 text-xs"
                />
              </Field>
            </div>

            <div className="text-[10px] text-slate-500 mt-2">
              Ces ratios sont utilisés uniquement si l’unité de tâche est{" "}
              <b>“sac”</b>. Pour AMANA en <b>colis</b>, aucune division n’est
              faite.
            </div>
          </div>

          {/* Répartition P/Pro */}
          <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3 items-center">
              <Field
                label={
                  <span className="text-[11px] font-semibold text-slate-700">
                    Part Particuliers (%)
                  </span>
                }
                icon={UserRound}
              >
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={partParticuliers}
                  onChange={(e) => {
                    const v = parseNonNeg(e.target.value) ?? 0;
                    const clamped = Math.max(0, Math.min(100, v));
                    setPartParticuliers(clamped);
                  }}
                  className="text-center h-8 text-xs"
                />
              </Field>

              <Field
                label={
                  <span className="text-[11px] font-semibold text-slate-700">
                    Part Professionnelles (%)
                  </span>
                }
                icon={Building}
              >
                <Input
                  type="text"
                  readOnly
                  value={`${partProfessionnels.toFixed(0)} %`}
                  className="bg-white border-slate-200 text-center cursor-not-allowed h-8 text-xs"
                />
              </Field>

              <div className="text-[10px] text-slate-500 leading-snug">
                La somme des deux parts = 100%.
                <br />
                Les volumes saisis sont des volumes <b>totaux annuels</b>{" "}
                répartis automatiquement {partParticuliers.toFixed(0)}% /{" "}
                {partProfessionnels.toFixed(0)}%.
              </div>
            </div>
          </div>

          {/* Deux colonnes */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 ${UI.gridGap}`}>
            {/* Particuliers */}
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <UserRound className="w-3.5 h-3.5 text-blue-600" />
                <h3 className="font-semibold text-slate-800 text-xs">
                  Particuliers
                </h3>
                <div className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-semibold text-blue-700">
                    {partParticuliers.toFixed(0)} %
                  </span>
                </div>
              </div>

              <div
                className={`grid ${UI.gridGap} grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`}
              >
                {[
                  { key: "cOrd", label: "C. ordinaire / an", icon: Mail },
                  { key: "cReco", label: "C. recommandé / an", icon: Mail },
                  { key: "eBarkia", label: "E-barkia / an", icon: Mail },
                  { key: "lrh", label: "LRH / an", icon: Mail },
                  { key: "amana", label: "AMANA / an", icon: Package },
                ].map((field) => {
                  const parsed = annualParsed[field.key] || 0;
                  const split = splitFlux(parsed);
                  const splitPart = split.part;

                  const setterMap = {
                    cOrd: setCOrd,
                    cReco: setCReco,
                    eBarkia: setEBarkia,
                    lrh: setLrh,
                    amana: setAmana,
                  };

                  // ✅ Activation selon catégorie (FIX: use effectiveCentreCategorie)
                  const mode = getEffectiveFluxMode(
                    effectiveCentreCategorie,
                    field.key
                  );
                  const disabled = mode !== "input";

                  return (
                    <Field
                      key={field.key}
                      label={
                        <span className="font-semibold text-slate-700 text-xs">
                          {field.label}
                        </span>
                      }
                      icon={field.icon}
                    >
                      <>
                        <Input
                          type="number"
                          min={0}
                          value={annualInputs[field.key]}
                          placeholder={disabled ? "N/A" : "0"}
                          disabled={disabled}
                          onChange={
                            disabled ? undefined : handleAnnualChange(field.key)
                          }
                          onBlur={
                            disabled
                              ? undefined
                              : handleAnnualBlur(
                                  field.key,
                                  setterMap[field.key]
                                )
                          }
                          className={`h-8 text-xs ${
                            disabled
                              ? "bg-slate-50 cursor-not-allowed opacity-70"
                              : ""
                          }`}
                        />
                        {renderMonthlyHint(
                          annualInputs[field.key],
                          annualParsed[field.key]
                        )}
                        <div className="text-[10px] mt-0.5 text-blue-700">
                          Part Particuliers ≈ {formatNumber(splitPart, 2)} / an
                        </div>
                      </>
                    </Field>
                  );
                })}
              </div>
            </div>

            {/* Professionnelles */}
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800 text-xs">
                  Professionnelles{" "}
                  <span className="text-[10px] text-slate-500">(Admin)</span>
                </h3>
                <div className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-semibold text-emerald-700">
                    {partProfessionnels.toFixed(0)} %
                  </span>
                </div>
              </div>

              <div
                className={`grid ${UI.gridGap} grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`}
              >
                {[
                  { key: "cOrd", label: "C. ordinaire", icon: Mail },
                  { key: "cReco", label: "C. recommandé", icon: Mail },
                  { key: "eBarkia", label: "E-barkia", icon: Mail },
                  { key: "lrh", label: "LRH", icon: Mail },
                  { key: "amana", label: "AMANA", icon: Package },
                ].map((field) => {
                  const parsed = annualParsed[field.key] || 0;
                  const split = splitFlux(parsed);
                  const valeurAnProf = split.prof;
                  const valeurMoisProf = monthly(valeurAnProf) || 0;

                  return (
                    <Field
                      key={field.key}
                      label={
                        <span className="font-semibold text-slate-700 text-xs">
                          {field.label}
                        </span>
                      }
                      icon={field.icon}
                    >
                      <>
                        <div className="text-xs text-slate-700 font-medium">
                          {formatNumber(valeurAnProf, 2)} / an
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 min-h-[1rem]">
                          {`≈ ${formatNumber(valeurMoisProf, 2)} / mois`}
                        </div>
                        <div className="text-[10px] text-emerald-600 mt-0.5">
                          Part Professionnelles (calcul automatique)
                        </div>
                      </>
                    </Field>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Résultats (FIX: use kpi totals MOD) */}
      {resultats && (
        <Card
          title={`Résultats pour : ${resultats.centre_label}`}
          className="bg-gradient-to-r from-sky-50/60 to-cyan-50/60"
        >
          <div className={`grid grid-cols-2 md:grid-cols-4 ${UI.gridGap}`}>
            <KPICardGlass
              label="Effectif Actuel (MOD)"
              value={kpi.eff}
              icon={UserRound}
              tone="slate"
              footer="Ressources présentes MOD"
            />
            <KPICardGlass
              label="ETP Calculé (MOD)"
              value={kpi.etpCalc.toFixed(2)}
              icon={Calculator}
              tone="cyan"
              emphasize
              footer="Charge théorique MOD"
            />
            <KPICardGlass
              label="ETP Arrondi (MOD)"
              value={kpi.etpArr}
              icon={CheckCircle2}
              tone="amber"
              footer="Besoin opérationnel MOD"
            />
            <KPICardGlass
              label="Écart Total (MOD)"
              value={`${kpi.ecart > 0 ? "+" : ""}${kpi.ecart}`}
              icon={kpi.ecart < 0 ? TrendingDown : TrendingUp}
              tone={
                kpi.ecart > 0 ? "red" : kpi.ecart < 0 ? "green" : "slate"
              }
              emphasize
              footer={
                kpi.ecart > 0
                  ? "Sur-effectif MOD"
                  : kpi.ecart < 0
                  ? "Sous-effectif MOD"
                  : "Équilibre MOD"
              }
            />
          </div>
        </Card>
      )}

      {/* Tables */}
      <Card title="Postes MOD - ETP actuel vs ETP calculé">
        <Table rows={rowsMOD} showCalc totals={rowsMOD.length ? totalsMOD : null} />
      </Card>

      <Card title="Postes MOI - ETP actuel">
        <Table
          rows={rowsMOI}
          totals={rowsMOI.length ? totalsMOI : null}
          showCalc={false}
          showHours={false}
        />
      </Card>
    </>
  );
}
