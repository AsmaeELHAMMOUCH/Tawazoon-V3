// ResultsGlobal.jsx — Tableau de bord Global (centre/région)
// Header compact • Filtres en une ligne • Vue Tableau/Graphe
// Graphe groupé/empilé + cible Calculé/Recommandé • Filtre "seulement écarts"

import { useEffect, useMemo, useRef, useState } from "react";
import { useActivity } from "../context/ActivityContext";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import {
  MapPinIcon, TagIcon, BuildingOfficeIcon, AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import {
  ArchiveBoxIcon, DocumentDuplicateIcon, ChartBarIcon, DocumentTextIcon, ClockIcon,
} from "@heroicons/react/24/outline";

/* ——— Données par défaut (fallback) ——— */
const defaultStaffing = [
  { role: "Chef Service", actuel: 1, calcule: 1, recommande: 1 },
  { role: "Chargé Réception dossier", actuel: 2, calcule: 2, recommande: 0 },
  { role: "Chargé dossier", actuel: 7, calcule: 7, recommande: 6 },
  { role: "Chargé saisie", actuel: 7, calcule: 6, recommande: 1 },
  { role: "Chargé Validation", actuel: 1, calcule: 1, recommande: 0 },
  { role: "Chargé production", actuel: 5, calcule: 5, recommande: 1 },
  { role: "Chargé envoi", actuel: 1, calcule: 1, recommande: 0 },
  { role: "Chargé archives", actuel: 1, calcule: 1, recommande: 1 },
  { role: "Chargé Numérisation", actuel: 1, calcule: 1, recommande: 0 },
  { role: "Chargé Stock", actuel: 1, calcule: 1, recommande: 0 },
  { role: "Chargé réclamation et reporting", actuel: 1, calcule: 1, recommande: 1 },
  { role: "Coordinateur Réseau", actuel: 0, calcule: 0, recommande: 3 },
  { role: "Chargé codes PIN", actuel: 1, calcule: 1, recommande: 0 },
  { role: "Chargé Contrôle", actuel: 1, calcule: 1, recommande: 1 },
  { role: "Détaché agence", actuel: 1, calcule: 1, recommande: 1 },
];

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

/* ——— Composant principal ——— */
export default function ResultsGlobal() {
  const { activityCode } = useActivity();

  // Filtres cascade (plus de "poste")
  const [regions, setRegions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [centres, setCentres] = useState([]);
  const [filters, setFilters] = useState({ regionId: "", categoryId: "", centreId: "" });

  // Paramètres
  const [params, setParams] = useState({
    sacsJour: 50, dossiersMois: 6500, productivite: 100, dossiersJour: 295.45, heuresNetJour: 8.0,
  });

  // Données/état
  const [rows, setRows] = useState(defaultStaffing); // détail par poste
  const [aggRows, setAggRows] = useState([]);        // agrégats centre/région
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Vues & options
  const [view, setView] = useState("table");       // 'table' | 'chart'
  const [groupBy, setGroupBy] = useState("poste"); // 'poste' | 'centre' | 'region'
  const [onlyDiff, setOnlyDiff] = useState(false); // afficher seulement les écarts
  const [chartMode, setChartMode] = useState("grouped");        // 'grouped' | 'stacked'
  const [chartTarget, setChartTarget] = useState("recommande"); // 'recommande' | 'calcule'

  const debounceRef = useRef(null);

  // Dérivés: dossiers/jour & heures net/jour
  useEffect(() => {
    const dossiersJour = Number(params.dossiersMois || 0) / 22;
    const heuresNetJour = (8 * Number(params.productivite || 0)) / 100;
    setParams((p) => ({
      ...p,
      dossiersJour: Number.isFinite(dossiersJour) ? Number(dossiersJour.toFixed(2)) : 0,
      heuresNetJour: Number.isFinite(heuresNetJour) ? Number(heuresNetJour.toFixed(2)) : 0,
    }));

  }, [params.dossiersMois, params.productivite]);

  /* ——— Chargement des listes ——— */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/process/filters/regions`);
        if (!r.ok) return;
        const raw = await r.json();
        const arr = (raw || []).map((v) => (typeof v === "string" ? { id: v, name: v } : v));
        setRegions(arr);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (!filters.regionId) { setCategories([]); setCentres([]); return; }
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/process/filters/categories?region=${encodeURIComponent(filters.regionId)}`);
        if (!r.ok) return;
        const raw = await r.json();
        const arr = (raw || []).map((v) => (typeof v === "string" ? { id: v, name: v } : v));
        setCategories(arr);
        setCentres([]);
        setFilters((f) => ({ ...f, categoryId: "", centreId: "" }));
      } catch { }
    })();
  }, [filters.regionId]);

  useEffect(() => {
    if (!filters.categoryId) { setCentres([]); return; }
    (async () => {
      try {
        const sp = new URLSearchParams();
        if (filters.regionId) sp.set("region", filters.regionId);
        if (filters.categoryId) sp.set("categorie", filters.categoryId);
        const r = await fetch(`${API_BASE}/process/filters/centres?${sp.toString()}`);
        if (!r.ok) return;
        const raw = await r.json();
        const arr = (raw || []).map((c) => ({ id: String(c.id ?? c.value ?? ""), name: c.nom ?? c.name ?? "" }));
        setCentres(arr);
        setFilters((f) => ({ ...f, centreId: "" }));
      } catch { }
    })();
  }, [filters.categoryId, filters.regionId]);

  // Charger les effectifs actuels par poste dès qu'un centre est sélectionné
  useEffect(() => {
    if (!filters.centreId) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/process/current/staffing/by-centre?centre_id=${encodeURIComponent(filters.centreId)}`);
        if (!r.ok) return;
        const staff = await r.json();
        if (Array.isArray(staff)) {
          setRows(staff.map(s => ({
            role: String(s.role ?? ''),
            actuel: Number(s.actuel || 0),
            calcule: 0,
            recommande: 0,
          })));
        } else {
          setRows([]);
        }
      } catch { }
    })();
  }, [filters.centreId]);

  /* ——— Simulation auto (debounce) ——— */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { simulate(); }, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activityCode, filters, params.sacsJour, params.dossiersMois,
    params.productivite, params.dossiersJour, params.heuresNetJour, groupBy,
  ]);

  async function simulate() {
    setLoading(true); setError("");
    try {
      const payload = {
        activityCode: activityCode || null,
        sacsJour: Number(params.sacsJour),
        dossiersMois: Number(params.dossiersMois),
        productivite: Number(params.productivite),
        dossiersJour: Number(params.dossiersJour),
        heuresNetJour: Number(params.heuresNetJour),
        regionId: filters.regionId || null,
        categoryId: filters.categoryId || null,
        centreId: filters.centreId || null,
        groupBy,
      };

      // 1) Détail par poste
      let res = await fetch(`${API_BASE}/dashboard/staffing/simulate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const qs = new URLSearchParams({
          activity_code: activityCode || "",
          sacs_jour: String(payload.sacsJour),
          dossiers_mois: String(payload.dossiersMois),
          productivite: String(payload.productivite),
          dossiers_jour: String(payload.dossiersJour),
          heures_net_jour: String(payload.heuresNetJour),
          region_id: payload.regionId ?? "",
          category_id: payload.categoryId ?? "",
          centre_id: payload.centreId ?? "",
        }).toString();
        res = await fetch(`${API_BASE}/dashboard/staffing?${qs}`);
      }
      if (!res.ok) throw new Error(await res.text());
      const detail = await res.json();
      if (!Array.isArray(detail)) throw new Error("Réponse inattendue");
      setRows(detail);

      // 2) Agrégats
      const compare = await loadAggregates(payload, detail);
      setAggRows(compare);

      // 3) Données graphe
      setChartData(toChartData(compare, detail, groupBy));
    } catch {
      setError("Impossible de charger la simulation (backend/filtres).");
    } finally {
      setLoading(false);
    }
  }

  async function loadAggregates(payload, detailRows) {
    if (groupBy === "poste") return [];
    try {
      const qs = new URLSearchParams({
        group_by: groupBy,
        activity_code: payload.activityCode || "",
        sacs_jour: String(payload.sacsJour),
        dossiers_mois: String(payload.dossiersMois),
        productivite: String(payload.productivite),
        dossiers_jour: String(payload.dossiersJour),
        heures_net_jour: String(payload.heuresNetJour),
        region_id: payload.regionId ?? "",
        category_id: payload.categoryId ?? "",
        centre_id: payload.centreId ?? "",
      }).toString();
      const r = await fetch(`${API_BASE}/dashboard/staffing/compare?${qs}`);
      if (r.ok) {
        const arr = await r.json();
        if (Array.isArray(arr)) {
          return arr.map((x) => ({
            label: String(x.label ?? ""),
            actuel: Number(x.actuel || 0),
            calcule: Number(x.calcule || 0),
            recommande: Number(x.recommande || 0),
          }));
        }
      }
    } catch { }
    // Fallback : total depuis le détail si pas d’endpoint d’agrégat
    const t = (detailRows || rows).reduce(
      (a, r) => ({
        actuel: a.actuel + Number(r.actuel || 0),
        calcule: a.calcule + Number(r.calcule || 0),
        recommande: a.recommande + Number(r.recommande || 0),
      }),
      { actuel: 0, calcule: 0, recommande: 0 }
    );
    return [{ label: "TOTAL", ...t }];
  }

  // Synchroniser le graphe si les agrégats arrivent après coup
  useEffect(() => {
    if (groupBy !== "poste") setChartData(toChartData(aggRows, rows, groupBy));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggRows]);

  function toChartData(aggregates, detailRows, gb) {
    if (gb === "poste") {
      const items = (detailRows || []).map((r) => ({
        label: r.role, Actuel: r.actuel, Calcule: r.calcule, Recommande: r.recommande,
      }));
      if (detailRows?.length) {
        const t = detailRows.reduce(
          (a, r) => ({
            Actuel: a.Actuel + r.actuel,
            Calcule: a.Calcule + r.calcule,
            Recommande: a.Recommande + r.recommande,
          }), { Actuel: 0, Calcule: 0, Recommande: 0 }
        );
        items.push({ label: "TOTAL", ...t });
      }
      return items;
    }
    return (aggregates || []).map((x) => ({
      label: x.label, Actuel: x.actuel, Calcule: x.calcule, Recommande: x.recommande,
    }));
  }

  /* ——— KPI & Totaux ——— */
  const totals = useMemo(() => {
    const t = rows.reduce((acc, r) => ({
      actuel: acc.actuel + Number(r.actuel || 0),
      calcule: acc.calcule + Number(r.calcule || 0),
      recommande: acc.recommande + Number(r.recommande || 0),
    }), { actuel: 0, calcule: 0, recommande: 0 });
    return { ...t, ecartCA: t.calcule - t.actuel, ecartRA: t.recommande - t.actuel, ecartRC: t.recommande - t.calcule };
  }, [rows]);

  const aggTotals = useMemo(() => {
    const t = (aggRows || []).reduce((a, r) => ({
      actuel: a.actuel + Number(r.actuel || 0),
      calcule: a.calcule + Number(r.calcule || 0),
      recommande: a.recommande + Number(r.recommande || 0),
    }), { actuel: 0, calcule: 0, recommande: 0 });
    return { ...t, ecartCA: t.calcule - t.actuel, ecartRA: t.recommande - t.actuel, ecartRC: t.recommande - t.calcule };
  }, [aggRows]);

  const adequation = useMemo(() => {
    const denom = Math.max(1, totals.recommande);
    const delta = rows.reduce((s, r) => s + Math.abs((r.recommande || 0) - (r.actuel || 0)), 0);
    const pct = Math.max(0, 1 - delta / denom);
    const over = rows.filter((r) => (r.recommande - r.actuel) < 0).length;
    const under = rows.filter((r) => (r.recommande - r.actuel) > 0).length;
    return { pct: Number((pct * 100).toFixed(1)), over, under };
  }, [rows, totals.recommande]);

  const titleChart =
    groupBy === "poste" ? "Comparaison des effectifs par Poste"
      : groupBy === "centre" ? "Comparaison des effectifs par Centre"
        : "Comparaison des effectifs par Région";

  /* ——— Rendu ——— */
  return (
    <div className="space-y-4 text-sm">
      {/* Header compact */}
      <div className="px-2 pt-3 pb-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="pl-1">
            <h1 className="text-base font-semibold text-slate-900">Tableau De Bord Global</h1>
            <p className="text-[11px] text-slate-500">Vue consolidée des effectifs et écarts</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" className="accent-primary" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
              Afficher seulement les écarts
            </label>
            <GroupBy value={groupBy} onChange={setGroupBy} />
            <Segment value={view} onChange={setView} />
          </div>
        </div>

        {/* Filtres (sans Poste) */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select compact label="Région" icon={MapPinIcon} value={filters.regionId}
            onChange={(v) => setFilters(f => ({ ...f, regionId: v, categoryId: "", centreId: "" }))}
            options={regions} placeholder="Région" />
          <Select compact label="Catégorie" icon={TagIcon} value={filters.categoryId}
            onChange={(v) => setFilters(f => ({ ...f, categoryId: v, centreId: "" }))}
            options={categories} placeholder="Catégorie" disabled={!filters.regionId} />
          <Select compact label="Centre" icon={BuildingOfficeIcon} value={filters.centreId}
            onChange={(v) => setFilters(f => ({ ...f, centreId: v }))}
            options={centres} placeholder="Centre" disabled={!filters.categoryId} />
          {/* Boutons graphe visibles seulement en mode Graphe */}
          {view === "chart" && (
            <div className="ml-auto flex items-center gap-2">
              <ChartModeToggle value={chartMode} onChange={setChartMode} />
              <TargetToggle value={chartTarget} onChange={setChartTarget} />
            </div>
          )}
        </div>
      </div>

      {/* KPI (uniquement en Graphe) */}
      {view === "chart" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard title="Adéquation globale" value={`${adequation.pct}%`} hint="Proximité Actuel ↔ Recommandé" />
          <KpiCard title="Sous-effectif (postes)" value={adequation.under} />
          <KpiCard title="Sur-effectif (postes)" value={adequation.over} />
        </div>
      )}

      {/* Paramètres */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
        <h2 className="text-xs font-semibold text-slate-700 mb-2">Paramètres de Simulation</h2>
        <div className="flex flex-wrap items-center justify-start gap-3">
          <Param icon={ArchiveBoxIcon} label="Sacs/Jour" value={params.sacsJour}
            onChange={(v) => setParams(p => ({ ...p, sacsJour: v }))} />
          <Param icon={DocumentDuplicateIcon} label="Dossiers/Mois" value={params.dossiersMois}
            onChange={(v) => setParams(p => ({ ...p, dossiersMois: v }))} />
          <Param icon={ChartBarIcon} label="Productivité (%)" value={params.productivite} suffix="%"
            onChange={(v) => setParams(p => ({ ...p, productivite: v }))} />
          <Param icon={DocumentTextIcon} label="Dossiers/Jour" value={params.dossiersJour} step={0.01}
            onChange={(v) => setParams(p => ({ ...p, dossiersJour: v }))} />
          <Param icon={ClockIcon} label="Heures Net/Jour" value={params.heuresNetJour} step={0.01} suffix="h"
            onChange={(v) => setParams(p => ({ ...p, heuresNetJour: v }))} />
          <div className="ml-auto flex items-center gap-3">
            {loading && <div className="flex items-center gap-2 text-xs text-slate-500"><Spinner /> Calcul…</div>}
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
        </div>
      </div>

      {/* Vue Tableau / Graphe */}
      {view === "table" ? (
        groupBy === "poste" ? (
          <TableBlock rows={rows.filter((r) => (onlyDiff ? diffRow(r) : true))} totals={totals} />
        ) : (
          <AggregateTableBlock
            rows={aggRows.filter((r) => (onlyDiff ? diffAggRow(r) : true))}
            totals={aggTotals}
            labelTitle={groupBy === "centre" ? "Centre" : "Région"}
            onRowClick={(r) => {
              // Drill-down léger : Région -> Centre, Centre -> Poste
              if (groupBy === "region") {
                const reg = regions.find((x) => (x.name ?? x.id) === r.label || x.id === r.label);
                if (reg) setFilters((f) => ({ ...f, regionId: reg.id, categoryId: "", centreId: "" }));
                setGroupBy("centre");
              } else if (groupBy === "centre") {
                const cen = centres.find((x) => (x.name ?? x.id) === r.label || x.id === r.label);
                if (cen) setFilters((f) => ({ ...f, centreId: cen.id }));
                setGroupBy("poste");
              }
            }}
          />
        )
      ) : (
        <ChartBlock
          data={(onlyDiff ? chartData.filter((d) => diffVals(d.Actuel, d.Calcule, d.Recommande)) : chartData)}
          title={titleChart}
          mode={chartMode}
          target={chartTarget}
        />
      )}
    </div>
  );
}

/* ——— Vues ——— */

function TableBlock({ rows, totals }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-primary text-white">
              <Th className="w-[240px]">Intervenant</Th>
              <Th center>Actuel</Th>
              <Th center>Calculé</Th>
              <Th center>Recommandé</Th>
              <Th center>Écart Calculé vs Actuel</Th>
              <Th center>Écart Recommandé vs Actuel</Th>
              <Th center>Écart Recommandé vs Calculé</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const ca = row.calcule - row.actuel
              const ra = row.recommande - row.actuel
              const rc = row.recommande - row.calcule
              return (
                <tr key={i} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 transition-colors">
                  <Td>{row.role}</Td>
                  <Td center>{row.actuel}</Td>
                  <Td center>{row.calcule}</Td>
                  <Td center>{row.recommande}</Td>
                  <Td center className={cls(ca)}>{ca}</Td>
                  <Td center className={cls(ra)}>{ra}</Td>
                  <Td center className={cls(rc)}>{rc}</Td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-medium">
              <Td>TOTAL</Td>
              <Td center>{totals.actuel}</Td>
              <Td center>{totals.calcule}</Td>
              <Td center>{totals.recommande}</Td>
              <Td center className={cls(totals.ecartCA)}>{totals.ecartCA}</Td>
              <Td center className={cls(totals.ecartRA)}>{totals.ecartRA}</Td>
              <Td center className={cls(totals.ecartRC)}>{totals.ecartRC}</Td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-slate-200">
        {rows.map((row, i) => {
          const ca = row.calcule - row.actuel
          const ra = row.recommande - row.actuel
          const rc = row.recommande - row.calcule
          return (
            <div key={i} className="p-4">
              <div className="font-semibold text-slate-900">{row.role}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-600">Actuel</div><div className="text-right">{row.actuel}</div>
                <div className="text-slate-600">Calculé</div><div className="text-right">{row.calcule}</div>
                <div className="text-slate-600">Recommandé</div><div className="text-right">{row.recommande}</div>
                <div className="text-slate-600">Écart C/A</div><div className={["text-right", cls(ca)].join(" ")}>{ca}</div>
                <div className="text-slate-600">Écart R/A</div><div className={["text-right", cls(ra)].join(" ")}>{ra}</div>
                <div className="text-slate-600">Écart R/C</div><div className={["text-right", cls(rc)].join(" ")}>{rc}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AggregateTableBlock({ rows, totals, labelTitle, onRowClick }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-primary text-white">
              <Th className="w-[240px]">{labelTitle}</Th>
              <Th center>Actuel</Th><Th center>Calculé</Th><Th center>Recommandé</Th>
              <Th center>Écart Calculé vs Actuel</Th><Th center>Écart Recommandé vs Actuel</Th><Th center>Écart Recommandé vs Calculé</Th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r, i) => {
              const ca = r.calcule - r.actuel, ra = r.recommande - r.actuel, rc = r.recommande - r.calcule;
              return (
                <tr key={i}
                  onClick={() => onRowClick && onRowClick(r)}
                  className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 transition-colors cursor-pointer"
                  title="Cliquer pour détailler">
                  <Td>{r.label}</Td>
                  <Td center>{r.actuel}</Td><Td center>{r.calcule}</Td><Td center>{r.recommande}</Td>
                  <Td center className={cls(ca)}>{ca}</Td><Td center className={cls(ra)}>{ra}</Td><Td center className={cls(rc)}>{rc}</Td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-medium">
              <Td>TOTAL</Td>
              <Td center>{totals.actuel}</Td><Td center>{totals.calcule}</Td><Td center>{totals.recommande}</Td>
              <Td center className={cls(totals.ecartCA)}>{totals.ecartCA}</Td>
              <Td center className={cls(totals.ecartRA)}>{totals.ecartRA}</Td>
              <Td center className={cls(totals.ecartRC)}>{totals.ecartRC}</Td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-slate-200">
        {(rows || []).map((r, i) => {
          const ca = r.calcule - r.actuel, ra = r.recommande - r.actuel, rc = r.recommande - r.calcule;
          return (
            <div key={i} className="p-4" onClick={() => onRowClick && onRowClick(r)}>
              <div className="font-semibold text-slate-900">{r.label}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-600">Actuel</div><div className="text-right">{r.actuel}</div>
                <div className="text-slate-600">Calculé</div><div className="text-right">{r.calcule}</div>
                <div className="text-slate-600">Recommandé</div><div className="text-right">{r.recommande}</div>
                <div className="text-slate-600">Écart C/A</div><div className={["text-right", cls(ca)].join(" ")}>{ca}</div>
                <div className="text-slate-600">Écart R/A</div><div className={["text-right", cls(ra)].join(" ")}>{ra}</div>
                <div className="text-slate-600">Écart R/C</div><div className={["text-right", cls(rc)].join(" ")}>{rc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartBlock({ data, title, mode = "grouped", target = "recommande" }) {
  // Vue empilée : Actuel + À_couvrir + Surplus
  const stacked = useMemo(() => {
    const tgtKey = target === "calcule" ? "Calcule" : "Recommande";
    return (data || []).map((d) => {
      const actuel = Number(d.Actuel || 0);
      const cible = Number(d[tgtKey] || 0);
      const manque = Math.max(0, cible - actuel);
      const surplus = Math.max(0, actuel - cible);
      return { label: d.label, Actuel: actuel, A_couvrir: manque, Surplus: surplus, Cible: cible };
    });
  }, [data, target]);

  const isStacked = mode === "stacked";
  const dataset = isStacked ? stacked : data;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 h-[440px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dataset} margin={{ top: 8, right: 20, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" angle={-35} textAnchor="end" interval={0} height={60} />
          <YAxis allowDecimals={false} label={{ value: "Nombre de Personnes", angle: -90, position: "insideLeft" }} />
          <Tooltip /><Legend />
          <text x="50%" y={14} textAnchor="middle" dominantBaseline="middle" style={{ fontWeight: 600 }}>
            {isStacked ? `${title} — Empilé vers ${target === "calcule" ? "Calculé" : "Recommandé"}` : title}
          </text>
          {isStacked ? (
            <>
              <Bar dataKey="Actuel" stackId="a" />
              <Bar dataKey="A_couvrir" stackId="a" />
              <Bar dataKey="Surplus" />
            </>
          ) : (
            <>
              <Bar dataKey="Actuel" />
              <Bar dataKey="Calcule" />
              <Bar dataKey="Recommande" />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ——— UI helpers ——— */

function Segment({ value, onChange }) {
  return (
    <div className="inline-flex items-center rounded-md border border-slate-300 overflow-hidden">
      <button onClick={() => onChange("table")}
        className={`px-3 py-1.5 text-xs ${value === "table" ? "bg-primary text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
        Tableau
      </button>
      <button onClick={() => onChange("chart")}
        className={`px-3 py-1.5 text-xs border-l border-slate-300 ${value === "chart" ? "bg-primary text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
        Graphe
      </button>
    </div>
  );
}

function GroupBy({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <label className="text-xs font-medium text-slate-700 hidden md:block">Comparer par</label>
      <div className="relative">
        <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-400 absolute left-2 top-2 pointer-events-none" />
        <select value={value} onChange={(e) => onChange(e.target.value)} className="pl-7 pr-2 h-8 text-xs border rounded bg-white min-w-[9rem]">
          <option value="poste">Poste</option>
          <option value="centre">Centre</option>
          <option value="region">Région</option>
        </select>
      </div>
    </div>
  );
}

function ChartModeToggle({ value, onChange }) {
  return (
    <div className="inline-flex items-center rounded-md border border-slate-300 overflow-hidden">
      <button onClick={() => onChange("grouped")}
        className={`px-2.5 py-1.5 text-xs ${value === "grouped" ? "bg-slate-800 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
        Groupé
      </button>
      <button onClick={() => onChange("stacked")}
        className={`px-2.5 py-1.5 text-xs border-l border-slate-300 ${value === "stacked" ? "bg-slate-800 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
        Empilé
      </button>
    </div>
  );
}

function TargetToggle({ value, onChange }) {
  return (
    <div className="inline-flex items-center rounded-md border border-slate-300 overflow-hidden">
      <button onClick={() => onChange("recommande")}
        className={`px-2.5 py-1.5 text-xs ${value === "recommande" ? "bg-primary text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
        Cible: Recommandé
      </button>
      <button onClick={() => onChange("calcule")}
        className={`px-2.5 py-1.5 text-xs border-l border-slate-300 ${value === "calcule" ? "bg-primary text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
        Cible: Calculé
      </button>
    </div>
  );
}

function Select({ label, icon: Icon, value, onChange, options, placeholder, disabled, compact }) {
  const base = compact ? "h-8 text-xs" : "h-10 text-sm";
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs font-medium text-slate-700 hidden md:block">{label}</label>
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 text-gray-400 absolute left-2 top-2.5 pointer-events-none" />}
        <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}
          className={`pl-7 pr-2 ${base} border rounded ${disabled ? "bg-slate-100 text-slate-400" : "bg-white"} min-w-[9.5rem]`}>
          <option value="">{placeholder || "—"}</option>
          {(options || []).map((o) => (
            <option key={o.id ?? o.value} value={o.id ?? o.value}>{o.name ?? o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Param({ label, value, onChange, step, icon: Icon, suffix }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs font-medium text-slate-700">{label}:</label>
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 text-gray-400 absolute left-2 top-2 pointer-events-none" />}
        {suffix && <span className="absolute right-2 top-1.5 text-[11px] text-slate-400 select-none">{suffix}</span>}
        <input type="number" value={value} step={step || 1} onChange={(e) => onChange(Number(e.target.value))}
          className={`w-28 h-8 border border-slate-300 rounded text-xs ${Icon ? "pl-7" : "pl-2"} ${suffix ? "pr-6" : "pr-2"} text-right`} />
      </div>
    </div>
  );
}

function KpiCard({ title, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[11px] text-slate-500">{title}</div>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function Th({ children, center, className }) {
  return (
    <th className={["px-3 py-2 text-[11px] font-semibold border-r border-white/20", center ? "text-center" : "text-left", className || ""].join(" ")}>
      {children}
    </th>
  );
}

function Td({ children, center, className }) {
  return (
    <td className={["px-3 py-2 text-sm text-slate-900 border-r border-slate-200", center ? "text-center" : "", className || ""].join(" ")}>
      {children}
    </td>
  );
}

function cls(val) { if (val > 0) return "text-green-600"; if (val < 0) return "text-red-600"; return "text-slate-900"; }
function diffVals(a, b, c) { return (a ?? 0) !== (b ?? 0) || (a ?? 0) !== (c ?? 0) || (b ?? 0) !== (c ?? 0); }
function diffRow(r) { return diffVals(r.actuel, r.calcule, r.recommande); }
function diffAggRow(r) { return diffVals(r.actuel, r.calcule, r.recommande); }

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z" />
    </svg>
  );
}
