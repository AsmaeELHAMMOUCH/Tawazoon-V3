import React from "react";

const JOURS = 264;

const fmt = (num, dec = 0) => {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
  const fixed = dec > 0 ? Number(num).toFixed(dec).replace(".", ",") : Math.round(num).toString();
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
};

const besoin = (vol, eff) => (eff > 0 && vol > 0 ? vol / eff / JOURS : null);
const besoinH = (b, cap) => (b !== null && cap > 0 ? b / cap : null);

/** Aligné sur l’affichage : /jour entier, /heure 1 décimale — l’écart = différence des valeurs affichées */
const roundJour = (v) => (v !== null && v !== undefined && !Number.isNaN(v) ? Math.round(v) : null);
const roundHeure1 = (v) => (v !== null && v !== undefined && !Number.isNaN(v) ? Math.round(v * 10) / 10 : null);

export default function CapaciteNominaleDirectionCard({
  icon: Icon,
  label,
  color,
  vol,
  effActuel,
  effs,
  capNette,
  scenarios,
  /** "blue" : deltas en nuances bleu (dialogue comparatif uniquement) */
  deltaTheme = "default",
}) {
  const deltaPos = deltaTheme === "blue" ? "#005EA8" : "#059669";
  const deltaNeg = deltaTheme === "blue" ? "#64748B" : "#dc2626";
  const bAct = besoin(vol, effActuel);
  const bActH = besoinH(bAct, capNette);
  const bActJDisp = roundJour(bAct);
  const bActHDisp = roundHeure1(bActH);

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
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Actuel</span>
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
          const bJDisp = roundJour(b);
          const bHDisp = roundHeure1(bH);
          const delta =
            bJDisp !== null && bActJDisp !== null ? bJDisp - bActJDisp : null;
          const deltaHRaw =
            bHDisp !== null && bActHDisp !== null ? bHDisp - bActHDisp : null;
          const deltaH =
            deltaHRaw !== null ? Math.round(deltaHRaw * 10) / 10 : null;
          const improvedJ = delta !== null && delta < 0;
          const improvedH = deltaH !== null && deltaH < 0;
          return (
            <div key={sc.key} className="flex items-center justify-between bg-white px-4 py-1.5 gap-2">
              <div className="flex items-center gap-2.5 min-w-0 shrink">
                <div
                  className="w-[5px] h-6 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: sc.color, boxShadow: `0 0 0 1px ${sc.color}33` }}
                />
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-wider truncate" style={{ color: sc.color }}>
                    {sc.label}
                  </p>
                  <p className="text-[7px] text-slate-400 font-bold leading-none">ETP: {fmt(eff)}</p>
                </div>
              </div>
              {/* Comme Actuel (DB) : /jour | /heure ; écart vs actuel sous chaque valeur */}
              <div className="flex items-stretch gap-3 flex-shrink-0">
                <div className="flex flex-col items-end text-right min-w-[3rem]">
                  <p className="text-[7px] text-slate-400 font-bold leading-none">/jour</p>
                  <p className="text-[13px] font-black tabular-nums leading-tight" style={{ color: sc.color }}>
                    {fmt(b)}
                  </p>
                  <div className="mt-0.5 min-h-[12px] flex items-center justify-end w-full" title="Écart /jour vs actuel">
                    {delta !== null ? (
                      <span
                        className="text-[7px] font-bold tabular-nums leading-none"
                        style={{
                          color: delta === 0 ? "#94a3b8" : improvedJ ? deltaPos : deltaNeg,
                        }}
                      >
                        {delta === 0 ? "=" : improvedJ ? "▼" : "▲"}
                        {fmt(Math.abs(delta), 0)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="w-px bg-slate-200 shrink-0" aria-hidden />
                <div className="flex flex-col items-end text-right min-w-[3rem]">
                  <p className="text-[7px] text-slate-400 font-bold leading-none">/heure</p>
                  <p className="text-[13px] font-black text-slate-600 tabular-nums leading-tight">{fmt(bH, 1)}</p>
                  <div className="mt-0.5 min-h-[12px] flex items-center justify-end w-full" title="Écart /h vs actuel">
                    {deltaH !== null ? (
                      <span
                        className="text-[7px] font-bold tabular-nums leading-none"
                        style={{
                          color: deltaH === 0 ? "#94a3b8" : improvedH ? deltaPos : deltaNeg,
                        }}
                      >
                        {deltaH === 0 ? "=" : improvedH ? "▼" : "▲"}
                        {fmt(Math.abs(deltaH), 1)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

