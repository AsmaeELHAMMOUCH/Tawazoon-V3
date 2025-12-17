import React from "react";
import ReactECharts from "echarts-for-react";

const CARD_CLASS = "bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-col h-[280px]";

export default function DirectionDonutsRow({ centres = [], charts = null }) {

    // 1. MOI / MOD Distribution
    const moiModOption = React.useMemo(() => {
        let data = [];
        if (charts && charts.dist && charts.dist.length > 0) {
            // Backend Data
            data = charts.dist.map(d => ({ value: d.value, name: d.name }));
        } else {
            // Fallback (Estimate)
            const total = centres.reduce((a, c) => a + (c.fte_actuel || 0), 0);
            data = [
                { value: total * 0.8, name: 'MOD' },
                { value: total * 0.2, name: 'MOI' }
            ];
        }

        return {
            tooltip: { trigger: 'item' },
            legend: { bottom: '0%', left: 'center', icon: 'circle', itemHeight: 8, textStyle: { fontSize: 10 } },
            color: ['#005EA8', '#0063A6', '#bae6fd'],
            series: [{
                name: 'Effectifs (ETP Calculé)',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '45%'],
                itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
                label: { show: false },
                data: data
            }]
        };
    }, [centres, charts]);

    // 2. Top 5 Gaps
    const barGapOption = React.useMemo(() => {
        let categories = [];
        let values = [];

        if (charts && charts.top && charts.top.length > 0) {
            categories = charts.top.map(d => d.name);
            values = charts.top.map(d => d.value);
        } else {
            const sorted = [...centres].sort((a, b) => (b.ecart || 0) - (a.ecart || 0)).slice(0, 5);
            categories = sorted.map(c => c.label?.substring(0, 15) + '...');
            values = sorted.map(c => c.ecart);
        }

        return {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { top: '10%', left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                data: categories,
                axisTick: { alignWithLabel: true },
                axisLabel: { interval: 0, rotate: 30, fontSize: 9 }
            },
            yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
            series: [{
                name: 'Écart',
                type: 'bar',
                barWidth: '40%',
                data: values,
                itemStyle: {
                    color: (params) => params.value > 0 ? '#e11d48' : '#059669',
                    borderRadius: [4, 4, 0, 0]
                }
            }]
        };
    }, [centres, charts]);



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
