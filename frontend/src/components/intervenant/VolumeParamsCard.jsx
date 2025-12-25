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
}) {
  // ✅ style commun
  const baseInputClass = "text-xs text-center !p-1 leading-none h-8";

  // 👉 largeur UNIQUE pour tous les champs des 3 tableaux
  const CELL_WIDTH_PX = 100;
  const tableInputStyle = { height: "32px", width: `${CELL_WIDTH_PX}px` };



  // Paramètres “unités” (au-dessus des tableaux)
  const [nbrCoSac, setNbrCoSac] = useState("");
  const [nbrCrSac, setNbrCrSac] = useState("");

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

  // 🔢 Calcul heures nettes : ((heures * 60) - tempsMort) / 60
  const computeHeuresNet = () => {
    const h = typeof heures === "number" ? heures : 0;
    const tm = typeof tempsMortMinutes === "number" ? tempsMortMinutes : 0;
    return (h * 60 - tm) / 60;
  };

  const handleSimuler = () => {
    const hn = computeHeuresNet();
    setHeuresNet(hn);

    onSimuler({
      colis_amana_par_sac: Number(colisAmanaParSac || 0),
      courriers_par_sac: Number(courriersParSac || 0),
      colis_par_collecte: Number(colisParCollecte || 1),

      heures_net: hn,
      volumes_flux: buildVolumesFlux(),
    });
  };

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
    <Card
      title={
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-700" />
          <span className="font-semibold text-slate-900 text-sm">
            Paramètres de volume
          </span>
        </div>
      }
      bodyClassName="!p-0"
    >
      <div className="space-y-2 p-2">
        {/* 🟦 Bloc Unités + Paramètres avancés */}
        <div className="border border-slate-200 rounded-md p-1.5 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] space-y-2">
          {/* Unités */}
          <div className="flex flex-wrap justify-center gap-8">
            {/* Nbre Colis / sac = Colis AMANA / sac */}
            <Field
              className="!w-auto"
              label={
                <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                  Nb Colis/sac (AMANA)
                </span>
              }
              icon={Package}
            >
              <Input
                type="number"
                min={1}
                value={colisAmanaParSac}
                onChange={(e) =>
                  setColisAmanaParSac(
                    e.target.value === "" ? 0 : Number(e.target.value)
                  )
                }
                className={baseInputClass + " w-[70px]"}
                style={{ height: "32px" }}
              />
            </Field>

            {/* Nbre CO / sac */}
            <Field
              className="!w-auto"
              label={
                <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                  Nb CO / sac
                </span>
              }
              icon={Mail}
            >
              <Input
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
                className={baseInputClass + " w-[70px]"}
                style={{ height: "32px" }}
              />
            </Field>

            {/* Nbre CR / sac */}
            <Field
              className="!w-auto"
              label={
                <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                  Nb CR / sac
                </span>
              }
              icon={Mail}
            >
              <Input
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
                className={baseInputClass + " w-[70px]"}
                style={{ height: "32px" }}
              />
            </Field>
          </div>
        </div>

        {/* 2️⃣ Les 3 tableaux : Arrivée / Dépôt–Récupération / Départ */}
        <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
          {/* ───── Arrivée ───── */}
          <div className="border border-slate-200 rounded-md bg-white shadow-sm">
            <div className="bg-sky-50 text-[10px] font-semibold py-0.5 border-b border-slate-200 flex items-center justify-center gap-1">
              <ArrowDownRight className="w-3 h-3 text-sky-600" />
              <span className="uppercase tracking-wide text-sky-800">
                Arrivée
              </span>
            </div>
            <table className="text-xs">
              <thead>
                <tr className="bg-sky-50/70 border-b border-slate-200">
                  <th className="px-1 py-0.5 text-left w-20">Flux</th>
                  <th className="px-0.5 py-0.5 text-center">Global</th>
                  <th className="px-0.5 py-0.5 text-center">Particulier</th>
                  <th className="px-0.5 py-0.5 text-center">Pro</th>
                  <th className="px-0.5 py-0.5 text-center">Distrib.</th>
                  <th className="px-0.5 py-0.5 text-center">Axes</th>
                </tr>
              </thead>
              <tbody>
                {fluxRows.map((row, idx) => {
                  const mode = getEffectiveFluxMode(centreCategorie, row.key);
                  const disabled = mode !== "input";
                  const st = arriveeState[row.key] || {};
                  const Icon = row.icon || Package;

                  const globalVal = getGlobalArrivee(row.key);

                  return (
                    <tr
                      key={row.key}
                      className={
                        (idx % 2 === 0 ? "bg-white" : "bg-slate-50/60") +
                        " hover:bg-sky-50 transition-colors"
                      }
                    >
                      <td className="px-1 py-0.5 font-semibold text-xs text-slate-700">
                        <div className="flex items-center gap-1">
                          <Icon className="w-3 h-3 text-slate-500" />
                          <span>{row.label}</span>
                        </div>
                      </td>

                      {/* Global Arrivée */}
                      <td className="px-0.5 py-0.5">
                        <ThousandInput
                          disabled={disabled}
                          value={globalVal}
                          onChange={(v) => setGlobalArrivee(row.key, v)}
                          className={baseInputClass}
                          style={tableInputStyle}
                        />
                      </td>

                      {/* Particulier */}
                      <td className="px-0.5 py-0.5">
                        <ThousandInput
                          disabled={disabled}
                          value={st.part}
                          onChange={(v) => updateArrivee(row.key, "part", v)}
                          className={baseInputClass}
                          style={tableInputStyle}
                        />
                      </td>

                      {/* Pro - B2B */}
                      <td className="px-0.5 py-0.5">
                        <ThousandInput
                          disabled={disabled}
                          value={st.pro}
                          onChange={(v) => updateArrivee(row.key, "pro", v)}
                          className={baseInputClass}
                          style={tableInputStyle}
                        />
                      </td>

                      {/* Distribution */}
                      <td className="px-0.5 py-0.5">
                        <ThousandInput
                          disabled={disabled}
                          value={st.dist}
                          onChange={(v) => updateArrivee(row.key, "dist", v)}
                          className={baseInputClass}
                          style={tableInputStyle}
                        />
                      </td>

                      {/* Axes */}
                      <td className="px-0.5 py-0.5">
                        <ThousandInput
                          disabled={disabled}
                          value={st.axes}
                          onChange={(v) => updateArrivee(row.key, "axes", v)}
                          className={baseInputClass}
                          style={tableInputStyle}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ───── Dépôt / Récupération ───── */}
          <div className="border border-slate-200 rounded-md bg-white shadow-sm self-start">
            <div className="bg-sky-50 text-[10px] font-semibold py-0.5 border-b border-slate-200 flex items-center justify-center gap-1">
              <ArrowLeftRight className="w-3 h-3 text-sky-600" />
              <span className="uppercase tracking-wide text-sky-800">
                Dep/Recup
              </span>
            </div>
            <table className="text-xs">
              <thead>
                <tr className="bg-sky-50/70 border-b border-slate-200">
                  <th className="px-0.5 py-0.5 text-center">Dépôt</th>
                  <th className="px-0.5 py-0.5 text-center">Récup.</th>
                </tr>
              </thead>
              <tbody>
                {fluxRows
                  .filter((row) => row.key !== "eb" && row.key !== "lrh")
                  .map((row, idx) => {
                    const mode = getEffectiveFluxMode(
                      centreCategorie,
                      row.key
                    );
                    const disabled = mode !== "input";
                    const st = depotRecupState[row.key] || {};

                    return (
                      <tr
                        key={row.key}
                        className={
                          (idx % 2 === 0 ? "bg-white" : "bg-slate-50/60") +
                          " hover:bg-sky-50 transition-colors"
                        }
                      >
                        <td className="px-0.5 py-0.5">
                          <ThousandInput
                            disabled={disabled}
                            value={st.depot}
                            onChange={(v) =>
                              updateDepotRecup(row.key, "depot", v)
                            }
                            className={baseInputClass}
                            style={tableInputStyle}
                          />
                        </td>
                        <td className="px-0.5 py-0.5">
                          <ThousandInput
                            disabled={disabled}
                            value={st.recup}
                            onChange={(v) =>
                              updateDepotRecup(row.key, "recup", v)
                            }
                            className={baseInputClass}
                            style={tableInputStyle}
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* ───── Départ ───── */}
          <div className="border border-slate-200 rounded-md bg-white shadow-sm">
            <div className="bg-sky-50 text-[10px] font-semibold py-0.5 border-b border-slate-200 flex items-center justify-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-sky-600" />
              <span className="uppercase tracking-wide text-sky-800">
                Départ
              </span>
            </div>
            <table className="text-xs">
              <thead>
                <tr className="bg-sky-50/70 border-b border-slate-200">
                  <th className="px-0.5 py-0.5 text-center">Global</th>
                  <th className="px-0.5 py-0.5 text-center">Part.</th>
                  <th className="px-0.5 py-0.5 text-center">Pro</th>
                  <th className="px-0.5 py-0.5 text-center">Distrib.</th>
                  <th className="px-0.5 py-0.5 text-center">Axes</th>
                </tr>
              </thead>
              <tbody>
                {fluxRows.map((row, idx) => {
                  const mode = getEffectiveFluxMode(centreCategorie, row.key);
                  const disabled = mode !== "input";
                  const st = departState[row.key] || {};

                  return (
                    <tr
                      key={row.key}
                      className={
                        (idx % 2 === 0 ? "bg-white" : "bg-slate-50/60") +
                        " hover:bg-sky-50 transition-colors"
                      }
                    >
                      {/* Global Départ */}
                      <td className="px-0.5 py-0.5">
                        <ThousandInput
                          disabled={disabled}
                          value={st.global}
                          onChange={(v) => updateDepart(row.key, "global", v)}
                          className={baseInputClass}
                          style={tableInputStyle}
                        />
                      </td>

                      {/* Particulier */}
                      <td className="px-0.5 py-0.5">
                        <ThousandInput
                          disabled={disabled}
                          value={st.part}
                          onChange={(v) => updateDepart(row.key, "part", v)}
                          className={baseInputClass}
                          style={tableInputStyle}
                        />
                      </td>

                      {/* Pro - B2B */}
                      <td className="px-0.5 py-0.5">
                        <ThousandInput
                          disabled={disabled}
                          value={st.pro}
                          onChange={(v) => updateDepart(row.key, "pro", v)}
                          className={baseInputClass}
                          style={tableInputStyle}
                        />
                      </td>

                      {/* Distribution */}
                      <td className="px-0.5 py-0.5">
                        <ThousandInput
                          disabled={disabled}
                          value={st.dist}
                          onChange={(v) => updateDepart(row.key, "dist", v)}
                          className={baseInputClass}
                          style={tableInputStyle}
                        />
                      </td>

                      {/* Axes */}
                      <td className="px-0.5 py-0.5">
                        <ThousandInput
                          disabled={disabled}
                          value={st.axes}
                          onChange={(v) => updateDepart(row.key, "axes", v)}
                          className={baseInputClass}
                          style={tableInputStyle}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🔔 MESSAGE NON APPLICABLE */}
        {hasNonApplicable && (
          <div className="mt-1 pt-1 border-t border-dashed border-slate-200 text-[9px] text-slate-500 italic">
            Certains champs sont{" "}
            <span className="font-semibold">non applicables</span> pour{" "}
            <span className="font-semibold">
              {centreCategorie || "?"}
            </span>{" "}
            et sont désactivés.
          </div>
        )}

        {/* Bouton en bas à droite */}
        <div className="flex justify-end pr-1">
          <button
            disabled={!centre || loading.simulation}
            onClick={handleSimuler}
            className="btn-cta h-9 px-4 flex items-center gap-2 text-sm"
          >
            <Package className="w-4 h-4" />
            {loading.simulation ? "Calcul..." : "Lancer la Simulation"}
          </button>
        </div>
      </div>
    </Card >
  );
}
