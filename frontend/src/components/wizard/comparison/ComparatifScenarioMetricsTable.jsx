import React, { createContext, useContext } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Calculator, TrendingUp, Zap } from "lucide-react";
import DeltaBadge from "@/components/wizard/DeltaBadge";

/** `compact` = onglet Postes / Step5 (largeur serrée). `comfortable` = Régions / Centres. */
const DensityContext = createContext("compact");

function useDensity() {
  return useContext(DensityContext);
}

/**
 * Bloc métrique commun (9 colonnes) : Actuel + Calculé + Consolidé + Optimisé
 */
export function ScenarioMetricCells({ row }) {
  const density = useDensity();
  const cozy = density === "comfortable";

  const cellMetric = cozy
    ? "text-center min-w-0 px-2 py-2.5"
    : "text-center min-w-0 px-0.5 py-1.5 sm:px-1";
  const cellDelta = cozy
    ? "text-center min-w-0 px-1.5 py-2 border-r border-slate-100/60 whitespace-nowrap"
    : "text-center min-w-0 px-0.5 py-1 border-r border-slate-100/60 whitespace-nowrap";
  const numSize = cozy ? "text-[11px]" : "text-[9px] sm:text-[10px]";
  const badgeWrap = cozy
    ? "inline-flex items-center justify-center max-w-full whitespace-nowrap"
    : "inline-flex items-center justify-center scale-[0.82] sm:scale-90 origin-center max-w-full whitespace-nowrap";

  return (
    <>
      <TableCell className={`${cellMetric} font-bold tabular-nums text-slate-900 ${numSize} bg-slate-50/15 border-r border-slate-100/80`}>
        {row.db !== null && row.db !== undefined ? Math.round(row.db) : "—"}
      </TableCell>

      <TableCell className={`${cellMetric} font-extrabold tabular-nums text-blue-800 ${numSize} bg-blue-50/30 border-r border-blue-100/50`}>
        {row.calc !== null && row.calc !== undefined ? Math.round(row.calc) : "—"}
      </TableCell>
      <TableCell className={`${cellDelta} bg-blue-50/10 border-r border-blue-100/40`}>
        <span className={badgeWrap}>
          <DeltaBadge value={row.dCalcVsDb} showNature />
        </span>
      </TableCell>

      <TableCell className={`${cellMetric} font-extrabold tabular-nums text-[#005EA8] ${numSize} bg-sky-50/25 border-r border-sky-100/50`}>
        {row.cons !== null && row.cons !== undefined ? Math.round(row.cons) : "—"}
      </TableCell>
      <TableCell className={`${cellDelta} bg-sky-50/10 border-r border-sky-100/40`}>
        <span className={badgeWrap}>
          <DeltaBadge value={row.dConsVsDb} showNature />
        </span>
      </TableCell>
      <TableCell className={`${cellDelta} bg-sky-50/5 border-r border-sky-100/35`}>
        <span className={badgeWrap}>
          <DeltaBadge value={row.dConsVsCalc} theme="subtle" showNature />
        </span>
      </TableCell>

      <TableCell className={`${cellMetric} font-extrabold tabular-nums text-slate-800 ${numSize} bg-slate-50/40 border-r border-slate-200/45`}>
        {row.opt !== null && row.opt !== undefined ? Math.round(row.opt) : "—"}
      </TableCell>
      <TableCell className={`${cellDelta} bg-slate-50/15 border-r border-slate-200/35`}>
        <span className={badgeWrap}>
          <DeltaBadge value={row.dOptVsDb} showNature />
        </span>
      </TableCell>
      <TableCell className={`${cellDelta} bg-slate-50/10 border-r-0`}>
        <span className={badgeWrap}>
          <DeltaBadge value={row.dOptVsCalc} theme="subtle" showNature />
        </span>
      </TableCell>
    </>
  );
}

export function ScenarioHeaderRow1Cells() {
  const density = useDensity();
  const cozy = density === "comfortable";

  if (cozy) {
    return (
      <>
        <TableHead
          className="text-center font-black text-slate-600 text-[10px] uppercase tracking-widest h-14 min-w-[3.25rem] px-2 border-b border-l border-slate-200/70 bg-slate-100/40 whitespace-nowrap"
          rowSpan={2}
        >
          Actuel
        </TableHead>

        <TableHead
          className="text-center font-black text-blue-800/90 text-[10px] uppercase tracking-widest h-14 border-b border-l border-blue-100/80 bg-gradient-to-br from-white via-blue-50/55 to-slate-50/25 min-w-[7rem] px-2"
          colSpan={2}
        >
          <div className="flex items-center justify-center gap-2">
            <Calculator className="w-3.5 h-3.5 text-blue-500/90 shrink-0" />
            <span>Calculé</span>
          </div>
        </TableHead>

        <TableHead
          className="text-center font-black text-[#005EA8] text-[10px] uppercase tracking-widest h-14 border-b border-l border-[#005EA8]/15 bg-gradient-to-br from-blue-50/40 via-white to-sky-50/20 min-w-[10.5rem] px-2"
          colSpan={3}
        >
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#0A6BBC]/90 shrink-0" />
            <span>Consolidé</span>
          </div>
        </TableHead>

        <TableHead
          className="text-center font-black text-slate-800 text-[10px] uppercase tracking-widest h-14 border-b border-l border-slate-200/60 bg-gradient-to-br from-slate-50/50 via-blue-50/25 to-white min-w-[10.5rem] px-2"
          colSpan={3}
        >
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-3.5 h-3.5 text-blue-900/75 shrink-0" />
            <span>Optimisé</span>
          </div>
        </TableHead>
      </>
    );
  }

  return (
    <>
      <TableHead
        className="text-center font-black text-slate-600 text-[8px] sm:text-[9px] uppercase tracking-tight sm:tracking-widest h-12 sm:h-14 border-b border-l border-slate-200/70 bg-slate-100/40 min-w-0 w-[6%]"
        rowSpan={2}
      >
        Actuel
      </TableHead>

      <TableHead
        className="text-center font-black text-blue-800/90 text-[8px] sm:text-[9px] uppercase tracking-tight sm:tracking-widest h-12 sm:h-14 border-b border-l border-blue-100/80 bg-gradient-to-br from-white via-blue-50/55 to-slate-50/25 min-w-0 w-[14%]"
        colSpan={2}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 leading-tight">
          <Calculator className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500/90 shrink-0" />
          <span>Calculé</span>
        </div>
      </TableHead>

      <TableHead
        className="text-center font-black text-[#005EA8] text-[8px] sm:text-[9px] uppercase tracking-tight sm:tracking-widest h-12 sm:h-14 border-b border-l border-[#005EA8]/15 bg-gradient-to-br from-blue-50/40 via-white to-sky-50/20 min-w-0 w-[22%]"
        colSpan={3}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 leading-tight">
          <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0A6BBC]/90 shrink-0" />
          <span>Consolidé</span>
        </div>
      </TableHead>

      <TableHead
        className="text-center font-black text-slate-800 text-[8px] sm:text-[9px] uppercase tracking-tight sm:tracking-widest h-12 sm:h-14 border-b border-l border-slate-200/60 bg-gradient-to-br from-slate-50/50 via-blue-50/25 to-white min-w-0 w-[22%]"
        colSpan={3}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 leading-tight">
          <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-900/75 shrink-0" />
          <span>Optimisé</span>
        </div>
      </TableHead>
    </>
  );
}

export function ScenarioHeaderRow2() {
  const density = useDensity();
  const cozy = density === "comfortable";

  if (cozy) {
    const sub =
      "text-center text-[9px] font-bold border-l min-w-0 px-2 h-11 whitespace-nowrap tracking-wide";
    return (
      <TableRow className="hover:bg-transparent bg-gradient-to-r from-slate-50/50 via-white to-blue-50/10 backdrop-blur-sm border-b border-slate-200/70">
        <TableHead className={`${sub} text-blue-700/85 border-blue-100/60 bg-blue-50/40`}>
          ETP
        </TableHead>
        <TableHead className={`${sub} text-blue-700/85 border-blue-100/50 bg-blue-50/35`}>
          Δ/ACT.
        </TableHead>

        <TableHead className={`${sub} text-[#005EA8] border-blue-100/70 bg-sky-50/35`}>
          ETP
        </TableHead>
        <TableHead className={`${sub} text-[#005EA8] bg-sky-50/30`}>
          Δ/ACT.
        </TableHead>
        <TableHead className={`${sub} text-[#005EA8] bg-sky-50/25`}>
          Δ/CALC
        </TableHead>

        <TableHead className={`${sub} text-slate-700 border-slate-200/50 bg-slate-50/60`}>
          ETP
        </TableHead>
        <TableHead className={`${sub} text-slate-700 bg-slate-50/50`}>
          Δ/ACT.
        </TableHead>
        <TableHead className={`${sub} text-slate-700 bg-slate-50/45`}>
          Δ/CALC
        </TableHead>
      </TableRow>
    );
  }

  const sub =
    "text-center text-[7px] sm:text-[8px] font-bold border-l min-w-0 px-0.5 h-9 sm:h-10 leading-tight";
  return (
    <TableRow className="hover:bg-transparent bg-gradient-to-r from-slate-50/50 via-white to-blue-50/10 backdrop-blur-sm border-b border-slate-200/70">
      <TableHead className={`${sub} text-blue-700/85 border-blue-100/60 bg-blue-50/40`}>
        ETP
      </TableHead>
      <TableHead className={`${sub} text-blue-700/85 border-blue-100/50 bg-blue-50/35`}>
        Δ/A
      </TableHead>

      <TableHead className={`${sub} text-[#005EA8] border-blue-100/70 bg-sky-50/35`}>
        ETP
      </TableHead>
      <TableHead className={`${sub} text-[#005EA8] bg-sky-50/30`}>
        Δ/A
      </TableHead>
      <TableHead className={`${sub} text-[#005EA8] bg-sky-50/25`}>
        Δ/C
      </TableHead>

      <TableHead className={`${sub} text-slate-700 border-slate-200/50 bg-slate-50/60`}>
        ETP
      </TableHead>
      <TableHead className={`${sub} text-slate-700 bg-slate-50/50`}>
        Δ/A
      </TableHead>
      <TableHead className={`${sub} text-slate-700 bg-slate-50/45`}>
        Δ/C
      </TableHead>
    </TableRow>
  );
}

/** Hauteur max par défaut : scroll vertical dans le bloc tableau, en-têtes collants. */
const DEFAULT_TABLE_MAX_HEIGHT = "clamp(280px, 58vh, 720px)";

function resolveTableMaxHeight(maxHeight) {
  if (maxHeight === undefined) return DEFAULT_TABLE_MAX_HEIGHT;
  if (maxHeight === false || maxHeight === null || maxHeight === "") return null;
  return maxHeight;
}

/**
 * Tableau comparatif ETP (structure identique Step5), colonne(s) de tête injectées.
 * @param {"compact"|"comfortable"} density — comfortable pour Régions/Centres (batch), compact pour Postes / Step5.
 * @param {string|false|null} [maxHeight] — hauteur max du corps scrollable ; `false`/`null` = pas de limite ; défaut = zone scroll ~58vh.
 */
export default function ComparatifScenarioMetricsTable({
  rows = [],
  getRowKey = (r) => r.id,
  renderLeadHeaderRow1,
  renderLeadCell,
  emptyColSpan = 10,
  emptyMessage = "Aucune donnée disponible",
  maxHeight,
  getRowProps,
  density = "compact",
}) {
  const cozy = density === "comfortable";
  const resolvedMax = resolveTableMaxHeight(maxHeight);
  const scrollInside = resolvedMax != null;

  const outerStyle = {};
  if (scrollInside) outerStyle.maxHeight = resolvedMax;

  const tableClass = cozy
    ? "w-full table-auto border-separate border-spacing-0 text-sm"
    : "w-full table-fixed border-separate border-spacing-0 text-xs";

  return (
    <DensityContext.Provider value={density}>
      <div
        className={`relative w-full min-w-0 max-w-full ${
          scrollInside
            ? "overflow-x-auto overflow-y-auto overscroll-contain custom-scrollbar rounded-b-lg"
            : cozy
              ? "overflow-x-auto"
              : "overflow-x-visible"
        }`}
        style={outerStyle}
      >
        <Table
          wrapperClassName={
            scrollInside
              ? "overflow-visible min-w-0 w-full max-w-full"
              : cozy
                ? "overflow-x-auto min-w-0 w-full max-w-full"
                : "overflow-x-visible overflow-y-visible min-w-0 w-full max-w-full"
          }
          className={tableClass}
        >
          <TableHeader className="sticky top-0 z-30 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] bg-white backdrop-blur-sm supports-[backdrop-filter]:bg-white/95">
            <TableRow className="hover:bg-transparent border-none">
              {renderLeadHeaderRow1()}
              <ScenarioHeaderRow1Cells />
            </TableRow>
            <ScenarioHeaderRow2 />
          </TableHeader>

          <TableBody>
            {rows.length > 0 ? (
              rows.map((row, idx) => {
                const extra = getRowProps?.(row, idx) || {};
                return (
                  <TableRow
                    key={getRowKey(row)}
                    className={`group transition-colors duration-200 border-b border-slate-100/80 ${
                      idx % 2 === 0 ? "bg-white/90" : "bg-slate-50/25"
                    } hover:bg-blue-50/35 ${extra.className || ""}`}
                    onClick={extra.onClick}
                    style={extra.style}
                  >
                    {renderLeadCell(row, idx)}
                    <ScenarioMetricCells row={row} />
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={emptyColSpan}
                  className="h-40 text-center text-slate-400 font-semibold uppercase tracking-widest text-[10px] bg-slate-50/20"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </DensityContext.Provider>
  );
}
