import { Settings2, BarChart3, Play, Activity, Gauge } from "lucide-react";

const inputFields = [
    { key: "sacs_jour", label: "Sacs / Jour", unit: "sacs", min: 0, icon: Gauge },
    { key: "dossiers_mois", label: "Dossiers / Mois", unit: "dossiers", min: 0, icon: Activity },
    { key: "productivite", label: "Productivité", unit: "%", min: 0, max: 200, step: 1, icon: Gauge },
];

const SimulationParamsCard = ({
    params,
    calculated,
    loading,
    onChange,
    onSubmit,
    onShowAdequation,
}) => {
    const handleInput = (field) => (e) => {
        const value = Number(e.target.value);
        onChange(field, Number.isNaN(value) ? 0 : value);
    };

    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
            {/* Header Section */}
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                        <Settings2 size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">INPUTS</p>
                        <h2 className="text-sm font-black text-slate-800 tracking-tight">Configuration des paramètres</h2>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Input Columns (Active) */}
                    {inputFields.map(({ key, label, unit, min, max, step, icon: Icon }) => (
                        <div key={key} className="space-y-2 group">
                            <div className="flex items-center gap-2 pl-1">
                                <Icon size={12} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {label}
                                </span>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    min={min}
                                    max={max}
                                    step={step ?? 1}
                                    value={params[key]}
                                    onChange={handleInput(key)}
                                    className="w-full h-11 rounded-1.5xl border-2 border-slate-100 bg-slate-50 px-4 py-1 text-center text-xs font-black text-[#005EA8] outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 shadow-inner"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-300 uppercase pointer-events-none">
                                    {unit}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Info Columns (Grayed out / Readonly) */}
                    {[
                        { label: "Dos. / Jour", value: calculated?.dossiers_par_jour?.toFixed(2), unit: "dos", icon: Activity },
                        { label: "Heures Net / Jour", value: calculated?.heures_net_par_jour?.toFixed(2), unit: "h", icon: Gauge },
                    ].map(({ label, value, unit, icon: Icon }) => (
                        <div key={label} className="space-y-2 opacity-80">
                            <div className="flex items-center gap-2 pl-1">
                                <Icon size={12} className="text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {label}
                                </span>
                            </div>
                            <div className="relative">
                                <div className="w-full h-11 rounded-1.5xl border-2 border-dashed border-slate-100 bg-slate-50/50 flex items-center justify-center text-xs font-bold text-slate-400 px-4">
                                    {value}
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-300 uppercase">
                                        {unit}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Final Action */}
            <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-50 flex items-center justify-center">
                <button
                    onClick={onSubmit}
                    disabled={loading}
                    className="group relative overflow-hidden px-10 py-3 rounded-2xl bg-slate-900 font-black text-xs text-white uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/20 active:scale-95 transition-all disabled:bg-slate-300"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex items-center gap-3">
                        {loading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                            <Play size={14} fill="currentColor" className="ml-0.5" />
                        )}
                        {loading ? "Calcul en cours..." : "Lancer la Simulation"}
                    </div>
                </button>
            </div>
        </section>
    );
};

export default SimulationParamsCard;
