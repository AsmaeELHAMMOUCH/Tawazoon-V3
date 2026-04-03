import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchChronogrammePositions } from "../api/chronogramme";
import EsignLayout from "../components/EsignLayout";
import { ArrowLeft, BarChart3, User, Download } from "lucide-react";
import { toPng } from "html-to-image";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from "recharts";

export default function ChronogrammeGraphPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const chartRef = useRef(null);

  const handleDownload = async () => {
    if (chartRef.current === null) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: "#ffffff", cacheBust: true });
      const link = document.createElement("a");
      link.download = "chronogramme-repartition-cumulative.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const payload = await fetchChronogrammePositions();
        setRows(payload.rows || []);
        setTotal(payload.total || null);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const chartData = useMemo(() => {
    if (rows.length === 0) return [];
    let aggregate = 0;
    const result = rows.map((row) => {
      const value = Number.parseFloat(row.hours) || 0;
      const start = aggregate;
      aggregate += value;
      return {
        name: row.position,
        prevSum: start,
        value,
        x_end: (start + value).toFixed(2),
      };
    });

    const totalHours = Number.parseFloat(total?.hours) || aggregate;
    if (!Number.isNaN(totalHours)) {
      result.push({
        name: "Total Général",
        prevSum: 0,
        value: totalHours,
        x_end: totalHours.toFixed(2),
        isTotal: true,
      });
    }

    return result;
  }, [rows, total]);

  return (
    <EsignLayout activeKey="Chronogramme par Position">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Premium Header */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-20 -mt-20 opacity-70" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center flex-col md:flex-row gap-3 text-center md:text-left">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 relative">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest mb-1 border border-blue-100">
                  Processus Actuel
                </div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-3">
                  Répartition Cumulative du Temps
                </h1>
                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                  Visualisation graphique de l'agrégation des temps par métier.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-500/20 border border-emerald-500 hover:border-emerald-600 active:scale-95"
              >
                <Download size={16} />
                <span>Télécharger Graphe</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/app/actuel/chronogramme/positions")}
                className="group flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm hover:shadow-md hover:-translate-x-1"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>Retour aux positions</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modern Graph Container */}
        <div ref={chartRef} className="bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col h-[calc(100vh-220px)] overflow-visible ring-1 ring-blue-500/10 relative animate-in slide-in-from-bottom-8 fade-in duration-700 ease-out fill-mode-backwards">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 z-30 rounded-t-2xl" />

          <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                <BarChart3 size={14} />
              </div>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Analyse Cumulative</h3>
            </div>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wide rounded border border-blue-100 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              Vue Interactive
            </span>
          </div>

          <div className="flex-1 p-6 relative bg-white">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-8 h-8 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Initialisation du graphe...</p>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 opacity-60">
                <BarChart3 size={40} className="text-slate-200" />
                <p className="text-xs font-medium">Pas de données disponibles pour cette vue.</p>
              </div>
            ) : (
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 20, right: 80, left: 120, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#60a5fa" />
                      </linearGradient>
                      <linearGradient id="barOffsetGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#bfdbfe" />
                        <stop offset="100%" stopColor="#e0ecff" />
                      </linearGradient>
                      <linearGradient id="totalGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1e293b" />
                        <stop offset="100%" stopColor="#475569" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      unit="h"
                      tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={180}
                      tick={{ fontSize: 10, fill: "#1e293b", fontWeight: 600 }}
                      interval={0}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[1]?.payload || payload[0]?.payload;
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-2xl min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
                              <div className="font-black text-white text-xs mb-2 border-b border-white/10 pb-2 uppercase tracking-wider">{data.name}</div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center gap-4">
                                  <span className="text-white/50 text-[10px] font-bold uppercase">Début</span>
                                  <span className="text-white font-mono text-xs">{data.prevSum.toFixed(2)}h</span>
                                </div>
                                <div className="flex justify-between items-center gap-4">
                                  <span className="text-white/50 text-[10px] font-bold uppercase">Fin</span>
                                  <span className="text-blue-400 font-mono text-xs font-bold">{data.x_end}h</span>
                                </div>
                                <div className="pt-2 mt-1 border-t border-white/10 flex justify-between items-center gap-4">
                                  <span className="text-white/50 text-[10px] font-bold uppercase">Durée</span>
                                  <span className="text-emerald-400 font-mono text-xs font-black">{data.value.toFixed(2)}h</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                      cursor={{ fill: "rgba(226, 232, 240, 0.4)" }}
                    />
                    {/* Partie cumulée teintée pour conserver le positionnement logique */}
                    <Bar dataKey="prevSum" stackId="a" fill="url(#barOffsetGradient)" barSize={22} radius={[6, 0, 0, 6]} />
                    <Bar dataKey="value" stackId="a" barSize={22}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={entry.isTotal ? "url(#totalGradient)" : "url(#barGradient)"}
                          radius={entry.isTotal ? [6, 6, 6, 6] : [0, 6, 6, 0]}
                        />
                      ))}
                      <LabelList
                        dataKey="x_end"
                        position="right"
                        offset={12}
                        content={(props) => {
                          const { x, y, width, height, value } = props;
                          return (
                            <text x={x + width + 8} y={y + height / 2} dy={4} fill="#1e293b" fontSize={10} fontWeight={800} fontFamily="'Inter', sans-serif">
                              {value}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 px-5 py-2.5 text-[10px] text-slate-500 font-medium flex justify-between items-center rounded-b-2xl">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />{rows.length} Positions analysées</span>
            </div>
            {error ? (
              <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-100 uppercase tracking-tighter">{error}</span>
            ) : (
              <span className="opacity-40 font-bold tracking-[0.2em]">© 2025 ALMAV GROUP</span>
            )}
          </div>
        </div>
      </div>
    </EsignLayout>
  );
}
