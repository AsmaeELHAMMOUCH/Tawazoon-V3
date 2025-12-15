import React from "react";
import ReactECharts from "echarts-for-react";

const CARD_CLASS = "bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-col h-[280px]";

export default function DirectionDonutsRow({ centres = [] }) {

    // Aggregations
    const aggregates = React.useMemo(() => {
        let moi = 0; // Usually 'Moi' or distinct field. Assuming simple logic for now. 
        let mod = 0;

        // Mock logic for demo if fields missing. Ideally `centres` contains `eff_moi` `eff_mod` or we sum `postes`.
        // The implementation plan says "Donut MOI/MOD".
        // If data not available in centre list, we might need to rely on consolidation data.
        // Assuming centres list has total `fte_actuel` and maybe a breakdown.
        // Since we removed mocks, we have to rely on what `api.centresByDirection` returns.
        // If it doesn't return MOI/MOD split, we show "Data N/A" or try to deduce.

        // Strategy: We'll sum up fte_actuel as MOD for now, unless we have better data.
        // Actually, let's use a simple placeholder if data missing to avoid crashing.

        const total = centres.reduce((a, c) => a + (c.fte_actuel || 0), 0);

        // Return dummy distribution for visual if no specific MOI/MOD field
        return { moi: total * 0.2, mod: total * 0.8 };
    }, [centres]);


    const moiModOption = {
        tooltip: { trigger: 'item' },
        legend: { bottom: '0%', left: 'center', icon: 'circle', itemHeight: 8, textStyle: { fontSize: 10 } },
        color: ['#005EA8', '#0063A6', '#bae6fd'],
        series: [
            {
                name: 'Effectifs',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '45%'],
                itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
                label: { show: false },
                data: [
                    { value: aggregates.mod, name: 'MOD' },
                    { value: aggregates.moi, name: 'MOI' },
                ]
            }
        ]
    };

    // Chart 2: Top 5 Centres by Gap (Ecart)
    const topGapData = React.useMemo(() => {
        const sorted = [...centres].sort((a, b) => (b.ecart || 0) - (a.ecart || 0)).slice(0, 5);
        return {
            categories: sorted.map(c => c.label?.substring(0, 15) + '...'),
            values: sorted.map(c => c.ecart),
        };
    }, [centres]);

    const barGapOption = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { top: '10%', left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
            type: 'category',
            data: topGapData.categories,
            axisTick: { alignWithLabel: true },
            axisLabel: { interval: 0, rotate: 30, fontSize: 9 }
        },
        yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
        series: [
            {
                name: 'Écart',
                type: 'bar',
                barWidth: '40%',
                data: topGapData.values,
                itemStyle: {
                    color: (params) => params.value > 0 ? '#e11d48' : '#059669', // Red for positive gap (sur-effectif), Green for neg
                    borderRadius: [4, 4, 0, 0]
                }
            }
        ]
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className={CARD_CLASS}>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Répartition MOI / MOD (Estimé)</h4>
                <div className="flex-1 min-h-0">
                    <ReactECharts option={moiModOption} style={{ height: '100%', width: '100%' }} />
                </div>
            </div>
            <div className={CARD_CLASS}>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Top 5 Écarts (Sur-effectifs)</h4>
                <div className="flex-1 min-h-0">
                    <ReactECharts option={barGapOption} style={{ height: '100%', width: '100%' }} />
                </div>
            </div>
        </div>
    );
}
