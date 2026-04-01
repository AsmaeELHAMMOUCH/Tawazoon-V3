import React from "react";

/** Avec showNature : même code couleur pour le chiffre et le libellé (Besoin = rouge, Surplus = vert). */
function badgeClasses(theme, isPos, showNature) {
  if (showNature) {
    return isPos
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (theme === "subtle") {
    return isPos
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  }
  return isPos
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : "bg-rose-50 text-rose-700 border-rose-200";
}

/** Libellé sémantique : Besoin = rouge, Surplus = vert. */
function NatureLabel({ isPos }) {
  const text = isPos ? "text-red-700" : "text-emerald-700";
  return (
    <span className={`text-[8px] font-bold uppercase tracking-wide leading-none whitespace-nowrap ${text}`}>
      {isPos ? "Besoin" : "Surplus"}
    </span>
  );
}

const DeltaBadge = ({ value, theme = "default", showNature = false }) => {
  const rounded = Math.round(value || 0);
  if (rounded === 0) {
    return (
      <span className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${showNature ? "min-h-[1.25rem]" : ""}`}>
        <span className="text-[10px] font-bold text-slate-300">==</span>
      </span>
    );
  }

  const isPos = rounded > 0;
  const absV = Math.abs(rounded);

  const wrap = (badge) =>
    showNature ? (
      <span className="inline-flex items-center justify-center gap-1.5 flex-nowrap whitespace-nowrap">
        {badge}
        <NatureLabel isPos={isPos} />
      </span>
    ) : (
      badge
    );

  const subtleWeight = showNature ? "font-black" : "font-bold";
  const subtleShadow = showNature ? "shadow-sm" : "";

  if (theme === "subtle") {
    return wrap(
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border whitespace-nowrap ${subtleWeight} ${subtleShadow} ${badgeClasses(theme, isPos, showNature)}`}
      >
        {isPos ? "+" : "-"}
        {absV}
      </span>
    );
  }

  return wrap(
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black border shadow-sm whitespace-nowrap ${badgeClasses(theme, isPos, showNature)}`}
    >
      {isPos ? "+" : "-"}
      {absV}
    </span>
  );
};

export default DeltaBadge;
