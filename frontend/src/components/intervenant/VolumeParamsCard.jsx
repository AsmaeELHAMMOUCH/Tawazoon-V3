"use client";
import React, { useState, useEffect } from "react";
import {
  Mail,
  Archive,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Clock,
  Gauge,
  MapPin,
  Lock,
} from "lucide-react";

// 5 lignes : Amana, CO, CR, E-Barkia, LRH
const fluxRows = [
  { key: "amana", label: "Amana", icon: Package },
  { key: "co", label: "CO", icon: Mail },
  { key: "cr", label: "CR", icon: Mail },
  { key: "eb", label: "E-Barkia", icon: Mail },
  { key: "lrh", label: "LRH", icon: Archive },
];

// 🔢 Formatage milliers : 1000000 -> "1 000 000"
const formatThousands = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const str = String(value).replace(/\s+/g, "");
  if (str === "" || isNaN(Number(str))) return "";
  return Number(str)
    .toLocaleString("fr-FR")
    .replace(/\u202F/g, " "); // espace insécable -> espace normal
};

const unformat = (str) => str.replace(/\s+/g, "");

export default function VolumeParamsCard({
  // UI
  Card,
  Field,
  Input,

  // Data / state
  centre,
  centreCategorie,
  loading = {},

  // volumes globaux (Arrivée – Global)
  courrierOrdinaire,
  setCourrierOrdinaire,
  courrierRecommande,
  setCourrierRecommande,
  ebarkia,
  setEbarkia,
  lrh,
  setLrh,
  amana,
  setAmana,

  // params sacs
  colisAmanaParSac,
  setColisAmanaParSac,
  courriersParSac,
  setCourriersParSac,
  nbrCoSac,
  setNbrCoSac,
  nbrCrSac,
  setNbrCrSac,

  // collecte colis (gardé pour compat)
  colis,
  setColis,
  colisParCollecte,
  setColisParCollecte,

  // helpers
  parseNonNeg,
  toInput,
  monthly,
  formatInt,
  splitFlux,
  partParticuliers,
  setPartParticuliers,
  partProfessionnels,

  // rules
  getEffectiveFluxMode,

  // ➕ pour calcul heures nettes
  heures, // en heures
  tempsMortMinutes, // en minutes

  // action
  onSimuler,

  // état simulation
  simDirty,
}) {
  // ✅ style commun PROFESSIONAL DASHBOARD
  const baseInputClass =
    "text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300 disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed";

  // 👉 largeur UNIQUE pour tous les champs des 3 tableaux
  const CELL_WIDTH_PX = 85;
  const tableInputStyle = { height: "30px", width: `${CELL_WIDTH_PX}px` };

  // Arrivée (hors Global)
  const [arriveeState, setArriveeState] = useState(() =>
    Object.fromEntries(
      fluxRows.map((r) => [r.key, { part: "", pro: "", dist: "", axes: "" }])
    )
  );

  // Départ
  const [departState, setDepartState] = useState(() =>
    Object.fromEntries(
      fluxRows.map((r) => [
        r.key,
        { global: "", part: "", pro: "", dist: "", axes: "" },
      ])
    )
  );

  // Dépôt / Récupération
  const [depotRecupState, setDepotRecupState] = useState(() =>
    Object.fromEntries(fluxRows.map((r) => [r.key, { depot: "", recup: "" }]))
  );

  // 🔢 Heures nettes (premier output)
  const [heuresNet, setHeuresNet] = useState(null);

  const updateArrivee = (fluxKey, field, value) => {
    setArriveeState((prev) => ({
      ...prev,
      [fluxKey]: {
        ...prev[fluxKey],
        [field]: value,
      },
    }));
  };

  const updateDepart = (fluxKey, field, value) => {
    setDepartState((prev) => ({
      ...prev,
      [fluxKey]: {
        ...prev[fluxKey],
        [field]: value,
      },
    }));
  };

  const updateDepotRecup = (fluxKey, field, value) => {
    setDepotRecupState((prev) => ({
      ...prev,
      [fluxKey]: {
        ...prev[fluxKey],
        [field]: value,
      },
    }));
  };

  // helpers pour récupérer / setter le Global Arrivée suivant le flux
  const getGlobalArrivee = (key) => {
    switch (key) {
      case "amana":
        return amana;
      case "co":
        return courrierOrdinaire;
      case "cr":
        return courrierRecommande;
      case "eb":
        return ebarkia;
      case "lrh":
        return lrh;
      default:
        return undefined;
    }
  };

  const setGlobalArrivee = (key, v) => {
    switch (key) {
      case "amana":
        return setAmana(v);
      case "co":
        return setCourrierOrdinaire(v);
      case "cr":
        return setCourrierRecommande(v);
      case "eb":
        return setEbarkia(v);
      case "lrh":
        return setLrh(v);
      default:
        return;
    }
  };

  // 🔍 Détection des champs non applicables
  const hasNonApplicable = fluxRows.some(
    (row) => getEffectiveFluxMode(centreCategorie, row.key) !== "input"
  );

  // 🔢 Calcul heures nettes
  const computeHeuresNet = () => {
    const h = typeof heures === "number" ? heures : 0;
    const tm = typeof tempsMortMinutes === "number" ? tempsMortMinutes : 0;
    return (h * 60 - tm) / 60;
  };

  // buildVolumesFlux helper for onSimuler
  const buildVolumesFlux = () => {
    const list = [];
    const segmentsMap = {
      part: "PARTICULIER",
      pro: "PROFESSIONNEL",
      dist: "DISTRIBUTION",
      axes: "AXES",
      global: "GLOBAL"
    };

    fluxRows.forEach(row => {
      const fluxCode = row.key.toUpperCase();

      // Arrivée
      const arr = arriveeState[row.key] || {};
      Object.keys(arr).forEach(field => {
        const val = Number(arr[field] || 0);
        if (val > 0 && segmentsMap[field]) {
          list.push({ flux: fluxCode, sens: "ARRIVEE", segment: segmentsMap[field], volume: val });
        }
      });

      // Départ
      const dep = departState[row.key] || {};
      Object.keys(dep).forEach(field => {
        const val = Number(dep[field] || 0);
        if (val > 0 && segmentsMap[field]) {
          list.push({ flux: fluxCode, sens: "DEPART", segment: segmentsMap[field], volume: val });
        }
      });

      // Dépôt / Récup
      const dr = depotRecupState[row.key] || {};
      if (Number(dr.depot || 0) > 0) list.push({ flux: fluxCode, sens: "DEPOT", segment: "GLOBAL", volume: Number(dr.depot) });
      if (Number(dr.recup || 0) > 0) list.push({ flux: fluxCode, sens: "RECUPERATION", segment: "GLOBAL", volume: Number(dr.recup) });
    });
    return list;
  };

  const handleSimuler = () => {
    const hn = computeHeuresNet();
    setHeuresNet(hn);

    onSimuler({
      colis_amana_par_sac: Number(colisAmanaParSac || 0),
      courriers_par_sac: Number(courriersParSac || 0),
      colis_par_collecte: Number(colisParCollecte || 1),

      heures_net: hn,
      volumes_flux: buildVolumesFlux(), // Use the helper
    });
  };

  /* ========= Input avec séparateur d'espaces pour milliers ========= */
  function ThousandInput({
    value,
    onChange,
    disabled,
    className,
    style,
    ...rest
  }) {
    const [local, setLocal] = useState(() =>
      value === undefined || value === null || value === ""
        ? ""
        : formatThousands(value)
    );

    // sync quand la valeur parent change
    useEffect(() => {
      if (value === undefined || value === null || value === "") {
        setLocal("");
      } else {
        setLocal(formatThousands(value));
      }
    }, [value]);

    const handleChange = (e) => {
      const raw = e.target.value;
      // on laisse l'utilisateur taper librement, on nettoie un minimum
      setLocal(raw.replace(/[^\d\s]/g, ""));
    };

    const handleBlur = () => {
      const cleaned = unformat(local);
      const num =
        cleaned === ""
          ? undefined
          : parseNonNeg
            ? parseNonNeg(cleaned)
            : Number(cleaned);

      onChange && onChange(num);
      setLocal(num === undefined ? "" : formatThousands(num));
    };

    return (
      <Input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        className={className}
        style={{ ...style, width: `${CELL_WIDTH_PX}px` }} // 👉 largeur forcée
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        {...rest}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* 2️⃣ Les 3 tableaux : Arrivée / Dépôt–Récupération / Départ */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg p-2">
        <div className="flex flex-col xl:flex-row gap-2 justify-center items-start">

          {/* ───── Arrivée ───── */}
          <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden flex-1">
            <div
              className="bg-gradient-to-r from-slate-50 to-white py-2 border-b border-slate-100 flex items-center justify-center gap-2"
              title="Volume journalier moyen"
            >
              <div className="p-1 rounded bg-blue-100 text-[#005EA8] shadow-sm">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Flux Arrivée
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium tracking-wide">
                    <th className="px-2 py-1 text-left font-normal uppercase text-[9px]">Flux</th>
                    <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Global</th>
                    <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Part.</th>
                    <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Pro</th>
                    <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Dist.</th>
                    <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Axes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fluxRows.map((row) => {
                    const mode = getEffectiveFluxMode(centreCategorie, row.key);
                    const disabled = mode !== "input";
                    const st = arriveeState[row.key] || {};
                    const Icon = row.icon || Package;
                    const globalVal = getGlobalArrivee(row.key);

                    return (
                      <tr key={row.key} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="px-2 py-0.5 font-semibold text-[10px] text-slate-600">
                          <div className="flex items-center gap-1">
                            <Icon className="w-3 h-3 text-slate-400 group-hover:text-[#005EA8] transition-colors" />
                            <span>{row.label}</span>
                          </div>
                        </td>
                        <td className="px-0.5 py-0.5 bg-blue-50/30"><ThousandInput disabled={disabled} value={globalVal} onChange={(v) => setGlobalArrivee(row.key, v)} className={`${baseInputClass} !font-bold !text-slate-900`} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.part} onChange={(v) => updateArrivee(row.key, "part", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.pro} onChange={(v) => updateArrivee(row.key, "pro", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.dist} onChange={(v) => updateArrivee(row.key, "dist", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.axes} onChange={(v) => updateArrivee(row.key, "axes", v)} className={baseInputClass} style={tableInputStyle} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ───── Dépôt / Récupération ───── */}
          <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden shrink-0">
            <div
              className="bg-gradient-to-r from-slate-50 to-white py-2 border-b border-slate-100 flex items-center justify-center gap-2"
              title="Opérations de guichet"
            >
              <div className="p-1 rounded bg-blue-100 text-[#005EA8] shadow-sm">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Guichet
              </span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium tracking-wide">
                  <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Dépôt</th>
                  <th className="px-1 py-1 text-center font-normal uppercase text-[9px]">Récup.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {fluxRows.filter((r) => r.key !== "eb" && r.key !== "lrh").map((row) => {
                  const mode = getEffectiveFluxMode(centreCategorie, row.key);
                  const disabled = mode !== "input";
                  const st = depotRecupState[row.key] || {};
                  return (
                    <tr key={row.key} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.depot} onChange={(v) => updateDepotRecup(row.key, "depot", v)} className={baseInputClass} style={tableInputStyle} /></td>
                      <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.recup} onChange={(v) => updateDepotRecup(row.key, "recup", v)} className={baseInputClass} style={tableInputStyle} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ───── Départ ───── */}
          <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden flex-1">
            <div
              className="bg-gradient-to-r from-slate-50 to-white py-2 border-b border-slate-100 flex items-center justify-center gap-2"
              title="Volume journalier moyen"
            >
              <div className="p-1 rounded bg-amber-100 text-amber-600 shadow-sm">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Flux Départ
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium tracking-wide">
                    <th className="px-1 py-2 text-center font-normal uppercase text-[10px]">Global</th>
                    <th className="px-1 py-2 text-center font-normal uppercase text-[10px]">Part.</th>
                    <th className="px-1 py-2 text-center font-normal uppercase text-[10px]">Pro</th>
                    <th className="px-1 py-2 text-center font-normal uppercase text-[10px]">Dist.</th>
                    <th className="px-1 py-2 text-center font-normal uppercase text-[10px]">Axes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fluxRows.map((row) => {
                    const mode = getEffectiveFluxMode(centreCategorie, row.key);
                    const disabled = mode !== "input";
                    const st = departState[row.key] || {};
                    return (
                      <tr key={row.key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-0.5 py-0.5 bg-blue-50/30"><ThousandInput disabled={disabled} value={st.global} onChange={(v) => updateDepart(row.key, "global", v)} className={`${baseInputClass} !font-bold !text-slate-900`} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.part} onChange={(v) => updateDepart(row.key, "part", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.pro} onChange={(v) => updateDepart(row.key, "pro", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.dist} onChange={(v) => updateDepart(row.key, "dist", v)} className={baseInputClass} style={tableInputStyle} /></td>
                        <td className="px-0.5 py-0.5"><ThousandInput disabled={disabled} value={st.axes} onChange={(v) => updateDepart(row.key, "axes", v)} className={baseInputClass} style={tableInputStyle} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* 🔔 MESSAGE NON APPLICABLE */}
        {hasNonApplicable && (
          <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-[9px] text-slate-500 italic text-center">
            Certains champs sont{" "}
            <span className="font-semibold">non applicables</span> pour{" "}
            <span className="font-semibold">
              {centreCategorie || "?"}
            </span>{" "}
            et sont désactivés.
          </div>
        )}
      </div>

      {/* 🟦 Paramètres Unités + État + Bouton - STICKY EN BAS */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-lg rounded-lg px-3 py-2 mt-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Nb Colis/sac (AMANA) */}
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
            <div className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Package className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Nb Colis/sac
              </label>
              <input
                type="number"
                min={1}
                value={colisAmanaParSac}
                onChange={(e) =>
                  setColisAmanaParSac(
                    e.target.value === "" ? 0 : Number(e.target.value)
                  )
                }
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* Nb CO/sac */}
          <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <Mail className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Nb CO/sac
              </label>
              <input
                type="number"
                min={0}
                value={nbrCoSac}
                onChange={(e) => {
                  const val = e.target.value;
                  setNbrCoSac(val);
                  const co = parseNonNeg(val) ?? 0;
                  const cr = parseNonNeg(nbrCrSac) ?? 0;
                  setCourriersParSac(co + cr);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* Nb CR/sac */}
          <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
              <Mail className="w-3 h-3" />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Nb CR/sac
              </label>
              <input
                type="number"
                min={0}
                value={nbrCrSac}
                onChange={(e) => {
                  const val = e.target.value;
                  setNbrCrSac(val);
                  const co = parseNonNeg(nbrCoSac) ?? 0;
                  const cr = parseNonNeg(val) ?? 0;
                  setCourriersParSac(co + cr);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center"
              />
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* État de la simulation */}
          <div className="flex items-center gap-1.5 min-w-[120px]">
            <div className="flex flex-col">
              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">État</span>
              <span className="text-xs font-semibold text-slate-700">
                {loading?.simulation ? "Simulation en cours..." : (simDirty ? "Paramètres modifiés" : "Données à jour")}
              </span>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden md:block" />

          {/* Bouton Lancer Simulation */}
          <div className="flex items-center">
            <button
              onClick={onSimuler}
              disabled={!centre || loading?.simulation}
              className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none
                ${!centre ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-gradient-to-r from-[#005EA8] to-blue-600 text-white hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"}
              `}
            >
              <Gauge className="w-3.5 h-3.5" />
              {loading?.simulation ? "Calcul..." : "Lancer Simulation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
