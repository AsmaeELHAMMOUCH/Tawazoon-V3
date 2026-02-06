import React, { useMemo, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

function DirectionOverviewChart({ centres = [] }) {
    const data = useMemo(() => {
        // Sort centres by absolute gap magnitude to show most critical ones
        // We take top 10 for readability
        const sorted = [...centres]
            .filter(c => Math.abs(c.ecart) > 0.5) // Filter out negligible gaps
            .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
            .slice(0, 10);

        return sorted.map(c => ({
            name: c.label.length > 15 ? c.label.substring(0, 15) + '...' : c.label,
            fullLabel: c.label,
            ecart: c.ecart,
            actuel: c.fte_actuel,
            cible: c.etp_calcule
        }));
    }, [centres]);

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center h-full min-h-[300px]">
                <p className="text-slate-400 font-medium text-sm">Aucun écart significatif à afficher.</p>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs">
                    <p className="font-bold text-slate-800 mb-1">{d.fullLabel}</p>
                    <p className="text-slate-500">Actuel : <span className="font-mono font-medium">{d.actuel?.toFixed(2)}</span></p>
                    <p className="text-slate-500">Cible : <span className="font-mono font-medium">{d.cible?.toFixed(2)}</span></p>
                    <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between gap-4">
                        <span className="font-semibold text-slate-500">Écart :</span>
                        <span className={`font-mono font-bold ${d.ecart > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {d.ecart > 0 ? '+' : ''}{d.ecart.toFixed(2)}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-4 h-full flex flex-col">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Top 10 Écarts Critiques</h3>
                    <p className="text-[10px] text-slate-400">Centres nécessitant une attention prioritaire (ETP)</p>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <ReferenceLine x={0} stroke="#cbd5e1" />
                        <Bar dataKey="ecart" radius={[0, 4, 4, 0]} barSize={12}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.ecart > 0 ? '#e11d48' : '#059669'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default memo(DirectionOverviewChart);
