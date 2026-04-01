import React, { useMemo, useState, useEffect, useRef } from "react";
import "@/styles/dialog-animations.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DollarSign,
  MapPin,
  Building2,
  Layers,
  Users,
  ArrowRight,
  Package,
  Calculator,
  TrendingUp,
  Calendar,
  Wallet,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { BudgetCard } from "@/components/wizard/ChiffrageDialog";
import {
  ChiffrageDirectionCard,
  ImpactBadge,
  SCENARIOS,
} from "@/components/wizard/ChiffrageComparatifDialog";
import {
  nationalTotals,
  aggregateRegions,
  aggregatePostesNetwork,
  hasChiffrageData,
  filterParCentreByRegion,
  uniqueRegionsFromParCentre,
  centreBudgetTotals,
  posteDetailRowsForCentre,
  nationalEtpTotals,
  centreEtpSums,
} from "@/lib/chiffrage-batch-aggregate";

const fmtSingle = (v) => {
  const val = Number(v || 0);
  const fixed = Math.round(val).toString();
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const fmtCmp = (v) => {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "—";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
};

const SEL_LIST = "__list__";

const SECTION_IDS = {
  regions: "chiffrage-section-regions",
  centres: "chiffrage-section-centres",
  postes: "chiffrage-section-postes",
};

function scrollSectionIntoView(containerEl, sectionId) {
  if (!containerEl || !sectionId) return;
  requestAnimationFrame(() => {
    const target = containerEl.querySelector(`#${sectionId}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function mapDetailToSingleRow(p) {
  const actuel = Math.round(Number(p.actuel_etp) || 0);
  const calcule = Math.round(Number(p.simule_etp) || 0);
  return {
    label: p.label,
    type: p.type_poste || "MOD",
    actuel,
    calcule,
    gap: actuel - calcule,
    salaire: Number(p.charge_salaire) || 0,
    coutActuel: p.budgetActuel,
    coutCalcule: p.budgetSimule,
    impact: p.impact,
  };
}

function mapAggToSingleRow(p) {
  const actuel = Math.round(Number(p.actuel_etp) || 0);
  const calcule = Math.round(Number(p.simule_etp) || 0);
  return {
    label: p.label,
    type: "MOD",
    actuel,
    calcule,
    gap: actuel - calcule,
    salaire: Number(p.charge_salaire) || 0,
    coutActuel: p.budgetActuel,
    coutCalcule: p.budgetSimule,
    impact: (p.budgetActuel || 0) - (p.budgetSimule || 0),
  };
}

function mapDetailToCmpRow(p) {
  return {
    label: p.label,
    type: p.type_poste || "MOD",
    salaire: Number(p.charge_salaire) || 0,
    actuel: Math.round(Number(p.actuel_etp) || 0),
    calc: Math.round(Number(p.simule_etp_calc) || 0),
    cons: Math.round(Number(p.simule_etp_cons) || 0),
    opt: Math.round(Number(p.simule_etp_opt) || 0),
    coutAct: p.budgetActuel,
    coutCalc: p.budgetCalc,
    coutCons: p.budgetCons,
    coutOpt: p.budgetOpt,
  };
}

function mapAggToCmpRow(p) {
  return {
    label: p.label,
    type: "MOD",
    salaire: Number(p.charge_salaire) || 0,
    actuel: Math.round(Number(p.actuel_etp) || 0),
    calc: Math.round(Number(p.simule_etp_calc) || 0),
    cons: Math.round(Number(p.simule_etp_cons) || 0),
    opt: Math.round(Number(p.simule_etp_opt) || 0),
    coutAct: p.budgetActuel,
    coutCalc: p.budgetCalc,
    coutCons: p.budgetCons,
    coutOpt: p.budgetOpt,
  };
}

/** Barre périmètre + réinit (navigation = clics dans le tableau). */
function DrilldownScopeBar({
  regionKey,
  centreKey,
  scopeLabel,
  scopedCentresLength,
  selectedCentreLabel,
  variant,
  onReset,
}) {
  const isCmp = variant === "comparatif";
  const accent = isCmp ? "text-[#005EA8]" : "text-violet-700";
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm flex flex-wrap items-center gap-2 justify-between gap-y-2">
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] min-w-0">
        <Layers className={`w-3.5 h-3.5 shrink-0 ${isCmp ? "text-[#005EA8]" : "text-violet-600"}`} />
        <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0">Périmètre</span>
        <span className="text-slate-300 hidden sm:inline">·</span>
        <nav className="flex flex-wrap items-center gap-1 text-slate-600 min-w-0" aria-label="Fil d'Ariane chiffrage">
          <span className={`font-bold ${regionKey === "all" ? accent : "text-slate-500"}`}>National (fichier)</span>
          {regionKey !== "all" && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
              <span className={`font-bold truncate max-w-[10rem] ${centreKey === SEL_LIST ? accent : "text-slate-500"}`} title={scopeLabel}>
                {scopeLabel}
              </span>
            </>
          )}
          {centreKey !== SEL_LIST && selectedCentreLabel && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
              <span className={`font-bold truncate max-w-[12rem] ${accent}`} title={selectedCentreLabel}>
                {selectedCentreLabel}
              </span>
            </>
          )}
        </nav>
        <span className="text-slate-300 hidden md:inline">·</span>
        <span className="text-slate-500 tabular-nums">
          {scopedCentresLength} centre{scopedCentresLength !== 1 ? "s" : ""} dans le filtre courant
        </span>
      </div>
      <button
        type="button"
        onClick={onReset}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors shrink-0 ${
          isCmp
            ? "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-[#005EA8]/30"
            : "border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-200"
        }`}
      >
        <RotateCcw className="w-3 h-3" />
        Réinitialiser
      </button>
    </div>
  );
}

export default function ChiffrageBatchHierarchyDialog({
  open,
  onOpenChange,
  variant = "single",
  par_centre = [],
  singleModeLabel = "simulé",
}) {
  const mode = variant === "comparatif" ? "comparatif" : "single";

  const [regionKey, setRegionKey] = useState("all");
  const [centreKey, setCentreKey] = useState(SEL_LIST);
  const [animKey, setAnimKey] = useState(0);
  const hierarchyScrollRef = useRef(null);

  useEffect(() => {
    if (open) {
      setRegionKey("all");
      setCentreKey(SEL_LIST);
      setAnimKey((k) => k + 1);
    }
  }, [open]);

  useEffect(() => {
    setCentreKey(SEL_LIST);
  }, [regionKey]);

  const nat = useMemo(() => nationalTotals(par_centre, mode), [par_centre, mode]);
  const etpNat = useMemo(() => nationalEtpTotals(par_centre, mode), [par_centre, mode]);
  const regionOptions = useMemo(() => uniqueRegionsFromParCentre(par_centre), [par_centre]);
  const scopedParCentre = useMemo(
    () => filterParCentreByRegion(par_centre, regionKey),
    [par_centre, regionKey]
  );

  const scopedCentres = useMemo(() => {
    return scopedParCentre
      .map((c) => ({
        centre_id: c.centre_id,
        centre_label: c.centre_label,
        region_label: c.region_label,
        region_id: c.region_id,
        ...centreBudgetTotals(c, mode),
        ...centreEtpSums(c, mode),
      }))
      .sort((a, b) =>
        `${a.region_label} ${a.centre_label}`.localeCompare(
          `${b.region_label} ${b.centre_label}`,
          "fr"
        )
      );
  }, [scopedParCentre, mode]);

  const postesAggScoped = useMemo(
    () => aggregatePostesNetwork(scopedParCentre, mode),
    [scopedParCentre, mode]
  );

  /** Toutes les régions du fichier (navigation toujours sur la liste nationale). */
  const regionRowsAllNetwork = useMemo(() => {
    const regs = aggregateRegions(par_centre, mode);
    return regs.map((reg) => {
      let etpAct = 0;
      let etpSim = 0;
      let etpCalc = 0;
      let etpCons = 0;
      let etpOpt = 0;
      for (const bc of reg.centres) {
        const raw = par_centre.find((p) => String(p.centre_id) === String(bc.centre_id));
        if (!raw) continue;
        const e = centreEtpSums(raw, mode);
        etpAct += e.etpAct;
        if (mode === "comparatif") {
          etpCalc += e.etpCalc;
          etpCons += e.etpCons;
          etpOpt += e.etpOpt;
        } else {
          etpSim += e.etpSim;
        }
      }
      const impact =
        mode === "single" ? reg.budgetActuel - reg.budgetSimule : 0;
      const nbCentres = reg.centres?.length ?? 0;
      return { ...reg, etpAct, etpSim, etpCalc, etpCons, etpOpt, impact, nbCentres };
    });
  }, [par_centre, mode]);

  const selectedCentreRow = useMemo(() => {
    if (centreKey === SEL_LIST) return null;
    const id = Number(centreKey);
    return (
      scopedParCentre.find((c) => c.centre_id === id || String(c.centre_id) === String(centreKey)) || null
    );
  }, [centreKey, scopedParCentre]);

  const posteDetailRows = useMemo(() => {
    if (!selectedCentreRow) return [];
    return posteDetailRowsForCentre(selectedCentreRow, mode);
  }, [selectedCentreRow, mode]);

  const ok = hasChiffrageData(par_centre);

  const scopeLabel =
    regionKey === "all"
      ? "National (fichier complet)"
      : regionOptions.find((r) => String(r.region_id) === String(regionKey))?.region_label || "Région";

  const postesTableTitle =
    centreKey === SEL_LIST
      ? regionKey === "all"
        ? "Postes agrégés — réseau national"
        : "Postes agrégés — région sélectionnée"
      : `Détail par poste — ${selectedCentreRow?.centre_label || ""}`;

  const singleRowsForTable = useMemo(() => {
    if (selectedCentreRow) return posteDetailRows.map(mapDetailToSingleRow);
    if (centreKey === SEL_LIST) return postesAggScoped.map(mapAggToSingleRow);
    return [];
  }, [centreKey, postesAggScoped, posteDetailRows, selectedCentreRow]);

  const cmpRowsForTable = useMemo(() => {
    if (selectedCentreRow) return posteDetailRows.map(mapDetailToCmpRow);
    if (centreKey === SEL_LIST) return postesAggScoped.map(mapAggToCmpRow);
    return [];
  }, [centreKey, postesAggScoped, posteDetailRows, selectedCentreRow]);

  const cmpTotalsFooter = useMemo(() => {
    const rows = cmpRowsForTable;
    return rows.reduce(
      (a, r) => ({
        actuel: a.actuel + r.actuel,
        calc: a.calc + r.calc,
        cons: a.cons + r.cons,
        opt: a.opt + r.opt,
        coutAct: a.coutAct + r.coutAct,
        coutCalc: a.coutCalc + r.coutCalc,
        coutCons: a.coutCons + r.coutCons,
        coutOpt: a.coutOpt + r.coutOpt,
      }),
      { actuel: 0, calc: 0, cons: 0, opt: 0, coutAct: 0, coutCalc: 0, coutCons: 0, coutOpt: 0 }
    );
  }, [cmpRowsForTable]);

  const cmpImpactsFooter = useMemo(
    () => ({
      calc: cmpTotalsFooter.coutAct - cmpTotalsFooter.coutCalc,
      cons: cmpTotalsFooter.coutAct - cmpTotalsFooter.coutCons,
      opt: cmpTotalsFooter.coutAct - cmpTotalsFooter.coutOpt,
    }),
    [cmpTotalsFooter]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {mode === "single" ? (
        <DialogContent
          key={animKey}
          className="dlg-enter max-w-[95vw] lg:max-w-5xl h-fit max-h-[92vh] p-0 overflow-hidden border-none shadow-2xl rounded-2xl"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Chiffrage batch</DialogTitle>
          </DialogHeader>
          {!ok ? (
            <div className="p-8 text-center text-[11px] text-amber-800 bg-amber-50">
              Aucune donnée de chiffrage (relancez la simulation). Champ{" "}
              <code className="font-mono">postes_chiffrage</code> requis.
            </div>
          ) : (
            <Card className="overflow-hidden border-0 shadow-none bg-slate-50 h-full flex flex-col max-h-[92vh]">
              <CardHeader className="dlg-header-enter relative shrink-0 overflow-hidden bg-gradient-to-br from-[#015294] via-[#005EA8] to-[#00A0E0] py-3 px-5 border-b-0">
                <div className="absolute inset-0 opacity-15">
                  <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/20 blur-2xl dlg-blob-a" />
                  <div className="absolute left-1/4 -bottom-5 w-32 h-32 rounded-full bg-sky-300/20 blur-xl dlg-blob-b" />
                </div>
                <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="dlg-icon-hover dlg-icon-enter w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner"
                      style={{ animationDelay: "0.1s" }}
                    >
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight flex flex-wrap items-center gap-2">
                        Chiffrage & Impact Financier ({singleModeLabel})
                        <span className="text-[10px] font-medium text-blue-100/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">
                          Batch national
                        </span>
                      </h2>
                      <p className="text-[10px] text-blue-100 font-medium opacity-80 uppercase tracking-wide">
                        Économie estimée (annuelle) : {nat.impact * 12 > 0 ? "+" : ""}
                        {fmtSingle(nat.impact * 12)} MAD / an
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 p-2 rounded-xl flex gap-4">
                      <div className="text-center">
                        <p className="text-[8px] text-blue-100/70 font-bold uppercase tracking-widest">Actuel</p>
                        <p className="text-base font-black text-white leading-tight">{fmtSingle(nat.budgetActuel)}</p>
                      </div>
                      <div className="w-px bg-white/10" />
                      <div className="text-center">
                        <p className="text-[8px] text-blue-200 font-bold uppercase tracking-widest" style={{ color: "#7dd3fc" }}>
                          {singleModeLabel}
                        </p>
                        <p className="text-base font-black text-white leading-tight">{fmtSingle(nat.budgetSimule)}</p>
                      </div>
                      <div className="w-px bg-white/10" />
                      <div className="text-center">
                        <p className="text-[8px] text-blue-100/70 font-bold uppercase tracking-widest">Économie / an</p>
                        <p
                          className={`text-base font-black leading-tight ${
                            nat.impact >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {nat.impact * 12 > 0 ? "+" : ""}
                          {fmtSingle(nat.impact * 12)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Effectifs MOD (fichier)</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-slate-300 tracking-widest">Actuel</p>
                      <p className="text-sm font-black text-slate-600 tabular-nums">
                        {fmtSingle(etpNat.etpAct)} <span className="text-[9px] font-bold text-slate-300">ETP</span>
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-200 hidden sm:block" />
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-blue-400 tracking-widest">{singleModeLabel}</p>
                      <p className="text-sm font-black text-blue-600 tabular-nums">
                        {fmtSingle(etpNat.etpSim)} <span className="text-[9px] font-bold text-blue-200">ETP</span>
                      </p>
                    </div>
                    <div className="w-px h-6 bg-slate-100 mx-1 hidden sm:block" />
                    <div
                      className={`px-3 py-1 rounded-lg flex items-center gap-1.5 font-black text-sm tabular-nums ${
                        etpNat.etpGap >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      <span className="text-[9px] font-bold opacity-60 uppercase">Écart :</span>
                      {etpNat.etpGap > 0 ? "+" : ""}
                      {fmtSingle(etpNat.etpGap)} ETP
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="dlg-card-enter" style={{ animationDelay: "0.18s" }}>
                    <BudgetCard
                      icon={Package}
                      label="Masse salariale actuelle"
                      sublabel="Budget initial"
                      monthly={fmtSingle(nat.budgetActuel)}
                      annual={fmtSingle(nat.budgetActuel * 12)}
                      color="#64748b"
                    />
                  </div>
                  <div className="dlg-card-enter" style={{ animationDelay: "0.26s" }}>
                    <BudgetCard
                      icon={Calculator}
                      label={`Masse salariale ${singleModeLabel}`}
                      sublabel={`Budget ${singleModeLabel}`}
                      monthly={fmtSingle(nat.budgetSimule)}
                      annual={fmtSingle(nat.budgetSimule * 12)}
                      color="#0ea5e9"
                    />
                  </div>
                  <div
                    className={`dlg-card-enter relative overflow-hidden rounded-xl flex flex-col shadow-md group transition-shadow hover:shadow-lg ${
                      nat.impact >= 0 ? "bg-gradient-to-b from-emerald-600 to-emerald-700" : "bg-gradient-to-b from-rose-600 to-rose-700"
                    }`}
                    style={{ animationDelay: "0.34s" }}
                  >
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative flex items-center justify-between px-3 pt-2.5 pb-0">
                      <div>
                        <p className="text-[8px] font-black text-white/60 uppercase tracking-[0.15em] leading-none">
                          {nat.impact >= 0 ? "Économie" : "Surcoût"}
                        </p>
                        <p className="text-[9px] font-bold text-white/70 mt-0.5">Impact financier</p>
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <div className="relative px-3 pt-1.5 pb-2">
                      <p className="text-[7px] font-bold text-white/70 uppercase tracking-wider">Écart budgétaire / an</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-white tabular-nums tracking-tight leading-none">
                          {nat.impact * 12 > 0 ? "+" : ""}
                          {fmtSingle(nat.impact * 12)}
                        </span>
                        <span className="text-[8px] font-bold text-white/50 uppercase">MAD</span>
                      </div>
                    </div>
                    <div className="relative mt-auto flex items-center justify-between bg-black/15 border-t border-white/10 px-3 py-1.5">
                      <span className="text-[7px] font-bold text-white/50 uppercase tracking-wider">Réf. / mois</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[11px] font-black text-white tabular-nums">
                          {nat.impact > 0 ? "+" : ""}
                          {fmtSingle(nat.impact)}
                        </span>
                        <span className="text-[7px] font-bold text-white/40 uppercase">MAD</span>
                      </div>
                    </div>
                  </div>
                </div>

                <DrilldownScopeBar
                  variant="single"
                  regionKey={regionKey}
                  centreKey={centreKey}
                  scopeLabel={scopeLabel}
                  scopedCentresLength={scopedCentres.length}
                  selectedCentreLabel={selectedCentreRow?.centre_label ?? ""}
                  onReset={() => {
                    setRegionKey("all");
                    setCentreKey(SEL_LIST);
                    setTimeout(() => scrollSectionIntoView(hierarchyScrollRef.current, SECTION_IDS.regions), 80);
                  }}
                />

                <div
                  ref={hierarchyScrollRef}
                  className="dlg-table-enter rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col max-h-[min(58vh,560px)]"
                  style={{ animationDelay: "0.38s" }}
                >
                  <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2 shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Un seul tableau — régions, centres, postes
                    </p>
                  </div>
                  <div className="overflow-y-auto overflow-x-auto min-h-0 flex-1">
                    <table className="w-full text-[10px] border-collapse min-w-[720px]">
                      <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                        <tr className="border-b border-slate-200">
                          <th className="text-left px-2 py-2 text-[9px] font-black uppercase text-slate-400 w-[4.5rem]">Niveau</th>
                          <th className="text-left px-2 py-2 text-[9px] font-black uppercase text-slate-400 min-w-[9rem]">Libellé</th>
                          <th className="text-left px-2 py-2 text-[9px] font-black uppercase text-slate-400 min-w-[5rem]">Info</th>
                          <th className="text-center px-2 py-2 text-[9px] font-black uppercase text-slate-400">ETP act.</th>
                          <th className="text-center px-2 py-2 text-[9px] font-black uppercase text-blue-400">ETP sim.</th>
                          <th className="text-center px-2 py-2 text-[9px] font-black uppercase text-slate-400">Écart ETP</th>
                          <th className="text-right px-2 py-2 text-[9px] font-black uppercase text-slate-500">Budget act.</th>
                          <th className="text-right px-2 py-2 text-[9px] font-black uppercase text-[#005EA8]">Budget sim.</th>
                          <th className="text-right px-2 py-2 text-[9px] font-black uppercase text-slate-600">Économie (an)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr id={SECTION_IDS.regions} className="bg-slate-100/95 scroll-mt-2">
                          <td colSpan={9} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 border-y border-slate-200">
                            Régions — cliquez une ligne pour afficher les centres (défilement automatique)
                          </td>
                        </tr>
                        {regionRowsAllNetwork.map((row, i) => (
                          <tr
                            key={`reg-${row.region_id}`}
                            onClick={() => {
                              setRegionKey(String(row.region_id));
                              setTimeout(() => scrollSectionIntoView(hierarchyScrollRef.current, SECTION_IDS.centres), 100);
                            }}
                            className={`cursor-pointer border-b border-slate-50 ${
                              i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                            } hover:bg-blue-50/70 ${String(regionKey) === String(row.region_id) ? "bg-blue-50/60" : ""}`}
                          >
                            <td className="px-2 py-2">
                              <span className="text-[8px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-100 rounded px-1 py-0.5">
                                Région
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="font-bold text-slate-800 truncate" title={row.region_label}>
                                  {row.region_label}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                              </div>
                            </td>
                            <td className="px-2 py-2 text-slate-600 tabular-nums">{row.nbCentres} ctr.</td>
                            <td className="px-2 py-2 text-center font-bold text-slate-600">{fmtSingle(row.etpAct)}</td>
                            <td className="px-2 py-2 text-center font-black text-[#005EA8] bg-blue-50/15">{fmtSingle(row.etpSim)}</td>
                            <td className="px-2 py-2 text-center font-bold text-slate-500">{fmtSingle(row.etpAct - row.etpSim)}</td>
                            <td className="px-2 py-2 text-right font-bold text-slate-500">{fmtSingle(row.budgetActuel)}</td>
                            <td className="px-2 py-2 text-right font-black text-[#005EA8]">{fmtSingle(row.budgetSimule)}</td>
                            <td className="px-2 py-2 text-right">
                              <span className={`font-black ${row.impact >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {row.impact * 12 > 0 ? "+" : ""}
                                {fmtSingle(row.impact * 12)}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr id={SECTION_IDS.centres} className="bg-slate-100/95 scroll-mt-2">
                          <td colSpan={9} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 border-y border-slate-200">
                            Centres — cliquez un centre pour le détail par poste
                          </td>
                        </tr>
                        {regionKey === "all" ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-6 text-center text-[11px] text-slate-400">
                              Choisissez une région dans la section ci-dessus pour lister ses centres.
                            </td>
                          </tr>
                        ) : scopedCentres.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-6 text-center text-[11px] text-slate-400">
                              Aucun centre dans cette région.
                            </td>
                          </tr>
                        ) : (
                          scopedCentres.map((row, i) => (
                            <tr
                              key={`cen-${row.centre_id}`}
                              onClick={() => {
                                setCentreKey(String(row.centre_id));
                                setTimeout(() => scrollSectionIntoView(hierarchyScrollRef.current, SECTION_IDS.postes), 100);
                              }}
                              className={`cursor-pointer border-b border-slate-50 ${
                                i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                              } hover:bg-indigo-50/60 ${
                                centreKey !== SEL_LIST && String(centreKey) === String(row.centre_id) ? "bg-indigo-50/50" : ""
                              }`}
                            >
                              <td className="px-2 py-2">
                                <span className="text-[8px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5">
                                  Centre
                                </span>
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span className="font-bold text-slate-800 truncate">{row.centre_label}</span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                                </div>
                              </td>
                              <td className="px-2 py-2 text-slate-500 truncate max-w-[6rem]" title={row.region_label}>
                                {row.region_label}
                              </td>
                              <td className="px-2 py-2 text-center font-bold text-slate-600">{fmtSingle(row.etpAct)}</td>
                              <td className="px-2 py-2 text-center font-black text-[#005EA8] bg-blue-50/15">{fmtSingle(row.etpSim)}</td>
                              <td className="px-2 py-2 text-center font-bold text-slate-500">{fmtSingle(row.etpAct - row.etpSim)}</td>
                              <td className="px-2 py-2 text-right font-bold text-slate-500">{fmtSingle(row.budgetActuel)}</td>
                              <td className="px-2 py-2 text-right font-black text-[#005EA8]">{fmtSingle(row.budgetSimule)}</td>
                              <td className="px-2 py-2 text-right">
                                <span className={`font-black ${row.impact >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                  {row.impact * 12 > 0 ? "+" : ""}
                                  {fmtSingle(row.impact * 12)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                        <tr id={SECTION_IDS.postes} className="bg-violet-50/80 scroll-mt-2">
                          <td colSpan={9} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 border-y border-slate-200">
                            Postes — {postesTableTitle}
                          </td>
                        </tr>
                        {singleRowsForTable.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-6 text-center text-[11px] text-slate-400">
                              Aucune ligne poste pour ce périmètre (sélectionnez un centre pour le détail).
                            </td>
                          </tr>
                        ) : (
                          singleRowsForTable.map((r, idx) => (
                            <tr
                              key={`poste-${r.label}-${idx}`}
                              className={`border-b border-slate-50 ${idx % 2 === 0 ? "bg-violet-50/20" : "bg-white"}`}
                            >
                              <td className="px-2 py-1.5">
                                <span className="text-[8px] font-black uppercase text-violet-700 bg-violet-50 border border-violet-100 rounded px-1 py-0.5">
                                  Poste
                                </span>
                              </td>
                              <td className="px-2 py-1.5 font-bold text-slate-800">{r.label}</td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                    r.type === "MOD"
                                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {r.type}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-center font-bold text-slate-600">{fmtSingle(r.actuel)}</td>
                              <td className="px-2 py-1.5 text-center font-black text-[#005EA8]">{fmtSingle(r.calcule)}</td>
                              <td className="px-2 py-1.5 text-center">
                                <span className={`font-black text-[9px] ${r.gap >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                  {r.gap > 0 ? "+" : ""}
                                  {fmtSingle(r.gap)}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-right font-bold text-slate-500">{fmtSingle(r.coutActuel)}</td>
                              <td className="px-2 py-1.5 text-right font-black text-[#005EA8]">{fmtSingle(r.coutCalcule)}</td>
                              <td className="px-2 py-1.5 text-right">
                                <span className={`font-black ${r.impact >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                  {r.impact * 12 > 0 ? "+" : ""}
                                  {fmtSingle(r.impact * 12)}
                                </span>
                                <span className="block text-[7px] font-bold text-slate-300 uppercase">MAD / an</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-[9px] text-slate-400 px-1">
                  Navigation par clics dans le tableau uniquement. Réinitialiser = retour à l’affichage national. MAD = charge salaire × ETP (MOD + APS).
                </p>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      ) : (
        <DialogContent
          key={animKey}
          className="max-w-[97vw] lg:max-w-7xl p-0 border-none rounded-2xl overflow-hidden"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "92vh",
            boxShadow: "0 32px 64px -12px rgba(0,0,0,0.35)",
            animation: "dlg-fade-slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Chiffrage comparatif batch</DialogTitle>
          </DialogHeader>
          {!ok ? (
            <div className="p-8 text-center text-[11px] text-amber-800 bg-amber-50">Aucune donnée de chiffrage.</div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                borderRadius: 16,
                overflow: "hidden",
                background: "#f8fafc",
              }}
            >
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
                <div className="relative px-6 py-3 flex items-center gap-3">
                  <div
                    className="dlg-icon-hover dlg-icon-enter w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-lg"
                    style={{ animationDelay: "0.1s" }}
                  >
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div className="dlg-header-enter" style={{ animationDelay: "0.15s" }}>
                    <h2 className="text-lg font-black text-white tracking-tight leading-none">Chiffrage comparatif — batch</h2>
                    <p className="text-[10px] text-blue-200/80 font-medium mt-1 uppercase tracking-widest">
                      Masse salariale MOD · fichier complet (synthèse)
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-3 space-y-3"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#cbd5e1 transparent",
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ChiffrageDirectionCard
                    icon={Wallet}
                    label="Budget mensuel"
                    sublabel="Masse salariale / mois"
                    color="#005EA8"
                    actuelValue={nat.budgetActuel}
                    animDelay="0.18s"
                    deltaBudgetAnnual
                    scenarios={SCENARIOS.map((sc) => ({
                      key: sc.key,
                      label: sc.label,
                      color: sc.color,
                      etp: sc.key === "actuel" ? etpNat.etpCalc : sc.key === "consolide" ? etpNat.etpCons : etpNat.etpOpt,
                      value: sc.key === "actuel" ? nat.budgetCalc : sc.key === "consolide" ? nat.budgetCons : nat.budgetOpt,
                    }))}
                  />
                  <ChiffrageDirectionCard
                    icon={Calendar}
                    label="Budget annuel"
                    sublabel="Masse salariale × 12"
                    color="#00A0E0"
                    actuelValue={nat.budgetActuel * 12}
                    animDelay="0.28s"
                    scenarios={SCENARIOS.map((sc) => ({
                      key: sc.key,
                      label: sc.label,
                      color: sc.color,
                      etp: sc.key === "actuel" ? etpNat.etpCalc : sc.key === "consolide" ? etpNat.etpCons : etpNat.etpOpt,
                      value:
                        (sc.key === "actuel" ? nat.budgetCalc : sc.key === "consolide" ? nat.budgetCons : nat.budgetOpt) * 12,
                    }))}
                  />
                </div>

                <DrilldownScopeBar
                  variant="comparatif"
                  regionKey={regionKey}
                  centreKey={centreKey}
                  scopeLabel={scopeLabel}
                  scopedCentresLength={scopedCentres.length}
                  selectedCentreLabel={selectedCentreRow?.centre_label ?? ""}
                  onReset={() => {
                    setRegionKey("all");
                    setCentreKey(SEL_LIST);
                    setTimeout(() => scrollSectionIntoView(hierarchyScrollRef.current, SECTION_IDS.regions), 80);
                  }}
                />

                <div
                  ref={hierarchyScrollRef}
                  className="dlg-table-enter rounded-2xl border border-white bg-white shadow-sm overflow-hidden flex flex-col max-h-[min(62vh,600px)]"
                  style={{ animationDelay: "0.32s" }}
                >
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0">
                    <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0A6BBC] to-[#005EA8]" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Un seul tableau — régions, centres, postes (détail poste ci-dessous)
                    </p>
                  </div>
                  <div className="overflow-y-auto overflow-x-auto min-h-0 flex-1">
                    <table className="w-full text-[10px] border-collapse min-w-[960px]">
                      <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                        <tr className="border-b border-slate-200">
                          <th className="text-left px-2 py-2 text-[9px] font-black uppercase text-slate-400 w-[4rem]">Niveau</th>
                          <th className="text-left px-2 py-2 text-[9px] font-black uppercase text-slate-400 min-w-[8rem]">Libellé</th>
                          <th className="text-left px-2 py-2 text-[9px] font-black uppercase text-slate-400 min-w-[5rem]">Info</th>
                          <th className="text-center px-1 py-2 text-[9px] font-black text-slate-500">ETP a.</th>
                          <th className="text-center px-1 py-2 text-[9px] font-black text-blue-700">Calc.</th>
                          <th className="text-center px-1 py-2 text-[9px] font-black text-[#005EA8]">Cons.</th>
                          <th className="text-center px-1 py-2 text-[9px] font-black text-blue-950">Opt.</th>
                          <th className="text-right px-1 py-2 text-[9px] font-black text-slate-500">B. act.</th>
                          <th className="text-right px-1 py-2 text-[9px] font-black text-blue-700">Calc.</th>
                          <th className="text-right px-1 py-2 text-[9px] font-black text-[#005EA8]">Cons.</th>
                          <th className="text-right px-1 py-2 text-[9px] font-black text-blue-950">Opt.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr id={SECTION_IDS.regions} className="bg-slate-100/95 scroll-mt-2">
                          <td colSpan={11} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 border-y border-slate-200">
                            Régions — cliquez pour afficher les centres de la région
                          </td>
                        </tr>
                        {regionRowsAllNetwork.map((row, i) => (
                          <tr
                            key={`cmp-reg-${row.region_id}`}
                            onClick={() => {
                              setRegionKey(String(row.region_id));
                              setTimeout(() => scrollSectionIntoView(hierarchyScrollRef.current, SECTION_IDS.centres), 100);
                            }}
                            className={`cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-blue-50/60 ${
                              String(regionKey) === String(row.region_id) ? "bg-blue-50/55" : ""
                            }`}
                          >
                            <td className="px-2 py-2">
                              <span className="text-[8px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-100 rounded px-1 py-0.5">
                                Région
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1 min-w-0">
                                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="font-bold text-slate-800 truncate" title={row.region_label}>
                                  {row.region_label}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                              </div>
                            </td>
                            <td className="px-2 py-2 text-slate-600 tabular-nums">{row.nbCentres} ctr.</td>
                            <td className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpAct)}</td>
                            <td className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpCalc)}</td>
                            <td className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpCons)}</td>
                            <td className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpOpt)}</td>
                            <td className="px-1 py-2 text-right font-bold text-slate-600">{fmtCmp(row.budgetActuel)}</td>
                            <td className="px-1 py-2 text-right font-bold text-blue-800 bg-blue-50/35">{fmtCmp(row.budgetCalc)}</td>
                            <td className="px-1 py-2 text-right font-bold text-[#005EA8] bg-blue-50/25">{fmtCmp(row.budgetCons)}</td>
                            <td className="px-1 py-2 text-right font-bold text-slate-800 bg-blue-100/20">{fmtCmp(row.budgetOpt)}</td>
                          </tr>
                        ))}
                        <tr id={SECTION_IDS.centres} className="bg-slate-100/95 scroll-mt-2">
                          <td colSpan={11} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 border-y border-slate-200">
                            Centres — cliquez pour le détail par poste
                          </td>
                        </tr>
                        {regionKey === "all" ? (
                          <tr>
                            <td colSpan={11} className="px-4 py-5 text-center text-[11px] text-slate-400">
                              Choisissez une région ci-dessus pour lister ses centres.
                            </td>
                          </tr>
                        ) : scopedCentres.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="px-4 py-5 text-center text-[11px] text-slate-400">
                              Aucun centre dans cette région.
                            </td>
                          </tr>
                        ) : (
                          scopedCentres.map((row, i) => (
                            <tr
                              key={`cmp-cen-${row.centre_id}`}
                              onClick={() => {
                                setCentreKey(String(row.centre_id));
                                setTimeout(() => scrollSectionIntoView(hierarchyScrollRef.current, SECTION_IDS.postes), 100);
                              }}
                              className={`cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-indigo-50/55 ${
                                centreKey !== SEL_LIST && String(centreKey) === String(row.centre_id) ? "bg-indigo-50/45" : ""
                              }`}
                            >
                              <td className="px-2 py-2">
                                <span className="text-[8px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5">
                                  Centre
                                </span>
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-1 min-w-0">
                                  <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span className="font-bold text-slate-800 truncate">{row.centre_label}</span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                                </div>
                              </td>
                              <td className="px-2 py-2 text-slate-600 truncate max-w-[6rem]" title={row.region_label}>
                                {row.region_label}
                              </td>
                              <td className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpAct)}</td>
                              <td className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpCalc)}</td>
                              <td className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpCons)}</td>
                              <td className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpOpt)}</td>
                              <td className="px-1 py-2 text-right font-bold text-slate-600">{fmtCmp(row.budgetActuel)}</td>
                              <td className="px-1 py-2 text-right font-bold text-blue-800 bg-blue-50/35">{fmtCmp(row.budgetCalc)}</td>
                              <td className="px-1 py-2 text-right font-bold text-[#005EA8] bg-blue-50/25">{fmtCmp(row.budgetCons)}</td>
                              <td className="px-1 py-2 text-right font-bold text-slate-800 bg-blue-100/20">{fmtCmp(row.budgetOpt)}</td>
                            </tr>
                          ))
                        )}
                        <tr id={SECTION_IDS.postes} className="bg-violet-50/80 scroll-mt-2">
                          <td colSpan={11} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 border-y border-slate-200">
                            Postes (comparatif) — {postesTableTitle}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={11} className="p-0 align-top border-0">
                            {cmpRowsForTable.length === 0 ? (
                              <div className="px-4 py-6 text-center text-[11px] text-slate-400">Aucune ligne poste pour ce périmètre.</div>
                            ) : (
                              <div className="overflow-x-auto max-h-[36vh] overflow-y-auto p-2">
                                <table className="w-full text-[11px] border-collapse" style={{ minWidth: 1120 }}>
                        <thead>
                          <tr>
                            <th
                              rowSpan={2}
                              className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200 w-[180px]"
                              style={{ background: "#fff", borderTop: "3px solid #cbd5e1" }}
                            >
                              Poste
                            </th>
                            <th
                              colSpan={4}
                              className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200"
                              style={{ background: "#fff", borderTop: "3px solid #94a3b8" }}
                            >
                              Actuel
                            </th>
                            <th
                              colSpan={4}
                              className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-blue-700 border-b border-blue-200"
                              style={{ background: "#fff", borderTop: "3px solid #2563EB" }}
                            >
                              Calculé
                            </th>
                            <th
                              colSpan={4}
                              className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#005EA8] border-b border-blue-300"
                              style={{ background: "#fff", borderTop: "3px solid #005EA8" }}
                            >
                              Consolidé
                            </th>
                            <th
                              colSpan={4}
                              className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-blue-950 border-b border-blue-400"
                              style={{ background: "#fff", borderTop: "3px solid #003d7a" }}
                            >
                              Optimisé
                            </th>
                          </tr>
                          <tr>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-400 border-b-2 border-slate-200" style={{ background: "#fff" }}>ETP</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-400 border-b-2 border-slate-200" style={{ background: "#fff" }}>Salaire</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-400 border-b-2 border-slate-200" style={{ background: "#fff" }}>Budg. mois</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-500 border-b-2 border-slate-200 border-r border-slate-100" style={{ background: "#fff" }}>Budg. an</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200" style={{ background: "#fff" }}>ETP</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200" style={{ background: "#fff" }}>Budg. mois</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200" style={{ background: "#fff" }}>Budg. an</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200 border-r border-blue-100" style={{ background: "#fff" }}>Écart</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300" style={{ background: "#fff" }}>ETP</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300" style={{ background: "#fff" }}>Budg. mois</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300" style={{ background: "#fff" }}>Budg. an</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300 border-r border-blue-200" style={{ background: "#fff" }}>Écart</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400" style={{ background: "#fff" }}>ETP</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400" style={{ background: "#fff" }}>Budg. mois</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400" style={{ background: "#fff" }}>Budg. an</th>
                            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400" style={{ background: "#fff" }}>Écart</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cmpRowsForTable.map((r, idx) => {
                            const ecartCalc = r.coutAct - r.coutCalc;
                            const ecartCons = r.coutAct - r.coutCons;
                            const ecartOpt = r.coutAct - r.coutOpt;
                            return (
                              <tr
                                key={`${r.label}-${idx}`}
                                className="dlg-table-row dlg-row-enter"
                                style={{ animationDelay: `${0.4 + idx * 0.04}s` }}
                              >
                                <td className="px-4 py-2.5 font-semibold text-slate-700 truncate max-w-[175px]" title={r.label}>
                                  <span className="text-[11px]">{r.label}</span>
                                  <p className="text-[7px] text-slate-400 uppercase tracking-widest mt-0.5">{r.type}</p>
                                </td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{r.actuel}</td>
                                <td className="px-2 py-2.5 text-center text-slate-500 tabular-nums">{fmtCmp(r.salaire)}</td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{fmtCmp(r.coutAct)}</td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-700 tabular-nums border-r border-slate-100">{fmtCmp(r.coutAct * 12)}</td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{r.calc}</td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{fmtCmp(r.coutCalc)}</td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-700 tabular-nums">{fmtCmp(r.coutCalc * 12)}</td>
                                <td className="px-2 py-2.5 text-center border-r border-blue-100"><ImpactBadge value={ecartCalc} /></td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{r.cons}</td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{fmtCmp(r.coutCons)}</td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-700 tabular-nums">{fmtCmp(r.coutCons * 12)}</td>
                                <td className="px-2 py-2.5 text-center border-r border-blue-200"><ImpactBadge value={ecartCons} /></td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{r.opt}</td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{fmtCmp(r.coutOpt)}</td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-700 tabular-nums">{fmtCmp(r.coutOpt * 12)}</td>
                                <td className="px-2 py-2.5 text-center"><ImpactBadge value={ecartOpt} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {cmpRowsForTable.length > 0 && (
                          <tfoot>
                            <tr className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50">
                              <td className="px-4 py-3 font-black text-slate-700 text-[10px] uppercase tracking-wider">Total</td>
                              <td className="px-2 py-3 text-center font-black text-slate-700 tabular-nums">{cmpTotalsFooter.actuel}</td>
                              <td className="px-2 py-3 text-center text-slate-400">—</td>
                              <td className="px-2 py-3 text-center font-black text-slate-700 tabular-nums">{fmtCmp(cmpTotalsFooter.coutAct)}</td>
                              <td className="px-2 py-3 text-center font-black text-slate-800 tabular-nums border-r border-slate-100">{fmtCmp(cmpTotalsFooter.coutAct * 12)}</td>
                              <td className="px-2 py-3 text-center font-black text-blue-800 tabular-nums bg-blue-50/50">{cmpTotalsFooter.calc}</td>
                              <td className="px-2 py-3 text-center font-black text-blue-800 tabular-nums bg-blue-50/50">{fmtCmp(cmpTotalsFooter.coutCalc)}</td>
                              <td className="px-2 py-3 text-center font-black text-blue-900 tabular-nums bg-blue-50/50">{fmtCmp(cmpTotalsFooter.coutCalc * 12)}</td>
                              <td className="px-2 py-3 text-center bg-blue-50/50 border-r border-blue-100"><ImpactBadge value={cmpImpactsFooter.calc} /></td>
                              <td className="px-2 py-3 text-center font-black text-[#005EA8] tabular-nums bg-blue-100/45">{cmpTotalsFooter.cons}</td>
                              <td className="px-2 py-3 text-center font-black text-[#005EA8] tabular-nums bg-blue-100/45">{fmtCmp(cmpTotalsFooter.coutCons)}</td>
                              <td className="px-2 py-3 text-center font-black text-[#004080] tabular-nums bg-blue-100/45">{fmtCmp(cmpTotalsFooter.coutCons * 12)}</td>
                              <td className="px-2 py-3 text-center bg-blue-100/45 border-r border-blue-200"><ImpactBadge value={cmpImpactsFooter.cons} /></td>
                              <td className="px-2 py-3 text-center font-black text-[#0A2A4A] tabular-nums bg-blue-200/35">{cmpTotalsFooter.opt}</td>
                              <td className="px-2 py-3 text-center font-black text-[#0A2A4A] tabular-nums bg-blue-200/35">{fmtCmp(cmpTotalsFooter.coutOpt)}</td>
                              <td className="px-2 py-3 text-center font-black text-[#061a2e] tabular-nums bg-blue-200/35">{fmtCmp(cmpTotalsFooter.coutOpt * 12)}</td>
                              <td className="px-2 py-3 text-center bg-blue-200/35"><ImpactBadge value={cmpImpactsFooter.opt} /></td>
                            </tr>
                          </tfoot>
                        )}
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-[9px] text-slate-400 px-1">
                  Navigation par clics dans le tableau ; réinitialiser = vue nationale. Section postes comparatif : grille détaillée sous les lignes géographiques.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
