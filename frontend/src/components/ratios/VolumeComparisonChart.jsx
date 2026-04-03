import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell
} from "recharts";

const palette = {
    actuel: "#005EA8",       // Bleu BAM
    calcule: "#3B82F6",      // Blue 500
    recommande: "#4F46E5",   // Indigo 600
};

const VolumeComparisonChart = ({ data, height = 280, timeframe = "" }) => {
    // Filtrer le TOTAL dans la vue compacte
    const filteredData = (data || []).filter((d) => !d.is_total);

    // Déterminer la précision des décimales selon le timeframe
    const precision = timeframe === "mois" ? 0 : 2;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-3 rounded-2xl shadow-2xl shadow-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
                    <div className="space-y-1.5">
                        {payload.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-xs font-bold text-slate-600">{entry.name}</span>
                                </div>
                                <span className="text-xs font-mono font-black text-slate-900">
                                    {Number(entry.value).toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart
                data={filteredData}
                margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
                barGap={4}
            >
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="4 4" vertical={false} />
                <XAxis
                    dataKey="position"
                    tick={{ fontSize: 9, fill: "#94A3B8", fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={40}
                />
                <YAxis
                    tickFormatter={(v) => v.toLocaleString()}
                    tick={{ fontSize: 9, fill: "#CBD5E1", fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 0 }}
                />
                <Bar
                    dataKey="actuel"
                    name="Actuel"
                    fill={palette.actuel}
                    radius={[4, 4, 0, 0]}
                    barSize={12}
                    animationDuration={1500}
                />
                <Bar
                    dataKey="recommande"
                    name="Recommandé"
                    fill={palette.recommande}
                    radius={[4, 4, 0, 0]}
                    barSize={12}
                    animationDuration={1500}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default VolumeComparisonChart;
