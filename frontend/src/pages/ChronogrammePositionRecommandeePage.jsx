import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchChronogrammePositionsRec } from "../api/recommande";
import EsignLayout from "../components/EsignLayout";
import {
    ArrowLeft,
    BarChart3,
    Loader2,
    X,
    User,
    List
} from "lucide-react";
import ReactECharts from "echarts-for-react";

export default function ChronogrammePositionRecommandeePage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showGraph, setShowGraph] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const payload = await fetchChronogrammePositionsRec();
            if (payload.message && payload.rows.length === 0) {
                setError(payload.message);
            } else {
                setRows(payload.rows || []);
                setTotal(payload.total || null);
                setError("");
            }
        } catch (err) {
            console.error(err);
            setError("Erreur lors du chargement des données.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <EsignLayout activeKey="Chronogramme recommandé">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-500">
                {/* Premium Header */}
                <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-20 -mt-20 opacity-70" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center flex-col md:flex-row gap-3 text-center md:text-left">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 relative">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-3">
                                    Chronogramme par Position
                                    <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border border-blue-200 shadow-sm translate-y-px">Recommandé</span>
                                </h1>
                                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                                    Agrégation des temps par métier - Processus Recommandé.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[500px]">

                    {/* Toolbar */}
                    <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate("/dimensionnement-recommande/chronogramme/taches")}
                                className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                            >
                                <ArrowLeft size={14} />
                                Retour aux tâches
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowGraph(true)}
                                disabled={rows.length === 0}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#005EA8] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition-all shadow-blue-500/20 border border-transparent disabled:opacity-50"
                            >
                                <BarChart3 size={14} />
                                Afficher Graphe
                            </button>
                        </div>
                    </div>

                    {/* Table Content */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 relative">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[40%]">
                                        <div className="flex items-center gap-2">
                                            <User size={12} className="text-blue-500" />
                                            Position
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center w-[20%] bg-blue-50/10">Durée (Sec)</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center w-[20%] bg-blue-50/10">Durée (Min)</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center w-[20%]">Durée (Heures)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-slate-400 animate-pulse">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                                <p className="text-[10px] font-medium">Chargement des données...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3 opacity-60">
                                                <List size={48} className="text-slate-300" />
                                                <p>{error || "Aucune donnée trouvée."}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {rows.map((row, index) => (
                                            <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-5 py-2 font-medium text-slate-700 group-hover:text-blue-700 transition-colors">
                                                    {row.position}
                                                </td>
                                                <td className="px-5 py-2 text-center font-mono text-slate-600 bg-slate-50/30 group-hover:bg-blue-50/40 border-l border-slate-100 border-r">
                                                    {Number(row.seconds).toFixed(2)}
                                                </td>
                                                <td className="px-5 py-2 text-center font-mono text-slate-600 bg-slate-50/30 group-hover:bg-blue-50/40 border-r border-slate-100">
                                                    {Number(row.minutes).toFixed(2)}
                                                </td>
                                                <td className="px-5 py-2 text-center font-mono text-blue-600 font-bold">
                                                    {Number(row.hours).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                        {total && (
                                            <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200 sticky bottom-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                                <td className="px-5 py-3 text-slate-900 uppercase tracking-widest text-[10px]">
                                                    {total.position}
                                                </td>
                                                <td className="px-5 py-3 text-center text-slate-900 font-mono border-l border-slate-200 border-r">
                                                    {Number(total.seconds).toFixed(2)}
                                                </td>
                                                <td className="px-5 py-3 text-center text-slate-900 font-mono border-r border-slate-200">
                                                    {Number(total.minutes).toFixed(2)}
                                                </td>
                                                <td className="px-5 py-3 text-center text-[#005EA8] font-mono">
                                                    {Number(total.hours).toFixed(2)}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Info */}
                    <div className="bg-white border-t border-slate-200 px-4 py-2 text-[10px] text-slate-500 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div>
                            <span className="font-semibold">{rows.length}</span> positions affichées
                        </div>
                        {error && !loading && rows.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600 border border-red-100 animate-in fade-in slide-in-from-bottom-1">
                                {error}
                            </span>
                        )}
                        <div className="text-slate-400 font-medium">
                            © 2025 – ALMAV GROUP
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Graphe */}
            {showGraph && (
                <PositionCumulativeChartModal onClose={() => setShowGraph(false)} />
            )}
        </EsignLayout>
    );
}

// Composant Modal pour le Graphe (Inchangé car déjà stylisé premium)
function PositionCumulativeChartModal({ onClose }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadGraph = async () => {
            try {
                const payload = await import("../api/recommande").then(m => m.fetchChronogrammeGraphDataRec());
                setData(payload.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadGraph();
    }, []);

    const option = {
        backgroundColor: "transparent",
        title: {
            text: "Répartition Cumulative du Temps par Poste",
            left: "center",
            top: 0,
            textStyle: {
                color: "#1e293b",
                fontSize: 20,
                fontWeight: "900",
                fontFamily: "'Inter', sans-serif"
            }
        },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            borderColor: "rgba(15, 23, 42, 0.9)",
            borderWidth: 0,
            padding: [10, 15],
            textStyle: { color: "#fff", fontSize: 13 },
            extraCssText: "box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border-radius: 12px;",
            formatter: (params) => {
                const item = params.find(p => p.seriesName === "Durée");
                if (!item) return "";
                const dataIndex = item.dataIndex;
                const raw = data[dataIndex];
                return `
                    <div style="font-family: 'Inter', sans-serif;">
                        <div style="font-weight: 800; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">${raw.position}</div>
                        <div style="display: flex; justify-between; gap: 20px; margin-bottom: 4px;">
                            <span style="opacity: 0.7;">Début</span>
                            <span style="font-weight: 600;">${raw.start}h</span>
                        </div>
                        <div style="display: flex; justify-between; gap: 20px; margin-bottom: 4px;">
                            <span style="opacity: 0.7;">Fin</span>
                            <span style="font-weight: 600; color: #60a5fa;">${raw.end}h</span>
                        </div>
                        <div style="display: flex; justify-between; gap: 20px; margin-top: 8px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1);">
                            <span style="opacity: 0.7;">Durée Totale</span>
                            <span style="font-weight: 800; color: #34d399;">${raw.hours.toFixed(2)}h</span>
                        </div>
                    </div>
                `;
            }
        },
        grid: {
            left: "5%",
            right: "8%",
            bottom: "8%",
            top: "15%",
            containLabel: true
        },
        xAxis: {
            type: "value",
            name: "Heures Cumulées",
            nameLocation: "middle",
            nameGap: 35,
            nameTextStyle: {
                color: "#64748b",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1px"
            },
            splitLine: {
                lineStyle: {
                    type: "dashed",
                    color: "rgba(226, 232, 240, 0.6)"
                }
            },
            axisLabel: { color: "#64748b", fontSize: 11 }
        },
        yAxis: {
            type: "category",
            data: data.map(d => d.position),
            inverse: true,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                fontWeight: 600,
                color: "#1e293b",
                fontSize: 12,
                margin: 20
            }
        },
        series: [
            {
                name: "Début cumulé",
                type: "bar",
                stack: "Total",
                itemStyle: {
                    borderRadius: [10, 0, 0, 10],
                    color: {
                        type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                        colorStops: [
                            { offset: 0, color: 'rgba(37, 99, 235, 0.30)' },
                            { offset: 1, color: 'rgba(96, 165, 250, 0.30)' }
                        ]
                    }
                },
                emphasis: {
                    itemStyle: {
                        borderRadius: [10, 0, 0, 10],
                        color: {
                            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                            colorStops: [
                                { offset: 0, color: 'rgba(37, 99, 235, 0.35)' },
                                { offset: 1, color: 'rgba(96, 165, 250, 0.35)' }
                            ]
                        }
                    }
                },
                data: data.map(d => parseFloat(d.start))
            },
            {
                name: "Durée",
                type: "bar",
                stack: "Total",
                barWidth: 24,
                barGap: "-100%",
                label: {
                    show: true,
                    position: "right",
                    formatter: (params) => {
                        return `{val|${data[params.dataIndex].end}}`;
                    },
                    rich: {
                        val: {
                            fontWeight: 800,
                            color: "#1e293b",
                            fontSize: 12,
                            padding: [0, 0, 0, 8]
                        }
                    }
                },
                itemStyle: {
                    borderRadius: [0, 10, 10, 0],
                    color: (params) => {
                        const isTotal = data[params.dataIndex].is_total;
                        if (isTotal) {
                            return {
                                type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                                colorStops: [
                                    { offset: 0, color: '#1e293b' },
                                    { offset: 1, color: '#334155' }
                                ]
                            };
                        }
                        return {
                            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                            colorStops: [
                                { offset: 0, color: '#2563eb' },
                                { offset: 1, color: '#60a5fa' }
                            ]
                        };
                    },
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.05)',
                    shadowOffsetX: 4
                },
                data: data.map(d => d.hours)
            }
        ]
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-6xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">Graphe de Répartition</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 p-8 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-12 h-12 text-[#005EA8] animate-spin" />
                        </div>
                    ) : data.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                            Aucune donnée pour le graphe.
                        </div>
                    ) : (
                        <ReactECharts
                            option={option}
                            style={{ height: "100%", width: "100%" }}
                        />
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-all shadow-sm shadow-slate-200/50"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
