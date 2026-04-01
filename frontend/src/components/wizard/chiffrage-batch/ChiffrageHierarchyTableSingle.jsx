import React from "react";
import { MapPin, Building2, Calculator, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHIFFRAGE_SINGLE_GEO_COLS, fmtSingle, SEL_LIST, HIERARCHY_TAB } from "./constants";

const C = CHIFFRAGE_SINGLE_GEO_COLS;
const th = "h-8 px-2 py-2 text-[9px] font-black uppercase text-slate-400 border-b border-slate-200";

function etpGapClass(g) {
  const n = Number(g);
  return n >= 0 ? "text-emerald-700" : "text-rose-700";
}

function ecoClass(impactAnnual) {
  const n = Number(impactAnnual);
  return n >= 0 ? "text-emerald-600" : "text-rose-600";
}

/** Même grille que l’onglet Postes : Poste, Type, Actuel, Simulé, Écart, Salaire u., Budg. act., Budg. sim., Économie (an). */
const geoHeader = (
  <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-sm [&_tr]:border-b-0">
    <TableRow className="border-b border-slate-200 hover:bg-transparent">
      <TableHead className={`${th} min-w-[9rem] text-left sticky left-0 bg-slate-50 z-[1]`}>Poste</TableHead>
      <TableHead className={`${th} w-[4.5rem] text-center`}>Type</TableHead>
      <TableHead className={`${th} text-center text-slate-400`}>Actuel</TableHead>
      <TableHead className={`${th} text-center text-[#005EA8]`}>Simulé</TableHead>
      <TableHead className={`${th} text-center text-slate-500`}>Écart</TableHead>
      <TableHead className={`${th} text-center text-slate-400`}>Salaire u.</TableHead>
      <TableHead className={`${th} text-right text-slate-500`}>Budg. act.</TableHead>
      <TableHead className={`${th} text-right text-[#005EA8]`}>Budg. sim.</TableHead>
      <TableHead className={`${th} text-right text-slate-600`}>Économie (an)</TableHead>
    </TableRow>
  </TableHeader>
);

const posteTh = "h-8 px-2 py-2 text-[9px] font-black uppercase border-b border-slate-200";

export default function ChiffrageHierarchyTableSingle({
  hierarchyTab,
  setHierarchyTab,
  regionKey,
  centreKey,
  setRegionKey,
  setCentreKey,
  regionRowsAllNetwork,
  scopedCentres,
  singleRowsForTable,
  postesTableTitle,
}) {
  const etpGap = (act, sim) => Number(act) - Number(sim);
  const ecoAn = (impactMois) => Number(impactMois || 0) * 12;

  return (
    <Card
      className="dlg-table-enter rounded-2xl border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[min(58vh,560px)]"
      style={{ animationDelay: "0.38s" }}
    >
      <CardContent className="p-3 pt-3 flex-1 min-h-0 flex flex-col overflow-hidden gap-2">
        <Tabs value={hierarchyTab} onValueChange={setHierarchyTab} className="flex flex-col flex-1 min-h-0 gap-2">
          <TabsList className="w-full h-auto flex flex-wrap sm:grid sm:grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-lg border border-slate-200/80 shrink-0">
            <TabsTrigger
              value={HIERARCHY_TAB.regions}
              className="text-[10px] font-bold gap-1.5 py-1 data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              Régions
            </TabsTrigger>
            <TabsTrigger
              value={HIERARCHY_TAB.centres}
              className="text-[10px] font-bold gap-1.5 py-1 data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1"
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              Centres
            </TabsTrigger>
            <TabsTrigger
              value={HIERARCHY_TAB.postes}
              className="text-[10px] font-bold gap-1.5 py-1 data-[state=active]:bg-white data-[state=active]:shadow-sm flex-1"
            >
              <Calculator className="w-3.5 h-3.5 shrink-0" />
              Postes
            </TabsTrigger>
          </TabsList>

          <TabsContent value={HIERARCHY_TAB.regions} className="mt-0 flex-1 min-h-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
            <div className="overflow-auto min-h-0 flex-1 rounded-md border border-slate-100">
              <Table wrapperClassName="overflow-visible w-full" className="min-w-[720px] text-[10px]">
                {geoHeader}
                <TableBody>
                  {regionRowsAllNetwork.map((row, i) => {
                    const g = etpGap(row.etpAct, row.etpSim);
                    const imp = row.impact;
                    const ea = ecoAn(imp);
                    return (
                      <TableRow
                        key={`reg-${row.region_id}`}
                        onClick={() => {
                          setRegionKey(String(row.region_id));
                          setHierarchyTab(HIERARCHY_TAB.centres);
                        }}
                        className={`cursor-pointer border-b border-slate-50 ${
                          i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                        } hover:bg-blue-50/70 ${String(regionKey) === String(row.region_id) ? "bg-blue-50/60" : ""}`}
                      >
                        <TableCell className="px-2 py-2 sticky left-0 bg-inherit z-0">
                          <div className="flex items-center gap-1.5 min-w-0">
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
                        <TableCell className="px-2 py-2 text-center">
                          <span className="text-[8px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-100 rounded px-1 py-0.5">
                            Région
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-2 text-center font-bold text-slate-600">{fmtSingle(row.etpAct)}</TableCell>
                        <TableCell className="px-2 py-2 text-center font-black text-[#005EA8] bg-blue-50/15">{fmtSingle(row.etpSim)}</TableCell>
                        <TableCell className="px-2 py-2 text-center">
                          <span className={`font-black text-[9px] ${etpGapClass(g)}`}>
                            {g > 0 ? "+" : ""}
                            {fmtSingle(g)}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-2 text-center text-slate-300">—</TableCell>
                        <TableCell className="px-2 py-2 text-right font-bold text-slate-500">{fmtSingle(row.budgetActuel)}</TableCell>
                        <TableCell className="px-2 py-2 text-right font-black text-[#005EA8]">{fmtSingle(row.budgetSimule)}</TableCell>
                        <TableCell className="px-2 py-2 text-right">
                          <span className={`font-black ${ecoClass(ea)}`}>
                            {ea > 0 ? "+" : ""}
                            {fmtSingle(ea)}
                          </span>
                          <span className="block text-[7px] font-bold text-slate-300 uppercase">MAD / an</span>
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
              <Table wrapperClassName="overflow-visible w-full" className="min-w-[720px] text-[10px]">
                {geoHeader}
                <TableBody>
                  {scopedCentres.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={C} className="px-4 py-8 text-center text-[11px] text-slate-400">
                        Aucun centre dans les données.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scopedCentres.map((row, i) => {
                      const g = etpGap(row.etpAct, row.etpSim);
                      const imp = row.impact;
                      const ea = ecoAn(imp);
                      return (
                        <TableRow
                          key={`cen-${row.centre_id}`}
                          onClick={() => {
                            setCentreKey(String(row.centre_id));
                            setHierarchyTab(HIERARCHY_TAB.postes);
                          }}
                          className={`cursor-pointer border-b border-slate-50 ${
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                          } hover:bg-indigo-50/60 ${
                            centreKey !== SEL_LIST && String(centreKey) === String(row.centre_id) ? "bg-indigo-50/50" : ""
                          }`}
                        >
                          <TableCell className="px-2 py-2 sticky left-0 bg-inherit z-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="font-bold text-slate-800 truncate">{row.centre_label}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                            </div>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 pl-5 truncate" title={row.region_label}>
                              {row.region_label}
                            </p>
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center">
                            <span className="text-[8px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5">
                              Centre
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center font-bold text-slate-600">{fmtSingle(row.etpAct)}</TableCell>
                          <TableCell className="px-2 py-2 text-center font-black text-[#005EA8] bg-blue-50/15">{fmtSingle(row.etpSim)}</TableCell>
                          <TableCell className="px-2 py-2 text-center">
                            <span className={`font-black text-[9px] ${etpGapClass(g)}`}>
                              {g > 0 ? "+" : ""}
                              {fmtSingle(g)}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center text-slate-300">—</TableCell>
                          <TableCell className="px-2 py-2 text-right font-bold text-slate-500">{fmtSingle(row.budgetActuel)}</TableCell>
                          <TableCell className="px-2 py-2 text-right font-black text-[#005EA8]">{fmtSingle(row.budgetSimule)}</TableCell>
                          <TableCell className="px-2 py-2 text-right">
                            <span className={`font-black ${ecoClass(ea)}`}>
                              {ea > 0 ? "+" : ""}
                              {fmtSingle(ea)}
                            </span>
                            <span className="block text-[7px] font-bold text-slate-300 uppercase">MAD / an</span>
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
              <Table wrapperClassName="overflow-visible w-full" className="min-w-[640px] text-[10px]">
                <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-sm [&_tr]:border-b-0">
                  <TableRow className="border-b border-slate-200 hover:bg-transparent">
                    <TableHead className={`${posteTh} text-left text-slate-400 sticky left-0 bg-slate-50 z-[1]`}>Poste</TableHead>
                    <TableHead className={`${posteTh} text-center text-slate-400`}>Type</TableHead>
                    <TableHead className={`${posteTh} text-center text-slate-400`}>Actuel</TableHead>
                    <TableHead className={`${posteTh} text-center text-[#005EA8]`}>Simulé</TableHead>
                    <TableHead className={`${posteTh} text-center text-slate-500`}>Écart</TableHead>
                    <TableHead className={`${posteTh} text-center text-slate-400`}>Salaire u.</TableHead>
                    <TableHead className={`${posteTh} text-right text-slate-500`}>Budg. act.</TableHead>
                    <TableHead className={`${posteTh} text-right text-[#005EA8]`}>Budg. sim.</TableHead>
                    <TableHead className={`${posteTh} text-right text-slate-600`}>Économie (an)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {singleRowsForTable.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="px-4 py-8 text-center text-[11px] text-slate-400">
                        Aucune ligne pour ce périmètre.
                      </TableCell>
                    </TableRow>
                  ) : (
                    singleRowsForTable.map((r, idx) => (
                      <TableRow
                        key={`poste-${r.label}-${idx}`}
                        className={`border-b border-slate-50 ${idx % 2 === 0 ? "bg-violet-50/20" : "bg-white"} hover:bg-violet-50/30`}
                      >
                        <TableCell className="px-2 py-1.5 sticky left-0 bg-inherit z-0">
                          <span className="block font-bold text-slate-800 mt-0.5">{r.label}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-center">
                          <span
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                              r.type === "MOD"
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {r.type}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-center font-bold text-slate-600">{fmtSingle(r.actuel)}</TableCell>
                        <TableCell className="px-2 py-1.5 text-center font-black text-[#005EA8]">{fmtSingle(r.calcule)}</TableCell>
                        <TableCell className="px-2 py-1.5 text-center">
                          <span className={`font-black text-[9px] ${r.gap >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {r.gap > 0 ? "+" : ""}
                            {fmtSingle(r.gap)}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-center text-[10px] font-bold text-slate-400 tabular-nums italic">
                          {fmtSingle(r.salaire)}
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-right font-bold text-slate-500">{fmtSingle(r.coutActuel)}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right font-black text-[#005EA8]">{fmtSingle(r.coutCalcule)}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">
                          <span className={`font-black ${r.impact * 12 >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {r.impact * 12 > 0 ? "+" : ""}
                            {fmtSingle(r.impact * 12)}
                          </span>
                          <span className="block text-[7px] font-bold text-slate-300 uppercase">MAD / an</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
