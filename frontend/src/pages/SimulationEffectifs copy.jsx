"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Info,
  BarChart3,
  Table,
  Play,
  MapPin,
  Tag,
  Building,
  User,
  Archive,
  Package,
  Mail,
  Gauge,
  Clock,
  FileDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";
import HelpPopover from "@/components/HelpPopover";
import { motion } from "framer-motion";
import DataTable from "@/components/DataTable";
import { createColumnHelper } from "@tanstack/react-table";
import FluxNavbar from "@/components/FluxNavbar";
import ReactECharts from "echarts-for-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/* ---------------- UI PRIMITIVES ---------------- */
function Card({ title, actions, children }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {(title || actions) && (
        <header className="h-12 px-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

function KpiGlass({ title, icon: Icon, children }) {
  return (
    <div className="relative rounded-2xl p-4 border border-white/40 bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-xl shadow-lg ring-1 ring-slate-900/5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-[#00A0E0]" />}
      </div>
      {children}
      <div className="absolute inset-0 rounded-2xl pointer-events-none [mask-image:radial-gradient(circle_at_20%_0%,rgba(255,255,255,.6),transparent_60%)]" />
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-slate-600 tracking-wide flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#005EA8]" />} {label}
      </span>
      {children}
    </label>
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className="h-8 rounded-md border border-slate-300 px-2 text-[12.5px] outline-none bg-white
                 focus:ring-2 focus:ring-[#005EA8] focus:border-[#005EA8]"
    />
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="h-8 rounded-md border border-slate-300 px-2 text-[12.5px] outline-none bg-white disabled:bg-slate-50
                 focus:ring-2 focus:ring-[#005EA8] focus:border-[#005EA8]"
    />
  );
}

function Segmented({ value, onChange, items }) {
  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            aria-selected={active}
            onClick={() => onChange?.(it.value)}
            className={
              "h-9 px-3 rounded-md text-[13px] transition focus:outline-none " +
              (active
                ? "bg-[#005EA8] text-white shadow-sm"
                : "text-[#005EA8] hover:bg-white")
            }
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- KPI COMPONENTS ---------------- */
function KpiStat({
  title,
  value,
  subtitle,
  delta,
  positive = true,
  icon: Icon,
}) {
  return (
    <div
      className="relative rounded-2xl p-4 bg-white/60 backdrop-blur-xl
                    border border-white/40 shadow-lg ring-1 ring-slate-900/5
                    before:absolute before:inset-0 before:rounded-2xl
                    before:[background:linear-gradient(135deg,rgba(0,94,168,.15),rgba(0,160,224,.10))]
                    before:pointer-events-none"
    >
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-sky-500" />}
      </div>
      <div className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
      )}
      {typeof delta !== "undefined" && (
        <div
          className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
                        \${positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
        >
          <span className={`mr-1 ${positive ? "rotate-0" : "rotate-180"}`}>
            ▲
          </span>
          {delta}
        </div>
      )}
    </div>
  );
}

function KpiGauge({ title, percent, icon: Icon }) {
  const p = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className="rounded-2xl p-4 bg-white/70 backdrop-blur-xl shadow-lg ring-1 ring-slate-900/5 border border-white/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-sky-500" />}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(#00A0E0 ${p * 3.6}deg, #E6F4FA 0deg)`,
            }}
          />
          <div className="absolute inset-2 rounded-full bg-white grid place-items-center text-lg font-bold text-sky-600">
            {p}%
          </div>
        </div>
        <div className="text-sm text-slate-600">
          <div>
            Objectif: <span className="font-medium">100%</span>
          </div>
          <div>
            Reste: <span className="font-medium">{100 - p}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiSpark({ title, value, data = [], icon: Icon }) {
  const option = {
    tooltip: { trigger: "axis", axisPointer: { type: "line" }, confine: true },
    grid: { left: 0, right: 0, top: 10, bottom: 0 },
    xAxis: { type: "category", show: false, data: data.map((_, i) => i) },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "line",
        data,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: "#00A0E0" },
        areaStyle: { color: "rgba(0,160,224,.15)" },
      },
    ],
  };
  return (
    <div className="rounded-2xl p-4 bg-white/70 backdrop-blur-xl shadow-lg ring-1 ring-slate-900/5 border border-white/40">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-sky-500" />}
      </div>
      <div className="text-3xl font-extrabold text-slate-900">{value}</div>
      <div className="h-16 mt-2">
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}

/* ---------------- PDF Helpers ---------------- */
const pxToMm = (px) => (px * 25.4) / 96;
const addCanvasAsPages = (pdf, canvas, marginMm = 10) => {
  const pageWidth = 210,
    pageHeight = 297; // A4 mm
  const maxWidth = pageWidth - marginMm * 2;
  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;
  const imgWidthMm = pxToMm(imgWidthPx);
  const imgHeightMm = pxToMm(imgHeightPx);
  const scale = maxWidth / imgWidthMm;
  const scaledWidthMm = imgWidthMm * scale;
  const scaledHeightMm = imgHeightMm * scale;
  const pageInnerHeightMm = pageHeight - marginMm * 2;
  const sliceHeightPx = Math.floor((pageInnerHeightMm / scale) * (96 / 25.4));
  const tmp = document.createElement("canvas");
  const ctx = tmp.getContext("2d");
  let offsetPx = 0;
  let first = true;
  while (offsetPx < imgHeightPx) {
    const h = Math.min(sliceHeightPx, imgHeightPx - offsetPx);
    tmp.width = imgWidthPx;
    tmp.height = h;
    ctx.clearRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, offsetPx, imgWidthPx, h, 0, 0, imgWidthPx, h);
    const imgData = tmp.toDataURL("image/png");
    if (!first) pdf.addPage();
    first = false;
    pdf.addImage(
      imgData,
      "PNG",
      marginMm,
      marginMm,
      scaledWidthMm,
      (h / imgHeightPx) * scaledHeightMm
    );
    offsetPx += h;
  }
};

/* ---------------- COMPOSANTS DE VUE ---------------- */
// Composant VueNationale
const VueNationale = ({
  sacs,
  setSacs,
  colis,
  setColis,
  courrier,
  setCourrier,
  productivite,
  setProductivite,
  heuresNet,
  setHeuresNet,
  scelle,
  setScelle,
}) => {
  const regionsData = [
    {
      nom: "Casablanca",
      centres: 12,
      etpActuel: 120,
      etpCalcule: 130,
      etpRecommande: 140,
      tauxOccupation: 85,
      lat: 33.5731,
      lng: -7.5898,
    },
    {
      nom: "Rabat",
      centres: 8,
      etpActuel: 90,
      etpCalcule: 95,
      etpRecommande: 100,
      tauxOccupation: 90,
      lat: 34.0209,
      lng: -6.8416,
    },
    {
      nom: "Marrakech",
      centres: 6,
      etpActuel: 80,
      etpCalcule: 82,
      etpRecommande: 85,
      tauxOccupation: 88,
      lat: 31.6295,
      lng: -7.9811,
    },
    {
      nom: "Fès",
      centres: 7,
      etpActuel: 70,
      etpCalcule: 75,
      etpRecommande: 80,
      tauxOccupation: 82,
      lat: 34.0632,
      lng: -4.9989,
    },
    {
      nom: "Tanger",
      centres: 5,
      etpActuel: 60,
      etpCalcule: 65,
      etpRecommande: 70,
      tauxOccupation: 80,
      lat: 35.7673,
      lng: -5.7998,
    },
    {
      nom: "Agadir",
      centres: 4,
      etpActuel: 50,
      etpCalcule: 55,
      etpRecommande: 60,
      tauxOccupation: 92,
      lat: 30.4278,
      lng: -9.5981,
    },
    {
      nom: "Meknès",
      centres: 5,
      etpActuel: 45,
      etpCalcule: 50,
      etpRecommande: 55,
      tauxOccupation: 78,
      lat: 33.8935,
      lng: -5.5473,
    },
    {
      nom: "Oujda",
      centres: 3,
      etpActuel: 30,
      etpCalcule: 35,
      etpRecommande: 40,
      tauxOccupation: 70,
      lat: 34.6831,
      lng: -1.9093,
    },
    {
      nom: "Settat",
      centres: 4,
      etpActuel: 40,
      etpCalcule: 42,
      etpRecommande: 45,
      tauxOccupation: 85,
      lat: 34.261,
      lng: -6.5802,
    },
    {
      nom: "Laâyoune",
      centres: 2,
      etpActuel: 20,
      etpCalcule: 22,
      etpRecommande: 25,
      tauxOccupation: 75,
      lat: 27.1567,
      lng: -13.2021,
    },
  ];

  const kpisNationaux = {
    etpActuelTotal: regionsData.reduce((s, r) => s + r.etpActuel, 0),
    etpRecommandeTotal: regionsData.reduce((s, r) => s + r.etpRecommande, 0),
    surplusDeficit: regionsData.reduce(
      (s, r) => s + (r.etpRecommande - r.etpActuel),
      0
    ),
    tauxProductiviteMoyen: 88,
    volumes: { sacs: 15000, colis: 8000, courrier: 50000 },
  };

  const getColor = (d) =>
    d > 90
      ? "#800026"
      : d > 80
      ? "#BD0026"
      : d > 70
      ? "#E31A1C"
      : d > 60
      ? "#FC4E2A"
      : d > 50
      ? "#FD8D3C"
      : d > 40
      ? "#FEB24C"
      : d > 30
      ? "#FED976"
      : "#FFEDA0";

  const barOptions = {
    title: { text: "Comparaison ETP Actuel vs Recommandé", left: "center" },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: ["ETP Actuel", "ETP Recommandé"], top: 20 },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: { type: "category", data: regionsData.map((r) => r.nom) },
    yAxis: { type: "value" },
    series: [
      {
        name: "ETP Actuel",
        type: "bar",
        data: regionsData.map((r) => r.etpActuel),
        itemStyle: { color: "#005EA8" },
      },
      {
        name: "ETP Recommandé",
        type: "bar",
        data: regionsData.map((r) => r.etpRecommande),
        itemStyle: { color: "#00A0E0" },
      },
    ],
  };

  const lineOptions = {
    title: { text: "Évolution du Taux d'Occupation (%)", left: "center" },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: regionsData.map((r) => r.nom) },
    yAxis: { type: "value", min: 0, max: 100 },
    series: [
      {
        name: "Taux d'Occupation",
        type: "line",
        data: regionsData.map((r) => r.tauxOccupation),
        itemStyle: { color: "#00A0E0" },
        areaStyle: { color: "rgba(0,160,224,0.2)" },
        smooth: true,
      },
    ],
  };

  const pieOptions = {
    title: { text: "Répartition des Effectifs par Région", left: "center" },
    tooltip: { trigger: "item" },
    legend: { orient: "vertical", left: "left" },
    series: [
      {
        name: "Effectifs",
        type: "pie",
        radius: "50%",
        data: regionsData.map((r) => ({ value: r.etpActuel, name: r.nom })),
        itemStyle: {
          color: (p) => {
            const colors = [
              "#005EA8",
              "#00A0E0",
              "#4682B4",
              "#5F9EA0",
              "#B0C4DE",
              "#ADD8E6",
              "#87CEEB",
              "#87CEFA",
              "#1E90FF",
              "#6495ED",
            ];
            return colors[p.dataIndex % colors.length];
          },
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Paramètres de simulation (NATIONAL) */}
      <Card
        title="Paramètres de simulation"
        actions={
          <button
            onClick={() =>
              alert(
                "Simulation nationale : à brancher sur l'API (ou logique front)."
              )
            }
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#005EA8] text-white text-[13px] font-medium
                       hover:bg-[#004b87] transition focus:outline-none focus:ring-2 focus:ring-[#005EA8]/60"
          >
            <Play className="w-3.5 h-3.5" />
            Lancer Simulation
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Field label="Sacs / Jour" icon={Archive}>
            <Input
              type="number"
              value={sacs}
              onChange={(e) => setSacs(Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Colis / Jour" icon={Package}>
            <Input
              type="number"
              value={colis}
              onChange={(e) => setColis(Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Courrier / Jour" icon={Mail}>
            <Input
              type="number"
              value={courrier}
              onChange={(e) => setCourrier(Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Productivité (%)" icon={Gauge}>
            <Input
              type="number"
              value={productivite}
              onChange={(e) => setProductivite(Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Heures net / Jour" icon={Clock}>
            <Input
              type="number"
              value={heuresNet}
              onChange={(e) => setHeuresNet(Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Scellés / Jour" icon={Tag}>
            <Input
              type="number"
              value={scelle}
              onChange={(e) => setScelle(Number(e.target.value || 0))}
            />
          </Field>
        </div>
      </Card>

      {/* Titre */}
      <h2 className="text-2xl font-bold text-slate-800">
        Vue Globale Nationale
      </h2>

      {/* KPIs Nationaux */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStat
          title="Total ETP National"
          value={kpisNationaux.etpActuelTotal}
          subtitle={
            <span className="text-slate-600">
              Recommandé&nbsp;:{" "}
              <span className="text-sky-600 font-semibold">
                {kpisNationaux.etpRecommandeTotal}
              </span>
            </span>
          }
          delta={`${kpisNationaux.surplusDeficit >= 0 ? "+" : ""}${
            kpisNationaux.surplusDeficit
          } (surplus)`}
          positive={kpisNationaux.surplusDeficit >= 0}
          icon={User}
        />
        <KpiGauge
          title="Taux de Productivité"
          percent={kpisNationaux.tauxProductiviteMoyen}
          icon={Gauge}
        />
        <KpiSpark
          title="Volumes (Sacs)"
          value={kpisNationaux.volumes.sacs}
          data={[13500, 14200, 15000, 14800, 15100, 15000]}
          icon={Archive}
        />
      </div>

      {/* Tableau récapitulatif */}
      <Card title="Récapitulatif par Région">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-2 text-left">Région</th>
                <th className="px-4 py-2 text-right">Centres</th>
                <th className="px-4 py-2 text-right">ETP Actuel</th>
                <th className="px-4 py-2 text-right">ETP Calculé</th>
                <th className="px-4 py-2 text-right">ETP Recommandé</th>
                <th className="px-4 py-2 text-right">Écart</th>
                <th className="px-4 py-2 text-right">Taux Occupation</th>
              </tr>
            </thead>
            <tbody>
              {regionsData.map((r, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="px-4 py-2 font-medium">{r.nom}</td>
                  <td className="px-4 py-2 text-right">{r.centres}</td>
                  <td className="px-4 py-2 text-right">{r.etpActuel}</td>
                  <td className="px-4 py-2 text-right">{r.etpCalcule}</td>
                  <td className="px-4 py-2 text-right">{r.etpRecommande}</td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={
                        r.etpRecommande - r.etpActuel >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {r.etpRecommande - r.etpActuel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{r.tauxOccupation}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-medium">
              <tr>
                <td className="px-4 py-2 text-right" colSpan="2">
                  Total
                </td>
                <td className="px-4 py-2 text-right">
                  {kpisNationaux.etpActuelTotal}
                </td>
                <td className="px-4 py-2 text-right">-</td>
                <td className="px-4 py-2 text-right">
                  {kpisNationaux.etpRecommandeTotal}
                </td>
                <td className="px-4 py-2 text-right">
                  {kpisNationaux.surplusDeficit}
                </td>
                <td className="px-4 py-2 text-right">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Graphiques ECharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Comparaison ETP Actuel vs Recommandé">
          <div className="h-80">
            <ReactECharts
              option={barOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>
        <Card title="Évolution du Taux d'Occupation">
          <div className="h-80">
            <ReactECharts
              option={lineOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>
      </div>

      {/* Carte & camembert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Distribution des Effectifs">
          <div className="h-80">
            <MapContainer
              center={[31.7917, -7.0926]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {regionsData.map((r, i) => (
                <CircleMarker
                  key={i}
                  center={[r.lat, r.lng]}
                  radius={Math.sqrt(r.etpActuel) * 0.8}
                  pathOptions={{
                    color: getColor(r.tauxOccupation),
                    fillOpacity: 0.7,
                  }}
                >
                  <Popup>
                    <div>
                      <p className="font-bold">{r.nom}</p>
                      <p>ETP Actuel: {r.etpActuel}</p>
                      <p>Taux d'occupation: {r.tauxOccupation}%</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </Card>
        <Card title="Répartition des Effectifs">
          <div className="h-80">
            <ReactECharts
              option={pieOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

// Composant ComparatifRegional
const ComparatifRegional = () => {
  const regionsData = [
    {
      nom: "Casablanca",
      centres: 12,
      etpActuel: 120,
      etpCalcule: 130,
      etpRecommande: 140,
      tauxOccupation: 85,
    },
    {
      nom: "Rabat",
      centres: 8,
      etpActuel: 90,
      etpCalcule: 95,
      etpRecommande: 100,
      tauxOccupation: 90,
    },
    {
      nom: "Marrakech",
      centres: 6,
      etpActuel: 80,
      etpCalcule: 82,
      etpRecommande: 85,
      tauxOccupation: 88,
    },
    {
      nom: "Fès",
      centres: 7,
      etpActuel: 70,
      etpCalcule: 75,
      etpRecommande: 80,
      tauxOccupation: 82,
    },
    {
      nom: "Tanger",
      centres: 5,
      etpActuel: 60,
      etpCalcule: 65,
      etpRecommande: 70,
      tauxOccupation: 80,
    },
    {
      nom: "Agadir",
      centres: 4,
      etpActuel: 50,
      etpCalcule: 55,
      etpRecommande: 60,
      tauxOccupation: 92,
    },
    {
      nom: "Meknès",
      centres: 5,
      etpActuel: 45,
      etpCalcule: 50,
      etpRecommande: 55,
      tauxOccupation: 78,
    },
    {
      nom: "Oujda",
      centres: 3,
      etpActuel: 30,
      etpCalcule: 35,
      etpRecommande: 40,
      tauxOccupation: 70,
    },
    {
      nom: "Laâyoune",
      centres: 4,
      etpActuel: 40,
      etpCalcule: 42,
      etpRecommande: 45,
      tauxOccupation: 85,
    },
    {
      nom: "Settat",
      centres: 3,
      etpActuel: 35,
      etpCalcule: 38,
      etpRecommande: 40,
      tauxOccupation: 80,
    },
  ];

  const kpiData = {
    totalETP: regionsData.reduce((sum, r) => sum + r.etpActuel, 0),
    totalRecommande: regionsData.reduce((sum, r) => sum + r.etpRecommande, 0),
    ecartTotal: regionsData.reduce(
      (sum, r) => sum + (r.etpRecommande - r.etpActuel),
      0
    ),
    tauxMoyen: (
      regionsData.reduce((sum, r) => sum + r.tauxOccupation, 0) /
      regionsData.length
    ).toFixed(1),
  };

  const getColor = (density) => {
    return density > 90
      ? "#800026"
      : density > 80
      ? "#BD0026"
      : density > 70
      ? "#E31A1C"
      : density > 60
      ? "#FC4E2A"
      : density > 50
      ? "#FD8D3C"
      : density > 40
      ? "#FEB24C"
      : density > 30
      ? "#FED976"
      : "#FFEDA0";
  };

  const barOptions = {
    title: { text: "Comparaison des ETP par Région", left: "center" },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: ["ETP Actuel", "ETP Recommandé"], top: 20 },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: { type: "category", data: regionsData.map((r) => r.nom) },
    yAxis: { type: "value" },
    series: [
      {
        name: "ETP Actuel",
        type: "bar",
        data: regionsData.map((r) => r.etpActuel),
        itemStyle: { color: "#005EA8" },
      },
      {
        name: "ETP Recommandé",
        type: "bar",
        data: regionsData.map((r) => r.etpRecommande),
        itemStyle: { color: "#00A0E0" },
      },
    ],
  };

  const lineOptions = {
    title: { text: "Taux d'Occupation par Région", left: "center" },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: regionsData.map((r) => r.nom) },
    yAxis: { type: "value", min: 0, max: 100 },
    series: [
      {
        name: "Taux d'Occupation",
        type: "line",
        data: regionsData.map((r) => r.tauxOccupation),
        itemStyle: { color: "#00A0E0" },
        areaStyle: { color: "rgba(0, 160, 224, 0.2)" },
        smooth: true,
      },
    ],
  };

  const pieOptions = {
    title: { text: "Répartition des ETP par Région", left: "center" },
    tooltip: { trigger: "item" },
    legend: { orient: "vertical", left: "left" },
    series: [
      {
        name: "Effectifs",
        type: "pie",
        radius: "50%",
        data: regionsData.map((r) => ({ value: r.etpActuel, name: r.nom })),
        itemStyle: {
          color: (params) => {
            const colors = [
              "#005EA8",
              "#00A0E0",
              "#4682B4",
              "#5F9EA0",
              "#B0C4DE",
              "#ADD8E6",
              "#87CEEB",
              "#87CEFA",
              "#1E90FF",
              "#6495ED",
            ];
            return colors[params.dataIndex % colors.length];
          },
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Titre */}
      <h2 className="text-2xl font-bold text-slate-800">Comparatif Régional</h2>
      <p className="text-sm text-slate-600">
        Tableaux et graphiques comparatifs des 10 régions
      </p>

      {/* KPIs Régionaux */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStat
          title="Total ETP Régional"
          value={kpiData.totalETP}
          subtitle={
            <span className="text-slate-600">
              Recommandé&nbsp;:{" "}
              <span className="text-sky-600 font-semibold">
                {kpiData.totalRecommande}
              </span>
            </span>
          }
          delta={`${kpiData.ecartTotal >= 0 ? "+" : ""}${
            kpiData.ecartTotal
          } (surplus)`}
          positive={kpiData.ecartTotal >= 0}
          icon={User}
        />
        <KpiGauge
          title="Taux d'Occupation Moyen"
          percent={kpiData.tauxMoyen}
          icon={Gauge}
        />
        <KpiSpark
          title="Évolution des ETP"
          value={kpiData.totalETP}
          data={[1200, 1250, 1300, 1350, 1400, 1450, 1500]}
          icon={BarChart3}
        />
      </div>

      {/* Tableau Comparatif */}
      <Card title="Tableau Comparatif des Régions">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-2 text-left">Région</th>
                <th className="px-4 py-2 text-right">Centres</th>
                <th className="px-4 py-2 text-right">ETP Actuel</th>
                <th className="px-4 py-2 text-right">ETP Calculé</th>
                <th className="px-4 py-2 text-right">ETP Recommandé</th>
                <th className="px-4 py-2 text-right">Écart</th>
                <th className="px-4 py-2 text-right">Taux Occupation</th>
              </tr>
            </thead>
            <tbody>
              {regionsData.map((region, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="px-4 py-2 font-medium">{region.nom}</td>
                  <td className="px-4 py-2 text-right">{region.centres}</td>
                  <td className="px-4 py-2 text-right">{region.etpActuel}</td>
                  <td className="px-4 py-2 text-right">{region.etpCalcule}</td>
                  <td className="px-4 py-2 text-right">
                    {region.etpRecommande}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={
                        region.etpRecommande - region.etpActuel >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {region.etpRecommande - region.etpActuel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {region.tauxOccupation}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-medium">
              <tr>
                <td className="px-4 py-2 text-right" colSpan="2">
                  Total
                </td>
                <td className="px-4 py-2 text-right">{kpiData.totalETP}</td>
                <td className="px-4 py-2 text-right">-</td>
                <td className="px-4 py-2 text-right">
                  {kpiData.totalRecommande}
                </td>
                <td className="px-4 py-2 text-right">{kpiData.ecartTotal}</td>
                <td className="px-4 py-2 text-right">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Comparaison des ETP par Région">
          <div className="h-80">
            <ReactECharts
              option={barOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>
        <Card title="Taux d'Occupation par Région">
          <div className="h-80">
            <ReactECharts
              option={lineOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>
      </div>

      {/* Graphique circulaire */}
      <Card title="Répartition des ETP par Région">
        <div className="h-80">
          <ReactECharts
            option={pieOptions}
            style={{ height: "100%", width: "100%" }}
          />
        </div>
      </Card>
    </div>
  );
};

/* ---------------- PAGE PRINCIPALE ---------------- */
/* ---------------- PAGE PRINCIPALE ---------------- */
export default function SimulationEffectifs() {
  const navigate = useNavigate();
  // UI state
  const [display, setDisplay] = useState("tableau");
  const [mode, setMode] = useState("actuel");
  const [activeFlux, setActiveFlux] = useState("national");
  // Filters
  const [region, setRegion] = useState("");
  const [categorie, setCategorie] = useState("Activité Postale");
  const [centre, setCentre] = useState("");
  const [poste, setPoste] = useState("Tous");
  // Inputs
  const [sacs, setSacs] = useState(30);
  const [colis, setColis] = useState(100);
  const [courrier, setCourrier] = useState(250);
   const [scelle, setScelle] = useState(0);
  const [productivite, setProductivite] = useState(100);
  const [heuresNet, setHeuresNet] = useState(8);
 
  const canSimulate = useMemo(() => true, []);
  
  // Lookups
  const [regions, setRegions] = useState([]);
  const [centres, setCentres] = useState([]);
  const [postesList, setPostesList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [centreCategorie, setCentreCategorie] = useState("");

  // Data
  const [referentiel, setReferentiel] = useState([]);

  const [resultats, setResultats] = useState([]);
  const [totaux, setTotaux] = useState(null);
  // Status
  const [loading, setLoading] = useState({
    regions: false,
    centres: false,
    postes: false,
    categories: false,
    referentiel: false,
    simulation: false,
  });
  const [err, setErr] = useState(null);
  // Refs
  const reportRef = useRef(null);

  /* ---------- Navigation Graphe ---------- */
  const goToGraphPage = () => {
    navigate("/app/graphe", {
      state: {
        data: {
          region:
            regions.find((r) => String(r.id) === String(region))?.label ||
            region,
          //categorie:
            //categoriesList.find((c) => String(c.id) === String(categorie))
              //?.label || categorie,
          centreId:
            centres.find((c) => String(c.id) === String(centre))?.label ||
            centre,
          poste:
            poste === "Tous"
              ? "Tous"
              : postesList.find((p) => String(p.id) === String(poste))?.label ||
                poste,
          sacs,
          colis,
          courrier,
          productivite,
          heuresNet,
        },
      },
    });
  };

  /* ---------- Export PDF ---------- */
  const exportRapportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const element = reportRef.current;
      element.style.position = "absolute";
      element.style.left = "0";
      element.style.top = "0";
      element.style.zIndex = "-1";

      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
        windowHeight: element.scrollHeight,
      });

      element.style.position = "fixed";
      element.style.left = "-9999px";
      element.style.zIndex = "auto";

      const pdf = new jsPDF("p", "mm", "a4");
      addCanvasAsPages(pdf, canvas, 10);
      pdf.save(
        `rapport_simulation_${new Date().toISOString().slice(0, 10)}.pdf`
      );

      alert("✅ Rapport PDF exporté avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      alert("❌ Erreur lors de l'export du PDF. Vérifiez la console.");
    }
  };

  /* ---------- Load lookups ---------- */
  /* ---------- Load lookups ---------- */
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      setLoading((l) => ({ ...l, regions: true, categories: true }));
      const [regs, cats] = await Promise.allSettled([
        api.regions(),
        api.categories(),
      ]);
      if (cancelled) return;
      
      // Charger les régions
      if (regs.status === "fulfilled" && Array.isArray(regs.value))
        setRegions(regs.value);
      
      // ✅ DÉCOMMENTER ET ACTIVER : Charger les catégories
      if (cats.status === "fulfilled" && Array.isArray(cats.value))
        setCategoriesList(cats.value);
      else if (cats.status === "fulfilled") 
        setCategoriesList([]);
        
    } catch (e) {
      if (!cancelled) setErr(e);
    } finally {
      if (!cancelled)
        setLoading((l) => ({ ...l, regions: false, categories: false }));
    }
  })();
  return () => {
    cancelled = true;
  };
}, []);

  /* ---------- Charger les centres quand région change ---------- */
  useEffect(() => {
    if (
      activeFlux === "regional" ||
      activeFlux === "centre" ||
      activeFlux === "poste"
    ) {
      if (!region) {
        setCentres([]);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          setLoading((l) => ({ ...l, centres: true }));
          const selectedRegion = regions.find(
            (r) => String(r.id) === String(region)
          );
          if (!selectedRegion) return;
          const data = await api.centres(selectedRegion.id);
          if (!cancelled) setCentres(Array.isArray(data) ? data : []);
        } catch (e) {
          if (!cancelled) setCentres([]);
        } finally {
          if (!cancelled) setLoading((l) => ({ ...l, centres: false }));
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [activeFlux, region, regions]);

  /* ---------- Charger les postes quand centre change ---------- */
  useEffect(() => {
    if (activeFlux === "centre" || activeFlux === "poste") {
      if (!centre) {
        setPostesList([]);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          setLoading((l) => ({ ...l, postes: true }));
          const data = await api.postes(centre);
          if (!cancelled) setPostesList(Array.isArray(data) ? data : []);
        } catch (e) {
          if (!cancelled) {
            setPostesList([]);
            setErr(e);
          }
        } finally {
          if (!cancelled) setLoading((l) => ({ ...l, postes: false }));
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [activeFlux, centre]);

/* ---------- Charger la catégorie du centre sélectionné ---------- */
useEffect(() => {
  // actif seulement pour centre/poste
  if (!(activeFlux === "centre" || activeFlux === "poste")) return;

  // pas de centre => reset
  if (!centre) {
    setCentreCategorie("");
    return;
  }

  // récupérer le centre choisi
  const selectedCentre = centres.find(
    (c) => String(c.id) === String(centre)
  );

  console.log("▶ selectedCentre =", selectedCentre);
  console.log("▶ categoriesList =", categoriesList);

  if (!selectedCentre) {
    setCentreCategorie("");
    return;
  }

  // 1. si le backend nous donne déjà le libellé de la catégorie -> on prend ça
  const directLabel =
    selectedCentre.categorie ||
    selectedCentre.category ||
    selectedCentre.categorie_label ||
    selectedCentre.category_label ||
    null;

  if (directLabel) {
    setCentreCategorie(directLabel);
    return;
  }

  // 2. sinon on essaie via l'id
  const rawCatId =
    selectedCentre.categorie_id ??
    selectedCentre.categorieId ??
    selectedCentre.category_id ??
    selectedCentre.categoryId ??
    null;

  if (!rawCatId) {
    setCentreCategorie("Non définie");
    return;
  }

  const foundCat = categoriesList.find(
    (cat) => String(cat.id) === String(rawCatId)
  );

  console.log("▶ foundCat =", foundCat);

  if (foundCat) {
    setCentreCategorie(foundCat.label || foundCat.name || "Non définie");
  } else {
    setCentreCategorie("Non définie");
  }
}, [activeFlux, centre, centres, categoriesList]);


  /* ---------- Charger le référentiel des tâches quand poste change ---------- */
  useEffect(() => {
    if (activeFlux === "poste" && centre) {
      let cancelled = false;
      (async () => {
        try {
          setLoading((l) => ({ ...l, referentiel: true }));
          const posteId = poste === "Tous" ? null : poste;
          const data = await api.taches({ centreId: centre, posteId });
          console.log("Données des tâches :", data);
          if (!cancelled && Array.isArray(data)) {
            setReferentiel(
              data.map((r) => ({
                t: r.task || r.nom_tache || r.tache || "N/A",
                ph: r.phase || r.ph || r.etape || "N/A",
                u: r.unit || r.unite_mesure || r.unite || "minute",
                m: Number((r.avg_sec ?? 0) / 60).toFixed(2),
              }))
            );
          }
        } catch (e) {
          console.error("Erreur simulate:", e);
          setReferentiel([]);
          setErr(
            e?.response?.data?.detail ||
              e?.message ||
              "Erreur lors du chargement des tâches"
          );
        } finally {
          if (!cancelled) setLoading((l) => ({ ...l, referentiel: false }));
        }
      })();
      return () => {
        cancelled = true;
      };
    } else {
      // si pas en mode "poste", on nettoie pour éviter d'afficher stale data
      setReferentiel([]);
    }
  }, [activeFlux, centre, poste]);

  /* ---------- Simulation ---------- */
  const onSimuler = async () => {
    setLoading((l) => ({ ...l, simulation: true }));
    setErr(null);

    const heures_net_calculees =
      heuresNet && !Number.isNaN(Number(heuresNet))
        ? Number(heuresNet)
        : (8 * productivite) / 100;

    const payload = {
      centre_id: centre ? Number(centre) : null,
      poste_id: poste === "Tous" ? null : Number(poste),
      productivite: Number(productivite),
      heures_net: Number(heures_net_calculees),
      volumes: {
        sacs: Number(sacs),
        colis: Number(colis),
        courrier: Number(courrier),
        scelle: Number(scelle || 0),
      },
    };

    try {
      const res = await api.simulate(payload);
      console.log("Résultat de la simulation :", res); // <-- Ici, c'est correct
      const details_taches = Array.isArray(res?.details_taches)
        ? res.details_taches
        : [];

      const tot = res
        ? {
            total_heures: res.total_heures ?? 0,
            fte_calcule: res.fte_calcule ?? 0,
            fte_arrondi: res.fte_arrondi ?? 0,
            heures_net: res.heures_net_jour ?? heures_net_calculees,
          }
        : null;

      setResultats(details_taches);
      setTotaux(tot);
    } catch (e) {
      console.error("Erreur simulate:", e);
      setResultats([]);
      setTotaux(null);
      setErr(
        e?.response?.data?.detail ||
          e?.message ||
          "Erreur lors du calcul de simulation"
      );
    } finally {
      setLoading((l) => ({ ...l, simulation: false }));
    }
  };

  /* ---------- hasPhase (colonne Phase dynamique) ---------- */
  const hasPhase = useMemo(() => {
    return referentiel.some((r) => {
      if (r.ph === undefined || r.ph === null) return false;
      const val = String(r.ph).trim().toLowerCase();
      return val !== "" && val !== "n/a";
    });
  }, [referentiel]);

  /* ---------- Render ---------- */
  return (
  <main className="min-h-screen bg-slate-50">
    {/* Header global bleu (TAWAZOON RH ...) reste au-dessus, sticky ailleurs */}
{/* Navbar principale (juste sous le header bleu) */}
<div className="sticky top-[64px] z-30 bg-white">
  <div className="max-w-7xl mx-auto px-5 py-2">
    <FluxNavbar activeFlux={activeFlux} onFluxChange={setActiveFlux} />
  </div>
</div>
    {/* Bloc local Simulation (blanc sous le header bleu) */}
    <div className="sticky top-[64px] z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-5 py-3">
        {/* Ligne 1 : titre + boutons */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-[15px] font-semibold text-[#005EA8]">
              Simulation des Effectifs - Flux en Cascade
            </h1>
            <p className="text-[13px] text-slate-700 -mt-0.5">
              Sélectionnez les paramètres et lancez la simulation
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={exportRapportPDF}
              disabled={referentiel.length === 0 && resultats.length === 0}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-red-600 text-white hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500/60"
              title="Exporter le rapport"
            >
              <FileDown className="w-4 h-4" />
              <span className="text-[13px] leading-none text-left">
                Exporter le
                <br />
                rapport
              </span>
            </button>

            <HelpPopover>
              <span className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 text-[13px] font-medium">
                <Info className="w-4 h-4" />
                Aide
              </span>
            </HelpPopover>
          </div>
        </div>

       

        {/* Ligne 3 : Segmented (seulement si pas national) */}
        {activeFlux !== "national" && (
          <div className="mt-3 flex flex-wrap items-center">
            <Segmented
              value={mode}
              onChange={setMode}
              items={[
                { value: "actuel", label: "Processus Actuel" },
                { value: "recommande", label: "Processus Recommandé" },
              ]}
            />
          </div>
        )}
      </div>
    </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-5 pt-0 pb-4 space-y-4 -mt-1">
        {/* Mode Processus (caché en National) */}
        {activeFlux !== "national" && (
          <div className="flex flex-wrap items-center justify-end -mt-1">
            <Segmented
              value={mode}
              onChange={setMode}
              items={[
                { value: "actuel", label: "Processus Actuel" },
                { value: "recommande", label: "Processus Recommandé" },
              ]}
            />
          </div>
        )}



        {activeFlux === "national" && (
          <VueNationale
            sacs={sacs}
            setSacs={setSacs}
            colis={colis}
            setColis={setColis}
            courrier={courrier}
            setCourrier={setCourrier}
            productivite={productivite}
            setProductivite={setProductivite}
            heuresNet={heuresNet}
            setHeuresNet={setHeuresNet}
            scelle={scelle}
            setScelle={setScelle}
          />
        )}

        {/* Régional */}
        {activeFlux === "regional" && <ComparatifRegional />}

        {/* Centre */}
        {activeFlux === "centre" && (
          <>
            <Card title="Paramètres principaux">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Région" icon={MapPin}>
                  <Select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Centre" icon={Building}>
                  <Select
                    value={centre}
                    onChange={(e) => setCentre(e.target.value)}
                    disabled={!region}
                  >
                    <option value="">
                      {loading.centres ? "Chargement..." : "Sélectionner…"}
                    </option>
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label ?? c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
<Field label="Catégorie" icon={Tag}>
  <Input
  value={centreCategorie || "—"}
  readOnly
  className="bg-slate-100 cursor-not-allowed text-slate-700"
/>
</Field>
              </div>
            </Card>

            <Card
              title="Volumes et productivité"
              actions={
                <button
                  disabled={!centre || loading.simulation}
                  onClick={onSimuler}
                  className="inline-flex items-center gap-1 px-3 h-8 rounded-md bg-[#005EA8] text-white
                     text-[13px] font-medium hover:bg-[#004b87] disabled:opacity-50 transition
                     focus:outline-none focus:ring-2 focus:ring-[#005EA8]/60"
                >
                  <Play className="w-3.5 h-3.5" />
                  {loading.simulation ? "Calcul..." : "Lancer Simulation"}
                </button>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <Field label="Sacs / Jour" icon={Archive}>
                  <Input
                    type="number"
                    value={sacs}
                    onChange={(e) => setSacs(Number(e.target.value || 0))}
                  />
                </Field>

                <Field label="Colis / Jour" icon={Package}>
                  <Input
                    type="number"
                    value={colis}
                    onChange={(e) => setColis(Number(e.target.value || 0))}
                  />
                </Field>

                <Field label="Courrier / Jour" icon={Mail}>
                  <Input
                    type="number"
                    value={courrier}
                    onChange={(e) => setCourrier(Number(e.target.value || 0))}
                  />
                </Field>

                <Field label="Productivité (%)" icon={Gauge}>
                  <Input
                    type="number"
                    value={productivite}
                    onChange={(e) =>
                      setProductivite(Number(e.target.value || 0))
                    }
                  />
                </Field>

                <Field label="Heures net / Jour" icon={Clock}>
                  <Input
                    type="number"
                    value={heuresNet}
                    onChange={(e) => setHeuresNet(Number(e.target.value || 0))}
                  />
                </Field>

                <Field label="Scellés / Jour">
                  <Input
                    type="number"
                    value={scelle}
                    onChange={(e) => setScelle(Number(e.target.value || 0))}
                  />
                </Field>
              </div>
            </Card>
          </>
        )}

        {/* Poste */}
        {activeFlux === "poste" && (
          <>
            <Card title="Paramètres principaux">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Région" icon={MapPin}>
                  <Select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Centre" icon={Building}>
                  <Select
                    value={centre}
                    onChange={(e) => setCentre(e.target.value)}
                    disabled={!region}
                  >
                    <option value="">
                      {loading.centres ? "Chargement..." : "Sélectionner…"}
                    </option>
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label ?? c.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Catégorie" icon={Tag}>
                  <Select
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                  >
                  
                  </Select>
                </Field>

                <Field label="Intervenant" icon={User}>
                  <Select
                    value={poste}
                    onChange={(e) => setPoste(e.target.value)}
                    disabled={!centre}
                  >
                    <option value="Tous">Tous</option>
                    {postesList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label ?? p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Card>

            <Card
              title="Volumes et productivité"
              actions={
                <button
                  disabled={!centre || loading.simulation}
                  onClick={onSimuler}
                  className="inline-flex items-center gap-1 px-3 h-8 rounded-md bg-[#005EA8] text-white
                     text-[13px] font-medium hover:bg-[#004b87] disabled:opacity-50 transition
                     focus:outline-none focus:ring-2 focus:ring-[#005EA8]/60"
                >
                  <Play className="w-3.5 h-3.5" />
                  {loading.simulation ? "Calcul..." : "Lancer Simulation"}
                </button>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <Field label="Sacs / Jour" icon={Archive}>
                  <Input
                    type="number"
                    value={sacs}
                    onChange={(e) => setSacs(Number(e.target.value || 0))}
                  />
                </Field>

                <Field label="Colis / Jour" icon={Package}>
                  <Input
                    type="number"
                    value={colis}
                    onChange={(e) => setColis(Number(e.target.value || 0))}
                  />
                </Field>

                <Field label="Courrier / Jour" icon={Mail}>
                  <Input
                    type="number"
                    value={courrier}
                    onChange={(e) => setCourrier(Number(e.target.value || 0))}
                  />
                </Field>

                <Field label="Productivité (%)" icon={Gauge}>
                  <Input
                    type="number"
                    value={productivite}
                    onChange={(e) =>
                      setProductivite(Number(e.target.value || 0))
                    }
                  />
                </Field>

                <Field label="Heures net / Jour" icon={Clock}>
                  <Input
                    type="number"
                    value={heuresNet}
                    onChange={(e) => setHeuresNet(Number(e.target.value || 0))}
                  />
                </Field>

                <Field label="Scellés / Jour">
                  <Input
                    type="number"
                    value={scelle}
                    onChange={(e) => setScelle(Number(e.target.value || 0))}
                  />
                </Field>
              </div>
            </Card>
          </>
        )}

        {/* Switch Tableau/Graphe */}
        {(activeFlux === "centre" || activeFlux === "poste") && (
          <>
            <div className="flex items-center justify-between -mt-1">
              <h3 className="text-base font-semibold text-slate-900">
                Résultats
              </h3>

              <Segmented
                value={display}
                onChange={(v) => {
                  setDisplay(v);
                  if (v === "graphe") goToGraphPage();
                }}
                items={[
                  {
                    value: "tableau",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <Table className="w-4 h-4" /> Tableau
                      </span>
                    ),
                  },
                  {
                    value: "graphe",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Graphe
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Référentiel des tâches */}
              <Card title="Référentiel des tâches (Centre/Intervenant)">
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="text-left px-2.5 py-1.5">Seq</th>
                          <th className="text-left px-2.5 py-1.5">Tâche</th>

                          {hasPhase && (
                            <th className="text-left px-3 py-2">Phase</th>
                          )}

                          <th className="text-left px-3 py-2">Unité</th>
                          <th className="text-left px-3 py-2">Moyenne (min)</th>
                        </tr>
                      </thead>

                      <tbody>
                        {loading.referentiel ? (
                          <tr>
                            <td
                              colSpan={hasPhase ? 5 : 4}
                              className="px-3 py-2 text-left text-slate-500"
                            >
                              Chargement…
                            </td>
                          </tr>
                        ) : referentiel.length === 0 ? (
                          <tr className="bg-white">
                            <td
                              colSpan={hasPhase ? 5 : 4}
                              className="px-3 py-2 text-left text-slate-500"
                            >
                              Aucune donnée.
                            </td>
                          </tr>
                        ) : (
                          referentiel.map((r, i) => (
                            <tr
                              key={i}
                              className={
                                i % 2 === 0 ? "bg-white" : "bg-slate-50"
                              }
                            >
                              <td className="px-3 py-2">{i + 1}</td>
                              <td className="px-3 py-2">{r.t}</td>

                              {hasPhase && (
                                <td className="px-3 py-2">
                                  {r.ph &&
                                  String(r.ph).trim().toLowerCase() !== "n/a"
                                    ? r.ph
                                    : ""}
                                </td>
                              )}

                              <td className="px-3 py-2">{r.u}</td>
                              <td className="px-3 py-2">
                                {Number(r.m ?? 0).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>

              {/* Résultats de Simulation */}
              <Card title="Résultats de Simulation">
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="text-left px-3 py-2">Seq</th>
                          <th className="text-left px-3 py-2">Tâche</th>
                          <th className="text-left px-3 py-2">
                            Nombre d'unité
                          </th>
                          <th className="text-left px-3 py-2">Heures</th>
                        </tr>
                      </thead>

                      <tbody>
                        {loading.simulation ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-2 text-left text-slate-500"
                            >
                              Calcul en cours...
                            </td>
                          </tr>
                        ) : resultats.length === 0 ? (
                          <tr className="bg-white">
                            <td
                              colSpan={4}
                              className="px-3 py-2 text-left text-slate-500"
                            >
                              Aucune donnée.
                            </td>
                          </tr>
                        ) : (
                          resultats.map((r, i) => (
                            <tr
                              key={i}
                              className={
                                i % 2 === 0 ? "bg-white" : "bg-slate-50"
                              }
                            >
                              <td className="px-3 py-2">{i + 1}</td>
                              <td className="px-3 py-2">
                                {r.task || r.nom_tache || "N/A"}
                              </td>
                              <td className="px-3 py-2 text-left">
                                {r.nombre_unite}
                              </td>
                              <td className="px-3 py-2 text-left">
                                {r.heures}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>

                      <tfoot className="bg-blue-50 font-medium text-slate-800">
                        {totaux ? (
                          <>
                            <tr>
                              <td className="px-3 py-2 text-left" colSpan={4}>
                                <span className="font-semibold text-blue-700">
                                  Total heures nécessaires (tâches / jour) :
                                </span>{" "}
                                {Number(totaux.total_heures ?? 0).toFixed(2)} h
                              </td>
                            </tr>

                            <tr>
                              <td className="px-3 py-2 text-left" colSpan={4}>
                                <span className="font-semibold text-blue-700">
                                  Effectif nécessaire (base{" "}
                                  {Number(totaux.heures_net ?? 0).toFixed(2)}{" "}
                                  h/jour) :
                                </span>{" "}
                                {Number(totaux.fte_calcule ?? 0).toFixed(2)} ETP
                              </td>
                            </tr>

                            <tr>
                              <td className="px-3 py-2 text-left" colSpan={4}>
                                <span className="font-semibold text-blue-700">
                                  Effectif nécessaire arrondi :
                                </span>{" "}
                                {Number(totaux.fte_arrondi ?? 0).toFixed(0)} ETP
                              </td>
                            </tr>
                          </>
                        ) : (
                          <>
                            <tr>
                              <td className="px-3 py-2 text-left" colSpan={4}>
                                <span className="font-semibold text-blue-700">
                                  Total heures nécessaires (tâches / jour) :
                                </span>{" "}
                                0.00 h
                              </td>
                            </tr>

                            <tr>
                              <td className="px-3 py-2 text-left" colSpan={4}>
                                <span className="font-semibold text-blue-700">
                                  Effectif nécessaire (base 7.20 h/jour) :
                                </span>{" "}
                                0.00 ETP
                              </td>
                            </tr>

                            <tr>
                              <td className="px-3 py-2 text-left" colSpan={4}>
                                <span className="font-semibold text-blue-700">
                                  Effectif nécessaire arrondi :
                                </span>{" "}
                                0 ETP
                              </td>
                            </tr>
                          </>
                        )}
                      </tfoot>
                    </table>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {!!err && (
          <div className="text-sm text-red-600">
            {err?.message || err?.detail || "Erreur inconnue"}
          </div>
        )}
      </div>

      {/* Rapport imprimable (caché) */}
      <div
        ref={reportRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: "794px",
          padding: "24px",
          backgroundColor: "#ffffff",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xl font-bold">
              Rapport de Simulation des Effectifs
            </div>
            <div className="text-sm text-slate-600">
              {new Date().toLocaleDateString()} • Mode:{" "}
              {mode === "actuel" ? "Processus Actuel" : "Processus Recommandé"}
            </div>
          </div>
        </div>

        <div className="text-sm grid grid-cols-2 gap-2 mb-12">
          <div>
            <b>Région:</b>{" "}
            {regions.find((r) => String(r.id) === String(region))?.label || "-"}
          </div>
          <div>
            <b>Catégorie:</b>{" "}
           
          </div>
          <div>
            <b>Centre:</b>{" "}
            {centres.find((c) => String(c.id) === String(centre))?.label || "-"}
          </div>
          <div>
            <b>Poste:</b>{" "}
            {poste === "Tous"
              ? "Tous"
              : postesList.find((p) => String(p.id) === String(poste))?.label ||
                poste}
          </div>
          <div>
            <b>Sacs/j:</b> {sacs}
          </div>
          <div>
            <b>Colis/j:</b> {colis}
          </div>
          <div>
            <b>Courrier/j:</b> {courrier}
          </div>
          <div>
            <b>Productivité:</b> {productivite}% • <b>Heures net/j:</b>{" "}
            {heuresNet}
          </div>
        </div>

        {/* Référentiel pour PDF */}
        <div className="mb-10">
          <div className="font-semibold mb-2">
            Référentiel des tâches (Centre/Intervenant)
          </div>

          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-2 py-1 border-b">Tâche</th>

                {hasPhase && (
                  <th className="text-left px-2 py-1 border-b">Phase</th>
                )}

                <th className="text-left px-2 py-1 border-b">Unité</th>
                <th className="text-left px-2 py-1 border-b">Moyenne (min)</th>
              </tr>
            </thead>

            <tbody>
              {referentiel.length === 0 ? (
                <tr>
                  <td
                    colSpan={hasPhase ? 4 : 3}
                    className="px-2 py-2 text-left text-slate-500"
                  >
                    Aucune donnée.
                  </td>
                </tr>
              ) : (
                referentiel.map((r, i) => (
                  <tr key={i} className={i % 2 ? "bg-slate-50" : undefined}>
                    <td className="px-2 py-1">{r.t}</td>

                    {hasPhase && (
                      <td className="px-2 py-1">
                        {r.ph && String(r.ph).trim().toLowerCase() !== "n/a"
                          ? r.ph
                          : ""}
                      </td>
                    )}

                    <td className="px-2 py-1">{r.u}</td>
                    <td className="px-2 py-1 text-left">
                      {Number(r.m ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Résultats pour PDF */}
        <div className="mb-10">
          <div className="font-semibold mb-2">Résultats de Simulation</div>

          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2">Seq</th>
                <th className="text-left px-3 py-2">Tâche</th>
                <th className="text-left px-3 py-2">Nombre d'unité</th>
                <th className="text-left px-3 py-2">Heures</th>
              </tr>
            </thead>

            <tbody>
              {loading.simulation ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-left text-slate-500"
                  >
                    Calcul en cours...
                  </td>
                </tr>
              ) : resultats.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-left text-slate-500"
                  >
                    Aucune donnée.
                  </td>
                </tr>
              ) : (
                resultats.map((r, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{r.role}</td>
                    <td className="px-3 py-2 text-left">{r.nombre_unite}</td>
                    <td className="px-3 py-2 text-left">{r.heures}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Graphe (placeholder) */}
        <div className="mb-4">
          <div className="font-semibold mb-2">Visualisation</div>
          <div className="h-60 border border-dashed border-slate-300 grid place-items-center text-slate-500">
            {resultats.length
              ? "Graphe de comparaison (à intégrer)"
              : "Aucun graphe"}
          </div>
        </div>

        <div className="text-[10px] text-slate-500 mt-8">
          Rapport généré automatiquement — {new Date().toLocaleString()}
        </div>
      </div>
    </main>
  );
}

// Composant VueNationale (à ajouter avant SimulationEffectifs)   la catégorie s'affiche automatiquement en fonction du centre sélectionné  dimenuer le margin entre la nav bar et le heder prinsipale