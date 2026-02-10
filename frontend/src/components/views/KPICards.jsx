
// --- Helper Components & Functions ---
const formatSmallNumber = (n) => typeof n === 'number' ? n.toFixed(2).replace('.', ',') : '0,00';

const formatHoursMinutes = (hours) => {
    if (!hours) return "0h00";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
};

const EffectifFooter = ({ totalLabel, totalValue, modValue, moiValue, apsLabel, apsValue }) => (
    <div className="text-[10px] text-slate-600 space-y-1.5">
        {totalValue && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                {totalLabel && <span className="font-semibold text-slate-700">{totalLabel}</span>}
                <span className="px-2 py-0.5 rounded-full bg-white text-slate-800 font-semibold shadow-sm">Total : {totalValue}</span>
            </div>
        )}
        <div className="flex items-center justify-center gap-2">
            <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#005EA8]">MOD : {modValue}</span>
            {moiValue !== undefined && moiValue !== null && (
                <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">MOI : {moiValue}</span>
            )}
        </div>
        {(apsValue !== undefined && apsValue !== null) && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-emerald-50/70 px-2 py-1">
                <span className="font-semibold text-emerald-800">{apsLabel}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 font-semibold shadow-sm">Total APS : {apsValue}</span>
            </div>
        )}
    </div>
);

const KPICardGlass = ({
    label, extraLabel, extraValue, total, icon: Icon, tone = "blue",
    emphasize = false, children, customFooter, toggleable = false, isOpen = false, onToggle,
}) => {
    const T = {
        blue: { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" },
        amber: { ring: "ring-amber-300/60", halo: "from-amber-400/25", text: "text-amber-600", dot: "bg-amber-500" },
        cyan: { ring: "ring-cyan-300/60", halo: "from-cyan-400/25", text: "text-cyan-600", dot: "bg-cyan-500" },
        rose: { ring: "ring-rose-300/60", halo: "from-rose-400/25", text: "text-rose-600", dot: "bg-rose-500" },
        emerald: { ring: "ring-emerald-300/60", halo: "from-emerald-400/25", text: "text-emerald-600", dot: "bg-emerald-500" },
        green: { ring: "ring-emerald-300/60", halo: "from-emerald-400/25", text: "text-emerald-600", dot: "bg-emerald-500" },
        slate: { ring: "ring-slate-300/60", halo: "from-slate-400/20", text: "text-slate-700", dot: "bg-slate-500" },
        red: { ring: "ring-rose-300/60", halo: "from-rose-400/25", text: "text-rose-600", dot: "bg-rose-500" },
    }[tone] || { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" };

    return (
        <div className={`relative overflow-hidden rounded-xl border border-white/50 bg-white/55 backdrop-blur-xl p-2 min-h-[75px] pb-2 ring-1 ${T.ring} shadow-[0_18px_55px_-18px_rgba(2,6,23,0.20)] transition-all duration-300 hover:scale-[1.02]`}>
            <div aria-hidden className={`pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${T.halo} to-transparent`} />
            {Icon && <Icon aria-hidden className="pointer-events-none absolute right-3 bottom-0.5 w-6 h-6 opacity-15 text-slate-700" />}

            {toggleable && onToggle && (
                <button type="button" onClick={onToggle} className="absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-full border border-white/70 bg-white/80 p-0.5 shadow-sm hover:bg-slate-50">
                    {isOpen ? <EyeOff className="w-2.5 h-2.5 text-slate-500" /> : <Eye className="w-2.5 h-2.5 text-slate-500" />}
                </button>
            )}

            <div className="text-[10px] font-semibold text-center text-slate-700 px-4 uppercase tracking-wider">{label}</div>
            <div className="mt-0.5 text-center text-lg font-extrabold text-slate-900">
                <span className={emphasize ? T.text : ""}>{total}</span>
            </div>

            {customFooter ? (
                <div className="mt-1 border-t border-slate-100 pt-0.5">{customFooter}</div>
            ) : children ? (
                <div className="mt-1 border-t border-slate-100 pt-0.5">{children}</div>
            ) : null}
        </div>
    );
};
