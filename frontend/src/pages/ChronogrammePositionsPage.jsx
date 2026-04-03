import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchChronogrammePositions } from "../api/chronogramme";
import EsignLayout from "../components/EsignLayout";
import {
  ArrowLeft,
  BarChart3,
  User,
  Clock,
  List
} from "lucide-react";

export default function ChronogrammePositionsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
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

  useEffect(() => {
    loadData();
  }, []);

  return (
    <EsignLayout activeKey="Chronogramme par Position">
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
                </h1>
                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                  Agrégation des temps par métier - Processus Actuel.
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
                onClick={() => navigate("/app/actuel/chronogramme/taches")}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                <ArrowLeft size={14} />
                Retour aux tâches
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/app/actuel/chronogramme/positions/graphe")}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#005EA8] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition-all shadow-blue-500/20 border border-transparent"
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
                        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-[10px] font-medium">Chargement des données...</p>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3 opacity-60">
                        <List size={48} className="text-slate-300" />
                        <p>Aucune donnée trouvée.</p>
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
            {error && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600 border border-red-100 animate-in fade-in slide-in-from-bottom-1">
                {error}
              </span>
            )}
          </div>
        </div>
      </div>
    </EsignLayout>
  );
}
