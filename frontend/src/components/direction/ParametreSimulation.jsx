"use client";
import React, { useMemo } from "react";
import { Gauge, Clock, Building } from "lucide-react";

/* ========== UI plus compacte ========== */
const Card = ({ title, subtitle, actions, children, className = "" }) => (
  <section
    className={`bg-white/80 backdrop-blur-xl rounded-xl border border-white/60 
    shadow-[0_4px_20px_-10px_rgba(2,6,23,0.12)] hover:shadow-[0_8px_30px_-14px_rgba(2,6,23,0.18)] 
    transition-all duration-400 ${className}`}
  >
    {(title || actions) && (
      <header className="px-3 pt-3 pb-2 border-b border-white/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </header>
    )}
    <div className="px-3 py-2.5">{children}</div>
  </section>
);

const Box = ({ children, className = "" }) => (
  <div
    className={`rounded-lg border border-slate-200/80 bg-white/60 backdrop-blur-sm p-2 ${className}`}
  >
    {children}
  </div>
);

const Field = ({ label, icon: Icon, children }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10px] font-semibold text-slate-700/90 flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3 text-cyan-600" />}
      {label}
    </span>
    {children}
  </label>
);

const Input = (props) => (
  <input
    {...props}
    className="h-8 w-full rounded-md border border-slate-300/80 bg-white/80 px-2 text-[12px]
    focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-150"
  />
);

const Select = (props) => (
  <select
    {...props}
    className="h-8 w-full rounded-md border border-slate-300/80 bg-white/80 px-2 text-[12px]
    focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-150"
  />
);

/* ========== Component extraite (compact) ========== */
export default function ParametreSimulation({
  productivite,
  setProductivite,
  heuresNet,
  dirs = [],
  dirId,
  setDirId,
  loadingDirs = false,
}) {
  const heuresNetText = useMemo(() => {
    const v = Number(heuresNet);
    return Number.isFinite(v) ? v.toFixed(2) : "0.00";
  }, [heuresNet]);

  return (
    <Card
      title="Objet et paramètres de la simulation"
      subtitle="Ajustez les paramètres pour affiner votre analyse"
    >
      <Box className="hover:bg-white/80 transition-all duration-200">
        <div className="grid gap-3 md:grid-cols-3">
          {/* Productivité */}
          <div className="flex flex-col items-center text-center mx-auto w-full max-w-[220px]">
            <Field label="Productivité moyenne" icon={Gauge}>
              <Input
                type="number"
                value={productivite}
                onChange={(e) => setProductivite(e.target.value)}
                min="0"
                max="200"
                className="w-full text-center"
              />
            </Field>
            <div className="text-[10px] text-slate-500 mt-1">
              Basé sur les standards
            </div>
          </div>

          {/* Heures nettes */}
          <div className="flex flex-col items-center text-center mx-auto w-full max-w-[220px]">
            <Field label="Heures nettes quotidiennes" icon={Clock}>
              <Input
                type="text"
                value={heuresNetText}
                readOnly
                className="bg-slate-50/80 w-full text-center"
              />
            </Field>
            <div className="text-[10px] text-slate-500 mt-1">
              Calculé automatiquement
            </div>
          </div>

          {/* Direction */}
          <div className="flex flex-col items-center text-center mx-auto w-full max-w-[220px]">
            <Field label="Direction analysée" icon={Building}>
              <Select
                value={dirId ?? ""}
                onChange={(e) => setDirId(Number(e.target.value))}
                disabled={loadingDirs}
                className="w-full text-center"
              >
                {(dirs || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="text-[10px] text-slate-500 mt-1">
              {dirs?.length || 0} directions
            </div>
          </div>
        </div>
      </Box>
    </Card>
  );
}
