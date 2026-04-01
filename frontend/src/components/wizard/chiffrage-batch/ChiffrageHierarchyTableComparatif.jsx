import React from "react";
import { MapPin, Building2, Calculator, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHIFFRAGE_CMP_GEO_COLS, fmtCmp, SEL_LIST, HIERARCHY_TAB } from "./constants";
import ChiffrageComparatifNestedPostesTable from "./ChiffrageComparatifNestedPostesTable";

const G = CHIFFRAGE_CMP_GEO_COLS;
const th = "h-9 px-1 py-1.5 text-[8px] font-black uppercase leading-tight border-b border-slate-200 align-bottom";

function CmpNumGap({ v }) {
  const n = Number(v);
  if (!isFinite(n)) return <span className="text-slate-300">—</span>;
  return (
    <span className={`font-bold ${n >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
      {n > 0 ? "+" : ""}
      {fmtCmp(n)}
    </span>
  );
}

/** Libellé, info, ETP (4) + écarts ETP vs actuel (3), budget (4) + écarts budg. vs actuel (3) — logique des écarts comme l’onglet Postes (vs actuel). */
const geoHeader = (
  <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-sm [&_tr]:border-b-0">
    <TableRow className="border-b border-slate-200 hover:bg-transparent">
      <TableHead className={`${th} min-w-[7rem] text-left text-slate-400 sticky left-0 bg-slate-50 z-[1]`}>Libellé</TableHead>
      <TableHead className={`${th} min-w-[4.5rem] text-left text-slate-400`}>Info</TableHead>
      <TableHead className={`${th} text-center text-slate-500`} title="ETP actuel">
        ETP a.
      </TableHead>
      <TableHead className={`${th} text-center text-blue-700`} title="ETP calculé">
        Calc.
      </TableHead>
      <TableHead className={`${th} text-center text-[#005EA8]`} title="ETP consolidé">
        Cons.
      </TableHead>
      <TableHead className={`${th} text-center text-blue-950`} title="ETP optimisé">
        Opt.
      </TableHead>
      <TableHead className={`${th} text-center text-slate-600`} title="Écart ETP actuel − calculé">
        É. c.
      </TableHead>
      <TableHead className={`${th} text-center text-slate-600`} title="Écart ETP actuel − consolidé">
        É. co.
      </TableHead>
      <TableHead className={`${th} text-center text-slate-600`} title="Écart ETP actuel − optimisé">
        É. o.
      </TableHead>
      <TableHead className={`${th} text-right text-slate-500`}>B. act.</TableHead>
      <TableHead className={`${th} text-right text-blue-700`}>Calc.</TableHead>
      <TableHead className={`${th} text-right text-[#005EA8]`}>Cons.</TableHead>
      <TableHead className={`${th} text-right text-blue-950`}>Opt.</TableHead>
      <TableHead className={`${th} text-right text-slate-600`} title="Écart budget actuel − calculé (MAD)">
        É.B c.
      </TableHead>
      <TableHead className={`${th} text-right text-slate-600`} title="Écart budget actuel − consolidé">
        É.B co.
      </TableHead>
      <TableHead className={`${th} text-right text-slate-600`} title="Écart budget actuel − optimisé">
        É.B o.
      </TableHead>
    </TableRow>
  </TableHeader>
);

function geoGapCells(row) {
  const a = Number(row.etpAct) || 0;
  const bc = Number(row.etpCalc) || 0;
  const bco = Number(row.etpCons) || 0;
  const bo = Number(row.etpOpt) || 0;
  const ba = Number(row.budgetActuel) || 0;
  const ccalc = Number(row.budgetCalc) || 0;
  const ccons = Number(row.budgetCons) || 0;
  const copt = Number(row.budgetOpt) || 0;
  return {
    dEtpC: a - bc,
    dEtpCo: a - bco,
    dEtpO: a - bo,
    dBC: ba - ccalc,
    dBCo: ba - ccons,
    dBO: ba - copt,
  };
}

export default function ChiffrageHierarchyTableComparatif({
  hierarchyTab,
  setHierarchyTab,
  regionKey,
  centreKey,
  setRegionKey,
  setCentreKey,
  regionRowsAllNetwork,
  scopedCentres,
  cmpRowsForTable,
  postesTableTitle,
  cmpTotalsFooter,
  cmpImpactsFooter,
}) {
  return (
    <Card
      className="dlg-table-enter rounded-2xl border-white bg-white shadow-sm overflow-hidden flex flex-col max-h-[min(62vh,600px)]"
      style={{ animationDelay: "0.32s" }}
    >
      <CardContent className="p-3 pt-0 flex-1 min-h-0 flex flex-col overflow-hidden gap-2">
        <Tabs value={hierarchyTab} onValueChange={setHierarchyTab} className="flex flex-col flex-1 min-h-0 gap-2">
          <TabsList className="w-full h-auto flex flex-wrap sm:grid sm:grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-lg border border-slate-200/80 shrink-0">
            <TabsTrigger
              value={HIERARCHY_TAB.regions}
              className="text-[10px] font-bold gap-1.5 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1"
            >
              <MapPin className="w-3 h-3 shrink-0" />
              Régions
            </TabsTrigger>
            <TabsTrigger
              value={HIERARCHY_TAB.centres}
              className="text-[10px] font-bold gap-1.5 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1"
            >
              <Building2 className="w-3 h-3 shrink-0" />
              Centres
            </TabsTrigger>
            <TabsTrigger
              value={HIERARCHY_TAB.postes}
              className="text-[10px] font-bold gap-1.5 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1"
            >
              <Calculator className="w-3 h-3 shrink-0" />
              Postes
            </TabsTrigger>
          </TabsList>

          <TabsContent value={HIERARCHY_TAB.regions} className="mt-0 flex-1 min-h-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
            <div className="overflow-auto min-h-0 flex-1 rounded-md border border-slate-100">
              <Table wrapperClassName="overflow-visible w-full" className="min-w-[1180px] text-[10px]">
                {geoHeader}
                <TableBody>
                  {regionRowsAllNetwork.map((row, i) => {
                    const g = geoGapCells(row);
                    return (
                      <TableRow
                        key={`cmp-reg-${row.region_id}`}
                        onClick={() => {
                          setRegionKey(String(row.region_id));
                          setHierarchyTab(HIERARCHY_TAB.centres);
                        }}
                        className={`cursor-pointer border-b border-slate-50 ${
                          i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                        } hover:bg-blue-50/60 ${String(regionKey) === String(row.region_id) ? "bg-blue-50/55" : ""}`}
                      >
                        <TableCell className="px-2 py-2 sticky left-0 bg-inherit z-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="font-bold text-slate-800 truncate" title={row.region_label}>
                              {row.region_label}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                          </div>
                          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 pl-5">
                            {row.nbCentres} centre{row.nbCentres > 1 ? "s" : ""}
                          </p>
                        </TableCell>
                        <TableCell className="px-2 py-2 text-slate-300">—</TableCell>
                        <TableCell className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpAct)}</TableCell>
                        <TableCell className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpCalc)}</TableCell>
                        <TableCell className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpCons)}</TableCell>
                        <TableCell className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpOpt)}</TableCell>
                        <TableCell className="px-1 py-2 text-center text-[9px]">
                          <CmpNumGap v={g.dEtpC} />
                        </TableCell>
                        <TableCell className="px-1 py-2 text-center text-[9px]">
                          <CmpNumGap v={g.dEtpCo} />
                        </TableCell>
                        <TableCell className="px-1 py-2 text-center text-[9px]">
                          <CmpNumGap v={g.dEtpO} />
                        </TableCell>
                        <TableCell className="px-1 py-2 text-right font-bold text-slate-600">{fmtCmp(row.budgetActuel)}</TableCell>
                        <TableCell className="px-1 py-2 text-right font-bold text-blue-800 bg-blue-50/35">{fmtCmp(row.budgetCalc)}</TableCell>
                        <TableCell className="px-1 py-2 text-right font-bold text-[#005EA8] bg-blue-50/25">{fmtCmp(row.budgetCons)}</TableCell>
                        <TableCell className="px-1 py-2 text-right font-bold text-slate-800 bg-blue-100/20">{fmtCmp(row.budgetOpt)}</TableCell>
                        <TableCell className="px-1 py-2 text-right text-[9px]">
                          <CmpNumGap v={g.dBC} />
                        </TableCell>
                        <TableCell className="px-1 py-2 text-right text-[9px]">
                          <CmpNumGap v={g.dBCo} />
                        </TableCell>
                        <TableCell className="px-1 py-2 text-right text-[9px]">
                          <CmpNumGap v={g.dBO} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value={HIERARCHY_TAB.centres} className="mt-0 flex-1 min-h-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
            <div className="overflow-auto min-h-0 flex-1 rounded-md border border-slate-100">
              <Table wrapperClassName="overflow-visible w-full" className="min-w-[1180px] text-[10px]">
                {geoHeader}
                <TableBody>
                  {scopedCentres.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={G} className="px-4 py-5 text-center text-[11px] text-slate-400">
                        Aucun centre dans les données.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scopedCentres.map((row, i) => {
                      const g = geoGapCells(row);
                      return (
                        <TableRow
                          key={`cmp-cen-${row.centre_id}`}
                          onClick={() => {
                            setCentreKey(String(row.centre_id));
                            setHierarchyTab(HIERARCHY_TAB.postes);
                          }}
                          className={`cursor-pointer border-b border-slate-50 ${
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                          } hover:bg-indigo-50/55 ${
                            centreKey !== SEL_LIST && String(centreKey) === String(row.centre_id) ? "bg-indigo-50/45" : ""
                          }`}
                        >
                          <TableCell className="px-2 py-2 sticky left-0 bg-inherit z-0">
                            <div className="flex items-center gap-1 min-w-0">
                              <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="font-bold text-slate-800 truncate">{row.centre_label}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-2 text-slate-600 truncate max-w-[6rem]" title={row.region_label}>
                            {row.region_label}
                          </TableCell>
                          <TableCell className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpAct)}</TableCell>
                          <TableCell className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpCalc)}</TableCell>
                          <TableCell className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpCons)}</TableCell>
                          <TableCell className="px-1 py-2 text-center font-bold text-slate-600">{fmtCmp(row.etpOpt)}</TableCell>
                          <TableCell className="px-1 py-2 text-center text-[9px]">
                            <CmpNumGap v={g.dEtpC} />
                          </TableCell>
                          <TableCell className="px-1 py-2 text-center text-[9px]">
                            <CmpNumGap v={g.dEtpCo} />
                          </TableCell>
                          <TableCell className="px-1 py-2 text-center text-[9px]">
                            <CmpNumGap v={g.dEtpO} />
                          </TableCell>
                          <TableCell className="px-1 py-2 text-right font-bold text-slate-600">{fmtCmp(row.budgetActuel)}</TableCell>
                          <TableCell className="px-1 py-2 text-right font-bold text-blue-800 bg-blue-50/35">{fmtCmp(row.budgetCalc)}</TableCell>
                          <TableCell className="px-1 py-2 text-right font-bold text-[#005EA8] bg-blue-50/25">{fmtCmp(row.budgetCons)}</TableCell>
                          <TableCell className="px-1 py-2 text-right font-bold text-slate-800 bg-blue-100/20">{fmtCmp(row.budgetOpt)}</TableCell>
                          <TableCell className="px-1 py-2 text-right text-[9px]">
                            <CmpNumGap v={g.dBC} />
                          </TableCell>
                          <TableCell className="px-1 py-2 text-right text-[9px]">
                            <CmpNumGap v={g.dBCo} />
                          </TableCell>
                          <TableCell className="px-1 py-2 text-right text-[9px]">
                            <CmpNumGap v={g.dBO} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value={HIERARCHY_TAB.postes} className="mt-0 flex-1 min-h-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
            <p className="text-[10px] font-semibold text-slate-600 mb-2 shrink-0 truncate" title={postesTableTitle}>
              {postesTableTitle}
            </p>
            <div className="overflow-auto min-h-0 flex-1 rounded-md border border-slate-100">
              <ChiffrageComparatifNestedPostesTable
                cmpRowsForTable={cmpRowsForTable}
                cmpTotalsFooter={cmpTotalsFooter}
                cmpImpactsFooter={cmpImpactsFooter}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
