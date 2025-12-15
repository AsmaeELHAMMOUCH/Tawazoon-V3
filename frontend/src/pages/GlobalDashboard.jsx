// src/pages/GlobalDashboard.jsx
"use client"

import { useMemo, useState, useEffect } from "react"
import {
  Info, BarChart3, PieChart, Activity, Users, Clock, TrendingUp,
  MapPin, Building, CalendarDays, Download, Filter, ArrowUpRight, ArrowDownRight
} from "lucide-react"

// ---------- UI PRIMS ----------
function Card({ title, actions, children }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {(title || actions) && (
        <header className="h-12 px-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-slate-600 tracking-wide flex items-center gap-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#005EA8]" />} {label}
      </span>
      {children}
    </label>
  )
}

function Select(props) {
  return (
    <select
      {...props}
      className="h-9 rounded-md border border-slate-300 px-2.5 text-[13px] outline-none
                 focus:ring-2 focus:ring-[#005EA8] focus:border-[#005EA8] bg-white"
    />
  )
}

function Input(props) {
  return (
    <input
      {...props}
      className="h-9 rounded-md border border-slate-300 px-2.5 text-[13px] outline-none
                 focus:ring-2 focus:ring-[#005EA8] focus:border-[#005EA8] bg-white disabled:bg-slate-50"
    />
  )
}

function Segmented({ value, onChange, items }) {
  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {items.map(it => {
        const active = value === it.value
        return (
          <button
            key={it.value}
            aria-selected={active}
            onClick={() => onChange?.(it.value)}
            className={
              "h-8 px-3 rounded-md text-[13px] transition " +
              (active ? "bg-[#005EA8] text-white shadow-sm" : "text-[#005EA8] hover:bg-white")
            }
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

function HelpPopover({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        {children}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Aide - Tableau de bord global"
          className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)]
                     rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xl z-50"
        >
          <div className="absolute -top-2 right-6 h-3 w-3 rotate-45 bg-white border-l border-t border-slate-200" />
          <div className="p-4 space-y-3 text-sm">
            <div className="font-semibold text-slate-900">Comment lire ce tableau de bord ?</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Filtrez par <b>Région</b>, <b>Centre</b> et <b>Période</b> en haut.</li>
              <li>Les KPI montrent l’état global (ETP, charge, productivité, retards).</li>
              <li>Les graphiques comparent <b>Actuel vs Recommandé</b> et l’évolution dans le temps.</li>
              <li>Exportez les vues via le bouton <b>Exporter</b> dans les en-têtes.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- PAGE ----------
export default function GlobalDashboard() {
  // Filtres
  const [region, setRegion] = useState("")
  const [centre, setCentre] = useState("")
  const [periode, setPeriode] = useState("mois") // jour | semaine | mois | trimestre
  const [mode, setMode] = useState("actuel")     // actuel | recommande
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Données (mock – brancher vos endpoints)
  const [regions, setRegions] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // TODO: remplacer par vos appels réels (api.regions(), api.centres(region))
    setRegions([{ id: 1, label: "Nord" }, { id: 2, label: "Sud" }, { id: 3, label: "Est" }, { id: 4, label: "Ouest" }])
  }, [])
  useEffect(() => {
    if (!region) { setCentres([]); return }
    // TODO: appeler backend selon region
    setCentres([{ id: 10, label: "Centre A" }, { id: 11, label: "Centre B" }])
  }, [region])

  // KPI simulés
  const kpi = useMemo(() => ([
    { label: "ETP Actuels", value: 128, delta: +2.3, icon: Users },
    { label: "ETP Recommandés", value: 121, delta: -1.1, icon: TrendingUp },
    { label: "Charge (h/j)", value: 892, delta: +0.7, icon: Clock },
    { label: "Productivité (%)", value: 86.4, delta: +0.4, icon: Activity },
  ]), [])

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <div className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-slate-200">
        <div className="px-6 py-3 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">Tableau de bord global</h1>
            <p className="text-sm text-slate-600">Vue consolidée des effectifs et de la charge, par centre et période.</p>
          </div>
          <HelpPopover>
            <Info className="w-4 h-4" />
            Aide
          </HelpPopover>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Filtres */}
        <Card
          title="Filtres"
          actions={
            <div className="flex items-center gap-2">
              <Segmented
                value={mode}
                onChange={setMode}
                items={[
                  { value: "actuel", label: "Actuel" },
                  { value: "recommande", label: "Recommandé" },
                ]}
              />
              <button className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-[13px] border border-slate-300 hover:bg-slate-50">
                <Filter className="w-4 h-4" /> Appliquer
              </button>
              <button className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-[13px] border border-slate-300 hover:bg-slate-50">
                <Download className="w-4 h-4" /> Exporter
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Field label="Région" icon={MapPin}>
              <Select value={region} onChange={e => setRegion(e.target.value)}>
                <option value="">Toutes</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </Select>
            </Field>
            <Field label="Centre" icon={Building}>
              <Select value={centre} onChange={e => setCentre(e.target.value)} disabled={!region}>
                <option value="">{region ? "Tous" : "Sélectionnez une région"}</option>
                {centres.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Période" icon={CalendarDays}>
              <Select value={periode} onChange={e => setPeriode(e.target.value)}>
                <option value="jour">Jour</option>
                <option value="semaine">Semaine</option>
                <option value="mois">Mois</option>
                <option value="trimestre">Trimestre</option>
              </Select>
            </Field>
            <Field label="Du">
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </Field>
            <Field label="Au">
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpi.map((k, i) => {
            const Icon = k.icon
            const positive = k.delta >= 0
            return (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <div className="text-[12px] text-slate-600">{k.label}</div>
                  <Icon className="w-4 h-4 text-[#005EA8]" />
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div className="text-2xl font-bold text-slate-900">{k.value}</div>
                  <div className={"text-xs inline-flex items-center gap-1 " + (positive ? "text-emerald-600" : "text-rose-600")}>
                    {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {Math.abs(k.delta)}%
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card
            title="ETP — Actuel vs Recommandé (par centre)"
            actions={<button className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-[12px] border border-slate-300 hover:bg-slate-50"><Download className="w-3.5 h-3.5" /> Exporter</button>}
          >
            <div className="h-64 grid place-items-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
              {/* Remplace par ton graphique barres */}
              <div className="flex items-center gap-2 text-sm"><BarChart3 className="w-4 h-4"/> Graphique ici</div>
            </div>
          </Card>

          <Card
            title="Charge & Productivité — Évolution"
            actions={<button className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-[12px] border border-slate-300 hover:bg-slate-50"><Download className="w-3.5 h-3.5" /> Exporter</button>}
          >
            <div className="h-64 grid place-items-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
              {/* Remplace par ton line chart */}
              <div className="flex items-center gap-2 text-sm"><Activity className="w-4 h-4"/> Graphique ici</div>
            </div>
          </Card>
        </div>

        {/* Tableaux synthèse */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card
            title="Top écarts ETP (centres)"
            actions={<button className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-[12px] border border-slate-300 hover:bg-slate-50"><Download className="w-3.5 h-3.5" /> CSV</button>}
          >
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2">Centre</th>
                    <th className="text-right px-3 py-2">ETP Actuel</th>
                    <th className="text-right px-3 py-2">ETP Reco.</th>
                    <th className="text-right px-3 py-2">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { c: "Centre A", a: 32, r: 29 },
                    { c: "Centre B", a: 28, r: 31 },
                    { c: "Centre C", a: 17, r: 15 },
                  ].map((row, i) => {
                    const ecart = row.a - row.r
                    const cls = ecart >= 0 ? "text-emerald-600" : "text-rose-600"
                    return (
                      <tr key={i} className="odd:bg-white even:bg-slate-50">
                        <td className="px-3 py-2">{row.c}</td>
                        <td className="px-3 py-2 text-right">{row.a}</td>
                        <td className="px-3 py-2 text-right">{row.r}</td>
                        <td className={"px-3 py-2 text-right font-medium " + cls}>{ecart}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="Alertes / Retards"
            actions={<button className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-[12px] bg-red-600 text-white hover:bg-red-700"><Download className="w-3.5 h-3.5" /> PDF</button>}
          >
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2">Centre</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-right px-3 py-2">Nb cas</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { c: "Centre B", t: "Retard traitement", n: 7 },
                    { c: "Centre A", t: "Absences", n: 3 },
                    { c: "Centre C", t: "Surcharge pic", n: 2 },
                  ].map((r, i) => (
                    <tr key={i} className="odd:bg-white even:bg-slate-50">
                      <td className="px-3 py-2">{r.c}</td>
                      <td className="px-3 py-2">{r.t}</td>
                      <td className="px-3 py-2 text-right">{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
