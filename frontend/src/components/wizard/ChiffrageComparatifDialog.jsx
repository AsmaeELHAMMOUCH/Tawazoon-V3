import React, { useMemo, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { DollarSign, TrendingUp, TrendingDown, Calendar, Wallet } from "lucide-react";
import "@/styles/dialog-animations.css";

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS & CONFIG
───────────────────────────────────────────────────────────────── */
export const SCENARIOS = [
  { key: "actuel",    label: "Calculé",   color: "#2563EB", bg: "#DBEAFE", light: "#EFF6FF" },
  { key: "consolide", label: "Consolidé", color: "#005EA8", bg: "#BFDBFE", light: "#DBEAFE" },
  { key: "optimise",  label: "Optimisé",  color: "#003d7a", bg: "#93C5FD", light: "#BFDBFE" },
];

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const isMod = (p) => {
  const t = (p?.type_poste || "").toUpperCase();
  return t === "MOD" || t === "DIRECT" || !!p?.is_mod;
};
const getActuelModValue = (p) => Number(p?.effectif_actuel_mod) || 0;

const fmt = (v) => {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "—";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
};

function computeRows(postes, rAct, rCons, rOpt) {
  return (postes || [])
    .filter(isMod)
    .map((p) => {
      const label   = (p.label || p.nom || "").trim();
      const salaire = Number(p.charge_salaire || 0);
      const actuel  = getActuelModValue(p);
      const calc    = Math.round(Number(rAct?.[label]  || 0));
      const cons    = Math.round(Number(rCons?.[label] || 0));
      const opt     = Math.round(Number(rOpt?.[label]  || 0));
      return {
        label, type: p.type_poste || "—", salaire, actuel, calc, cons, opt,
        coutAct:  actuel * salaire,
        coutCalc: calc   * salaire,
        coutCons: cons   * salaire,
        coutOpt:  opt    * salaire,
      };
    })
    .filter((r) => r.actuel > 0 || r.calc > 0 || r.cons > 0 || r.opt > 0)
    .sort((a, b) => b.actuel - a.actuel);
}

/* ─── Impact badge ─────────────────────────────────────────── */
export function ImpactBadge({ value }) {
  if (!value && value !== 0) return <span className="text-slate-300">—</span>;
  if (value === 0) return <span className="text-slate-400 text-[9px]">—</span>;
  const positive = value > 0;
  return (
    <span
      className="dlg-badge inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none"
      style={{
        background: positive ? "#d1fae5" : "#fee2e2",
        color: positive ? "#059669" : "#ef4444",
      }}
    >
      {positive ? "+" : ""}{fmt(value)}
    </span>
  );
}

/* ─── Direction-style card (same design as CapaciteNominaleDirectionCard) ── */
export function ChiffrageDirectionCard({
  icon: Icon,
  label,
  sublabel,
  color,
  actuelValue,
  scenarios,
  animDelay = "0s",
  /** Si true, l’écart sous chaque scénario est affiché en MAD / an (×12). Si false, les montants sont déjà annuels. */
  deltaBudgetAnnual = false,
}) {
  return (
    <div
      className="dlg-card-hover rounded-2xl overflow-hidden bg-white flex flex-col"
      style={{
        border: `1px solid ${color}25`,
        boxShadow: `0 4px 20px -6px ${color}20`,
        animation: "dlg-fade-scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        animationDelay: animDelay,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${color}12, ${color}06)`, borderBottom: `1px solid ${color}18` }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "18" }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-700 leading-none">{label}</p>
            <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{sublabel}</p>
          </div>
        </div>
      </div>

      {/* Actuel (DB) row */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-50" style={{ background: "#f8fafc" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Actuel</span>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-black text-slate-600 tabular-nums">{fmt(actuelValue)}</p>
          <p className="text-[7px] text-slate-400 font-bold uppercase">MAD</p>
        </div>
      </div>

      {/* Scenario rows */}
      <div className="divide-y divide-slate-100 flex-1">
        {scenarios.map((sc, i) => {
          const delta = actuelValue - sc.value;
          const improved = delta > 0;
          return (
            <div
              key={sc.key}
              className="dlg-scenario-row flex items-center justify-between bg-white px-4 py-2"
              style={{
                animation: "dlg-row-slide-in 0.4s ease both",
                animationDelay: `calc(${animDelay} + ${0.08 + i * 0.07}s)`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-[5px] h-6 rounded-sm"
                  style={{ backgroundColor: sc.color, boxShadow: `0 0 0 1px ${sc.color}33` }}
                />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: sc.color }}>
                    {sc.label}
                  </p>
                  <p className="text-[7px] text-slate-400 font-bold">ETP: {sc.etp}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black leading-none tabular-nums text-slate-700">
                  {fmt(sc.value)} <span className="text-[8px] font-bold text-slate-400">MAD</span>
                </p>
                {delta !== 0 && (
                  <p className="text-[8px] font-bold mt-0.5" style={{ color: improved ? "#059669" : "#dc2626" }}>
                    {improved ? "▼" : "▲"} {fmt(Math.abs(delta))}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function ChiffrageComparatifDialog({
  open, onOpenChange, postes,
  responseActuel, responseConsolide, responseOptimise,
}) {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (open) setAnimKey((k) => k + 1); }, [open]);

  const rows = useMemo(() => computeRows(
    postes,
    responseActuel?.ressources_par_poste   || {},
    responseConsolide?.ressources_par_poste || {},
    responseOptimise?.ressources_par_poste  || {}
  ), [postes, responseActuel, responseConsolide, responseOptimise]);

  const totals = useMemo(() => rows.reduce(
    (a, r) => ({
      actuel:   a.actuel   + r.actuel,
      calc:     a.calc     + r.calc,
      cons:     a.cons     + r.cons,
      opt:      a.opt      + r.opt,
      coutAct:  a.coutAct  + r.coutAct,
      coutCalc: a.coutCalc + r.coutCalc,
      coutCons: a.coutCons + r.coutCons,
      coutOpt:  a.coutOpt  + r.coutOpt,
    }),
    { actuel: 0, calc: 0, cons: 0, opt: 0, coutAct: 0, coutCalc: 0, coutCons: 0, coutOpt: 0 }
  ), [rows]);

  const impacts = useMemo(() => ({
    calc: totals.coutAct - totals.coutCalc,
    cons: totals.coutAct - totals.coutCons,
    opt:  totals.coutAct - totals.coutOpt,
  }), [totals]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent
        key={animKey}
        className="max-w-[97vw] lg:max-w-7xl p-0 border-none rounded-2xl overflow-hidden"
        style={{
          display: "flex", flexDirection: "column", height: "92vh",
          boxShadow: "0 32px 64px -12px rgba(0,0,0,0.35)",
          animation: "dlg-fade-slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        <DialogHeader className="sr-only"><DialogTitle>Chiffrage comparatif</DialogTitle></DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, borderRadius: 16, overflow: "hidden", background: "#f8fafc" }}>

          {/* ══ HEADER ══ */}
          <div
            className="relative overflow-hidden"
            style={{
              flexShrink: 0,
              background: "linear-gradient(135deg, #003d7a 0%, #005EA8 50%, #0077cc 100%)",
              animation: "dlg-fade-slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/10 blur-2xl dlg-blob-a" />
              <div className="absolute left-1/3 -bottom-8 w-36 h-36 rounded-full bg-white/8 blur-xl dlg-blob-b" />
              <div className="absolute right-1/4 top-1/2 w-20 h-20 rounded-full bg-blue-300/10 blur-lg dlg-blob-c" />
            </div>

            <div className="relative px-6 py-3 flex items-center justify-between gap-4">
              {/* Title */}
              <div className="flex items-center gap-3">
                <div
                  className="dlg-icon-hover dlg-icon-enter w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-lg"
                  style={{ animationDelay: "0.1s" }}
                >
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div className="dlg-header-enter" style={{ animationDelay: "0.15s" }}>
                  <h2 className="text-lg font-black text-white tracking-tight leading-none">Chiffrage comparatif</h2>
                  <p className="text-[10px] text-blue-200/80 font-medium mt-1 uppercase tracking-widest">
                    Masse salariale MOD · Actuel vs 3 scénarios
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ══ BODY ══ */}
          <div className="p-3 space-y-3"
            style={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>

            {/* ── Direction-style KPI cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ChiffrageDirectionCard
                icon={Wallet}
                label="Budget Mensuel"
                sublabel="Masse salariale / mois"
                color="#005EA8"
                actuelValue={totals.coutAct}
                animDelay="0.18s"
                deltaBudgetAnnual
                scenarios={SCENARIOS.map((sc) => ({
                  key: sc.key,
                  label: sc.label,
                  color: sc.color,
                  etp: sc.key === "actuel" ? totals.calc : sc.key === "consolide" ? totals.cons : totals.opt,
                  value: sc.key === "actuel" ? totals.coutCalc : sc.key === "consolide" ? totals.coutCons : totals.coutOpt,
                }))}
              />
              <ChiffrageDirectionCard
                icon={Calendar}
                label="Budget Annuel"
                sublabel="Masse salariale × 12"
                color="#00A0E0"
                actuelValue={totals.coutAct * 12}
                animDelay="0.28s"
                scenarios={SCENARIOS.map((sc) => ({
                  key: sc.key,
                  label: sc.label,
                  color: sc.color,
                  etp: sc.key === "actuel" ? totals.calc : sc.key === "consolide" ? totals.cons : totals.opt,
                  value: (sc.key === "actuel" ? totals.coutCalc : sc.key === "consolide" ? totals.coutCons : totals.coutOpt) * 12,
                }))}
              />
            </div>

            {/* ── Detail table ── */}
            <div
              className="dlg-table-enter rounded-2xl border border-white bg-white shadow-sm overflow-hidden"
              style={{ animationDelay: "0.35s" }}
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0A6BBC] to-[#005EA8]" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Détail financier par poste</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: 1120 }}>
                  <thead>
                    {/* Row 1 — groups */}
                    <tr>
                      <th rowSpan={2}
                        className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200 w-[180px]"
                        style={{ background: "#fff", borderTop: "3px solid #cbd5e1" }}>
                        Poste
                      </th>
                      <th colSpan={4}
                        className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200"
                        style={{ background: "#fff", borderTop: "3px solid #94a3b8" }}>
                        Actuel
                      </th>
                      <th colSpan={4}
                        className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-blue-700 border-b border-blue-200"
                        style={{ background: "#fff", borderTop: "3px solid #2563EB" }}>
                        Calculé
                      </th>
                      <th colSpan={4}
                        className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#005EA8] border-b border-blue-300"
                        style={{ background: "#fff", borderTop: "3px solid #005EA8" }}>
                        Consolidé
                      </th>
                      <th colSpan={4}
                        className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-blue-950 border-b border-blue-400"
                        style={{ background: "#fff", borderTop: "3px solid #003d7a" }}>
                        Optimisé
                      </th>
                    </tr>
                    {/* Row 2 — sub-columns */}
                    <tr>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-400 border-b-2 border-slate-200" style={{ background: "#fff" }}>ETP</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-400 border-b-2 border-slate-200" style={{ background: "#fff" }}>Salaire</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-400 border-b-2 border-slate-200" style={{ background: "#fff" }}>Budg. mois</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-500 border-b-2 border-slate-200 border-r border-slate-100" style={{ background: "#fff" }}>Budg. an</th>

                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200" style={{ background: "#fff" }}>ETP</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200" style={{ background: "#fff" }}>Budg. mois</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200" style={{ background: "#fff" }}>Budg. an</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200 border-r border-blue-100" style={{ background: "#fff" }}>Écart (an)</th>

                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300" style={{ background: "#fff" }}>ETP</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300" style={{ background: "#fff" }}>Budg. mois</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300" style={{ background: "#fff" }}>Budg. an</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300 border-r border-blue-200" style={{ background: "#fff" }}>Écart (an)</th>

                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400" style={{ background: "#fff" }}>ETP</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400" style={{ background: "#fff" }}>Budg. mois</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400" style={{ background: "#fff" }}>Budg. an</th>
                      <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400" style={{ background: "#fff" }}>Écart (an)</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr><td colSpan={17} className="text-center py-12 text-slate-400 text-[11px]">Aucune donnée disponible</td></tr>
                    ) : rows.map((r, idx) => {
                      const ecartCalc = r.coutAct - r.coutCalc;
                      const ecartCons = r.coutAct - r.coutCons;
                      const ecartOpt  = r.coutAct - r.coutOpt;
                      return (
                        <tr
                          key={`${r.label}-${idx}`}
                          className="dlg-table-row dlg-row-enter"
                          style={{
                            animationDelay: `${0.4 + idx * 0.04}s`,
                          }}
                        >
                          <td className="px-4 py-2.5 font-semibold text-slate-700 truncate max-w-[175px]" title={r.label}>
                            <span className="text-[11px]">{r.label}</span>
                            <p className="text-[7px] text-slate-400 uppercase tracking-widest mt-0.5">{r.type}</p>
                          </td>

                          {/* Actuel DB */}
                          <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{r.actuel}</td>
                          <td className="px-2 py-2.5 text-center text-slate-500 tabular-nums">{fmt(r.salaire)}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{fmt(r.coutAct)}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-700 tabular-nums border-r border-slate-100">{fmt(r.coutAct * 12)}</td>

                          {/* Calculé */}
                          <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{r.calc}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{fmt(r.coutCalc)}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-700 tabular-nums">{fmt(r.coutCalc * 12)}</td>
                          <td className="px-2 py-2.5 text-center border-r border-blue-100"><ImpactBadge value={ecartCalc * 12} /></td>

                          {/* Consolidé */}
                          <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{r.cons}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{fmt(r.coutCons)}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-700 tabular-nums">{fmt(r.coutCons * 12)}</td>
                          <td className="px-2 py-2.5 text-center border-r border-blue-200"><ImpactBadge value={ecartCons * 12} /></td>

                          {/* Optimisé */}
                          <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{r.opt}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{fmt(r.coutOpt)}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-700 tabular-nums">{fmt(r.coutOpt * 12)}</td>
                          <td className="px-2 py-2.5 text-center"><ImpactBadge value={ecartOpt * 12} /></td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {rows.length > 0 && (
                    <tfoot>
                      <tr
                        className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 dlg-row-enter"
                        style={{
                          animationDelay: `${0.4 + rows.length * 0.04 + 0.06}s`,
                        }}
                      >
                        <td className="px-4 py-3 font-black text-slate-700 text-[10px] uppercase tracking-wider">Total</td>

                        <td className="px-2 py-3 text-center font-black text-slate-700 tabular-nums">{totals.actuel}</td>
                        <td className="px-2 py-3 text-center text-slate-400">—</td>
                        <td className="px-2 py-3 text-center font-black text-slate-700 tabular-nums">{fmt(totals.coutAct)}</td>
                        <td className="px-2 py-3 text-center font-black text-slate-800 tabular-nums border-r border-slate-100">{fmt(totals.coutAct * 12)}</td>

                        <td className="px-2 py-3 text-center font-black text-blue-800 tabular-nums bg-blue-50/50">{totals.calc}</td>
                        <td className="px-2 py-3 text-center font-black text-blue-800 tabular-nums bg-blue-50/50">{fmt(totals.coutCalc)}</td>
                        <td className="px-2 py-3 text-center font-black text-blue-900 tabular-nums bg-blue-50/50">{fmt(totals.coutCalc * 12)}</td>
                        <td className="px-2 py-3 text-center bg-blue-50/50 border-r border-blue-100"><ImpactBadge value={impacts.calc * 12} /></td>

                        <td className="px-2 py-3 text-center font-black text-[#005EA8] tabular-nums bg-blue-100/45">{totals.cons}</td>
                        <td className="px-2 py-3 text-center font-black text-[#005EA8] tabular-nums bg-blue-100/45">{fmt(totals.coutCons)}</td>
                        <td className="px-2 py-3 text-center font-black text-[#004080] tabular-nums bg-blue-100/45">{fmt(totals.coutCons * 12)}</td>
                        <td className="px-2 py-3 text-center bg-blue-100/45 border-r border-blue-200"><ImpactBadge value={impacts.cons * 12} /></td>

                        <td className="px-2 py-3 text-center font-black text-[#0A2A4A] tabular-nums bg-blue-200/35">{totals.opt}</td>
                        <td className="px-2 py-3 text-center font-black text-[#0A2A4A] tabular-nums bg-blue-200/35">{fmt(totals.coutOpt)}</td>
                        <td className="px-2 py-3 text-center font-black text-[#061a2e] tabular-nums bg-blue-200/35">{fmt(totals.coutOpt * 12)}</td>
                        <td className="px-2 py-3 text-center bg-blue-200/35"><ImpactBadge value={impacts.opt * 12} /></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
