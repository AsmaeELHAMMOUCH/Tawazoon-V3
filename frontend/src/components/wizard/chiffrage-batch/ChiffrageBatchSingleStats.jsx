import React from "react";
import { Users, ArrowRight, Package, Calculator, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BudgetCard } from "@/components/wizard/ChiffrageDialog";
import { fmtSingle } from "./constants";

export default function ChiffrageBatchSingleStats({ etpNat, nat, singleModeLabel }) {
  return (
    <>
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
        </CardContent>
      </Card>

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
    </>
  );
}
