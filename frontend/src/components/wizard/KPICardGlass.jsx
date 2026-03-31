import React from "react";
import { Eye } from "lucide-react";

/**
 * KPI Card Component with Glass-morphism effect
 * Used for displaying ETP summaries and other key metrics.
 */
const KPICardGlass = ({
  label,
  total,
  icon: Icon,
  tone = "blue",
  emphasize = false,
  children,
  onDetailClick,
  subLabel,
}) => {
  const T =
    {
      blue: {
        ring: "ring-blue-300/60",
        halo: "from-blue-400/25",
        text: "text-[#005EA8]",
        border: "border-blue-200/40",
        iconBg: "bg-blue-50/80",
      },
      cyan: {
        ring: "ring-cyan-300/60",
        halo: "from-cyan-400/25",
        text: "text-cyan-600",
        border: "border-cyan-200/40",
        iconBg: "bg-cyan-50/80",
      },
      amber: {
        ring: "ring-amber-300/60",
        halo: "from-amber-400/25",
        text: "text-amber-600",
        border: "border-amber-200/40",
        iconBg: "bg-amber-50/80",
      },
      emerald: {
        ring: "ring-emerald-300/60",
        halo: "from-emerald-400/25",
        text: "text-emerald-600",
        border: "border-emerald-200/40",
        iconBg: "bg-emerald-50/80",
      },
      rose: {
        ring: "ring-rose-300/60",
        halo: "from-rose-400/25",
        text: "text-rose-600",
        border: "border-rose-200/40",
        iconBg: "bg-rose-50/80",
      },
    }[tone] || {
      ring: "ring-blue-300/60",
      halo: "from-blue-400/25",
      text: "text-[#005EA8]",
      border: "border-blue-200/40",
      iconBg: "bg-blue-50/80",
    };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${T.border} bg-gradient-to-br from-white via-white to-slate-50/30 backdrop-blur-xl p-2.5 pb-2 flex flex-col ring-1 ${T.ring} shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 h-full`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${T.halo} to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300`}
      />

      {onDetailClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDetailClick();
          }}
          className={`absolute right-2 top-2 z-10 p-1 rounded-lg ${T.iconBg} hover:bg-white text-slate-500 hover:text-slate-700 transition-all duration-200 shadow-sm border ${T.border}`}
        >
          <Eye className="w-3 h-3" />
        </button>
      )}

      {Icon && (
        <Icon
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-0.5 w-6 h-6 opacity-10 text-slate-700 group-hover:opacity-15 transition-opacity"
        />
      )}

      <div className="flex flex-col items-center mb-1.5">
        <div className="h-[26px] flex items-center justify-center">
          <span className="text-[10px] font-bold text-center text-slate-600 uppercase tracking-tight leading-[11px] px-1">
            {label}
          </span>
        </div>
        <div className="text-center flex flex-col items-center justify-center h-[24px]">
          <div className="flex items-baseline gap-1 leading-none">
            <span
              className={`text-xl font-extrabold ${emphasize ? T.text : "text-slate-900"
                }`}
            >
              {total}
            </span>
            {subLabel && (
              <span
                className={`text-[9px] font-bold uppercase tracking-tighter ${emphasize ? T.text + " opacity-70" : "text-slate-400"
                  }`}
              >
                {subLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {children && (
        <div className="flex-1 flex flex-col justify-center pt-1.5 border-t border-slate-200/60 w-full">
          {children}
        </div>
      )}
    </div>
  );
};

export default KPICardGlass;
