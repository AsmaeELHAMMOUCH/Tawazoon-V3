import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { User, Network, Calculator, TrendingUp, Zap, Search } from "lucide-react";
import DeltaBadge from "@/components/wizard/DeltaBadge";

/**
 * Premium Per-Poste Comparison Table component.
 * Displays a detailed breakdown of ETPs and Deltas across all scenarios.
 * Now includes real-time filtering by Poste.
 */
const ComparisonTable = ({ data = [] }) => {
  return (
    <div className="w-full">
      <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {/* Table Header / Title */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#005EA8] to-[#0A6BBC] flex items-center justify-center shadow-lg shadow-blue-200/50">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Détail Comparatif par Poste</h3>
              <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Analyse granulaire des ETP et écarts multi-scénarios</p>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="relative overflow-auto max-h-[600px] custom-scrollbar">
          <Table className="w-full border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-30 shadow-md">
              {/* Scenario Group Headers */}
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="sticky left-0 z-40 w-[200px] bg-slate-50/95 backdrop-blur-md font-black text-slate-800 text-[11px] uppercase tracking-widest h-14 px-6 border-b border-r border-slate-200">
                  <div className="flex items-center gap-2">
                    <Network className="w-3.5 h-3.5 text-blue-500" />
                    <span>Intitulé du Poste</span>
                  </div>
                </TableHead>

                <TableHead className="text-center font-black text-slate-600 text-[10px] uppercase tracking-widest h-14 border-b border-l border-slate-200 bg-slate-100 min-w-[100px]">
                  Actuel
                </TableHead>

                <TableHead className="text-center font-black text-sky-700 text-[10px] uppercase tracking-widest h-14 border-b border-l border-sky-200 bg-gradient-to-r from-sky-50 to-sky-100 min-w-[180px]" colSpan={2}>
                  <div className="flex items-center justify-center gap-2">
                    <Calculator className="w-3.5 h-3.5 text-sky-500" />
                    <span>Calculé</span>
                  </div>
                </TableHead>

                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest h-14 border-b border-l min-w-[240px]"
                  colSpan={3}
                  style={{ color: "#92400e", background: "linear-gradient(to right, #fefce8, #fef9c3)", borderColor: "#fde68a" }}>
                  <div className="flex items-center justify-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: "#ca8a04" }} />
                    <span>Consolidé</span>
                  </div>
                </TableHead>

                <TableHead className="text-center font-black text-emerald-700 text-[10px] uppercase tracking-widest h-14 border-b border-l border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 min-w-[240px]" colSpan={3}>
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Optimisé</span>
                  </div>
                </TableHead>
              </TableRow>

              {/* Sub-Headers (ETP, Deltas) */}
              <TableRow className="hover:bg-transparent bg-slate-50/90 backdrop-blur-sm border-b border-slate-200">
                <TableHead className="sticky left-0 z-40 bg-slate-50 border-r border-slate-200 h-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" />
                <TableHead className="text-center text-[9px] font-black text-slate-500 border-l border-slate-200 h-10 bg-slate-100/50 font-black tracking-widest">ACTUAL</TableHead>

                <TableHead className="text-center text-[9px] font-black text-sky-700 border-l border-sky-100 h-10 bg-sky-50/30 font-black tracking-widest">ETP</TableHead>
                <TableHead className="text-center text-[9px] font-black text-sky-700 h-10 bg-sky-50/30 tracking-widest">Δ/ACTUEL</TableHead>

                <TableHead className="text-center text-[9px] font-black h-10 tracking-widest border-l"
                  style={{ color: "#ca8a04", background: "rgba(254,252,232,0.3)", borderColor: "#fde68a" }}>ETP</TableHead>
                <TableHead className="text-center text-[9px] font-black h-10 tracking-widest"
                  style={{ color: "#ca8a04", background: "rgba(254,252,232,0.3)" }}>Δ/ACTUEL</TableHead>
                <TableHead className="text-center text-[9px] font-black h-10 tracking-widest"
                  style={{ color: "#ca8a04", background: "rgba(254,252,232,0.3)" }}>Δ/CALC</TableHead>

                <TableHead className="text-center text-[9px] font-black text-emerald-700 border-l border-emerald-100 h-10 bg-emerald-50/30 font-black tracking-widest">ETP</TableHead>
                <TableHead className="text-center text-[9px] font-black text-emerald-700 h-10 bg-emerald-50/30 tracking-widest">Δ/ACTUEL</TableHead>
                <TableHead className="text-center text-[9px] font-black text-emerald-700 h-10 bg-emerald-50/30 tracking-widest">Δ/CALC</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.length > 0 ? (
                data.map((row, idx) => (
                  <TableRow
                    key={row.id}
                    className={`group transition-all duration-200 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-blue-50/50`}
                  >
                    <TableCell className="sticky left-0 z-10 bg-inherit font-bold text-slate-700 text-xs px-6 py-3 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)] group-hover:text-blue-700 group-hover:bg-blue-50/50 transition-colors">
                      {row.label}
                    </TableCell>

                    <TableCell className="text-center font-bold text-slate-500 text-xs bg-slate-50/20 border-r border-slate-100">
                      {row.db !== null ? Math.round(row.db) : "—"}
                    </TableCell>

                    {/* CALCULÉ */}
                    <TableCell className="text-center font-extrabold text-[#005EA8] text-xs bg-sky-50/5 border-r border-slate-50">
                      {row.calc !== null ? Math.round(row.calc) : "—"}
                    </TableCell>
                    <TableCell className="text-center border-r border-sky-100/30">
                      <DeltaBadge value={row.dCalcVsDb} />
                    </TableCell>

                    {/* CONSOLIDÉ */}
                    <TableCell className="text-center font-extrabold text-xs border-r border-slate-50"
                      style={{ color: "#92400e", background: "rgba(254,252,232,0.05)" }}>
                      {row.cons !== null ? Math.round(row.cons) : "—"}
                    </TableCell>
                    <TableCell className="text-center border-r border-slate-50">
                      <DeltaBadge value={row.dConsVsDb} />
                    </TableCell>
                    <TableCell className="text-center border-r border-yellow-100/30">
                      <DeltaBadge value={row.dConsVsCalc} theme="subtle" />
                    </TableCell>

                    {/* OPTIMISÉ */}
                    <TableCell className="text-center font-extrabold text-emerald-700 text-xs bg-emerald-50/5 border-r border-slate-50">
                      {row.opt !== null ? Math.round(row.opt) : "—"}
                    </TableCell>
                    <TableCell className="text-center border-r border-slate-50">
                      <DeltaBadge value={row.dOptVsDb} />
                    </TableCell>
                    <TableCell className="text-center">
                      <DeltaBadge value={row.dOptVsCalc} theme="subtle" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-40 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    Aucune donnée disponible
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default ComparisonTable;
