import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import "@/styles/dialog-animations.css";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Calculator, Users, ArrowUpRight, ArrowDownLeft, ArrowUpDown, Package } from "lucide-react";
import ReactECharts from "echarts-for-react";
import CapaciteNominaleDirectionCard from "./CapaciteNominaleDirectionCard";

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS & CONFIG
───────────────────────────────────────────────────────────────── */
const JOURS = 264;

const SCENARIOS = [
  { key: "actuel",    label: "Calculé",   shortLabel: "Calc.",  color: "#0284c7", bg: "#e0f2fe", light: "#f0f9ff" },
  { key: "consolide", label: "Consolidé", shortLabel: "Cons.",  color: "#eab308", bg: "#fef08a", light: "#fefce8" },
  { key: "optimise",  label: "Optimisé",  shortLabel: "Opti.",  color: "#059669", bg: "#d1fae5", light: "#f0fdf4" },
];

const FLUX_CONFIG = {
  amana:   { label: "Amana",
    getDepart: (gv) => (parseFloat(gv?.amana?.depot?.gc?.global) || 0) + (parseFloat(gv?.amana?.depot?.part?.global) || 0),
    getArrive: (gv) => (parseFloat(gv?.amana?.recu?.gc?.global) || 0)  + (parseFloat(gv?.amana?.recu?.part?.global) || 0) },
  cr:      { label: "CR",
    getDepart: (gv) => parseFloat(gv?.cr?.med?.global) || 0,
    getArrive: (gv) => parseFloat(gv?.cr?.arrive?.global) || 0 },
  co:      { label: "CO",
    getDepart: (gv) => parseFloat(gv?.co?.med?.global) || 0,
    getArrive: (gv) => parseFloat(gv?.co?.arrive?.global) || 0 },
  lrh:     { label: "LRH",
    getDepart: (gv) => parseFloat(gv?.lrh?.med) || 0,
    getArrive: (gv) => parseFloat(gv?.lrh?.arrive) || 0 },
  ebarkia: { label: "E-Barkia",
    getDepart: (gv) => parseFloat(gv?.ebarkia?.med) || 0,
    getArrive: (gv) => parseFloat(gv?.ebarkia?.arrive) || 0 },
};

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
function isMod(p) {
  const t = (p.type_poste || "").toUpperCase();
  return t !== "MOI" && t !== "INDIRECT" && t !== "STRUCTURE" && !p.is_moi;
}
function getActuelModValue(p) {
  return Number(p?.effectif_actuel_mod) || 0;
}
const fmt = (num, dec = 0) => {
  if (num === null || num === undefined || isNaN(num)) return "—";
  const fixed = dec > 0 ? Number(num).toFixed(dec).replace(".", ",") : Math.round(num).toString();
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
};
const besoin  = (vol, eff) => (eff > 0 && vol > 0 ? vol / eff / JOURS : null);
const besoinH = (b, cap)   => (b !== null && cap > 0 ? b / cap : null);


function getEffCalcule(response, postes) {
  const rpp = response?.ressources_par_poste || {};
  return Math.round(
    (postes || []).filter(isMod).reduce((s, p) => {
      const lbl = (p.label || p.nom || "").trim();
      return s + (rpp[lbl] || 0);
    }, 0)
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function CapaciteNominaleComparatifDialog({
  open, onOpenChange,
  data,
  responseActuel,
  responseConsolide,
  responseOptimise,
  postes,
  centreDetails,
}) {
  const [activeFlux, setActiveFlux] = useState("amana");
  const [activeDir,  setActiveDir]  = useState("Glob");
  const gridValues = data?.gridValues || {};
  const capNette   = data?.heuresNet || 8.5;
  const flux       = FLUX_CONFIG[activeFlux];

  const effActuel    = useMemo(() => (postes || []).filter(isMod).reduce((s, p) => s + getActuelModValue(p), 0), [postes]);
  const effCalcule   = useMemo(() => getEffCalcule(responseActuel,    postes), [responseActuel,    postes]);
  const effConsolide = useMemo(() => getEffCalcule(responseConsolide,  postes), [responseConsolide,  postes]);
  const effOptimise  = useMemo(() => getEffCalcule(responseOptimise,   postes), [responseOptimise,   postes]);
  const effs = { actuel: effCalcule, consolide: effConsolide, optimise: effOptimise };

  const volDepart = useMemo(() => flux.getDepart(gridValues), [flux, gridValues]);
  const volArrive = useMemo(() => flux.getArrive(gridValues), [flux, gridValues]);
  const volTotal  = volDepart + volArrive;

  /* ── Table rows ── */
  const posteRows = useMemo(() => {
    const getUsedVolumesFromBackend = (response, posteCode) => {
      const byCode = response?.volumes_utilises_par_poste || {};
      if (!posteCode || !byCode[posteCode]) return { dep: 0, arr: 0, glob: 0 };
      const entry = byCode[posteCode]?.[activeFlux];
      if (!entry) return { dep: 0, arr: 0, glob: 0 };
      return {
        dep: Number(entry.dep) || 0,
        arr: Number(entry.arr) || 0,
        glob: Number(entry.glob) || 0,
      };
    };

    const rpps = {
      actuel:    responseActuel?.ressources_par_poste    || {},
      consolide: responseConsolide?.ressources_par_poste || {},
      optimise:  responseOptimise?.ressources_par_poste  || {},
    };
    return (postes || []).filter(isMod).map((p) => {
      const label = (p.label || p.nom || "").trim();
      const act   = getActuelModValue(p);
      const calc  = Math.round(rpps.actuel[label]    || 0);
      const cons  = Math.round(rpps.consolide[label] || 0);
      const opt   = Math.round(rpps.optimise[label]  || 0);
      const effsRow = { actuel: calc, consolide: cons, optimise: opt };
      const row = { label, type: p.type_poste || "—", act, calc, cons, opt };

      const posteCode = String(p?.code ?? p?.Code ?? "").trim();
      const usedAct = getUsedVolumesFromBackend(responseActuel, posteCode);
      const usedCon = getUsedVolumesFromBackend(responseConsolide, posteCode);
      const usedOpt = getUsedVolumesFromBackend(responseOptimise, posteCode);

      const usedByScenario = {
        actuel: usedAct,
        consolide: usedCon,
        optimise: usedOpt,
      };

      ["Dep", "Arr", "Glob"].forEach((dir) => {
        const volKey = dir === "Dep" ? "dep" : dir === "Arr" ? "arr" : "glob";

        // Baseline Actuel (DB effectif)
        row[`v${dir}_act`] = usedAct[volKey];
        row[`b${dir}_act`] = besoin(usedAct[volKey], act);
        row[`b${dir}H_act`] = besoinH(row[`b${dir}_act`], capNette);

        // Colonnes scénarios (ETP Calculé / Consolidé / Optimisé)
        SCENARIOS.forEach((sc) => {
          const eff = effsRow[sc.key];
          const vol = usedByScenario[sc.key]?.[volKey] ?? usedAct[volKey];
          row[`v${dir}_${sc.key}`] = vol;
          row[`b${dir}_${sc.key}`] = besoin(vol, eff);
          row[`b${dir}H_${sc.key}`] = besoinH(row[`b${dir}_${sc.key}`], capNette);
        });
      });
      return row;
    }).filter(r => r.act > 0 || r.calc > 0).sort((a, b) => b.act - a.act);
  }, [
    postes,
    responseActuel,
    responseConsolide,
    responseOptimise,
    capNette,
    activeFlux,
  ]);

  /* ── ECharts ── */
  const chartOption = useMemo(() => {
    const labels  = ["Actuel (DB)", ...SCENARIOS.map(s => s.label)];
    const colors  = ["#94a3b8", ...SCENARIOS.map(s => s.color)];
    const effList = [effActuel, effCalcule, effConsolide, effOptimise];
    const bDep   = effList.map(e => besoin(volDepart, e) ?? 0);
    const bArr   = effList.map(e => besoin(volArrive, e) ?? 0);
    const bGlob  = effList.map(e => besoin(volTotal,  e) ?? 0);
    const mkSerie = (name, data, alpha) => ({
      name, type: "bar", barMaxWidth: 20,
      data: data.map((v, i) => ({
        value: parseFloat(v.toFixed(1)),
        itemStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: colors[i] + alpha[0] },
              { offset: 1, color: colors[i] + alpha[1] },
            ],
          },
          borderRadius: [5, 5, 0, 0],
        },
      })),
    });
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" },
        backgroundColor: "rgba(15,23,42,.93)", borderWidth: 0, padding: [10, 14],
        textStyle: { color: "#fff", fontSize: 11 },
        formatter: (params) => {
          const lines = params.map(p =>
            `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:5px;vertical-align:middle"></span><b>${p.seriesName}</b>: ${Number(p.value).toFixed(1)}`
          ).join("<br/>");
          return `<div style="font-weight:800;margin-bottom:6px;color:#e2e8f0">${params[0]?.axisValue}</div>${lines}`;
        },
      },
      legend: {
        data: ["Départ /j", "Arrivé /j", "Global /j"],
        bottom: 0, textStyle: { fontSize: 10, color: "#475569" },
        itemWidth: 10, itemHeight: 10, icon: "roundRect",
      },
      grid: { top: 16, left: 10, right: 10, bottom: 40, containLabel: true },
      xAxis: {
        type: "category", data: labels,
        axisLabel: { fontSize: 9, color: "#64748b", fontWeight: 600 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,.25)" } }, axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 9, color: "#94a3b8" },
        splitLine: { lineStyle: { color: "rgba(148,163,184,.12)", type: "dashed" } },
      },
      series: [
        mkSerie("Départ /j",  bDep,  ["ff", "dd"]),
        mkSerie("Arrivé /j",  bArr,  ["dd", "bb"]),
        mkSerie("Global /j",  bGlob, ["bb", "99"]),
      ],
    };
  }, [volDepart, volArrive, volTotal, effActuel, effCalcule, effConsolide, effOptimise]);

  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (open) setAnimKey((k) => k + 1); }, [open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={animKey}
        className="dlg-enter max-w-[97vw] lg:max-w-7xl p-0 border-none rounded-2xl overflow-hidden"
        style={{ display: "flex", flexDirection: "column", height: "94vh", boxShadow: "0 32px 64px -12px rgba(0,0,0,0.35)" }}
      >
        <DialogHeader className="sr-only"><DialogTitle>Capacité Nominale Comparative</DialogTitle></DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, borderRadius: 16, overflow: "hidden", background: "#f8fafc" }}>

          {/* ══ HEADER ══ */}
          <div className="dlg-header-enter relative overflow-hidden"
            style={{ flexShrink: 0, background: "linear-gradient(135deg, #003d7a 0%, #005EA8 50%, #0077cc 100%)" }}>

            {/* Decorative halos */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/10 blur-2xl dlg-blob-a" />
              <div className="absolute left-1/3 -bottom-8 w-36 h-36 rounded-full bg-white/8 blur-xl dlg-blob-b" />
              <div className="absolute right-1/4 top-1/2 w-20 h-20 rounded-full bg-cyan-300/10 blur-lg dlg-blob-c" />
            </div>

            <div className="relative px-6 py-2 flex items-center justify-between mr-8 gap-4">
              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="dlg-icon-hover dlg-icon-enter w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-lg"
                  style={{ animationDelay: "0.1s" }}>
                  <Calculator className="w-4 h-4 text-white" />
                </div>
                <div className="dlg-header-enter" style={{ animationDelay: "0.15s" }}>
                  <h2 className="text-lg font-black text-white tracking-tight leading-none">
                    Capacité Nominale
                    {centreDetails?.centre_name && (
                      <span className="ml-2 text-sm font-bold text-blue-200">— {centreDetails.centre_name}</span>
                    )}
                  </h2>
                  <p className="text-[10px] text-blue-200/80 font-medium mt-0.5 uppercase tracking-widest">
                    Comparatif 3 scénarios · {fmt(JOURS)} jours · Cap. nette {fmt(capNette, 1)}h
                  </p>
                </div>
              </div>

              {/* ETP chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Actuel DB */}
                <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-center min-w-[68px]">
                  <p className="text-[7px] font-black uppercase tracking-widest text-blue-200/70">Actuel DB</p>
                  <p className="text-lg font-black text-white leading-none">{fmt(effActuel)}</p>
                  <p className="text-[7px] text-blue-200/50 font-bold">ETP MOD</p>
                </div>
                {SCENARIOS.map(sc => (
                  <div key={sc.key} className="border rounded-xl px-3 py-2 text-center min-w-[68px]"
                    style={{ backgroundColor: "rgba(255,255,255,.12)", borderColor: "rgba(255,255,255,.20)" }}>
                    <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: sc.color === "#0284c7" ? "#7dd3fc" : sc.color === "#eab308" ? "#fde047" : "#6ee7b7" }}>{sc.label}</p>
                    <p className="text-lg font-black text-white leading-none">{fmt(effs[sc.key])}</p>
                    <p className="text-[7px] font-bold text-white/50">ETP MOD</p>
                  </div>
                ))}
                {/* Volume */}
                <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-center min-w-[68px]">
                  <p className="text-[7px] font-black uppercase tracking-widest text-blue-200/70">Vol. Total</p>
                  <p className="text-lg font-black text-white leading-none">{fmt(volTotal)}</p>
                  <p className="text-[7px] text-blue-200/50 font-bold">{FLUX_CONFIG[activeFlux].label}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ══ BODY ══ */}
          <div className="p-2 space-y-2"
            style={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>

            {/* ── Flux tabs ── */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(FLUX_CONFIG).map(([key, cfg]) => {
                const total    = cfg.getDepart(gridValues) + cfg.getArrive(gridValues);
                const isActive = activeFlux === key;
                return (
                  <button key={key} onClick={() => setActiveFlux(key)}
                    disabled={!total && !isActive}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all border ${
                      isActive ? "text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-[#0284c7] hover:text-[#0284c7]"
                    } ${!total && !isActive ? "opacity-30 cursor-not-allowed" : ""}`}
                    style={isActive ? { backgroundColor: "#0284c7", borderColor: "#0284c7" } : {}}>
                    <div className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isActive ? "white" : (total ? "#0284c7" : "#cbd5e1") }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* ── Direction cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="dlg-card-enter" style={{ animationDelay: "0.18s" }}>
                <CapaciteNominaleDirectionCard icon={ArrowUpRight} label="Flux Départ" color="#005EA8" vol={volDepart} effActuel={effActuel} effs={effs} capNette={capNette} scenarios={SCENARIOS} />
              </div>
              <div className="dlg-card-enter" style={{ animationDelay: "0.26s" }}>
                <CapaciteNominaleDirectionCard icon={ArrowDownLeft} label="Flux Arrivé" color="#00A0E0" vol={volArrive} effActuel={effActuel} effs={effs} capNette={capNette} scenarios={SCENARIOS} />
              </div>
              <div className="dlg-card-enter" style={{ animationDelay: "0.34s" }}>
                <CapaciteNominaleDirectionCard icon={ArrowUpDown} label="Flux Global" color="#0077cc" vol={volTotal} effActuel={effActuel} effs={effs} capNette={capNette} scenarios={SCENARIOS} />
              </div>
            </div>

            {/* ── Chart ── */}
            <div className="dlg-table-enter rounded-2xl bg-white border border-slate-100 shadow-sm p-4"
              style={{ animationDelay: "0.38s" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-5 rounded-full"
                  style={{ background: "linear-gradient(to bottom, #0284c7, #0077cc)" }} />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Comparaison visuelle — Besoins /jour</p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">Départ · Arrivé · Global — tous scénarios</p>
                </div>
              </div>
              <ReactECharts option={chartOption} style={{ height: 190 }} opts={{ renderer: "svg" }} />
            </div>

            {/* ── Table ── */}
            {(() => {
              const DIR_TABS = [
                { key: "Dep",  label: "↗ Départ",  vol: volDepart },
                { key: "Arr",  label: "↙ Arrivé",  vol: volArrive },
                { key: "Glob", label: "⇅ Global",  vol: volTotal  },
              ];
              const curDir = DIR_TABS.find(d => d.key === activeDir) || DIR_TABS[2];
              const effKey = (sc) => sc.key === "actuel" ? "calc" : sc.key === "consolide" ? "cons" : "opt";
              const totals = posteRows.reduce((acc, r) => {
                acc.act += Number(r.act) || 0;
                acc.calc += Number(r.calc) || 0;
                acc.cons += Number(r.cons) || 0;
                acc.opt += Number(r.opt) || 0;
                acc.vol += Number(r[`v${curDir.key}_act`]) || 0;
                return acc;
              }, { act: 0, calc: 0, cons: 0, opt: 0, vol: 0 });
              const capTotAct = totals.act > 0 ? totals.vol / totals.act / JOURS : null;
              const capTotCalc = totals.calc > 0 ? totals.vol / totals.calc / JOURS : null;
              const capTotCons = totals.cons > 0 ? totals.vol / totals.cons / JOURS : null;
              const capTotOpt = totals.opt > 0 ? totals.vol / totals.opt / JOURS : null;
              return (
                <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                  {/* Table header bar */}
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-3 flex-wrap"
                    style={{ background: "linear-gradient(to right, #f8fafc, #ffffff)" }}>
                    <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Détail par poste</p>

                    {/* Direction tabs */}
                    <div className="flex items-center gap-1 ml-2 bg-slate-100 rounded-xl p-1">
                      {DIR_TABS.map(d => (
                        <button key={d.key} onClick={() => setActiveDir(d.key)}
                          className="px-3 py-1 rounded-lg text-[9px] font-black transition-all"
                          style={activeDir === d.key
                            ? { background: "#0284c7", color: "#fff", boxShadow: "0 2px 8px #0284c740" }
                            : { color: "#64748b" }}>
                          {d.label}
                        </button>
                      ))}
                    </div>

                    <span className="ml-auto text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {posteRows.length} postes
                    </span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse" style={{ minWidth: 640 }}>
                      <thead>
                        <tr className="border-b border-slate-200" style={{ background: "#f8fafc" }}>
                          {/* Poste */}
                          <th className="text-left px-3 py-2 text-[8px] font-black uppercase text-slate-400 sticky left-0 z-20 border-r border-slate-200 min-w-[150px]"
                            style={{ background: "#f8fafc", borderTop: "3px solid #cbd5e1" }}>Poste</th>
                          {/* Effectifs group */}
                          <th className="text-center px-2 py-2 text-[8px] font-black uppercase text-slate-400 border-l border-slate-200 bg-slate-50"
                            style={{ borderTop: "3px solid #94a3b8" }}>Act.</th>
                          {SCENARIOS.map(sc => (
                            <th key={sc.key} className="text-center px-2 py-2 text-[8px] font-black border-l border-slate-100 bg-slate-50"
                              style={{ color: sc.color, borderTop: `3px solid ${sc.color}` }}>{sc.shortLabel}</th>
                          ))}
                          {/* Separator */}
                          <th className="w-3 border-l-2 border-slate-200" style={{ background: "#f1f5f9" }} />
                          {/* Volume utilisé */}
                          <th className="text-center px-2 py-2 border-l border-slate-200 bg-slate-50"
                            style={{ borderTop: "3px solid #0f172a" }}>
                            <p className="text-[8px] font-black uppercase text-slate-600">Volume utilisé</p>
                            <p className="text-[7px] font-bold text-slate-400 mt-0.5">dir. active</p>
                          </th>
                          {/* Besoin group header */}
                          <th className="text-center px-2 py-2 border-l border-slate-200 bg-slate-50"
                            style={{ borderTop: "3px solid #64748b" }}>
                            <p className="text-[8px] font-black uppercase text-slate-500">Besoin Act.</p>
                            <p className="text-[7px] font-bold text-slate-400 mt-0.5">/jour · /heure</p>
                          </th>
                          {SCENARIOS.map(sc => (
                            <th key={sc.key} className="text-center px-2 py-2 border-l border-slate-100 bg-slate-50"
                              style={{ borderTop: `3px solid ${sc.color}` }}>
                              <p className="text-[8px] font-black" style={{ color: sc.color }}>{sc.shortLabel}</p>
                              <p className="text-[7px] font-bold text-slate-400 mt-0.5">/jour · /heure</p>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {posteRows.length === 0 ? (
                          <tr><td colSpan={11} className="text-center py-12 text-slate-300 italic">Aucun poste configuré.</td></tr>
                        ) : posteRows.map((r, idx) => (
                            <tr
                              key={idx}
                              className="dlg-table-row dlg-row-enter"
                              style={{ animationDelay: `${0.45 + idx * 0.04}s` }}
                            >
                              <td className="px-3 py-1 sticky left-0 bg-inherit z-10 border-r border-slate-100 shadow-[1px_0_0_rgba(0,0,0,0.04)]">
                                <p className="font-bold text-slate-700 text-[10px] truncate max-w-[140px]" title={r.label}>{r.label}</p>
                                <p className="text-[7px] text-slate-400 uppercase tracking-tighter mt-0.5">{r.type}</p>
                              </td>
                              {/* Effectifs */}
                              <td className="px-2 py-1 text-center font-bold text-slate-500 border-l border-slate-100">{fmt(r.act)}</td>
                              {SCENARIOS.map(sc => (
                                <td key={sc.key} className="px-2 py-2 text-center font-black border-l border-slate-100">
                                  <span style={{ color: sc.color }}>{fmt(r[effKey(sc)])}</span>
                                </td>
                              ))}
                              {/* Separator */}
                              <td className="border-l-2 border-slate-200" style={{ background: "#f1f5f9" }} />
                              {/* Volume utilisé */}
                              <td className="px-2 py-1 text-center border-l border-slate-100">
                                <p className="font-black text-slate-700 text-[11px] leading-none">{fmt(r[`v${curDir.key}_act`])}</p>
                              </td>
                              {/* Besoins — /j et /h empilés */}
                              <td className="px-2 py-1 text-center border-l border-slate-100">
                                <p className="font-black text-slate-700 text-[11px] leading-none">{fmt(r[`b${curDir.key}_act`])} <span className="text-[8px] font-bold text-slate-400">/jrs</span></p>
                                <p className="font-bold text-slate-400 text-[9px] mt-0.5">{fmt(r[`b${curDir.key}H_act`], 1)}/h</p>
                              </td>
                              {SCENARIOS.map(sc => (
                                <td key={sc.key} className="px-2 py-1 text-center border-l border-slate-100">
                                  <p className="font-black text-[11px] leading-none" style={{ color: sc.color }}>{fmt(r[`b${curDir.key}_${sc.key}`])} <span className="text-[8px] font-bold" style={{ color: sc.color + "88" }}>/jrs</span></p>
                                  <p className="font-bold text-[9px] mt-0.5 text-slate-400">{fmt(r[`b${curDir.key}H_${sc.key}`], 1)}/h</p>
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

          </div>{/* end body */}
        </div>
      </DialogContent>
    </Dialog>
  );
}