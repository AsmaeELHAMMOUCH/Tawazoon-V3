import React from "react";

const DeltaBadge = ({ value, theme = "default" }) => {
  const rounded = Math.round(value || 0);
  if (rounded === 0) return <span className="text-[10px] font-bold text-slate-300">==</span>;

  const isPos = rounded > 0;
  const absV = Math.abs(rounded);

  // Theme "subtle" for Δ/Calc, "default" for Δ/ACTUEL
  if (theme === "subtle") {
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${isPos ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
        }`}>
        {isPos ? "+" : "-"}{absV}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black ${isPos ? "bg-emerald-100 text-emerald-700 shadow-sm" : "bg-rose-100 text-rose-700 shadow-sm"
      }`}>
      {isPos ? "+" : "-"}{absV}
    </span>
  );
};

export default DeltaBadge;
