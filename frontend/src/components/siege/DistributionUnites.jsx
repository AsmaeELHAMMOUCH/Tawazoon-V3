"use client";
import React from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

/**
 * Section des 2 grosses cartes:
 * - Distribution des Unités
 * - Top unités en terme d'effectifs
 *
 * Props attendues (venant de VueSiege):
 * - Card, cx, fmt
 * - statsParCategorie, totalUnitesStats
 * - top10Fte
 * - getTopPostesForUnite
 */
export default function DistributionUnites({
  Card,
  cx,
  fmt,
  statsParCategorie = [],
  totalUnitesStats = 0,
  top10Fte = [],
  getTopPostesForUnite,
}) {
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Distribution des unités */}
      <Card
        className="col-span-12 xl:col-span-6"
        title="Distribution des Unités Siège"
        subtitle="Répartition de la structure siège"
      >
        <div className="grid grid-cols-12 gap-4 items-start">
          {/* Pie */}
          <div className="col-span-12 md:col-span-5 xl:col-span-4 flex justify-center md:justify-start">
            <div className="relative w-full max-w-[210px] aspect-square">
              <ReactECharts
                option={{
                  tooltip: {
                    trigger: "item",
                    formatter: "{b}: {c} ({d}%)",
                  },
                  series: [
                    {
                      type: "pie",
                      radius: ["62%", "88%"],
                      center: ["50%", "50%"],
                      label: { show: false },
                      labelLine: { show: false },
                      itemStyle: {
                        borderColor: "rgba(255,255,255,0.98)",
                        borderWidth: 3,
                        shadowBlur: 10,
                        shadowColor: "rgba(2, 6, 23, 0.12)",
                      },
                      data: statsParCategorie.map((s, i) => {
                        const palettes = [
                          { from: "#005EA8", to: "#3B82F6" },
                          { from: "#06B6D4", to: "#0EA5E9" },
                          { from: "#10B981", to: "#22C55E" },
                          { from: "#6B7280", to: "#9CA3AF" },
                          { from: "#94A3B8", to: "#CBD5E1" },
                        ];
                        const p = palettes[i % palettes.length];
                        return {
                          value: s.valeur,
                          name: s.label,
                          itemStyle: {
                            color: new echarts.graphic.LinearGradient(
                              0,
                              0,
                              1,
                              1,
                              [
                                { offset: 0, color: p.from },
                                { offset: 1, color: p.to },
                              ]
                            ),
                          },
                        };
                      }),
                    },
                  ],
                }}
                className="!w-full !h-full"
              />

              {/* Centre */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-[20px] font-extrabold text-slate-900">
                    {fmt(totalUnitesStats)}
                  </div>
                  <div className="text-[11px] text-slate-500">unités</div>
                </div>
              </div>
            </div>
          </div>

          {/* Légendes + barres */}
          <div className="col-span-12 md:col-span-7 xl:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {statsParCategorie.map((stat, index) => {
                const pct = totalUnitesStats
                  ? (stat.valeur / totalUnitesStats) * 100
                  : 0;

                const barColor = [
                  "bg-blue-600",
                  "bg-cyan-600",
                  "bg-emerald-600",
                  "bg-slate-400",
                ][index % 4];

                return (
                  <div
                    key={index}
                    className="relative rounded-2xl p-3 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all"
                  >
                    <div
                      className={cx(
                        "absolute left-0 top-3 bottom-3 w-1.5 rounded-full",
                        barColor
                      )}
                    />
                    <div className="pl-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 text-[13px] sm:text-[14px]">
                          {stat.label}
                        </div>
                        <div className="text-[12px] font-extrabold text-slate-700">
                          {stat.valeur}{" "}
                          <span className="text-slate-400 font-semibold">
                            ({pct.toFixed(0)}%)
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={cx("h-full rounded-full", barColor)}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        Part dans la structure siège
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Top unités */}
      <Card
        className="col-span-12 xl:col-span-6"
        title="Top unités en terme d'effectifs"
        subtitle="Où sont concentrés les effectifs du siège ?"
      >
        <ReactECharts
          option={{
            grid: {
              left: 8,
              right: 16,
              top: 6,
              bottom: 6,
              containLabel: true,
            },
            tooltip: {
              trigger: "axis",
              axisPointer: { type: "shadow" },
              formatter: (params) => {
                const p = params?.[0];
                if (!p) return "";
                const tops = getTopPostesForUnite
                  ? getTopPostesForUnite(p.name)
                  : [];
                const postesHtml = tops.length
                  ? tops
                      .map(
                        (t) => `• ${t.label}: <b>${fmt(t.eff)}</b>`
                      )
                      .join("<br/>")
                  : "<i>Aucun détail poste</i>";
                return `
                  <div style="font-weight:800;margin-bottom:6px">${p.name}</div>
                  <div>ETP actuel: <b>${fmt(p.value)}</b></div>
                  <div style="margin-top:6px;font-weight:700">Postes principaux :</div>
                  <div style="margin-top:2px">${postesHtml}</div>
                `;
              },
            },
            xAxis: {
              type: "value",
              axisLabel: { fontSize: 10, color: "#64748B" },
              axisLine: { lineStyle: { color: "#E2E8F0" } },
              axisTick: { show: false },
              splitLine: {
                lineStyle: { color: "rgba(148,163,184,0.25)" },
              },
            },
            yAxis: {
              type: "category",
              data: top10Fte.map((r) => r.label),
              axisLabel: {
                fontSize: 10,
                color: "#0F172A",
                width: 240,
                overflow: "truncate",
                ellipsis: "...",
              },
              axisTick: { show: false },
              axisLine: { show: false },
            },
            series: [
              {
                type: "bar",
                data: top10Fte.map((r) => r.fte_safe),
                barWidth: 9,
                barCategoryGap: "18%",
                itemStyle: {
                  borderRadius: 999,
                  color: new echarts.graphic.LinearGradient(
                    0,
                    0,
                    1,
                    0,
                    [
                      { offset: 0, color: "rgba(2,132,199,0.10)" },
                      { offset: 1, color: "rgba(79,70,229,0.70)" },
                    ]
                  ),
                },
                label: {
                  show: true,
                  position: "right",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#0F172A",
                  formatter: (p) => fmt(p.value),
                },
              },
            ],
          }}
          style={{ height: 240, width: "100%" }}
        />
      </Card>
    </div>
  );
}
