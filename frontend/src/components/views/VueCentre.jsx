// VueCentre.jsx
"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MapPin,
  Building,
  Tag,
  UserRound,
  Calculator,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Sliders,
  X,
  Calendar,
  Layers,
  Users,
  BarChart,
  FileText,
  DollarSign,
} from "lucide-react";

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

const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return "0.00";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(decimals).replace(".", ",");
};

const formatUnit = (value, decimals = 0) => {
  if (value === null || value === undefined || value === "") return "0";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

const formatSmallNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return "0,00";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num)) return "0,00";
  return num.toFixed(decimals).replace(".", ",");
};

/** Mode d’activation des flux selon catégorie */
const getEffectiveFluxMode = (categorie, key) => {
  return "input";
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
                {/* Tag Cas Spécial ajouté */}
                {showSpecialTag && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold mr-2">
                    Cas Spécial {casValue ? `: ${casValue}` : ""}
                  </span>
                )}
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
  showSpecialTag = false,
  casValue,
  besoinAPS
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
      {moiValue !== undefined && moiValue !== null && (
        <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">
          MOI : {moiValue}
        </span>
      )}
    </div>

    {/* 3️⃣ Ligne APS (Uniquement si valeur > 0 ou explicitement demandé) */}
    {(apsValue > 0 || apsLabel) && (
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-emerald-50/70 px-2 py-1">
        <span className="font-semibold text-emerald-800">{apsLabel || "APS"}</span>
        <span className="px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 font-semibold shadow-sm">
          Total APS : {apsValue}
        </span>
      </div>
    )}



    {/* 5️⃣ Ligne Spéciale */}
    {showSpecialTag && (
      <div className="flex justify-center mt-1">
        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold border border-amber-200">
          Cas Spécial {casValue ? `: ${casValue}` : ""}
        </span>
      </div>
    )}
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
  heuresNet = 0,
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
  edPercent = 60,
  setEdPercent = () => { },
  pctAxesArrivee = 40,
  setPctAxesArrivee = () => { },
  pctAxesDepart = 60,
  setPctAxesDepart = () => { },
  apiBaseUrl = "http://localhost:8000/api",
  resultats = null,
  totaux = null,
  hasSimulated = false,
  simDirty = false,
  idleMinutes = 0,
  setIdleMinutes = () => { },
  // New persist props
  volumesFluxGrid = null,
  setVolumesFluxGrid = () => { },
  tauxComplexite = 1,
  setTauxComplexite = () => { },
  natureGeo = 1,
  setNatureGeo = () => { },
  pctCollecte = 0,
  setPctCollecte = () => { },
  pctRetour = 0,
  setPctRetour = () => { },
  shift = 1,
  setShift = () => { },
  nbrCoSac = 0,
  setNbrCoSac = () => { },
  nbrCrSac = 0,
  setNbrCrSac = () => { },
  crParCaisson = 500,
  setCrParCaisson = () => { },
  pctInternational = 0,
  setPctInternational = () => { },
  pctMarcheOrdinaire = 0,
  setPctMarcheOrdinaire = () => { },
  Card,
  Field,
  Input,
  Select,
  categories = [],
  selectedTypology = "",
  setSelectedTypology = () => { },
}) {
  // 🔄 Lecture des données de replay depuis location.state
  const location = useLocation();
  const navigate = useNavigate();
  const replayData = location.state?.replayData;

  const [error, setError] = useState("");

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
  /* const [showDetailsModal, setShowDetailsModal] = useState(false); */
  const [activeModal, setActiveModal] = useState(null); // 'ACTUEL', 'CALC'
  const showDetailsModal = activeModal !== null;
  const setShowDetailsModal = (val) => setActiveModal(val ? 'CALC' : null); // Compatibilité ancienne API


  const [showDetails, setShowDetails] = useState(false);
  const [showMODDetails, setShowMODDetails] = useState(false);
  const [showMOIDetails, setShowMOIDetails] = useState(false);
  const [showRecapParams, setShowRecapParams] = useState(true); // 👁️ Affichage du contenu de la carte Rappel des paramètres




  // const [tauxComplexite, setTauxComplexite] = useState(1);
  // const [natureGeo, setNatureGeo] = useState(1);

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

  // --- TEST MODE LOGIC ---
  // --- Corrected Logic ---

  // Resolve centre object
  const centreObj = useMemo(() => {
    if (!centre) return null;
    if (typeof centre === "object") return centre;
    return (
      centres.find(
        (c) => String(c.id ?? c.value ?? c.code) === String(centre)
      ) || null
    );
  }, [centre, centres]);

  const centreLabel = useMemo(() => {
    if (centreObj) return centreObj.label || centreObj.name || centreObj.nom || "";
    if (!centre || !centres || centres.length === 0) return "";
    const c = centres.find(ct => String(ct.id) === String(centre));
    return c?.nom || c?.label || c?.name || "";
  }, [centreObj, centres, centre]);

  const recapItems = useMemo(() => {
    const pct = (v) => `${formatUnit(v, 0)}%`;
    const num0 = (v) => formatUnit(v, 0);
    const num2 = (v) => formatUnit(v, 2);
    return [
      { label: "Centre", value: centreLabel || "—" },
      { label: "Productivite", value: pct(productivite) },
      { label: "Temps mort", value: `${num0(idleMinutes)} min` },
      { label: "Shift", value: num0(shift) },
      { label: "Taux complexite", value: num2(tauxComplexite) },
      { label: "Nature geo", value: num2(natureGeo) },
      { label: "Axes arrivee", value: pct(pctAxesArrivee) },
      { label: "Axes depart", value: pct(pctAxesDepart) },
      { label: "Collecte", value: pct(pctCollecte) },
      { label: "Retour", value: pct(pctRetour) },
      { label: "International", value: pct(pctInternational) },
      { label: "Marche ordinaire", value: pct(pctMarcheOrdinaire) },
      { label: "ED %", value: pct(edPercent) },
      { label: "Colis amana/sac", value: num0(colisAmanaParSac) },
      { label: "Courriers/sac", value: num0(courriersParSac) },
      { label: "Colis/collecte", value: num0(colisParCollecte) },
      { label: "Nbr CO sac", value: num0(nbrCoSac) },
      { label: "Nbr CR sac", value: num0(nbrCrSac) },
      { label: "CR par caisson", value: num0(crParCaisson) },
      { label: "Sacs", value: num0(sacs) },
      { label: "Colis", value: num0(colis) },
      { label: "CO", value: num0(cOrd) },
      { label: "CR", value: num0(cReco) },
      { label: "E-barkia", value: num0(eBarkia) },
      { label: "LRH", value: num0(lrh) },
      { label: "Amana", value: num0(amana) },
    ];
  }, [
    centreLabel,
    productivite,
    idleMinutes,
    shift,
    tauxComplexite,
    natureGeo,
    pctAxesArrivee,
    pctAxesDepart,
    pctCollecte,
    pctRetour,
    pctInternational,
    pctMarcheOrdinaire,
    edPercent,
    colisAmanaParSac,
    courriersParSac,
    colisParCollecte,
    nbrCoSac,
    nbrCrSac,
    crParCaisson,
    sacs,
    colis,
    cOrd,
    cReco,
    eBarkia,
    lrh,
    amana,
  ]);

  const isTestMode = useMemo(() => {
    return (resultats?.centre_label || "").toLowerCase().includes("test");
  }, [resultats]);

  useEffect(() => {
    if (centreObj) console.log("🔍 [VueCentre] Centre Loaded:", centreObj);
  }, [centreObj]);

  const effectiveCentreCategorie =
    centreCategorie ||
    centreObj?.categorie ||
    centreObj?.category ||
    centreObj?.categorie_label ||
    "";

  // 🐛 DEBUG: Afficher la catégorie effective
  console.log("🔍 [VueCentre] effectiveCentreCategorie:", effectiveCentreCategorie);

  // 🆕 Disabled Axes Logic (AM)
  const disabledAxes = useMemo(() => {
    return (
      (effectiveCentreCategorie || "").startsWith("AM") ||
      (centreObj?.type_site || "").startsWith("AM") ||
      (centreObj?.typologie || "").startsWith("AM")
    );
  }, [effectiveCentreCategorie, centreObj]);

  const calculateVolFromGrid = useCallback(() => {
    const baseVols = {
      cOrd: annualParsed.cOrd ?? Number(cOrd || 0),
      cReco: annualParsed.cReco ?? Number(cReco || 0),
      amana: annualParsed.amana ?? Number(amana || 0),
      eBarkia: annualParsed.eBarkia ?? Number(eBarkia || 0),
      lrh: annualParsed.lrh ?? Number(lrh || 0),
      sacs: Number(sacs || 0),
      colis: Number(colis || 0),
    };

    if (volumesFluxGrid && volumesFluxGrid.length > 0) {
      const getSum = (tag) => {
        const sum = volumesFluxGrid
          .filter((row) => {
            const f = (row.flux || "").toLowerCase();
            return f === tag || (tag === "ebarkia" && f === "eb");
          })
          .reduce((acc, cur) => acc + (Number(cur.volume) || 0), 0);

        // Si la somme est 0 dans la grille, on garde la valeur de base (prop/state)
        return sum > 0 ? sum : null;
      };

      return {
        cOrd: getSum("co") ?? baseVols.cOrd,
        cReco: getSum("cr") ?? baseVols.cReco,
        amana: getSum("amana") ?? baseVols.amana,
        eBarkia: getSum("ebarkia") ?? baseVols.eBarkia,
        lrh: getSum("lrh") ?? baseVols.lrh,
        sacs: baseVols.sacs,
        colis: baseVols.colis,
      };
    }
    return baseVols;
  }, [volumesFluxGrid, annualParsed, cOrd, cReco, amana, eBarkia, lrh, sacs, colis]);

  const handleNavigateToCategorisation = useCallback(async () => {
    if (!centreId) return;

    const currentVolumes = calculateVolFromGrid();

    const simulationResults = resultats ? {
      postes: resultats.postes,
      total_heures: resultats.total_heures,
      total_etp_calcule: resultats.total_etp_calcule,
      total_etp_arrondi: resultats.total_etp_arrondi ?? 0, // Fallback to resultats or 0
      total_ecart: resultats.ecart_total ?? 0, // Fallback to resultats or 0
      acheminement_score: (pctAxesArrivee > 0 && pctAxesDepart > 0) ? 100 : 0
    } : null;

    let enrichedCentreInfo = { ...centreObj };
    if (centreObj?.id_categorisation) {
      try {
        const catList = await api.categorisations();
        const currentCat = catList.find(c => c.id === centreObj.id_categorisation);
        if (currentCat) enrichedCentreInfo.categorisation_label = currentCat.label;
      } catch (e) { }
    }

    navigate(`/app/simulation/categorisation/${centreId}`, {
      state: {
        simulationResults,
        centreInfo: enrichedCentreInfo,
        volumes: currentVolumes
      }
    });
  }, [centreId, calculateVolFromGrid, resultats, pctAxesArrivee, pctAxesDepart, centreObj, navigate]);

  const handleToggleDetails = useCallback(() => {
    setShowDetails((prev) => {
      const next = !prev;
      if (!next) {
        setShowMODDetails(false);
        setShowMOIDetails(false);
        setActiveModal(null);
      }
      return next;
    });
  }, []);

  const handleNavigateToAdequation = useCallback(() => {
    if (!centreId) return;
    const centreLabel =
      centreObj?.label || centreObj?.name || resultats?.centre_label || "Centre";

    // Préparer les résultats de simulation pour la page Index Adéquation
    const simulationResults = resultats ? {
      postes: Array.isArray(resultats) ? resultats : (resultats.postes || []),
      total_heures: totaux?.total_heures || 0,
      total_etp_calcule: totaux?.total_etp_calcule || 0,
      total_etp_arrondi: totaux?.total_etp_arrondi || 0,
    } : null;

    navigate("/app/simulation/index_Adequation", {
      state: {
        centreId,
        centreLabel,
        simulationResults,
        centreInfo: {
          label: centreLabel,
          categorie: centreCategorie,
        }
      },
    });
  }, [centreId, centreObj, resultats, totaux, centreCategorie, navigate]);

  // 🆕 Handlers pour les cartes de menu
  const handleNavigateToSaisonnalite = useCallback(() => {
    if (!centreId) return;
    navigate("/app/simulation/saisonnalite", {
      state: { centreId, centreLabel: centreObj?.label || centreObj?.name || "Centre" },
    });
  }, [centreId, centreObj, navigate]);

  const handleNavigateToOrganogramme = useCallback(() => {
    if (!centreId) return;
    navigate("/app/simulation/organigramme", {
      state: { centreId, centreLabel: centreObj?.label || centreObj?.name || "Centre" },
    });
  }, [centreId, centreObj, navigate]);

  const handleNavigateToCapaciteNominale = useCallback(() => {
    if (!centreId) return;
    navigate("/app/simulation/capacite_nominale", {
      state: { centreId, centreLabel: centreObj?.label || centreObj?.name || "Centre" },
    });
  }, [centreId, centreObj, navigate]);

  const handleNavigateToComparatifs = useCallback(() => {
    if (!centreId) return;
    navigate("/app/simulation/comparatifs", {
      state: { centreId, centreLabel: centreObj?.label || centreObj?.name || "Centre" },
    });
  }, [centreId, centreObj, navigate]);

  const handleNavigateToNbre = useCallback(() => {
    if (!centreId) return;
    navigate("/app/simulation/nbre", {
      state: { centreId, centreLabel: centreObj?.label || centreObj?.name || "Centre" },
    });
  }, [centreId, centreObj, navigate]);

  const handleNavigateToEconomies = useCallback(() => {
    if (!centreId) return;
    navigate("/app/simulation/economies", {
      state: { centreId, centreLabel: centreObj?.label || centreObj?.name || "Centre" },
    });
  }, [centreId, centreObj, navigate]);



  /* ✅ Export CSV */
  const handleExportCSV = useCallback(() => {
    if (!centreId) return;

    const allowedAnnual = (fluxKey, value) => {
      const mode = getEffectiveFluxMode(effectiveCentreCategorie, fluxKey);
      return mode === "input" ? Number(value || 0) : 0;
    };

    // Pour l'export, on s'appuie sur 'annualParsed' qui contient les valeurs parsées locales
    // au cas où l'utilisateur n'a pas encore "validé" par onBlur. 
    // Sinon on pourrait prendre les props cOrd, cReco, etc.
    const params = new URLSearchParams({
      centre_id: String(centreId),
      sacs: String(Number(sacs || 0)),
      colis: String(Number(colis || 0) + Number(amana || 0)),
      courrier_ordinaire: String(allowedAnnual("co", annualParsed.cOrd)),
      courrier_recommande: String(allowedAnnual("cr", annualParsed.cReco)),
      ebarkia: String(allowedAnnual("eb", annualParsed.eBarkia)),
      lrh: String(allowedAnnual("lrh", annualParsed.lrh)),
      amana: String(allowedAnnual("amana", annualParsed.amana)),
      colis_amana_par_sac: String(Number(colisAmanaParSac ?? 5)),
      courriers_par_sac: String(Number(courriersParSac ?? 4500)),
      productivite: String(productivite || 100),
      heures_net: String(baseHeuresNet || heuresNet || 8),
      idle_minutes: String(Number(idleMinutes || 0)),
      colis_par_collecte: String(Number(colisParCollecte ?? 1)),
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
    // Suppression des dépendances locales obsolètes
    colisAmanaParSac,
    courriersParSac,
    apiBaseUrl,
    productivite,
    baseHeuresNet,
    heuresNet,
    effectiveCentreCategorie,
    idleMinutes,
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
    let totalETPCalculeMOI = 0; // 🆕 Ajouté pour accumuler l'ETP MOI
    let totalETPArrondiMOI = 0; // 🆕 Ajouté
    let totalHeuresMOI = 0;

    let totalStatutMOD = 0;
    let totalAPSMOD = 0;
    let totalEtpStatMOD = 0;
    let totalEtpAPSMOD = 0;

    resultats.postes.forEach((poste) => {
      const effStat = Number(
        poste.effectif_actuel ?? poste.effectif_actuel ?? 0
      );
      if (poste.type_poste !== 'MOD') console.log(`Poste: ${poste.poste_label}, Type: ${poste.type_poste}`);
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

      const typePoste = (poste.type_poste || "").toUpperCase();
      const labelPoste = (poste.poste_label || "").toUpperCase();

      // 🚨 DÉTECTION MOI AGRESSIVE (Keywords prioritisés - Aligné avec VueIntervenant) 🚨
      const isMOIKeyword = labelPoste.includes("RECEVEUR") ||
        labelPoste.includes("CHEF") ||
        labelPoste.includes("DIRECTEUR") ||
        labelPoste.includes("GERANT") ||
        labelPoste.includes("RESPONSABLE") ||
        labelPoste.includes("ADJOINT") ||
        labelPoste.includes("ASSISTANT") ||
        labelPoste.includes("ADMIN") ||
        labelPoste.includes("RH") ||
        labelPoste.includes("RESSOURCES") ||
        labelPoste.includes("SECRETAIRE") ||
        labelPoste.includes("SUPPORT") ||
        labelPoste.includes("QUALITE") ||
        labelPoste.includes("PILOTE") ||
        labelPoste.includes("COORDINATEUR") ||
        labelPoste.includes("ENCADR") ||
        labelPoste.includes("SUPERVISEUR");

      const isMOI = typePoste === "MOI" ||
        typePoste === "INDIRECT" ||
        typePoste === "STRUCTURE" ||
        isMOIKeyword;

      if (isMOI) {
        // 🆕 EXIGENCE CLIENT : Pour MOI, on considère l'effectif actuel comme la référence

        // Force visuel pour le tableau : AFFICHER MOI
        const displayPoste = {
          ...posteData,
          type_poste: "MOI", // Force le tag visuel
          etp_calcule: posteData.etp_calcule, // Keep calculated value
          etp_arrondi: effStat,
          ecart: 0
        };
        MOI.push(displayPoste);

        totalEffectifMOI += effStat;
        totalHeuresMOI += poste.total_heures || 0;

        // Totaux KPI (MOI = 1 pour 1 poste présent)
        totalETPCalculeMOI += (posteData.etp_calcule || 0);
        totalETPArrondiMOI += effStat;
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

    // 🚨 Logique supprimée : On ne force plus MOI fictif à 1 si non trouvé, pour alignement strict avec les données réelles et VueIntervenant.
    // if (MOI.length === 0) { ... }

    return {
      rowsMOD: MOD,
      rowsMOI: MOI,
      totalsMOD: {
        effectif: totalEffectifMOD,
        etpCalcule: totalETPCalculeMOD,
        etpArrondi: Math.round(totalETPCalculeMOD), //  Top-Down: Arrondi du total (RÉFÉRENCE pour KPI)
        ecart: Math.round(totalETPCalculeMOD) - totalEffectifMOD,
        heures: totalHeuresMOD,
        effectifStatutaire: totalStatutMOD,
        effectifAPS: totalAPSMOD,
        etpStatutaire: totalEtpStatMOD,
        etpAPS: totalEtpAPSMOD,
      },
      totalsMOI: {
        // 🚨 FORCE VISUEL DEMANDÉ : MOI TOUJOURS À 1 (Sauf écart)
        effectif: totalEffectifMOI,
        heures: totalHeuresMOI,
        effectifStatutaire: totalEffectifMOI,
        effectifAPS: 0,
        etpCalcule: totalETPCalculeMOI,
        etpArrondi: totalETPArrondiMOI,
        ecart: totalETPArrondiMOI - totalEffectifMOI,
      },
    };
  }, [resultats]);

  /* ===================== KPI ===================== */
  const kpi = useMemo(() => {
    const effMOD = totalsMOD.effectif ?? 0;
    const effMOI = totalsMOI.effectif ?? 0;
    const effTotal = effMOD + effMOI;

    // 🚨 ALIGNEMENT VUE INTERVENANT : Utiliser `totaux.fte_calcule` si disponible (Backend) pour garantir la cohérence
    const etpCalcMOD = (totaux && typeof totaux.fte_calcule === 'number')
      ? totaux.fte_calcule
      : (totalsMOD.etpCalcule ?? 0);
    const etpCalcMOI = totalsMOI.etpCalcule ?? 0;
    const etpCalc = etpCalcMOD + etpCalcMOI;

    const effStatMOD = totalsMOD.effectifStatutaire ?? 0;

    // ✅ APS : Priorité à la valeur globale T_APS du centre (Database)
    const valAPS = (centreObj && (centreObj.t_aps_global ?? centreObj.aps_legacy ?? centreObj.T_APS ?? centreObj.t_aps));

    // Suppression du mapping temporaire pour utiliser la valeur réelle de la base de données
    const finalAPS = valAPS;

    let apsGlobal = (finalAPS !== undefined && finalAPS !== null) ? Number(finalAPS) : null;
    const effAPSMOD = apsGlobal !== null ? apsGlobal : (totalsMOD.effectifAPS ?? 0);

    // ✅ NOUVELLE LOGIQUE D'ARRONDI (Demande User)
    // MOD_arrondi = round(MOD_calculé)
    let etpArrMOD = Math.round(etpCalcMOD);

    // ⚠️ CORRECTIF : MOI Arrondi doit refléter l'Effectif Actuel (Structurel) et non le calculé
    const etpArrMOI = effMOI > 0 ? effMOI : Math.round(etpCalcMOI);

    // --- EVALUATION PROTECTION / OVERRIDE (Alignement VueIntervenant) ---
    const statutaireCalcInit = etpArrMOD + etpArrMOI;
    const statutaireActuel = effStatMOD + effMOI;
    const apsTheorique = Math.max(0, statutaireCalcInit - statutaireActuel);
    const totalCalcInit = statutaireCalcInit + apsTheorique;
    const totalActuel = effMOD + effMOI + effAPSMOD;

    let etpAPSMOD = apsTheorique;

    // Si le besoin calculé total est inférieur à l'actuel -> On Override pour protéger (Afficher Actuel)
    if (totalCalcInit < totalActuel) {
      etpArrMOD = effMOD;
      // MOI reste effMOI
      etpAPSMOD = effAPSMOD;
    }

    const etpArr = etpArrMOD + etpArrMOI + etpAPSMOD; // Total Arrondi Final (Incluant APS)

    // Recalcul des écarts (basé sur l'arrondi potentiellement surchargé)
    const effActuelTotal = effMOD + effMOI + effAPSMOD;
    const ecart = effActuelTotal - etpArr;
    const ecartMOD = effMOD - etpArrMOD;
    const ecartMOI = effMOI - etpArrMOI;

    // Écart APS (toujours 0 car on vise 0 APS)
    const ecartAPS = effAPSMOD - etpAPSMOD;

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
      etpAPSMOD, // APS calculé selon nouvelle règle
      ecartAPS,
      apsBrut: apsGlobal ?? 0,
    };
  }, [totalsMOD, totalsMOI, centreObj]);
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
    showPreciseCalc = true,
    showHours = true,
    totals = null,
    emptyLabel = "Aucune donnée",
    hasAPS = true,
    fullPrecision = false,
    showActuel = true, // 🆕 Prop pour masquer/afficher Actuel
  }) => {
    // 🆕 Override hasAPS if test mode
    hasAPS = isTestMode ? false : hasAPS;
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
      if (fullPrecision) return formatSmallNumber(n, 2);
      return formatSmallNumber(n);
    };
    const displayArrondi = (v) => {
      const n = Number(v ?? 0);
      if (!Number.isFinite(n) || n === 0) return "";
      // 🆕 Modif: Ne pas forcer l'arrondi entier (Math.round).
      // Conserver les décimales si existent (cas MOI), sinon entier.
      return Number.isInteger(n) ? n : formatSmallNumber(n, 2);
    };

    // ✅ 3) Recul des totaux (SOMMES BRUTES)
    const summedTotals = groupedRows.reduce(
      (acc, group) => {
        const first = group.equivalents[0] || {};

        const effStat = Number(
          first.effectif_statutaire ?? first.effectif_actuel ?? 0
        );
        const effAPS = Number(first.effectif_aps ?? 0);

        const etpStat = Number(first.etp_calcule ?? 0);
        const etpAPS = Number(first.etp_aps ?? 0);
        const heures = Number(first.total_heures ?? 0);

        acc.effectifStatutaire += effStat;
        acc.effectifAPS += effAPS;
        acc.etpStatutaire += etpStat;
        acc.etpAPS += etpAPS;
        acc.heures += heures;

        return acc;
      },
      {
        effectifStatutaire: 0,
        effectifAPS: 0,
        etpStatutaire: 0,
        etpAPS: 0,
        etpArrondi: 0, // Sera écrasé
        heures: 0,
        ecart: 0, // Sera écrasé
      }
    );

    // 🚨 REGLE D'ARRONDI TOTAL : On arrondit le TOTAL CALCULÉ (Règle du 0.5)
    // Au lieu de la somme des arrondis individuels
    const etpArrondiGlobal = Math.round(summedTotals.etpStatutaire);

    // Recalcul de l'écart global cohérent (Cible - Actuel)
    const ecartGlobal = etpArrondiGlobal - summedTotals.effectifStatutaire;

    const aggregatedTotals = {
      ...summedTotals,
      etpArrondi: etpArrondiGlobal,
      ecart: ecartGlobal
    };

    // ✅ On utilise ce qu’on a reçu en props si présent, sinon le recalcul
    const finalTotals = totals || aggregatedTotals;

    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[920px] w-full text-[11px] border-collapse">
          {/* ===== En-têtes ===== */}
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr className="text-left text-slate-700 border-b border-slate-200">
              <th rowSpan={2} className="px-4 py-2 font-bold border-r border-slate-200">
                Position
              </th>

              <th
                rowSpan={2}
                className="px-3 py-2 font-bold text-center border-r border-slate-200"
              >
                Type
              </th>

              {!isTestMode && showActuel && (
                <th
                  colSpan={hasAPS ? 2 : 1}
                  className="px-2 py-2 font-bold text-center border-r border-slate-200 bg-slate-100/50"
                >
                  Effectif actuel
                </th>
              )}

              {showCalc && (
                <>
                  <th
                    colSpan={showPreciseCalc ? 2 : 1}
                    className="px-2 py-2 font-bold text-center border-r border-slate-200 bg-blue-50/30"
                  >
                    Effectif calculé
                  </th>
                  {!isTestMode && (
                    <th
                      rowSpan={2}
                      className="px-3 py-2 font-bold text-right border-r border-slate-200"
                    >
                      Écart
                    </th>
                  )}
                </>
              )}

              {showHours && (
                <th
                  rowSpan={2}
                  className="px-3 py-2 font-bold text-right"
                >
                  Total heures
                </th>
              )}
            </tr>

            <tr className="text-slate-600 border-b border-slate-200">
              {/* Effectif actuel - Sub-headers */}
              {!isTestMode && showActuel && (
                <>
                  <th className="px-2 py-1 text-center font-semibold border-r border-slate-200 bg-slate-100/50">
                    Statutaire
                  </th>
                  {hasAPS && (
                    <th className="px-2 py-1 text-center font-semibold border-r border-slate-200 bg-slate-100/50">
                      APS
                    </th>
                  )}
                </>
              )}

              {/* Effectif calculé - Sub-headers */}
              {showCalc && (
                <>
                  {showPreciseCalc && (
                    <th className="px-2 py-1 text-center font-semibold border-r border-slate-200 bg-blue-50/30">
                      Statutaire
                    </th>
                  )}
                  <th className="px-2 py-1 text-center font-semibold text-amber-700 bg-amber-50 border-r border-slate-200">
                    Arrondi
                  </th>
                </>
              )}
            </tr>
          </thead>

          {/* ===== Lignes ===== */}
          <tbody className="divide-y divide-slate-200">
            {groupedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={20}
                  className="px-4 py-8 text-center text-slate-500 italic"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              groupedRows.map((group) =>
                group.equivalents.map((equivalent, eqIndex) => {
                  const effStat = equivalent.effectif_statutaire ?? 0;
                  const effAPS = equivalent.effectif_aps ?? "";

                  const calcStat = equivalent.etp_calcule ?? 0;
                  const calcAPS = equivalent.etp_aps ?? 0;

                  const cibleArrondi = equivalent.etp_arrondi ?? Math.round(calcStat);
                  const ecart = (effStat + (Number(effAPS) || 0)) - cibleArrondi;

                  const ecartColor =
                    ecart < 0
                      ? "text-emerald-700 bg-emerald-50"
                      : ecart > 0
                        ? "text-rose-700 bg-rose-50"
                        : "text-slate-500";

                  // Highlight écart cell slightly if non-zero
                  const ecartCellClass = Number(ecart || 0) !== 0 ? ecartColor : "";

                  const hasEcart = Number(ecart || 0) !== 0;

                  return (
                    <tr
                      key={`${group.mainPost}-${eqIndex}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Position */}
                      <td
                        className={`px-4 py-2 align-top font-medium text-slate-900 border-r border-slate-200 ${eqIndex === 0
                          ? "bg-white"
                          : "bg-slate-50/30"
                          }`}
                      >
                        {group.mainPost}
                      </td>

                      {/* Type */}
                      <td className="px-3 py-1.5 text-center border-r border-slate-200">
                        <span
                          className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase shadow-sm border ${(equivalent.type_poste || "").toUpperCase() === "MOD"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100"
                            }`}
                        >
                          {equivalent.type_poste || "MOD"}
                        </span>
                      </td>

                      {/* Effectif actuel */}
                      {!isTestMode && showActuel && (
                        <>
                          <td className="px-2 py-1.5 text-center font-mono tabular-nums border-r border-slate-200 bg-slate-50/30">
                            {eqIndex === 0 ? displayInt(effStat) : 0}
                          </td>
                          {hasAPS && (
                            <td className="px-2 py-1.5 text-center font-mono tabular-nums border-r border-slate-200 bg-slate-50/30">
                              {eqIndex === 0 ? displayInt(effAPS) : 0}
                            </td>
                          )}
                        </>
                      )}

                      {/* Effectif calculé */}
                      {showCalc && (
                        <>
                          {showPreciseCalc && (
                            <td className="px-2 py-1.5 text-center font-mono tabular-nums text-blue-700 border-r border-slate-200 font-medium">
                              {eqIndex === 0 ? displayDec(calcStat) : 0}
                            </td>
                          )}
                          {/* Arrondi */}
                          <td className="px-2 py-1.5 text-center font-mono tabular-nums text-amber-800 font-bold bg-amber-50/50 border-r border-slate-200 text-xs">
                            {eqIndex === 0
                              ? (equivalent.type_poste === 'MOI' ? '-' : displayArrondi(equivalent.etp_arrondi))
                              : 0}
                          </td>

                          {/* Écart */}
                          {!isTestMode && (
                            <td className={`px-3 py-1.5 text-right font-mono tabular-nums font-bold border-r border-slate-200 ${ecartCellClass}`}>
                              {hasEcart && (
                                <span>
                                  {ecart > 0 ? `+${Math.round(ecart)}` : Math.round(ecart)}
                                </span>
                              )}
                            </td>
                          )}
                        </>
                      )}

                      {/* Heures */}
                      {showHours && (
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-500 text-[10px]">
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

            {/* ===== Ligne APS (avant TOTAL) ===== */}
            {finalTotals && groupedRows.length > 0 && !isTestMode && (
              <tr className="bg-blue-50 border-t-2 border-blue-100 font-semibold text-blue-900">
                <td
                  colSpan={2}
                  className="px-3 py-2 text-left text-xs uppercase tracking-wider border-r border-blue-100"
                >
                  APS Global
                </td>

                {/* APS Actuel */}
                {!isTestMode && showActuel && (
                  <>
                    <td className="px-2 py-1.5 text-center border-r border-blue-100">-</td>
                    {hasAPS && (
                      <td className="px-2 py-1.5 text-center border-r border-blue-100">
                        {finalTotals.effectifAPS ?? 0}
                      </td>
                    )}
                  </>
                )}

                {/* APS Calculé */}
                {showCalc && (
                  <>
                    {showPreciseCalc && (
                      <td className="px-2 py-1.5 text-center border-r border-blue-100">-</td>
                    )}
                    {/* Arrondi APS */}
                    <td className="px-2 py-1.5 text-center border-r border-blue-100">-</td>

                    {!isTestMode && (
                      <td className="px-3 py-1.5 text-center border-r border-blue-100">-</td>
                    )}
                  </>
                )}

                {showHours && (
                  <td className="px-3 py-1.5 text-right font-mono">-</td>
                )}
              </tr>
            )}

            {/* ===== Ligne TOTAL ===== */}
            {finalTotals && groupedRows.length > 0 && (
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                <td
                  colSpan={2}
                  className="px-4 py-3 text-left uppercase tracking-wider text-xs border-r border-slate-300"
                >
                  Total Général
                </td>

                {/* 🔹 Effectif actuel total */}
                {!isTestMode && showActuel && (
                  <>
                    <td className="px-2 py-2 text-center font-mono tabular-nums border-r border-slate-300 text-xs">
                      {finalTotals.effectifStatutaire ?? finalTotals.effectif ?? ""}
                    </td>

                    {hasAPS && (
                      <td className="px-2 py-2 text-center font-mono tabular-nums border-r border-slate-300 text-xs">
                        {finalTotals.effectifAPS ?? 0}
                      </td>
                    )}
                  </>
                )}

                {/* 🔹 Effectif calculé total */}
                {showCalc && (
                  <>
                    {showPreciseCalc && (
                      <td className="px-2 py-2 text-center font-mono tabular-nums text-blue-800 border-r border-slate-300 text-xs">
                        {displayDec(finalTotals.etpStatutaire ?? finalTotals.etp_calcule)}
                      </td>
                    )}

                    <td className="px-2 py-2 text-center font-mono tabular-nums bg-amber-100/50 text-amber-900 border-r border-slate-300 text-sm">
                      {finalTotals.etpArrondi ?? finalTotals.etp_arrondi}
                    </td>

                    {!isTestMode && (
                      <td
                        className={`px-3 py-2 text-right font-mono tabular-nums border-r border-slate-300 text-sm ${finalTotals.ecart < 0
                          ? "text-emerald-700"
                          : finalTotals.ecart > 0
                            ? "text-rose-700"
                            : "text-slate-700"
                          }`}
                      >
                        {finalTotals.ecart > 0
                          ? `+${Math.round(finalTotals.ecart)}`
                          : Math.round(finalTotals.ecart)}
                      </td>
                    )}
                  </>
                )}

                {/* 🔹 Total heures */}
                {showHours && (
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-800 text-xs">
                    {formatNumber(finalTotals.heures || finalTotals.total_heures)}
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  /* ===================== Override Logic Effectif Calculé (Cas A) ===================== */
  const effActuelStatutaire = (kpi.effStatMOD || 0) + (kpi.effMOI || 0);
  const effCalculeGlobal = (kpi.etpCalcMOD || 0) + (kpi.effMOI || 0); // Statutaire Calculé (Calculé MOD + MOI Actuel/Cible)

  const needOverrideCentre = !isTestMode && (effCalculeGlobal > effActuelStatutaire); // Besoin > Actuel

  // 1️⃣ Variables pour Effectif Calculé
  // Footer Breakdown Logic
  const dispCalcMOD_Centre = needOverrideCentre ? kpi.effStatMOD : kpi.etpCalcMOD;
  const dispCalcMOI_Centre = kpi.effMOI; // MOI Target = MOI Actuel

  // Footer Statutaire Total: somme affichée (Step 90) -> Si override, c'est l'actuel
  const dispCalcStatutaireTotal_Centre = dispCalcMOD_Centre + dispCalcMOI_Centre;

  // Footer APS: Effectif Calculé Réellement - Statutaire Calculé (Affiché) (Step 129)
  const dispCalcAPS_Centre = Math.max(0, effCalculeGlobal - dispCalcStatutaireTotal_Centre);

  // Main Total Calculé: DOIT ÊTRE LA VALEUR RÉELLE CALCULÉE (Step 54)
  // "Dans la carte effectif calculé total met la meme valeur que statutaire calculé"
  const dispMainTotalCalcul_Centre = effCalculeGlobal;


  // 2️⃣ Variables pour Effectif Arrondi
  // Footer Statutaire Total: Arrondi du Statutaire Calculé RÉEL (Step 48)
  const dispArrStatutaireTotal_Centre = Math.round(effCalculeGlobal);

  // Footer APS: Arrondi de l'APS affiché dans la carte Calculé (Step 113)
  const dispArrAPSTotal_Centre = Math.round(dispCalcAPS_Centre);

  // Breakdown Arrondi (pour Ecart MOD)
  // Si override, on aligne l'arrondi MOD affiché sur l'actuel, sinon arrondi standard
  const dispArrMOD_Centre = needOverrideCentre ? kpi.effStatMOD : kpi.etpArrMOD;
  const dispArrMOI_Centre = kpi.effMOI;

  // Main Total Arrondi: Arrondi du Statutaire Calculé RÉEL (Step 65)
  const dispMainTotalArrondi_Centre = Math.round(effCalculeGlobal);


  // 3️⃣ Variables pour Écart Total
  // Main Total Ecart: Effectif Actuel Total - Effectif Arrondi Affiché (Step 80)
  // Actuel Total = effActuelStatutaire + (kpi.effAPSMOD || 0)
  // Arrondi Affiché = dispMainTotalArrondi_Centre
  const dispEcartTotal_Centre = (effActuelStatutaire + (kpi.effAPSMOD || 0)) - dispMainTotalArrondi_Centre;

  // Footer Ecarts
  // Ecart Statutaire: Actuel Statutaire - Arrondi Statutaire (Step 75)
  const dispEcartStatutaire_Centre = effActuelStatutaire - dispArrStatutaireTotal_Centre;

  // Ecart MOD: MOD Actuel - MOD Arrondi Affiché (Step 85)
  const dispEcartMOD_Centre = kpi.effStatMOD - dispArrMOD_Centre;

  // Ecart MOI
  const dispEcartMOI_Centre = kpi.effMOI - dispArrMOI_Centre; // 0

  // Ecart APS: Actuel APS - Arrondi APS (Step 70 implicit)
  const dispEcartAPS_Centre = (kpi.effAPSMOD || 0) - dispArrAPSTotal_Centre;

  /* ===================== Rendu ===================== */
  return (
    <div className="space-y-1" style={{ zoom: "90%" }}>
      {/* 1️⃣ Bandeau selection centre */}
      <div className="sticky top-[57px] z-20">

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


          {/* 🆕 Sélecteur Typologie */}
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <Tag className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Typologie
              </label>
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate text-left disabled:opacity-50"
                value={selectedTypology ?? ""}
                onChange={(e) => setSelectedTypology(e.target.value)}
                disabled={!region}
              >
                <option value="">Toutes</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
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



        </div>

      </div>
      {hasSimulated && (
        <Card
          title={<span className="text-[11px] font-semibold">Rappel des parametres utilises</span>}
          headerRight={
            <button
              type="button"
              onClick={() => setShowRecapParams(prev => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {showRecapParams ? (
                <EyeOff className="w-3 h-3 text-slate-500" />
              ) : (
                <Eye className="w-3 h-3 text-slate-500" />
              )}
              <span>{showRecapParams ? "Masquer" : "Afficher"}</span>
            </button>
          }
          bodyClassName="!p-2"
        >
          {showRecapParams && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {recapItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white/70 px-2 py-1"
                  >
                    <span className="text-[10px] text-slate-500">{item.label}</span>
                    <span className="text-[11px] font-semibold text-slate-700">{item.value}</span>
                  </div>
                ))}
              </div>
              {simDirty && (
                <div className="mt-2 text-[10px] text-amber-600">
                  Parametres modifies depuis la derniere simulation.
                </div>
              )}
            </>
          )}
        </Card>
      )}



      {/* Résultats */}
      {
        !hasSimulated ? (
          <Card title="Résultats de Simulation">
            <div className="text-xs text-slate-600">
              Aucune simulation disponible. Lancez la simulation depuis la page Intervenant.
            </div>
          </Card>
        ) : simDirty ? (
          <Card title="Résultats de Simulation">
            <div className="text-xs text-slate-600">
              Paramètres modifiés. Relancez la simulation depuis la page Intervenant.
            </div>
          </Card>
        ) : resultats && (
          <Card
            title={`Résultats pour : ${resultats.centre_label}`}
            className="bg-gradient-to-r from-sky-50/60 to-cyan-50/60"
            headerRight={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleDetails}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-1 shadow-sm hover:bg-slate-50"
                >
                  {showDetails ? (
                    <EyeOff className="w-3 h-3 text-slate-500" />
                  ) : (
                    <Eye className="w-3 h-3 text-slate-500" />
                  )}
                  <span className="text-[10px] sm:text-xs">
                    {showDetails ? "Masquer détails" : "Afficher détails"}
                  </span>
                </button>

                {showDetails && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowDetailsModal(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 shadow-sm hover:bg-blue-100"
                    >
                      <Eye className="w-3 h-3 text-blue-600" />
                      <span className="text-[10px] sm:text-xs font-semibold text-blue-700">Vue Détaillée</span>
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
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
                      <span className="text-[10px] sm:text-xs">
                        Détails Positions MOD
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
                      <span className="text-[10px] sm:text-xs">MOI / Autres</span>
                    </button>

                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleNavigateToCategorisation}
                  className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 shadow-sm hover:bg-indigo-100 transition-colors"
                  title="Accéder à la catégorisation"
                >
                  <Sliders className="w-3 h-3 text-indigo-600" />
                  <span className="text-[10px] sm:text-xs font-semibold text-indigo-700">Catégorisation</span>
                </button>
              </div>
            }
          >
            {/* 👉 La grille qui contient les 4 cartes KPI */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${isTestMode ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4`}>
              {/* 1️⃣ Effectif actuel */}
              {
                !isTestMode && (
                  <KPICardGlass
                    label="Effectif actuel"
                    icon={UserRound}
                    tone="slate"
                    emphasize
                    total={totalGlobal}
                    toggleable
                    onToggle={() => setActiveModal('ACTUEL')}
                    isOpen={activeModal === 'ACTUEL'}
                    customFooter={
                      <EffectifFooter
                        totalLabel="Statutaire"
                        totalValue={kpi.effStatMOD + kpi.effMOI}
                        modValue={kpi.effStatMOD}
                        moiValue={kpi.effMOI}
                        apsLabel="APS"
                        apsValue={kpi.effAPSMOD}
                        showSpecialTag={Boolean(centreObj?.cas)}
                        casValue={centreObj?.cas}

                      />
                    }
                  />
                )
              }

              {/* 2️⃣ Effectif Calculé (Charge) */}
              <KPICardGlass
                label="Effectif Calculé"
                icon={Calculator}
                tone="blue"
                emphasize
                // Main Total: Calculé Réel sans override (Step 54)
                total={formatSmallNumber(dispMainTotalCalcul_Centre, 2)}
                toggleable
                onToggle={() => setActiveModal('CALC')}
                isOpen={activeModal === 'CALC'}
                customFooter={
                  <EffectifFooter
                    totalLabel="Statutaire"
                    // Footer Total: Somme affichée (Step 90)
                    totalValue={formatSmallNumber(dispCalcStatutaireTotal_Centre, 2)}
                    modValue={formatSmallNumber(dispCalcMOD_Centre, 2)}
                    moiValue={formatSmallNumber(dispCalcMOI_Centre, 0)}
                    apsLabel={isTestMode ? null : "APS"}
                    // Footer APS: 0 si override (Step 94)
                    apsValue={isTestMode ? 0 : formatSmallNumber(dispCalcAPS_Centre, 2)}
                  />
                }
              />

              {/* 3️⃣ Effectif Cible (Arrondi) */}
              <KPICardGlass
                label="Effectif Arrondi"
                icon={CheckCircle2}
                tone="amber"
                emphasize
                // Main Total: Arrondi Calculé Réel (Step 65)
                total={dispMainTotalArrondi_Centre}
                toggleable
                onToggle={() => setActiveModal('CALC')} // Arrondi partage la même vue que Calculé
                isOpen={activeModal === 'CALC'}
                customFooter={
                  <EffectifFooter
                    totalLabel="Statutaire"
                    // Footer Total: Arrondi Stautaire Réel (Step 48)
                    totalValue={dispArrStatutaireTotal_Centre}
                    modValue={dispArrMOD_Centre}
                    moiValue={dispArrMOI_Centre}
                    // Footer APS: Arrondi APS Réel (Step 60)
                    apsLabel={isTestMode ? null : "APS"}
                    apsValue={isTestMode ? 0 : formatSmallNumber(dispArrAPSTotal_Centre, 0)}
                  />
                }
              />


              {/* 4️⃣ Écart Total */}
              {
                !isTestMode && (
                  <KPICardGlass
                    label="Écart Total"
                    icon={dispEcartTotal_Centre < 0 ? TrendingDown : TrendingUp}
                    tone={dispEcartTotal_Centre < 0 ? "red" : "green"}
                    // Main Total: Actuel - Arrondi (Step 80)
                    total={
                      <>
                        {formatSmallNumber(dispEcartTotal_Centre, 0)}
                        <span className="text-[12px] font-normal ml-1 opacity-80">
                          ({dispEcartTotal_Centre > 0 ? "Surplus" : dispEcartTotal_Centre < 0 ? "Besoin" : "Équilibre"})
                        </span>
                      </>
                    }
                    toggleable
                    onToggle={() => setActiveModal('CALC')}
                    isOpen={activeModal === 'CALC'}
                    customFooter={
                      <EffectifFooter
                        totalLabel="Écart Statutaire"
                        // Footer Ecarts: Strict difference (Steps 75, 85)
                        totalValue={dispEcartStatutaire_Centre}
                        modValue={dispEcartMOD_Centre}
                        moiValue={formatSmallNumber(dispEcartMOI_Centre, 0)}
                        apsLabel="APS"
                        apsValue={formatSmallNumber(dispEcartAPS_Centre, 0)}
                      />
                    }
                  />
                )
              }

            </div >
          </Card >
        )
      }

      {/* 🏷️ SECTION SCORING & CATEGORISATION (Couche 2) */}
      {/* {resultats && (
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
      )} */}

      {/* Tables MOD / MOI */}
      {
        showDetails && showMODDetails && (
          <Card title="Positions MOD - Effectif actuel vs Effectif calculé">
            <Table
              rows={rowsMOD}
              showCalc
              totals={null}
            />
          </Card>
        )
      }

      {
        showDetails && showMOIDetails && (
          <Card title="Positions MOI - Effectif actuel">
            <Table
              rows={rowsMOI}
              totals={null}
              hasAPS={false}
              showCalc={false}
              showHours={false}
            />
          </Card>
        )
      }
      {/* 🔹 MODAL DETAILS */}
      {
        showDetailsModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Détails des Postes</h3>
                    <p className="text-xs text-slate-500">Vue complète des effectifs calculés</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6 bg-slate-50/30 space-y-8">
                <section>
                  <h4 className="flex items-center gap-2 font-bold mb-4 text-slate-800 text-sm uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    Tous les postes (MOD + MOI) ({rowsMOD.length + rowsMOI.length})
                  </h4>
                  <Table
                    rows={[...rowsMOD, ...rowsMOI]}
                    showActuel={true} // TOUJOURS afficher Actuel (Demandé pour le modal CALCULÉ aussi)
                    showCalc={activeModal === 'CALC'}     // Afficher Calculé seulement si modal CALC
                    showPreciseCalc={true}
                    fullPrecision={true}
                    hasAPS={activeModal === 'ACTUEL' || (kpi.apsBrut > 0)}
                    showHours={false}
                    totals={{
                      // Calculate totals directly from rows
                      effectifStatutaire: (kpi.effStatMOD || 0) + (kpi.effMOI || 0),
                      effectifAPS: kpi.apsBrut,
                      etpStatutaire: [...rowsMOD, ...rowsMOI].reduce((acc, r) => acc + (r.etp_statutaire || r.etp_calcule || 0), 0),
                      // TOTAL ETP CALCULE = MOD uniquement
                      etpCalcule: [...rowsMOD].reduce((acc, r) => acc + (r.etp_calcule || 0), 0),
                      etpArrondi: [...rowsMOD].reduce((acc, r) => acc + (r.etp_arrondi || 0), 0),
                      // Ecart = Somme des écarts individuels MOD (Arrondi - Actuel par ligne)
                      ecart: [...rowsMOD].reduce((acc, r) => {
                        const effStat = r.effectif_statutaire ?? 0;
                        const effAPS = r.effectif_aps ?? 0;
                        const cibleArrondi = r.etp_arrondi ?? 0;
                        return acc + ((effStat + (Number(effAPS) || 0)) - cibleArrondi);
                      }, 0),
                      heures: [...rowsMOD, ...rowsMOI].reduce((acc, r) => acc + (r.heures || 0), 0),
                    }}
                  />
                </section>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-white border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* 🆕 Grille de cartes de menu - Placée à la fin */}
      {centre && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {/* Simulation Saisonnalité */}
          <button
            onClick={handleNavigateToSaisonnalite}
            className="group relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 text-left transition-all hover:shadow-lg hover:scale-105 hover:border-blue-300"
          >
            <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calendar className="w-12 h-12 text-blue-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-blue-100">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-blue-900">Simulation Saisonnalité</h3>
            </div>
          </button>

          {/* Organogramme */}
          <button
            onClick={handleNavigateToOrganogramme}
            className="group relative overflow-hidden rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 p-4 text-left transition-all hover:shadow-lg hover:scale-105 hover:border-rose-300"
          >
            <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Layers className="w-12 h-12 text-rose-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-rose-100">
                  <Layers className="w-4 h-4 text-rose-600" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-rose-900">Organigramme</h3>
            </div>
          </button>

          {/* Catégorisation */}
          <button
            onClick={handleNavigateToCategorisation}
            className="group relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-4 text-left transition-all hover:shadow-lg hover:scale-105 hover:border-red-300"
          >
            <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sliders className="w-12 h-12 text-red-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-red-100">
                  <Sliders className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-red-900">Catégorisation</h3>
            </div>
          </button>

          {/* Index Adéquation */}
          <button
            onClick={handleNavigateToAdequation}
            className="group relative overflow-hidden rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-4 text-left transition-all hover:shadow-lg hover:scale-105 hover:border-sky-300"
          >
            <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 className="w-12 h-12 text-sky-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-sky-100">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-sky-900">Index Adéquation</h3>
            </div>
          </button>

          {/* Capacité Nominale */}
          <button
            onClick={handleNavigateToCapaciteNominale}
            className="group relative overflow-hidden rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50 p-4 text-left transition-all hover:shadow-lg hover:scale-105 hover:border-cyan-300"
          >
            <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-12 h-12 text-cyan-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-cyan-100">
                  <Users className="w-4 h-4 text-cyan-600" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-cyan-900">Capacité Nominale</h3>
            </div>
          </button>

          {/* Comparatifs */}
          <button
            onClick={handleNavigateToComparatifs}
            className="group relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 text-left transition-all hover:shadow-lg hover:scale-105 hover:border-amber-300"
          >
            <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart className="w-12 h-12 text-amber-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-amber-100">
                  <BarChart className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-amber-900">Comparatifs</h3>
            </div>
          </button>

          {/* Nbre */}
          <button
            onClick={handleNavigateToNbre}
            className="group relative overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 text-left transition-all hover:shadow-lg hover:scale-105 hover:border-indigo-300"
          >
            <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-12 h-12 text-indigo-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-indigo-100">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-indigo-900">Nbre</h3>
            </div>
          </button>

          {/* Economies */}
          <button
            onClick={handleNavigateToEconomies}
            className="group relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4 text-left transition-all hover:shadow-lg hover:scale-105 hover:border-emerald-300"
          >
            <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign className="w-12 h-12 text-emerald-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-emerald-100">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-emerald-900">Economies</h3>
            </div>
          </button>
        </div>
      )}
    </div >
  );
}

