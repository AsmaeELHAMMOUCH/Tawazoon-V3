import React from "react";
import { Layers, ChevronRight, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { SEL_LIST } from "./constants";

export default function ChiffrageDrilldownScopeBar({
  regionKey,
  centreKey,
  scopeLabel,
  scopedCentresLength,
  selectedCentreLabel,
  variant,
  onReset,
}) {
  const isCmp = variant === "comparatif";
  const accent = isCmp ? "text-[#005EA8]" : "text-violet-700";

  return (
    <Card className="rounded-xl border-slate-200 shadow-sm">
      <CardContent className="p-3 flex flex-wrap items-center gap-2 justify-between gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] min-w-0">
          <Layers className={`w-3.5 h-3.5 shrink-0 ${isCmp ? "text-[#005EA8]" : "text-violet-600"}`} />
          <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0">Périmètre</span>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <nav className="flex flex-wrap items-center gap-1 text-slate-600 min-w-0" aria-label="Fil d'Ariane chiffrage">
            <span className={`font-bold ${regionKey === "all" ? accent : "text-slate-500"}`}>National (fichier)</span>
            {regionKey !== "all" && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                <span
                  className={`font-bold truncate max-w-[10rem] ${centreKey === SEL_LIST ? accent : "text-slate-500"}`}
                  title={scopeLabel}
                >
                  {scopeLabel}
                </span>
              </>
            )}
            {centreKey !== SEL_LIST && selectedCentreLabel && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                <span className={`font-bold truncate max-w-[12rem] ${accent}`} title={selectedCentreLabel}>
                  {selectedCentreLabel}
                </span>
              </>
            )}
          </nav>
          <span className="text-slate-300 hidden md:inline">·</span>
          <span className="text-slate-500 tabular-nums">
            {scopedCentresLength} centre{scopedCentresLength !== 1 ? "s" : ""} dans le filtre courant
          </span>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-5 text-[10px] font-bold gap-1.5 shrink-0" onClick={onReset}>
          <RotateCcw className="w-3 h-3" />
          Réinitialiser
        </Button>
      </CardContent>
    </Card>
  );
}
