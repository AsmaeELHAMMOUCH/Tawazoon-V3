// ../intervenant/ProductivityParamsCard.jsx
"use client";
import React from "react";
import { Gauge, Clock } from "lucide-react";

export default function ProductivityParamsCard({
  Card,
  Field,
  Input,
  productivite,
  setProductivite,
  heuresNet,
  setHeuresNet,
  tempsMort,
  setTempsMort,
  parseNonNeg,
  toInput,
  baseHeuresNet,
  tauxComplexite,
  setTauxComplexite,
  natureGeo,
  setNatureGeo,
}) {
  const handleNumberChange = (setter) => (e) => {
    const n = parseNonNeg(e.target.value);
    setter(n ?? 0);
  };

  // 🔢 Quand on change la productivité → on recalcule Heures/Jour automatiquement
  const handleProductiviteChange = (e) => {
    const n = parseNonNeg(e.target.value);
    const p = n ?? 0;
    setProductivite(p);

    // 🧮 Heures/Jour calculées à partir de la productivité
    const heuresCalculees = p > 0 ? (8 * p) / 100 : 0;
    setHeuresNet(heuresCalculees);
  };

  const heuresTheoInput = toInput(heuresNet);
  const tempsMortInput = toInput(tempsMort);
  const complexiteInput = toInput(tauxComplexite);
  const natureGeoInput = toInput(natureGeo);
  const productiviteInput = toInput(productivite);

  const heuresNettesDisplay =
    baseHeuresNet !== null && baseHeuresNet !== undefined
      ? baseHeuresNet.toFixed(2)
      : "0,00";

  return (
    <Card title="Paramètres de productivité">
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2 p-2 items-end">
        {/* 1️⃣ Productivité (%) */}
        <Field label="Productivité (%)" icon={Gauge}>
          <div className="relative">
            <Input
              type="text"
              value={productiviteInput}
              onChange={handleProductiviteChange}
              className="pr-6 !text-center"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-500">
              %
            </span>
          </div>
        </Field>

        {/* 2️⃣ Heures / Jour (calculé à partir de la productivité) */}
        <Field label="Heures/Jour" icon={Clock}>
          <div className="relative">
            <Input
              type="text"
              value={heuresTheoInput}
              readOnly
              disabled
              className="pr-6 !text-center !bg-sky-50 !text-sky-700 !border-sky-300 cursor-not-allowed"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-500">
              h
            </span>
          </div>
        </Field>

        {/* 3️⃣ Temps mort (min/Jour) */}
        <Field label="Temps mort (min/Jour)">
          <div className="relative">
            <Input
              type="text"
              value={tempsMortInput}
              onChange={handleNumberChange(setTempsMort)}
              className="pr-7 !text-center"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-500">
              min
            </span>
          </div>
        </Field>

        {/* 4️⃣ H.nettes / Jour (calculé) */}
        <Field label="H.nettes / Jour">
          <div className="relative">
            <Input
              type="text"
              value={heuresNettesDisplay}
              readOnly
              disabled
              className="pr-6 !text-center !bg-sky-50 !text-sky-700 !border-sky-300 cursor-not-allowed"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-500">
              h
            </span>
          </div>
        </Field>

        {/* 5️⃣ Complexité (circulation) */}
        <Field label="complexité (circulation)">
          <div className="relative">
            <Input
              type="text"
              value={complexiteInput}
              onChange={handleNumberChange(setTauxComplexite)}
              className="!text-center"
            />
          </div>
        </Field>

        {/* 6️⃣ Nature géographique (distribution) */}
        <Field label="Nature géographique (distribution)">
          <div className="relative">
            <Input
              type="text"
              value={natureGeoInput}
              onChange={handleNumberChange(setNatureGeo)}
              className="!text-center"
            />
          </div>
        </Field>
      </div>
    </Card>
  );
}
