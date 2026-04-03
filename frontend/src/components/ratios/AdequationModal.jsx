import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    Users,
    Calculator,
    Target,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Info,
    X,
    Activity,
    Layers,
    FileSpreadsheet
} from "lucide-react";

const getStatusConfig = (value) => {
    if (value >= 95 && value <= 105)
        return {
            color: "emerald",
            icon: <CheckCircle2 className="w-4 h-4" />,
            label: "OPTIMAL",
            description: "Adéquation parfaite.",
            bg: "bg-emerald-50/50",
            border: "border-emerald-100",
            text: "text-emerald-700",
            bar: "#10B981",
            gradient: "from-emerald-500 to-teal-600"
        };
    if ((value >= 90 && value < 95) || (value > 105 && value <= 110))
        return {
            color: "amber",
            icon: <AlertCircle className="w-4 h-4" />,
            label: "VIGILANCE",
            description: "Surveillance nécessaire.",
            bg: "bg-amber-50/50",
            border: "border-amber-100",
            text: "text-amber-700",
            bar: "#F59E0B",
            gradient: "from-amber-500 to-orange-600"
        };
    return {
        color: "rose",
        icon: <Target className="w-4 h-4" />,
        label: "CRITIQUE",
        description: "Action requise.",
        bg: "bg-rose-50/50",
        border: "border-rose-100",
        text: "text-rose-700",
        bar: "#EF4444",
        gradient: "from-rose-500 to-pink-600"
    };
};

const AdequationModal = ({ isOpen, adequation, onClose, onExportExcel, isExporting }) => {
    if (!isOpen || !adequation) return null;

    const indices = [
        {
            label: "Calculé / Actuel",
            value: adequation.indice_calc_vs_actuel,
            icon: <Calculator size={14} />
        },
        {
            label: "Recommandé / Actuel",
            value: adequation.indice_reco_vs_actuel,
            icon: <TrendingUp size={14} />
        },
        {
            label: "Recommandé / Calculé",
            value: adequation.indice_reco_vs_calc,
            icon: <Target size={14} />
        },
    ];

    const chartData = indices.map((i) => ({
        name: i.label,
        value: Number(i.value.toFixed(2)),
    }));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col">

                {/* Modern Header */}
                <div className="relative p-6 pb-2">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                <Activity className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Indice d'Adéquation</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Analyse granulaire des ressources</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onExportExcel && onExportExcel("global")}
                                disabled={isExporting}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50 border border-emerald-100/50 shadow-sm"
                            >
                                <FileSpreadsheet size={14} />
                                Rapport Excel
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-all hover:rotate-90 active:scale-90"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Summary */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        {[
                            { label: "Actuel", value: adequation.effectif_actuel, icon: <Users size={16} />, color: "text-slate-600", bg: "bg-slate-50/50" },
                            { label: "Calculé", value: adequation.effectif_calcule, icon: <Calculator size={16} />, color: "text-blue-600", bg: "bg-blue-50/50" },
                            { label: "Recommandé", value: adequation.effectif_recommande, icon: <Target size={16} />, color: "text-emerald-600", bg: "bg-emerald-50/50" },
                        ].map((item) => (
                            <div key={item.label} className={`relative overflow-hidden group p-4 rounded-2xl border border-slate-100 ${item.bg}`}>
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-125 transition-transform duration-500">
                                    {item.icon}
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className={`text-2xl font-black ${item.color}`}>{Math.round(item.value || 0)}</span>
                                    <span className="text-[10px] font-bold text-slate-400 italic">ETP</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 pt-2 grid lg:grid-cols-5 gap-6">

                    {/* Indices Cards */}
                    <div className="lg:col-span-2 flex flex-col gap-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Layers size={14} className="text-blue-600" />
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Couverture des besoins</h4>
                        </div>

                        {indices.map((idx) => {
                            const cfg = getStatusConfig(idx.value);
                            return (
                                <div key={idx.label} className={`group relative overflow-hidden px-4 py-4 rounded-2xl border-2 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100 ${cfg.border} ${cfg.bg}`}>
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[10px] font-black text-slate-900 tracking-tight">{idx.label}</p>
                                            <span className={`text-2xl font-black ${cfg.text}`}>{idx.value?.toFixed(1)}%</span>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-[8px] font-black tracking-widest border border-white/50 bg-white/40 backdrop-blur-sm ${cfg.text}`}>
                                            {cfg.label}
                                        </div>
                                    </div>
                                    <div className="mt-3 relative z-10">
                                        <div className="h-1.5 w-full bg-white/50 rounded-full overflow-hidden border border-white/30 p-[1px]">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${cfg.gradient} transition-all duration-1000 ease-out`}
                                                style={{ width: `${Math.min(idx.value, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    {/* Subtle pattern */}
                                    <div className={`absolute -right-4 -bottom-4 w-16 h-16 opacity-5 group-hover:scale-150 transition-transform duration-700 ${cfg.text}`}>
                                        {idx.icon}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Chart Section */}
                    <div className="lg:col-span-3">
                        <div className="bg-slate-50/50 rounded-2xl border-2 border-slate-100 p-5 h-full flex flex-col relative overflow-hidden min-h-[300px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">Visualisation des Écarts</h4>

                            <div className="flex-1 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                                        <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={({ x, y, payload }) => {
                                                // Raccourcir les labels pour le graphique
                                                const label = payload.value.replace(' / ', '/');
                                                return (
                                                    <text x={x} y={y + 15} textAnchor="middle" className="text-[9px] font-black fill-slate-500">
                                                        {label}
                                                    </text>
                                                );
                                            }}
                                        />
                                        <YAxis
                                            domain={[0, (dataMax) => Math.max(120, Math.ceil(dataMax / 20) * 20)]}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                                            tickFormatter={(v) => `${v}%`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(226, 232, 240, 0.4)', radius: 12 }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const cfg = getStatusConfig(payload[0].value);
                                                    return (
                                                        <div className="bg-white p-3 rounded-xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                                                            <p className="text-[10px] font-black text-slate-800 mb-1">{payload[0].payload.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-lg font-black ${cfg.text}`}>{payload[0].value}%</span>
                                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${cfg.bg} ${cfg.text}`}>
                                                                    {cfg.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <ReferenceLine y={100} stroke="#475569" strokeDasharray="4 4" strokeWidth={1.5} label={{ position: 'right', value: '100%', fill: '#475569', fontSize: 10, fontWeight: 900 }} />
                                        <Bar dataKey="value" barSize={45} radius={[10, 10, 10, 10]}>
                                            {chartData.map((entry) => {
                                                const cfg = getStatusConfig(entry.value);
                                                return (
                                                    <Cell key={entry.name} fill={cfg.bar} />
                                                );
                                            })}
                                            <LabelList
                                                dataKey="value"
                                                position="top"
                                                formatter={(v) => `${v}%`}
                                                style={{ fontSize: 11, fontWeight: 900, fill: '#1e293b' }}
                                                offset={12}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm relative z-10">
                                {[
                                    { label: "95% à 105%", color: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" },
                                    { label: "[90%-95%] ou [105%-110%]", color: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" },
                                    { label: "<90% ou >110%", color: "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-sm ${item.color} shrink-0`} />
                                        <span className="text-[10px] font-bold text-slate-500 tracking-tight whitespace-nowrap">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-6 w-full bg-slate-50/30" />
            </div>
        </div>
    );
};

export default AdequationModal;
