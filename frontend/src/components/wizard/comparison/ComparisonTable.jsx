import React from "react";
import { Card } from "@/components/ui/card";
import { TableHead, TableCell } from "@/components/ui/table";
import { User, Network } from "lucide-react";
import ComparatifScenarioMetricsTable from "@/components/wizard/comparison/ComparatifScenarioMetricsTable";

/**
 * Comparatif par poste — même grille que Step5ComparatifProcessResults (ComparatifScenarioMetricsTable).
 */
const ComparisonTable = ({ data = [] }) => {
  return (
    <div className="w-full">
      <Card className="rounded-2xl border border-slate-200/40 bg-white/95 backdrop-blur-sm overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-16px_rgba(15,23,42,0.08)]">
        <div className="relative px-6 py-5 border-b border-slate-100/90 flex items-center justify-between bg-gradient-to-br from-white via-slate-50/35 to-blue-50/15 flex-wrap gap-4">
          <div className="pointer-events-none absolute -right-16 -top-20 w-48 h-48 rounded-full blur-3xl bg-gradient-to-br from-[#005EA8]/8 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#005EA8] to-[#0A6BBC] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(0,94,168,0.35)] border border-white/20">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Détail Comparatif par Poste</h3>
              <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Analyse granulaire des ETP et écarts multi-scénarios</p>
            </div>
          </div>
        </div>

        <ComparatifScenarioMetricsTable
          rows={data}
          getRowKey={(r) => r.id}
          emptyColSpan={10}
          maxHeight="600px"
          renderLeadHeaderRow1={() => (
            <TableHead rowSpan={2} className="sticky left-0 z-40 min-w-0 w-[12%] bg-slate-50/90 backdrop-blur-md font-black text-slate-800 text-[8px] sm:text-[10px] uppercase tracking-tight sm:tracking-widest h-12 sm:h-14 px-2 sm:px-4 border-b border-r border-slate-200/70">
              <div className="flex items-center gap-2">
                <Network className="w-3.5 h-3.5 text-[#005EA8]/90" />
                <span>Intitulé du Poste</span>
              </div>
            </TableHead>
          )}
          renderLeadCell={(row) => (
            <TableCell className="sticky left-0 z-10 bg-inherit font-bold text-slate-700 text-[10px] sm:text-xs px-2 sm:px-4 py-2 sm:py-3 border-r border-slate-100/90 shadow-[2px_0_12px_-6px_rgba(15,23,42,0.05)] min-w-0 max-w-[10rem] sm:max-w-none truncate group-hover:text-[#005EA8] group-hover:bg-blue-50/40 transition-colors" title={row.label}>
              {row.label}
            </TableCell>
          )}
        />
      </Card>
    </div>
  );
};

export default ComparisonTable;
