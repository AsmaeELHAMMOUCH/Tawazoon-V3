import React from "react";

const JOURS = 264;

const fmt = (num, dec = 0) => {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
  const fixed = dec > 0 ? Number(num).toFixed(dec).replace(".", ",") : Math.round(num).toString();
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
};

const besoin = (vol, eff) => (eff > 0 && vol > 0 ? vol / eff / JOURS : null);
const besoinH = (b, cap) => (b !== null && cap > 0 ? b / cap : null);

export default function CapaciteNominaleDirectionCard({
  icon: Icon,
  label,
  color,
  vol,
  effActuel,
  effs,
  capNette,
  scenarios,
}) {
  const bAct = besoin(vol, effActuel);
  const bActH = besoinH(bAct, capNette);

  return (
    <div
      className="rounded-2xl overflow-hidden bg-white flex flex-col"
      style={{ border: `1px solid ${color}25`, boxShadow: `0 4px 20px -6px ${color}20` }}
    >
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${color}12, ${color}06)`, borderBottom: `1px solid ${color}18` }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "18" }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-700 leading-none">{label}</p>
            <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Vol. annuel</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Volume</p>
          <p className="text-base font-black text-slate-700">{fmt(vol)}</p>
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-50" style={{ background: "#f8fafc" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Actuel (DB)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[7px] text-slate-400 font-bold">/jour</p>
            <p className="text-[13px] font-black text-slate-600">{fmt(bAct)}</p>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="text-right">
            <p className="text-[7px] text-slate-400 font-bold">/heure</p>
            <p className="text-[13px] font-black text-slate-600">{fmt(bActH, 1)}</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100 flex-1">
        {scenarios.map((sc) => {
          const eff = effs[sc.key];
          const b = besoin(vol, eff);
          const bH = besoinH(b, capNette);
          const delta = b !== null && bAct !== null ? b - bAct : null;
          const improved = delta !== null && delta < 0;
          return (
            <div key={sc.key} className="flex items-center justify-between bg-white px-4 py-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-[5px] h-6 rounded-sm"
                  style={{ backgroundColor: sc.color, boxShadow: `0 0 0 1px ${sc.color}33` }}
                />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: sc.color }}>
                    {sc.label}
                  </p>
                  <p className="text-[7px] text-slate-400 font-bold">ETP: {fmt(eff)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black leading-none" style={{ color: sc.color }}>
                  {fmt(b)} <span className="text-[8px] font-bold" style={{ color: sc.color + "88" }}>/jrs</span>
                </p>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{fmt(bH, 1)}/h</p>
                {delta !== null && (
                  <p className="text-[8px] font-bold mt-0.5" style={{ color: improved ? "#059669" : "#dc2626" }}>
                    {improved ? "▼" : "▲"} {fmt(Math.abs(delta), 1)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

