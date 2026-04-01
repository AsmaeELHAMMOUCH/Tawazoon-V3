import React, { useMemo, useState, useEffect } from "react";
import "@/styles/dialog-animations.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
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
import { SEL_LIST, HIERARCHY_TAB } from "./chiffrage-batch/constants";
import {
  mapDetailToSingleRow,
  mapAggToSingleRow,
  mapDetailToCmpRow,
  mapAggToCmpRow,
} from "./chiffrage-batch/mappers";
import ChiffrageBatchSingleHero from "./chiffrage-batch/ChiffrageBatchSingleHero";
import ChiffrageBatchSingleStats from "./chiffrage-batch/ChiffrageBatchSingleStats";
import ChiffrageDrilldownScopeBar from "./chiffrage-batch/ChiffrageDrilldownScopeBar";
import ChiffrageHierarchyTableSingle from "./chiffrage-batch/ChiffrageHierarchyTableSingle";
import ChiffrageBatchComparatifHeader from "./chiffrage-batch/ChiffrageBatchComparatifHeader";
import ChiffrageBatchComparatifDirectionCards from "./chiffrage-batch/ChiffrageBatchComparatifDirectionCards";
import ChiffrageHierarchyTableComparatif from "./chiffrage-batch/ChiffrageHierarchyTableComparatif";

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
  const [hierarchyTab, setHierarchyTab] = useState(HIERARCHY_TAB.regions);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (open) {
      setRegionKey("all");
      setCentreKey(SEL_LIST);
      setHierarchyTab(HIERARCHY_TAB.regions);
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
        `${a.region_label} ${a.centre_label}`.localeCompare(`${b.region_label} ${b.centre_label}`, "fr")
      );
  }, [scopedParCentre, mode]);

  const postesAggScoped = useMemo(
    () => aggregatePostesNetwork(scopedParCentre, mode),
    [scopedParCentre, mode]
  );

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
      const impact = mode === "single" ? reg.budgetActuel - reg.budgetSimule : 0;
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

  const resetDrilldown = () => {
    setRegionKey("all");
    setCentreKey(SEL_LIST);
    setHierarchyTab(HIERARCHY_TAB.regions);
  };

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
            <Card className="overflow-hidden border-0 shadow-none bg-slate-50 h-full flex flex-col max-h-[92vh] rounded-2xl">
              <ChiffrageBatchSingleHero nat={nat} singleModeLabel={singleModeLabel} />
              <CardContent className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4">
                <ChiffrageBatchSingleStats etpNat={etpNat} nat={nat} singleModeLabel={singleModeLabel} />
                <ChiffrageDrilldownScopeBar
                  variant="single"
                  regionKey={regionKey}
                  centreKey={centreKey}
                  scopeLabel={scopeLabel}
                  scopedCentresLength={scopedCentres.length}
                  selectedCentreLabel={selectedCentreRow?.centre_label ?? ""}
                  onReset={resetDrilldown}
                />
                <ChiffrageHierarchyTableSingle
                  hierarchyTab={hierarchyTab}
                  setHierarchyTab={setHierarchyTab}
                  regionKey={regionKey}
                  centreKey={centreKey}
                  setRegionKey={setRegionKey}
                  setCentreKey={setCentreKey}
                  regionRowsAllNetwork={regionRowsAllNetwork}
                  scopedCentres={scopedCentres}
                  singleRowsForTable={singleRowsForTable}
                  postesTableTitle={postesTableTitle}
                />
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
              <ChiffrageBatchComparatifHeader />
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
                <ChiffrageBatchComparatifDirectionCards nat={nat} etpNat={etpNat} />
                <ChiffrageDrilldownScopeBar
                  variant="comparatif"
                  regionKey={regionKey}
                  centreKey={centreKey}
                  scopeLabel={scopeLabel}
                  scopedCentresLength={scopedCentres.length}
                  selectedCentreLabel={selectedCentreRow?.centre_label ?? ""}
                  onReset={resetDrilldown}
                />
                <ChiffrageHierarchyTableComparatif
                  hierarchyTab={hierarchyTab}
                  setHierarchyTab={setHierarchyTab}
                  regionKey={regionKey}
                  centreKey={centreKey}
                  setRegionKey={setRegionKey}
                  setCentreKey={setCentreKey}
                  regionRowsAllNetwork={regionRowsAllNetwork}
                  scopedCentres={scopedCentres}
                  cmpRowsForTable={cmpRowsForTable}
                  postesTableTitle={postesTableTitle}
                  cmpTotalsFooter={cmpTotalsFooter}
                  cmpImpactsFooter={cmpImpactsFooter}
                />
              </div>
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
