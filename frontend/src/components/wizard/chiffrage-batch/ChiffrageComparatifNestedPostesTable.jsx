import React from "react";
import { ImpactBadge } from "@/components/wizard/ChiffrageComparatifDialog";
import { fmtCmp } from "./constants";

export default function ChiffrageComparatifNestedPostesTable({ cmpRowsForTable, cmpTotalsFooter, cmpImpactsFooter }) {
  if (cmpRowsForTable.length === 0) {
    return <div className="px-4 py-6 text-center text-[11px] text-slate-400">Aucune ligne poste pour ce périmètre.</div>;
  }

  return (
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
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-400 border-b-2 border-slate-200 bg-white">ETP</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-400 border-b-2 border-slate-200 bg-white">Salaire</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-400 border-b-2 border-slate-200 bg-white">Budg. mois</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-slate-500 border-b-2 border-slate-200 border-r border-slate-100 bg-white">Budg. an</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200 bg-white">ETP</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200 bg-white">Budg. mois</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200 bg-white">Budg. an</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-600 border-b-2 border-blue-200 border-r border-blue-100 bg-white">Écart</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300 bg-white">ETP</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300 bg-white">Budg. mois</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300 bg-white">Budg. an</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-[#005EA8] border-b-2 border-blue-300 border-r border-blue-200 bg-white">Écart</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400 bg-white">ETP</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400 bg-white">Budg. mois</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400 bg-white">Budg. an</th>
            <th className="text-center px-2 py-1.5 text-[8px] font-bold text-blue-900 border-b-2 border-blue-400 bg-white">Écart</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cmpRowsForTable.map((r, idx) => {
            const ecartCalc = r.coutAct - r.coutCalc;
            const ecartCons = r.coutAct - r.coutCons;
            const ecartOpt = r.coutAct - r.coutOpt;
            return (
              <tr key={`${r.label}-${idx}`} className="dlg-table-row dlg-row-enter" style={{ animationDelay: `${0.4 + idx * 0.04}s` }}>
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
                <td className="px-2 py-2.5 text-center border-r border-blue-100">
                  <ImpactBadge value={ecartCalc} />
                </td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{r.cons}</td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{fmtCmp(r.coutCons)}</td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-700 tabular-nums">{fmtCmp(r.coutCons * 12)}</td>
                <td className="px-2 py-2.5 text-center border-r border-blue-200">
                  <ImpactBadge value={ecartCons} />
                </td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{r.opt}</td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-600 tabular-nums">{fmtCmp(r.coutOpt)}</td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-700 tabular-nums">{fmtCmp(r.coutOpt * 12)}</td>
                <td className="px-2 py-2.5 text-center">
                  <ImpactBadge value={ecartOpt} />
                </td>
              </tr>
            );
          })}
        </tbody>
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
            <td className="px-2 py-3 text-center bg-blue-50/50 border-r border-blue-100">
              <ImpactBadge value={cmpImpactsFooter.calc} />
            </td>
            <td className="px-2 py-3 text-center font-black text-[#005EA8] tabular-nums bg-blue-100/45">{cmpTotalsFooter.cons}</td>
            <td className="px-2 py-3 text-center font-black text-[#005EA8] tabular-nums bg-blue-100/45">{fmtCmp(cmpTotalsFooter.coutCons)}</td>
            <td className="px-2 py-3 text-center font-black text-[#004080] tabular-nums bg-blue-100/45">{fmtCmp(cmpTotalsFooter.coutCons * 12)}</td>
            <td className="px-2 py-3 text-center bg-blue-100/45 border-r border-blue-200">
              <ImpactBadge value={cmpImpactsFooter.cons} />
            </td>
            <td className="px-2 py-3 text-center font-black text-[#0A2A4A] tabular-nums bg-blue-200/35">{cmpTotalsFooter.opt}</td>
            <td className="px-2 py-3 text-center font-black text-[#0A2A4A] tabular-nums bg-blue-200/35">{fmtCmp(cmpTotalsFooter.coutOpt)}</td>
            <td className="px-2 py-3 text-center font-black text-[#061a2e] tabular-nums bg-blue-200/35">{fmtCmp(cmpTotalsFooter.coutOpt * 12)}</td>
            <td className="px-2 py-3 text-center bg-blue-200/35">
              <ImpactBadge value={cmpImpactsFooter.opt} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
