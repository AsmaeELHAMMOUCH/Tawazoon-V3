// VueCentre.jsx
"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
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
  Eye,
  EyeOff,
  Sliders,
} from "lucide-react";
import VolumeParamsCard from "../intervenant/VolumeParamsCard";
import ProductivityParamsCard from "../intervenant/ProductivityParamsCard";
import ScoringSection from "./ScoringSection";
import CentreScoringDetailsDrawer from "@/components/scoring/CentreScoringDetailsDrawer";
import { api } from "../../lib/api";

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

/** Mode d’activation des flux selon catégorie */
const getEffectiveFluxMode = (categorie, key) => {
  const cat = String(categorie || "")
    .trim()
    .toUpperCase();
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
const PAGE_SCALE = 0.8;

const UI = COMPACT
  ? {
    cardPad: "p-3",
    cardTitle: "text-[12px]",
    cardSubtitle: "text-[11px]",
    fieldWidth: "w-full",
    fieldLabel: "text-[9px]",
    fieldIcon: 14,
    inputText: "text-xs",
    inputPad: "px-2 py-1.5",
    inputH: "h-8",
    selectText: "text-xs",
    selectPad: "px-2 py-1.5",
    selectH: "h-8",
  }
  : {
    cardPad: "p-4",
    cardTitle: "text-sm",
    cardSubtitle: "text-xs",
    fieldWidth: "w-full",
    fieldLabel: "text-xs",
    fieldIcon: 16,
    inputText: "text-[10px]",
    inputPad: "px-3 py-2",
    inputH: "h-9",
    selectText: "text-[10px]",
    selectPad: "px-3 py-2",
    selectH: "h-9",
  };

/* ===================== Group posts ===================== */
const groupPostsByMainPost = (postes) => {
  const grouped = {};

  (postes || []).forEach((poste) => {
    // 1. Label principal brut
    let mainPost =
      poste.poste_label || poste.poste_principal || poste.intitule_rh || "";

    // 2. Si vide → on prend l'équivalent / intitule_rh
    if (!mainPost || String(mainPost).trim() === "") {
      mainPost = poste.poste_label || poste.poste_label || "";
    }

    // 3. On normalise
    mainPost = normalizePosteLabel(mainPost);

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

    let equivalentLabel = poste.equivalent;
    if (!equivalentLabel) {
      if (poste.intitule_rh && poste.intitule_rh.trim() !== "") {
        equivalentLabel = poste.intitule_rh;
      }
    }

    grouped[mainPost].equivalents.push({
      equivalent: equivalentLabel,
      effectif_actuel: poste.effectif_actuel || 0,
      etp_calcule: poste.etp_calcule || 0,
      etp_arrondi: poste.etp_arrondi || 0,
      ecart: poste.ecart || 0,
      total_heures: poste.total_heures || 0,
      type_poste: poste.type_poste || "MOD",
      intitule_rh: poste.intitule_rh,
      effectif_statutaire:
        poste.effectif_statutaire ?? poste.eff_statutaire ?? 0,
      effectif_aps: poste.effectif_aps ?? poste.eff_aps ?? 0,
      etp_statutaire: poste.etp_statutaire ?? 0,
      etp_aps: poste.etp_aps ?? 0,
    });

    grouped[mainPost].totalEffectifActuel += poste.effectif_actuel || 0;
    grouped[mainPost].totalETPCalcule += poste.etp_calcule || 0;
    grouped[mainPost].totalETPArrondi += poste.etp_arrondi || 0;
    grouped[mainPost].totalHeures += poste.total_heures || 0;
    grouped[mainPost].totalEcart += poste.ecart || 0;
  });

  // On vide l’effectif des lignes "équivalents" (sauf la 1ère)
  Object.values(grouped).forEach((group) => {
    group.equivalents.forEach((eq, index) => {
      if (index > 0) {
        eq.effectif_actuel = "";
      }
    });
  });

  return Object.values(grouped);
};

/* ====== Normalisation du label poste ====== */
const normalizePosteLabel = (lbl) => {
  if (!lbl) return "";
  const raw = lbl.trim();
  const u = raw.toUpperCase();
  const uNoAccent = u.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (uNoAccent === "AGENT OPERATIONS COURRIER") {
    return "AGENT OPERATIONS";
  }
  if (uNoAccent === "CONTROLEUR FRONT OFFICE") {
    return "CONTRÔLEUR";
  }
  if (uNoAccent === "CONTROLEUR BACK OFFICE") {
    return "CONTRÔLEUR";
  }

  return raw;
};



/* ===================== UI components ===================== */
const Card = ({ title, subtitle, headerRight, className = "", children }) => (
  <div
    className={`bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 
    shadow-[0_10px_40px_-10px_rgba(2,6,23,0.18)] ${UI.cardPad} mb-2 ${className}`}
  >
    {(title || headerRight) && (
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {title && (
          <h3 className={`${UI.cardTitle} font-semibold text-slate-800`}>
            {title}
          </h3>
        )}

        {headerRight && (
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            {headerRight}
          </div>
        )}
      </div>
    )}

    {subtitle && (
      <p className={`${UI.cardSubtitle} text-slate-600 mb-2`}>{subtitle}</p>
    )}

    {children}
  </div>
);

const Field = ({ label, icon: Icon, children, className = "" }) => (
  <div className={`${UI.fieldWidth} ${className}`}>
    <label
      className={`flex items-center gap-1.5 ${UI.fieldLabel} font-medium text-slate-700 mb-0.5`}
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
    className={`mt-0.5 block w-full rounded-lg border border-white/40 bg-white/60 
    backdrop-blur-sm shadow-sm focus:border-[#005EA8] focus:ring-[#005EA8] 
    ${UI.inputText} ${UI.inputPad} ${UI.inputH} ${className}`}
    {...props}
  />
);

const Select = ({ value, onChange, children, className = "" }) => (
  <select
    value={value}
    onChange={onChange}
    className={`mt-0.5 block w-full rounded-lg border border-white/40 bg-white/60
    backdrop-blur-sm shadow-sm focus:border-[#005EA8] focus:ring-[#005EA8]
    ${UI.selectText} ${UI.selectPad} ${UI.selectH} ${className}`}
  >
    {children}
  </select>
);

/* ===================== KPI ===================== */
const KPICardGlass = ({
  label,
  MOD,
  MOI,
  extraLabel,
  extraValue,
  total,
  icon: Icon,
  tone = "blue",
  emphasize = false,
  leftLabel = "MOD",
  rightLabel = "MOI",
  children,
  customFooter,
  toggleable = false,
  isOpen = false,
  onToggle,
}) => {
  const T = {
    blue: {
      ring: "ring-blue-300/60",
      halo: "from-blue-400/25",
      text: "text-[#005EA8]",
      dot: "bg-[#005EA8]",
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
        "p-2.5 min-h-[90px] pb-3",
        "ring-1",
        T.ring,
        "shadow-[0_18px_55px_-18px_rgba(2,6,23,0.20)] transition-all duration-300",
      ].join(" ")}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${T.halo} to-transparent`}
      />
      {Icon && (
        <Icon
          aria-hidden
          className="pointer-events-none absolute right-3 bottom-1 w-7 h-7 opacity-15 text-slate-700"
        />
      )}

      {toggleable && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-full border border-white/70 bg-white/80 p-1 shadow-sm hover:bg-slate-50"
        >
          {isOpen ? (
            <EyeOff className="w-3 h-3 text-slate-500" />
          ) : (
            <Eye className="w-3 h-3 text-slate-500" />
          )}
        </button>
      )}

      <div className="text-[11px] font-semibold text-center text-slate-700 px-4">
        {label}
      </div>

      <div className="mt-0.5 text-center text-lg font-extrabold text-slate-900">
        <span className={emphasize ? T.text : ""}>{total}</span>
      </div>

      {customFooter ? (
        <div className="mt-1.5 border-t border-slate-100 pt-1">
          {customFooter}
        </div>
      ) : children ? (
        <div className="mt-1.5 border-t border-slate-100 pt-1">{children}</div>
      ) : (
        (MOD !== undefined ||
          MOI !== undefined ||
          extraValue !== undefined) && (
          <div className="flex justify-center gap-3 mt-0.5 text-[10px] font-medium text-slate-600">
            {MOD !== undefined && (
              <div>
                {leftLabel}: {MOD}
              </div>
            )}
            {MOI !== undefined && (
              <div>
                {rightLabel}: {MOI}
              </div>
            )}
            {extraValue !== undefined && extraLabel && (
              <div>
                {extraLabel}: {extraValue}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

/* ===== Footer commun pour les 4 cartes ===== */
const EffectifFooter = ({
  totalLabel,
  totalValue,
  modValue,
  moiValue,
  apsLabel,
  apsValue,
}) => (
  <div className="text-[10px] text-slate-600 space-y-1.5">
    {/* 1️⃣ Ligne Statutaire */}
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-50 px-2 py-1">
      <span className="font-semibold text-slate-700">{totalLabel}</span>
      <span className="px-2 py-0.5 rounded-full bg-white text-slate-800 font-semibold shadow-sm">
        Total : {totalValue}
      </span>
    </div>

    {/* 2️⃣ Ligne MOD + MOI */}
    <div className="flex items-center justify-center gap-2">
      <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#005EA8]">
        MOD : {modValue}
      </span>
      <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">
        MOI : {moiValue}
      </span>
    </div>

    {/* 3️⃣ Ligne APS */}
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-emerald-50/70 px-2 py-1">
      <span className="font-semibold text-emerald-800">{apsLabel}</span>
      <span className="px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 font-semibold shadow-sm">
        Total APS : {apsValue}
      </span>
    </div>
  </div>
);

/* ===================== Composant principal ===================== */
export default function VueCentre({
  regions = [],
  centres = [],
  loading = {},
  centreCategorie = "",
  region,
  setRegion = () => { },
  centre,
  setCentre = () => { },
  sacs = 0,
  setSacs = () => { },
  colis = 0,
  setColis = () => { },
  scelle = 0,
  setScelle = () => { },
  productivite = 100,
  setProductivite = () => { },
  heuresNet: heuresNetInit = 0,
  cOrd = 0,
  setCOrd = () => { },
  cReco = 0,
  setCReco = () => { },
  eBarkia = 0,
  setEBarkia = () => { },
  lrh = 0,
  setLrh = () => { },
  amana = 0,
  setAmana = () => { },
  colisAmanaParSac = 5,
  setColisAmanaParSac = () => { },
  courriersParSac = 4500,
  setCourriersParSac = () => { },
  colisParCollecte = 1,
  setColisParCollecte = () => { },
  apiBaseUrl = "http://localhost:8000/api",
}) {
  // 🔄 Lecture des données de replay depuis location.state
  const location = useLocation();
  const replayData = location.state?.replayData;

  const [resultats, setResultats] = useState(null);
  const [loadingSimu, setLoadingSimu] = useState(false);
  const [error, setError] = useState("");

  const [partParticuliers, setPartParticuliers] = useState(75);
  const partProfessionnels = 100 - partParticuliers;

  const [colisAmanaParSacLocal, setColisAmanaParSacLocal] = useState(
    Number(colisAmanaParSac ?? 5) || 0
  );
  const [courriersParSacLocal, setCourriersParSacLocal] = useState(
    Number(courriersParSac ?? 4500) || 0
  );
  const [colisParCollecteLocal, setColisParCollecteLocal] = useState(
    Number(colisParCollecte ?? 1) || 1
  );

  // 🏷️ Catégories (pour affichage dynamique)
  const [categorisationsList, setCategorisationsList] = useState([]);

  useEffect(() => {
    // Charge les catégorisations (Classe A, B...) au montage pour le lookup
    api.categorisations().then(setCategorisationsList).catch(err => console.error("Err categorisations:", err));
  }, []);

  // 🔄 Pré-remplir les champs avec les données de replay
  useEffect(() => {
    if (replayData) {
      console.log("📥 Données de replay détectées:", replayData);

      // Pré-remplir le centre
      if (replayData.centre_id && setCentre) {
        setCentre(replayData.centre_id);
      }

      // Pré-remplir la productivité
      if (replayData.productivite && setProductivite) {
        setProductivite(replayData.productivite);
      }

      // Pré-remplir les volumes
      if (replayData.volumes) {
        const volumes = replayData.volumes;
        if (volumes.CO && setCOrd) setCOrd(volumes.CO);
        if (volumes.CR && setCReco) setCReco(volumes.CR);
        if (volumes.SACS && setSacs) setSacs(volumes.SACS);
        if (volumes.COLIS && setColis) setColis(volumes.COLIS);
        if (volumes.AMANA && setAmana) setAmana(volumes.AMANA);
        if (volumes.EBARKIA && setEBarkia) setEBarkia(volumes.EBARKIA);
        if (volumes.LRH && setLrh) setLrh(volumes.LRH);
      }

      // Log du commentaire pour debug
      if (replayData.commentaire) {
        console.log("📝 Commentaire de replay:", replayData.commentaire);
      }

      console.log("✅ Champs pré-remplis avec succès");
    }
  }, [replayData]);

  // 👁️ affichage détails tables
  const [showMODDetails, setShowMODDetails] = useState(false);
  const [showMOIDetails, setShowMOIDetails] = useState(false);

  useEffect(() => {
    setColisAmanaParSacLocal(Number(colisAmanaParSac ?? 5) || 0);
  }, [colisAmanaParSac]);

  useEffect(() => {
    setCourriersParSacLocal(Number(courriersParSac ?? 4500) || 0);
  }, [courriersParSac]);

  useEffect(() => {
    setColisParCollecteLocal(Number(colisParCollecte ?? 1) || 1);
  }, [colisParCollecte]);

  // ⏱ temps mort (min/jour)
  const [idleMinutes, setIdleMinutes] = useState(0);

  // ⏱ heures / jour théoriques
  const [heuresNet, setHeuresNet] = useState(
    Number(heuresNetInit || 8).toFixed(2)
  );

  useEffect(() => {
    const p = Number(productivite || 0);
    if (!p) return;
    const hTheo = (p / 100) * 8;
    setHeuresNet(hTheo.toFixed(2));
  }, [productivite]);

  const [tauxComplexite, setTauxComplexite] = useState(0);
  const [natureGeo, setNatureGeo] = useState(0);

  const baseHeuresNet = useMemo(() => {
    const hTheo = Number(heuresNet || 0);
    const hIdle = Number(idleMinutes || 0) / 60;
    const net = hTheo - hIdle;
    return net > 0 ? net : 0;
  }, [heuresNet, idleMinutes]);

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
      centres.find(
        (c) => String(c.id ?? c.value ?? c.code) === String(centre)
      ) || null
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
      if (n === undefined) return setAnnualInputs((p) => ({ ...p, [key]: "" }));
      setter(n);
      setAnnualParsed((p) => ({ ...p, [key]: n }));
    },
    []
  );

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
  const handleSimuler = useCallback(
    async (volParams = null) => {
      if (!centreId) {
        setError("Veuillez sélectionner un centre");
        return;
      }

      try {
        setError("");
        setLoadingSimu(true);

        const colisTotal = Number(colis || 0) + Number(amana || 0);

        const colisAmanaParSacEff =
          volParams?.colis_amana_par_sac ??
          colisAmanaParSacLocal ??
          colisAmanaParSac ??
          5;

        const courriersParSacEff =
          volParams?.courriers_par_sac ??
          courriersParSacLocal ??
          courriersParSac ??
          4500;

        const colisParCollecteEff =
          volParams?.colis_par_collecte ??
          colisParCollecteLocal ??
          colisParCollecte ??
          1;

        const heuresNetEff =
          volParams?.heures_net != null
            ? Number(volParams.heures_net)
            : Number(baseHeuresNet || heuresNet || 8);

        const allowedAnnual = (fluxKey, value) => {
          const mode = getEffectiveFluxMode(effectiveCentreCategorie, fluxKey);
          return mode === "input" ? Number(value || 0) : 0;
        };

        const volumesJournaliers = {
          sacs: Number(sacs || 0),
          colis: Number(colis || 0),
          colis_amana_par_sac: Number(colisAmanaParSacEff),
          courriers_par_sac: Number(courriersParSacEff),
          colis_par_collecte: Number(colisParCollecteEff),
        };

        const volumesAnnuels = {
          courrier_ordinaire: allowedAnnual("co", annualParsed.cOrd),
          courrier_recommande: allowedAnnual("cr", annualParsed.cReco),
          ebarkia: allowedAnnual("eb", annualParsed.eBarkia),
          lrh: allowedAnnual("lrh", annualParsed.lrh),
          amana: allowedAnnual("amana", annualParsed.amana),
        };

        const payload = {
          centre_id: Number(centreId),
          productivite: Number(productivite || 100),
          heures_net: Number(heuresNetEff),
          // idle_minutes non géré explicitement ici mais pourrait l'être
          volumes: volumesJournaliers,
          volumes_annuels: volumesAnnuels,
        };

        // Use the correct API for accumulated Centre View
        const data = await api.vueCentreOptimisee(payload);

        // 🔍 DEBUG: Voir ce que renvoie l'API
        console.log("🔍 DEBUG - Réponse API simulate():", data);
        console.log("🔍 total_etp_calcule:", data.total_etp_calcule);
        console.log("🔍 fte_calcule:", data.fte_calcule);
        console.log("🔍 total_heures:", data.total_heures);

        // Previous logic expects 'data' to have 'details_taches' etc.
        // We ensure backend returns full data.

        const detailsLog = data.details_taches || [];
        if (Array.isArray(detailsLog) && detailsLog.length > 0) {
          console.groupCollapsed("VueCentre - Tâches calculées");
          detailsLog.forEach((d, idx) => {
            console.log(
              `#${idx + 1} | ${d.task || d.tache_label || "N/A"} | unit=${d.unit || d.unite || "N/A"
              } | vol_jour=${d.nombre_unite ?? d.volume_jour ?? "?"} | heures=${d.heures ?? "?"}`
            );
          });
          console.groupEnd();
        }

        setResultats({
          centre_id: data.centre_id,
          centre_label: data.centre_label,
          heures_net: Number(
            data.heures_net || data.heures_net_jour || heuresNetEff || 8
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
    },
    [
      centreId,
      sacs,
      colis,
      annualParsed,
      productivite,
      baseHeuresNet,
      heuresNet,
      colisAmanaParSacLocal,
      courriersParSacLocal,
      colisParCollecteLocal,
      colisAmanaParSac,
      courriersParSac,
      apiBaseUrl,
      effectiveCentreCategorie,
      amana,
      tauxComplexite,
      natureGeo,
      idleMinutes,
    ]
  );

  /* ✅ Export CSV */
  const handleExportCSV = useCallback(() => {
    if (!centreId) return;

    const allowedAnnual = (fluxKey, value) => {
      const mode = getEffectiveFluxMode(effectiveCentreCategorie, fluxKey);
      return mode === "input" ? Number(value || 0) : 0;
    };

    const params = new URLSearchParams({
      centre_id: String(centreId),
      sacs: String(Number(sacs || 0)),
      colis: String(Number(colis || 0) + Number(amana || 0)),
      courrier_ordinaire: String(allowedAnnual("co", annualParsed.cOrd)),
      courrier_recommande: String(allowedAnnual("cr", annualParsed.cReco)),
      ebarkia: String(allowedAnnual("eb", annualParsed.eBarkia)),
      lrh: String(allowedAnnual("lrh", annualParsed.lrh)),
      amana: String(allowedAnnual("amana", annualParsed.amana)),
      colis_amana_par_sac: String(
        Number(colisAmanaParSacLocal ?? colisAmanaParSac ?? 5)
      ),
      courriers_par_sac: String(
        Number(courriersParSacLocal ?? courriersParSac ?? 4500)
      ),
      productivite: String(productivite || 100),
      heures_net: String(baseHeuresNet || heuresNet || 8),
      idle_minutes: String(Number(idleMinutes || 0)),
      colis_par_collecte: String(
        Number(colisParCollecteLocal ?? colisParCollecte ?? 1)
      ),
    });

    window.open(
      `${apiBaseUrl}/vue-centre-optimisee/export?${params.toString()}`,
      "_blank"
    );
  }, [
    centreId,
    sacs,
    colis,
    annualParsed,
    colisAmanaParSacLocal,
    courriersParSacLocal,
    colisAmanaParSac,
    courriersParSac,
    apiBaseUrl,
    productivite,
    baseHeuresNet,
    heuresNet,
    effectiveCentreCategorie,
    idleMinutes,
    colisParCollecteLocal,
    colisParCollecte,
    amana,
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
    let totalETPArrondiMOD = 0;
    let totalHeuresMOD = 0;

    let totalEffectifMOI = 0;
    let totalHeuresMOI = 0;

    let totalStatutMOD = 0;
    let totalAPSMOD = 0;
    let totalEtpStatMOD = 0;
    let totalEtpAPSMOD = 0;

    resultats.postes.forEach((poste) => {
      const effStat = Number(
        poste.effectif_actuel ?? poste.effectif_actuel ?? 0
      );
      const effAPS = Number(poste.effectif_aps ?? poste.eff_aps ?? 0);

      const etpStat = Number(poste.etp_statutaire ?? 0);
      const etpAPS = Number(poste.etp_aps ?? 0);

      const posteData = {
        ...poste,
        intitule_rh: poste.intitule_rh || null,
        effectif_statutaire: effStat,
        effectif_aps: effAPS,
        etp_statutaire: etpStat,
        etp_aps: etpAPS,
      };

      if ((poste.type_poste || "").toUpperCase() === "MOI") {
        MOI.push(posteData);
        totalEffectifMOI += poste.effectif_actuel || 0;
        totalHeuresMOI += poste.total_heures || 0;
      } else {
        MOD.push(posteData);
        totalEffectifMOD += poste.effectif_actuel || 0;
        totalETPCalculeMOD += poste.etp_calcule || 0;
        totalETPArrondiMOD += poste.etp_arrondi || 0;
        totalHeuresMOD += poste.total_heures || 0;

        totalStatutMOD += effStat;
        totalAPSMOD += effAPS;
        totalEtpStatMOD += etpStat;
        totalEtpAPSMOD += etpAPS;
      }
    });

    return {
      rowsMOD: MOD,
      rowsMOI: MOI,
      totalsMOD: {
        effectif: totalEffectifMOD,
        etpCalcule: totalETPCalculeMOD,
        etpArrondi: totalETPArrondiMOD,
        ecart: totalETPArrondiMOD - totalEffectifMOD,
        heures: totalHeuresMOD,
        effectifStatutaire: totalStatutMOD,
        effectifAPS: totalAPSMOD,
        etpStatutaire: totalEtpStatMOD,
        etpAPS: totalEtpAPSMOD,
      },
      totalsMOI: {
        effectif: totalEffectifMOI,
        heures: totalHeuresMOI,
        effectifStatutaire: totalEffectifMOI,
        effectifAPS: 0,
        etpCalcule: totalEffectifMOI,
        etpArrondi: totalEffectifMOI,
        ecart: 0,
      },
    };
  }, [resultats]);

  const updateColisAmanaParSac = useCallback(
    (v) => {
      setColisAmanaParSacLocal(v);
      setColisAmanaParSac(v);
    },
    [setColisAmanaParSac]
  );

  const updateCourriersParSac = useCallback(
    (v) => {
      setCourriersParSacLocal(v);
      setCourriersParSac(v);
    },
    [setCourriersParSac]
  );

  /* ===================== KPI ===================== */
  const kpi = useMemo(() => {
    const effMOD = totalsMOD.effectif ?? 0;
    const effMOI = totalsMOI.effectif ?? 0;
    const effTotal = effMOD + effMOI;

    const etpCalcMOD = totalsMOD.etpCalcule ?? 0;
    const etpCalcMOI = totalsMOI.etpCalcule ?? 0;
    const etpCalc = etpCalcMOD + etpCalcMOI;

    const etpArrMOD = totalsMOD.etpArrondi ?? 0;
    const etpArrMOI = effMOI;
    const etpArr = etpArrMOD + etpArrMOI;

    const ecart = etpArr - (effMOD + effMOI);

    const effStatMOD = totalsMOD.effectifStatutaire ?? 0;
    const effAPSMOD = totalsMOD.effectifAPS ?? 0;
    const ecartMOD = etpArrMOD - effMOD;
    const ecartMOI = etpArrMOI - effMOI;

    return {
      effMOD,
      effMOI,
      effTotal,
      etpCalc,
      etpCalcMOD,
      etpCalcMOI,
      etpArr,
      etpArrMOD,
      etpArrMOI,
      ecart,
      effStatMOD,
      effAPSMOD,
      ecartMOD,
      ecartMOI,
    };
  }, [totalsMOD, totalsMOI]);
  const formatSigned = (n) => {
    const v = Number(n || 0);
    if (!Number.isFinite(v) || v === 0) return "0";
    return v > 0 ? `+${v}` : `${v}`;
  };

  // ✅ Statutaire = MOD + MOI, APS = effectif_aps (MOD), Global = Statutaire + APS
  const totalStatutaire = (kpi.effMOD || 0) + (kpi.effMOI || 0);
  const totalAPS = kpi.effAPSMOD || 0;
  const totalGlobal = totalStatutaire + totalAPS;

  /* ============== TABLE ============== */
  const Table = ({
    rows,
    showCalc = false,
    showHours = true,
    totals = null,
    emptyLabel = "Aucune donnée",
    hasAPS = true,
  }) => {
    // ✅ 1) Normaliser les lignes : si poste_label est vide,
    //    on reprend le poste_label de la ligne précédente
    const normalizedRows = (rows || []).reduce((acc, row, idx) => {
      let currentLabel = row.poste_label;

      if (!currentLabel || String(currentLabel).trim() === "") {
        const prev = acc[acc.length - 1];
        if (prev && prev.poste_label) {
          currentLabel = prev.poste_label;
        }
      }

      acc.push({
        ...row,
        poste_label: currentLabel,
      });

      return acc;
    }, []);

    // ✅ 2) On continue le flux normal avec les lignes normalisées
    const groupedRows = groupPostsByMainPost(normalizedRows);

    const displayInt = (v) => {
      const n = Number(v ?? 0);
      return n === 0 ? "" : n;
    };

    const displayDec = (v) => {
      const n = Number(v ?? 0);
      if (!Number.isFinite(n) || n === 0) return "";
      return formatSmallNumber(n);
    };
    const displayArrondi = (v) => {
      const n = Number(v ?? 0);
      if (!Number.isFinite(n) || n === 0) return "";
      return Math.round(n);
    };

    // ✅ 3) Recalcule des totaux à partir de ce qui est réellement affiché
    const aggregatedTotals = groupedRows.reduce(
      (acc, group) => {
        const first = group.equivalents[0] || {};

        const effStat = Number(
          first.effectif_statutaire ?? first.effectif_actuel ?? 0
        );
        const effAPS = Number(first.effectif_aps ?? 0);

        const etpStat = Number(first.etp_statutaire ?? first.etp_calcule ?? 0);
        const etpAPS = Number(first.etp_aps ?? 0);

        const arrondi = Number(first.etp_arrondi ?? etpStat + etpAPS);
        const heures = Number(first.total_heures ?? 0);
        const ecart = Number(first.ecart ?? 0);

        acc.effectifStatutaire += effStat;
        acc.effectifAPS += effAPS;
        acc.etpStatutaire += etpStat;
        acc.etpAPS += etpAPS;
        acc.etpArrondi += arrondi;
        acc.heures += heures;
        acc.ecart += ecart;

        return acc;
      },
      {
        effectifStatutaire: 0,
        effectifAPS: 0,
        etpStatutaire: 0,
        etpAPS: 0,
        etpArrondi: 0,
        heures: 0,
        ecart: 0,
      }
    );

    // ✅ On utilise ce qu’on a reçu en props si présent, sinon le recalcul
    const finalTotals = totals || aggregatedTotals;

    return (
      <div className="overflow-x-auto rounded-2xl border border-white/60 bg-white/70 backdrop-blur shadow-[0_10px_30px_-12px_rgba(15,23,42,0.45)]">
        <table className="min-w-[920px] w-full text-[11px]">
          {/* ===== En-têtes ===== */}
          <thead className="bg-slate-50/90 sticky top-0 z-10 backdrop-blur-sm">
            <tr className="text-left text-slate-600 border-b border-slate-100">
              <th rowSpan={2} className="px-4 py-1.5 text-[10px] font-semibold">
                Position
              </th>
              <th rowSpan={2} className="px-4 py-1.5 text-[10px] font-semibold">
                Intitulé Poste RH
              </th>
              <th
                rowSpan={2}
                className="px-3 py-1.5 text-[10px] font-semibold text-center"
              >
                Type
              </th>

              <th
                colSpan={hasAPS ? 2 : 2}
                className="px-2 py-1.5 text-[10px] font-semibold text-center border-l border-slate-100"
              >
                Effectif actuel
              </th>

              {showCalc && (
                <>
                  <th
                    colSpan={hasAPS ? 3 : 2}
                    className="px-2 py-1.5 text-[10px] font-semibold text-center border-l border-slate-100"
                  >
                    Effectif calculé
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-1.5 text-[10px] font-semibold text-right"
                  >
                    Écart
                  </th>
                </>
              )}

              {showHours && (
                <th
                  rowSpan={2}
                  className="px-3 py-1.5 text-[10px] font-semibold text-right"
                >
                  Total heures
                </th>
              )}
            </tr>

            <tr className="text-slate-500 border-b border-slate-100">
              {/* Effectif actuel */}
              <th className="px-2 py-1 text-right text-[10px] font-medium border-l border-slate-100">
                Statutaire
              </th>
              {hasAPS && (
                <th className="px-2 py-1 text-right text-[10px] font-medium">
                  APS
                </th>
              )}

              {/* Effectif calculé */}
              {showCalc && (
                <>
                  <th className="px-2 py-1 text-right text-[10px] font-medium border-l border-slate-100">
                    Statutaire
                  </th>
                  {hasAPS && (
                    <th className="px-2 py-1 text-right text-[10px] font-medium">
                      APS
                    </th>
                  )}
                  {/* Effectif calculé Arrondi*/}
                  <th className="px-2 py-1 text-right text-[10px] font-medium border-l border-slate-100">
                    Arrondi
                  </th>
                </>
              )}
            </tr>
          </thead>

          {/* ===== Lignes ===== */}
          <tbody className="divide-y divide-slate-50">
            {groupedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={20}
                  className="px-4 py-4 text-center text-slate-500"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              groupedRows.map((group) =>
                group.equivalents.map((equivalent, eqIndex) => {
                  const effStat = equivalent.effectif_statutaire ?? "";
                  const effAPS = equivalent.effectif_aps ?? "";

                  const calcStat = equivalent.etp_calcule ?? 0;
                  const calcAPS = equivalent.etp_aps ?? 0;
                  const ecart = equivalent.ecart ?? 0;
                  const arrondi = equivalent.etp_arrondi ?? calcStat + calcAPS;

                  const ecartColor =
                    ecart > 0
                      ? "text-rose-600"
                      : ecart < 0
                        ? "text-emerald-600"
                        : "text-slate-600";

                  const hasEcart = Number(ecart || 0) !== 0;

                  return (
                    <tr
                      key={`${group.mainPost}-${eqIndex}`}
                      className="hover:bg-slate-50/80 transition-colors even:bg-slate-50/40"
                    >
                      {/* Position */}
                      <td
                        className={`px-4 py-2 align-top text-[11px] font-semibold text-slate-900 ${eqIndex === 0
                          ? "bg-slate-50/70"
                          : "bg-slate-50/40"
                          }`}
                      >
                        {group.mainPost}
                      </td>

                      {/* Intitulé RH */}
                      <td
                        className={`px-4 py-1.5 ${eqIndex === 0
                          ? "text-slate-800 font-medium"
                          : "text-slate-600 pl-6"
                          }`}
                      >
                        {equivalent.equivalent}
                      </td>

                      {/* Type */}
                      <td className="px-3 py-1.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${(equivalent.type_poste || "").toUpperCase() ===
                            "MOD"
                            ? "bg-blue-100 text-[#005EA8]"
                            : "bg-fuchsia-100 text-fuchsia-800"
                            }`}
                        >
                          {equivalent.type_poste || "MOD"}
                        </span>
                      </td>

                      {/* Effectif actuel */}
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {eqIndex === 0 ? displayInt(effStat) : 0}
                      </td>
                      {hasAPS && (
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                          {eqIndex === 0 ? displayInt(effAPS) : 0}
                        </td>
                      )}

                      {/* Effectif calculé */}
                      {showCalc && (
                        <>
                          <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[#005EA8]">
                            {eqIndex === 0 ? displayDec(calcStat) : 0}
                          </td>
                          {hasAPS && (
                            <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[#005EA8]">
                              {eqIndex === 0 ? displayDec(calcAPS) : 0}
                            </td>
                          )}
                          <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[#005EA8]">
                            {eqIndex === 0 ? displayArrondi(arrondi) : 0}
                          </td>

                          {/* Écart */}
                          <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                            {hasEcart && (
                              <span
                                className={`inline-flex items-center justify-end gap-1 text-[11px] font-semibold ${ecartColor}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${ecart > 0 ? "bg-rose-500" : "bg-emerald-500"
                                    }`}
                                />
                                {ecart > 0 ? `+${ecart}` : ecart}
                              </span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Heures */}
                      {showHours && (
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-600">
                          {eqIndex === 0
                            ? formatNumber(equivalent.total_heures)
                            : 0}
                        </td>
                      )}
                    </tr>
                  );
                })
              )
            )}

            {/* ===== Ligne TOTAL ===== */}
            {finalTotals && groupedRows.length > 0 && (
              <tr className="border-t-2 border-slate-200 bg-white/95">
                <td
                  className="px-4 py-1.5 text-[11px] font-bold text-slate-900"
                  colSpan={3}
                >
                  TOTAL
                </td>

                {/* 🔹 Effectif actuel total */}
                <td className="px-2 py-1.5 text-right font-mono tabular-nums font-semibold">
                  {finalTotals.effectifStatutaire ?? finalTotals.effectif ?? ""}
                </td>

                {hasAPS && (
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums font-semibold">
                    {finalTotals.effectifAPS ?? 0}
                  </td>
                )}

                {showCalc && (
                  <>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums font-semibold">
                      {displayDec(
                        finalTotals.etpCalcule ?? finalTotals.etpStatutaire ?? 0
                      )}
                    </td>

                    {hasAPS && (
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums font-semibold">
                        {displayDec(finalTotals.etpAPS ?? 0)}
                      </td>
                    )}

                    <td className="px-2 py-1.5 text-right font-mono tabular-nums font-bold">
                      {displayArrondi(
                        finalTotals.etpArrondi ??
                        finalTotals.totalEtpStatMOD ??
                        0
                      )}
                    </td>

                    <td
                      className={`px-3 py-1.5 text-right font-mono tabular-nums font-bold ${finalTotals.ecart > 0
                        ? "text-rose-600"
                        : finalTotals.ecart < 0
                          ? "text-emerald-600"
                          : "text-slate-700"
                        }`}
                    >
                      {finalTotals.ecart > 0
                        ? `+${finalTotals.ecart}`
                        : finalTotals.ecart}
                    </td>
                  </>
                )}

                {showHours && (
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums font-bold text-slate-900">
                    {formatNumber(finalTotals.heures)}
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
    <div className="space-y-1" style={{ zoom: "90%" }}>
      {/* 1️⃣ Bandeau paramètres principaux + productivité */}
      {/* 🔹 BARRES STICKY EN HAUT - Sélection + Productivité côte à côte */}
      <div className="sticky top-[57px] z-20 grid grid-cols-1 xl:grid-cols-2 gap-2">

        {/* Barre de sélection */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2 flex flex-wrap items-center gap-3 transition-all duration-300">

          {/* Région */}
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <MapPin className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Région
              </label>
              <select
                value={region || ""}
                onChange={(e) => setRegion(e.target.value || "")}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate text-left"
              >
                <option value="">Sélectionner...</option>
                {(regions || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label || r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* Centre */}
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <Building className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Centre
              </label>
              <select
                value={centre || ""}
                onChange={(e) => setCentre(e.target.value || "")}
                disabled={!region || loading.centres}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate text-left disabled:opacity-50"
              >
                <option value="">Sélectionner...</option>
                {(centres || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* Typologie (Tag) */}
          <div className="flex items-center gap-1.5">
            {effectiveCentreCategorie ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <Tag className="w-2.5 h-2.5" />
                {effectiveCentreCategorie}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 italic px-2">
                -- Typologie --
              </span>
            )}
          </div>

        </div>

        {/* Configuration & Performance */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">

            {/* Productivité */}
            <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                <Gauge className="w-3 h-3" />
              </div>
              <div className="flex flex-col w-full">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Productivité
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={productivite}
                    onChange={(e) => setProductivite(Number(e.target.value || 0))}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-6 text-center"
                  />
                  <span className="absolute right-0 top-0 text-[9px] text-slate-400 font-bold pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-slate-200 hidden md:block" />

            {/* Temps mort */}
            <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
              <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-3 h-3" />
              </div>
              <div className="flex flex-col w-full">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Temps mort
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={idleMinutes}
                    onChange={(e) => setIdleMinutes(Number(e.target.value || 0))}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-8 text-center"
                  />
                  <span className="absolute right-0 top-0 text-[9px] text-slate-400 font-bold pointer-events-none">
                    min
                  </span>
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-slate-200 hidden md:block" />

            {/* Complexité Circulation */}
            <div className="flex items-center gap-1.5 min-w-[90px] flex-1">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                <Sliders className="w-3 h-3" />
              </div>
              <div className="flex flex-col w-full">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Compl. Circ.
                </label>
                <input
                  type="number"
                  value={tauxComplexite}
                  onChange={(e) => setTauxComplexite(Number(e.target.value || 0))}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
                />
              </div>
            </div>

            <div className="w-px h-6 bg-slate-200 hidden md:block" />

            {/* Complexité Géo */}
            <div className="flex items-center gap-1.5 min-w-[90px] flex-1">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                <MapPin className="w-3 h-3" />
              </div>
              <div className="flex flex-col w-full">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Compl. Géo
                </label>
                <input
                  type="number"
                  value={natureGeo}
                  onChange={(e) => setNatureGeo(Number(e.target.value || 0))}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
                />
              </div>
            </div>

            <div className="w-px h-6 bg-slate-200 hidden md:block" />

            {/* Capacité Nette */}
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                <Clock className="w-3 h-3" />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-[#005EA8] uppercase tracking-wider">
                  Capacité Nette
                </label>
                <span className="text-xs font-bold text-[#005EA8]">
                  {formatNumber(baseHeuresNet)} h
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 🔢 Paramètres de volume */}
      <VolumeParamsCard
        UI={UI}
        Card={Card}
        Field={Field}
        Input={Input}
        centre={centreObj}
        centreCategorie={effectiveCentreCategorie}
        loading={{ simulation: loadingSimu }}
        courrierOrdinaire={cOrd}
        setCourrierOrdinaire={setCOrd}
        courrierRecommande={cReco}
        setCourrierRecommande={setCReco}
        ebarkia={eBarkia}
        setEbarkia={setEBarkia}
        lrh={lrh}
        setLrh={setLrh}
        amana={amana}
        setAmana={setAmana}
        colisAmanaParSac={colisAmanaParSacLocal}
        setColisAmanaParSac={updateColisAmanaParSac}
        courriersParSac={courriersParSacLocal}
        setCourriersParSac={updateCourriersParSac}
        colis={colis}
        setColis={setColis}
        colisParCollecte={colisParCollecteLocal}
        setColisParCollecte={setColisParCollecteLocal}
        parseNonNeg={parseNonNeg}
        toInput={toInput}
        monthly={monthly}
        formatInt={formatInt}
        splitFlux={splitFlux}
        partParticuliers={partParticuliers}
        setPartParticuliers={setPartParticuliers}
        partProfessionnels={partProfessionnels}
        getEffectiveFluxMode={getEffectiveFluxMode}
        heures={baseHeuresNet}
        tempsMortMinutes={idleMinutes}
        onSimuler={handleSimuler}
      />

      {/* KPI Résultats */}
      {resultats && (
        <Card
          title={`Résultats pour : ${resultats.centre_label}`}
          className="bg-gradient-to-r from-sky-50/60 to-cyan-50/60"
          headerRight={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMODDetails((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-1 shadow-sm hover:bg-slate-50"
              >
                {showMODDetails ? (
                  <EyeOff className="w-3 h-3 text-slate-500" />
                ) : (
                  <Eye className="w-3 h-3 text-slate-500" />
                )}
                <span>
                  Détails Positions MOD - Effectif actuel vs Effectif calculé{" "}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowMOIDetails((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-1 shadow-sm hover:bg-slate-50"
              >
                {showMOIDetails ? (
                  <EyeOff className="w-3 h-3 text-slate-500" />
                ) : (
                  <Eye className="w-3 h-3 text-slate-500" />
                )}
                <span>MOI / Autres</span>
              </button>
            </div>
          }
        >



          {/* 👉 La grille qui contient les 4 cartes KPI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1️⃣ Effectif actuel */}
            <KPICardGlass
              label="Effectif actuel"
              icon={UserRound}
              tone="slate"
              emphasize
              total={totalGlobal}
              customFooter={
                <EffectifFooter
                  totalLabel="Statutaire"
                  totalValue={totalStatutaire}
                  modValue={kpi.effMOD}
                  moiValue={kpi.effMOI}
                  apsLabel="APS"
                  apsValue={totalAPS}
                />
              }
            />

            {/* 2️⃣ Effectif Calculé */}
            <KPICardGlass
              label="Effectif Calculé"
              icon={Calculator}
              tone="blue"
              emphasize
              total={formatSmallNumber(kpi.etpCalc, 2)}
              customFooter={
                <EffectifFooter
                  totalLabel="Statutaire"
                  totalValue={formatSmallNumber(kpi.etpCalc, 2)}
                  modValue={formatSmallNumber(kpi.etpCalcMOD, 2)}
                  moiValue={formatSmallNumber(kpi.effMOI, 2)}
                  apsLabel="APS"
                  apsValue={totalAPS}
                />
              }
            />

            {/* 3️⃣ Effectif Arrondi */}
            <KPICardGlass
              label="Effectif Arrondi"
              icon={CheckCircle2}
              tone="amber"
              emphasize
              total={kpi.etpArr}
              customFooter={
                <EffectifFooter
                  totalLabel="Effectif arrondi"
                  totalValue={kpi.etpArr}
                  modValue={kpi.etpArrMOD}
                  moiValue={kpi.etpArrMOI}
                  apsLabel="APS"
                  apsValue={totalAPS}
                />
              }
            />

            {/* 4️⃣ Écart Total */}
            <KPICardGlass
              label="Écart Total"
              icon={kpi.ecart < 0 ? TrendingDown : TrendingUp}
              tone={kpi.ecart > 0 ? "red" : kpi.ecart < 0 ? "green" : "slate"}
              emphasize
              total={formatSigned(kpi.ecartMOD + kpi.etpArrMOI)}
              customFooter={
                <EffectifFooter
                  totalLabel="Écart global"
                  totalValue={formatSigned(kpi.ecartMOD + kpi.etpArrMOI)}
                  modValue={formatSigned(kpi.ecartMOD)}
                  moiValue={formatSigned(kpi.etpArrMOI)}
                  apsLabel="APS"
                  apsValue={0}
                />
              }
            />
          </div>
        </Card>
      )
      }

      {/* 🏷️ SECTION SCORING & CATEGORISATION (Couche 2) */}
      {resultats && (
        <div className="mb-6 mt-4">
          <ScoringSection
            centreId={centre}
            centreLabel={resultats.centre_label}
            code={resultats.code}
            regionId={resultats.region_id}
            regionLabel={(() => {
              const rId = resultats.region_id;
              const r = (regions || []).find(x => x.id == rId);
              return r?.label || r?.name || rId || "N/A";
            })()}
            typologie={(() => {
              const cObj = (centres || []).find(c => c.id === Number(centre));
              return cObj?.type_site || cObj?.typologie || "Standard";
            })()}
            volumes={{
              courrier_ordinaire: Number(cOrd) || 0,
              courrier_recommande: Number(cReco) || 0,
              colis: Number(colis) || 0,
              amana: Number(amana) || 0,
              ebarkia: Number(eBarkia) || 0,
              lrh: Number(lrh) || 0
            }}
            effectifGlobal={kpi.etpArr || 0}
            currentCategoryLabel={(() => {
              const centreIdNum = Number(centre);
              const currentCentreObj = (centres || []).find(c => c.id === centreIdNum);
              return categorisationsList.find(cat => cat.id == currentCentreObj?.id_categorisation)?.label || "SANS";
            })()}
          />
        </div>
      )}

      {/* Tables MOD / MOI */}
      {
        showMODDetails && (
          <Card title="Positions MOD - Effectif actuel vs Effectif calculé">
            <Table
              rows={rowsMOD}
              showCalc
              totals={rowsMOD.length ? totalsMOD : null}
            />
          </Card>
        )
      }

      {
        showMOIDetails && (
          <Card title="Positions MOI - Effectif actuel">
            <Table
              rows={rowsMOI}
              totals={rowsMOI.length ? totalsMOI : null}
              hasAPS={false}
              showCalc={false}
              showHours={false}
            />
          </Card>
        )
      }
    </div >
  );
}
