// ModalDonut.jsx
import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

const n = (v) => (isNaN(v) || v == null ? 0 : Number(v));

export default function ModalDonut({ open, onClose, consolideRows }) {
  if (!open) return null;

  const option = useMemo(() => ({
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { type: "scroll", top: 0 },
    series: [
      {
        name: "ETP total",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: true,
        label: { show: true, formatter: "{b}\n{d}%" },
        data: (consolideRows || []).map((r) => ({
          name: r.label,
          value: n(r.etp_total),
        })),
      },
    ],
  }), [consolideRows]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-[800px] max-w-[95vw] h-[600px] flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-[15px] font-semibold text-slate-800">
            Répartition ETP total par poste (Consolidé)
          </h3>
          <button
            onClick={onClose}
            className="px-3 py-1 text-[13px] text-slate-600 hover:text-[#005EA8]"
          >
            ✕ Fermer
          </button>
        </header>

        {/* Graph */}
        <div className="flex-1 p-4">
          <ReactECharts option={option} theme="brand" style={{ height: "100%" }} />
        </div>
      </div>
    </div>
  );
}
