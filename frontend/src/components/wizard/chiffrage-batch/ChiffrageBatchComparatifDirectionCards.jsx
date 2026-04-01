import React from "react";
import { Wallet, Calendar } from "lucide-react";
import { ChiffrageDirectionCard, SCENARIOS } from "@/components/wizard/ChiffrageComparatifDialog";

export default function ChiffrageBatchComparatifDirectionCards({ nat, etpNat }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ChiffrageDirectionCard
        icon={Wallet}
        label="Budget mensuel"
        sublabel="Masse salariale / mois"
        color="#005EA8"
        actuelValue={nat.budgetActuel}
        animDelay="0.18s"
        deltaBudgetAnnual
        scenarios={SCENARIOS.map((sc) => ({
          key: sc.key,
          label: sc.label,
          color: sc.color,
          etp: sc.key === "actuel" ? etpNat.etpCalc : sc.key === "consolide" ? etpNat.etpCons : etpNat.etpOpt,
          value: sc.key === "actuel" ? nat.budgetCalc : sc.key === "consolide" ? nat.budgetCons : nat.budgetOpt,
        }))}
      />
      <ChiffrageDirectionCard
        icon={Calendar}
        label="Budget annuel"
        sublabel="Masse salariale × 12"
        color="#00A0E0"
        actuelValue={nat.budgetActuel * 12}
        animDelay="0.28s"
        scenarios={SCENARIOS.map((sc) => ({
          key: sc.key,
          label: sc.label,
          color: sc.color,
          etp: sc.key === "actuel" ? etpNat.etpCalc : sc.key === "consolide" ? etpNat.etpCons : etpNat.etpOpt,
          value: (sc.key === "actuel" ? nat.budgetCalc : sc.key === "consolide" ? nat.budgetCons : nat.budgetOpt) * 12,
        }))}
      />
    </div>
  );
}
