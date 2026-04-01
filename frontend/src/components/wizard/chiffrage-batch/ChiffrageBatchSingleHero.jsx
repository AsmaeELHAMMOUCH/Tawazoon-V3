import React from "react";
import { DollarSign } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { fmtSingle } from "./constants";

export default function ChiffrageBatchSingleHero({ nat, singleModeLabel }) {
  return (
    <CardHeader className="dlg-header-enter relative shrink-0 overflow-hidden bg-gradient-to-br from-[#015294] via-[#005EA8] to-[#00A0E0] py-3 px-5 border-b-0 rounded-none border-0 text-white shadow-none">
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
              <p className={`text-base font-black leading-tight ${nat.impact >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {nat.impact * 12 > 0 ? "+" : ""}
                {fmtSingle(nat.impact * 12)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </CardHeader>
  );
}
