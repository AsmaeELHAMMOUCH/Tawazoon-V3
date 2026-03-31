import React from "react";

/**
 * Footer component for KPI cards showing the MOD/MOI/APS breakdown.
 */
const EffectifFooter = ({
  totalLabel,
  totalValue,
  modValue,
  moiValue,
  apsLabel,
  apsValue,
}) => (
  <div className="text-[10px] text-slate-600 space-y-1 w-full">
    <div
      className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-0.5 border ${totalValue !== undefined ? "bg-slate-50 border-slate-100" : "opacity-0"
        }`}
    >
      <span className="font-bold text-slate-400 text-[8px] uppercase">
        {totalLabel || "TOTAL"}:
      </span>
      <span className="text-slate-800 font-extrabold">{totalValue || "0"}</span>
    </div>
    <div className="flex items-center justify-center gap-1">
      <div className="flex-1 flex items-center justify-between px-1.5 py-0.5 rounded bg-blue-50/50 text-[#005EA8] border border-blue-100/50">
        <span className="text-blue-400 font-bold text-[8px]">MOD:</span>
        <span className="font-extrabold">{modValue}</span>
      </div>
      {(moiValue !== undefined && moiValue !== null) && (
        <div
          className="flex-1 flex items-center justify-between px-1.5 py-0.5 rounded border bg-fuchsia-50/50 text-fuchsia-700 border-fuchsia-100/50"
        >
          <span className="text-fuchsia-400 font-bold text-[8px]">MOI:</span>
          <span className="font-extrabold">{moiValue || "0"}</span>
        </div>
      )}
    </div>
    {(apsValue !== undefined && apsValue !== null) && (
      <div
        className="flex flex-col items-center justify-center gap-0.5 rounded-full px-2 py-0.5 border bg-emerald-50 text-emerald-700 border-emerald-100/50"
      >
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-emerald-400 text-[8px] uppercase">
            {apsLabel || "APS"}:
          </span>
          <span className="font-extrabold">{apsValue || "0"}</span>
        </div>
      </div>
    )}
  </div>
);

export default EffectifFooter;
