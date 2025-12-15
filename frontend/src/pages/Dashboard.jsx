// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChartBarIcon, CurrencyDollarIcon, ArrowTrendingUpIcon, ClockIcon,
  UsersIcon, BuildingOffice2Icon, MapPinIcon, MapIcon, AdjustmentsHorizontalIcon, PlusIcon
} from '@heroicons/react/24/outline'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

/* ======================== Helpers ======================== */
function formatMoney(v){
  try{
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(Number(v||0)/1000)) + 'K'
  }catch{ return v }
}

const ACCENTS = {
  blue:   { stripe: 'from-sky-500 to-blue-600',      icon: 'text-sky-400' },
  violet: { stripe: 'from-fuchsia-500 to-violet-600', icon: 'text-fuchsia-400' },
  emerald:{ stripe: 'from-emerald-500 to-teal-600',   icon: 'text-emerald-400' },
  amber:  { stripe: 'from-amber-500 to-orange-600',   icon: 'text-amber-400' },
}

/* ======================== UI Atomes ======================== */
function GhostIcon({ icon, accent='blue' }) {
  const Icon = icon
  return (
    <div className={`absolute top-2 right-2 opacity-20 ${ACCENTS[accent]?.icon ?? ACCENTS.blue.icon}`}>
      <Icon className="w-4 h-4" />
    </div>
  )
}

function Kpi({ label, value, unit, icon = ClockIcon, accent = 'blue' }) {
  const stripe = ACCENTS[accent]?.stripe ?? ACCENTS.blue.stripe
  return (
    <div className="relative rounded-xl bg-white shadow-sm border border-slate-200 p-3 overflow-hidden">
      <span className={`pointer-events-none absolute inset-y-0 left-0 w-[6px] rounded-l-2xl bg-gradient-to-b ${stripe}`} />
      <GhostIcon icon={icon} accent={accent} />
      <div className="text-slate-500 text-[13px]">{label}</div>
      <div className="mt-0.5 text-slate-900 font-extrabold text-lg">
        {value ?? '—'}{unit ? ` ${unit}` : ''}
      </div>
    </div>
  )
}

function Card({ title, children, right }){
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-slate-900 font-semibold text-[15px]">{title}</div>
        {right}
      </div>
      {children}
    </div>
  )
}

function FilterSelect({ label, icon:Icon, value, onChange, options, placeholder='—', disabled=false }) {
  return (
    <label className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-slate-600 text-sm">
        {Icon && <Icon className="w-4 h-4" />} <span>{label}</span>
      </div>
      <select
        className="ml-1 min-w-[150px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-100"
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {Array.isArray(options) && options.map(o => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </label>
  )
}

function SegmentedProcess({ value, onChange }) {
  const items = [
    { key: 'actual', label: 'Actuel' },
    { key: 'recommended', label: 'Recommandé' },
    { key: 'compare', label: 'Compare' },
  ]
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5">
      {items.map(it => (
        <button
          key={it.key}
          className={[
            "px-2.5 py-1 text-[13px] rounded-md",
            value === it.key
              ? "bg-white text-slate-900 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          ].join(' ')}
          onClick={()=>onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

/* ======================== Dashboard ======================== */
export default function Dashboard(){
  const navigate = useNavigate()

  // Filtres hiérarchiques
  const [directionId, setDirectionId] = useState(null)
  const [regionId, setRegionId]       = useState(null)
  const [centreId, setCentreId]       = useState(null)
  const [typeId, setTypeId]           = useState(null)
  const [period, setPeriod]           = useState('last_6m') // ex: last_6m, ytd, last_12m

  // Processus
  const [process, setProcess] = useState('actual') // actual | recommended | compare

  // Options filtres
  const [directions, setDirections] = useState([])
  const [regions, setRegions]       = useState([])
  const [centres, setCentres]       = useState([])
  const [types, setTypes]           = useState([])

  // Données
  const [kpis, setKpis]             = useState(null)
  const [staffing, setStaffing]     = useState([])
  const [costSeries, setCostSeries] = useState([])
  const [centresRows, setCentresRows] = useState([])

  // UI
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  /* ------ Charger options filtres ------ */
  useEffect(() => {
    let cancelled = false
    async function loadDirections(){
      try{
        const r = await fetch(`${API_BASE}/filters/directions`)
        const data = r.ok ? await r.json() : []
        if (!cancelled) setDirections(data)
        // auto-select first if none
        if (!cancelled && !directionId && data?.length) setDirectionId(String(data[0].id))
      }catch(e){/* ignore */}
    }
    loadDirections()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!directionId){ setRegions([]); setRegionId(null); return }
    let cancelled = false
    async function loadRegions(){
      try{
        const r = await fetch(`${API_BASE}/filters/regions?direction_id=${encodeURIComponent(directionId)}`)
        const data = r.ok ? await r.json() : []
        if (!cancelled) setRegions(data)
        if (!cancelled){ setRegionId(data?.[0]?.id ? String(data[0].id) : null) }
      }catch(e){/* ignore */}
    }
    loadRegions()
    return () => { cancelled = true }
  }, [directionId])

  useEffect(() => {
    if (!regionId){ setCentres([]); setCentreId(null); return }
    let cancelled = false
    async function loadCentres(){
      try{
        const r = await fetch(`${API_BASE}/filters/centres?region_id=${encodeURIComponent(regionId)}`)
        const data = r.ok ? await r.json() : []
        if (!cancelled) setCentres(data)
        if (!cancelled){ setCentreId(data?.[0]?.id ? String(data[0].id) : null) }
      }catch(e){/* ignore */}
    }
    loadCentres()
    return () => { cancelled = true }
  }, [regionId])

  useEffect(() => {
    if (!centreId){ setTypes([]); setTypeId(null); return }
    let cancelled = false
    async function loadTypes(){
      try{
        const r = await fetch(`${API_BASE}/filters/types?centre_id=${encodeURIComponent(centreId)}`)
        const data = r.ok ? await r.json() : []
        if (!cancelled) setTypes(data)
        if (!cancelled){ setTypeId(data?.[0]?.id ? String(data[0].id) : null) }
      }catch(e){/* ignore */}
    }
    loadTypes()
    return () => { cancelled = true }
  }, [centreId])

  /* ------ Charger données dashboard ------ */
  useEffect(() => {
    let cancelled = false
    async function loadAll(){
      try{
        setLoading(true); setError('')
        const scope = centreId ? 'centre' : regionId ? 'region' : directionId ? 'direction' : 'global'
        const scopeId = centreId ?? regionId ?? directionId ?? ''
        const qsBase = `scope=${scope}&id=${encodeURIComponent(scopeId)}&process=${encodeURIComponent(process)}&period=${encodeURIComponent(period)}`
        const typeQS = typeId ? `&type_id=${encodeURIComponent(typeId)}` : ''

        const [rk, rs, rc, rt] = await Promise.all([
          fetch(`${API_BASE}/dashboard/kpis?${qsBase}${typeQS}`),
          fetch(`${API_BASE}/dashboard/staffing?${qsBase}${typeQS}`),
          fetch(`${API_BASE}/dashboard/costs?${qsBase}${typeQS}`),
          fetch(`${API_BASE}/dashboard/centres?${qsBase}${typeQS}`),
        ])

        const k  = rk.ok ? await rk.json() : null
        const st = rs.ok ? await rs.json() : []
        const cs = rc.ok ? await rc.json() : []
        const tb = rt.ok ? await rt.json() : []

        if (!cancelled){
          setKpis(k)
          setStaffing(Array.isArray(st) ? st : [])
          setCostSeries(Array.isArray(cs) ? cs : [])
          setCentresRows(Array.isArray(tb) ? tb : [])
        }
      }catch(e){
        if (!cancelled) setError("Chargement des données échoué")
      }finally{
        if (!cancelled) setLoading(false)
      }
    }
    loadAll()
    return () => { cancelled = true }
  }, [directionId, regionId, centreId, typeId, period, process])

  /* ------ Dérivés graphiques ------ */
  const staffingBars = useMemo(() => {
    if (!Array.isArray(staffing) || staffing.length === 0){
      return [
        { label:'Actuel', value: 0 },
        { label:'Calculé', value: 0 },
        { label:'Recommandé', value: 0 },
      ]
    }
    const total = staffing.reduce((acc, r) => {
      acc.actuel += Number(r.actuel||0)
      acc.calcule += Number(r.calcule||0)
      acc.recommande += Number(r.recommande||0)
      return acc
    }, { actuel:0, calcule:0, recommande:0 })
    return [
      { label:'Actuel', value: total.actuel },
      { label:'Calculé', value: total.calcule },
      { label:'Recommandé', value: total.recommande },
    ]
  }, [staffing])

  const masseMensuelle = useMemo(() => {
    // Si l'API renvoie déjà la série: utiliser costSeries
    if (Array.isArray(costSeries) && costSeries.length){
      return costSeries // [{ mois:'Jan', actuel: 280, recommande: 140 }, ...]
    }
    // Fallback simple
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun']
    return months.map((m)=>({ mois:m, actuel: 280, recommande: 140 }))
  }, [costSeries])

  /* ------ Actions ------ */
  function handleNewSimulation(){
    // Transmets tout le contexte courant via querystring
    const qs = new URLSearchParams({
      direction_id: directionId || '',
      region_id: regionId || '',
      centre_id: centreId || '',
      type_id: typeId || '',
      period: period || '',
      process: process || '',
    }).toString()
    try {
      navigate(`/simulations/new?${qs}`)
    } catch {
      console.log('New simulation with context:', qs)
    }
  }

  /* ======================== Render ======================== */
  return (
    <>
      <div className="space-y-4">
        {/* Header + filtres */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Tableau de Bord</h1>
            <p className="text-slate-500 text-[13px]">Vue d'ensemble de vos simulations RH</p>
          </div>
          <div className="flex items-center gap-2">
            <SegmentedProcess value={process} onChange={setProcess} />
            <button
              onClick={handleNewSimulation}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-white font-semibold hover:opacity-90 text-[13px]"
              title="Nouvelle simulation"
            >
              <PlusIcon className="w-4 h-4" /> Nouvelle simulation
            </button>
          </div>
        </div>

        {/* Bande de filtres supprimée à la demande */}

        {(loading || error) && (
          <div className="text-sm">
            {loading && <span className="text-slate-500">Chargement…</span>}
            {error && <span className="text-red-600 ml-3">{error}</span>}
          </div>
        )}

        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Effectif Recommandé"
            value={kpis?.effectif_recommande}
            unit=""
            icon={UsersIcon}
            accent="violet"
          />
          <Kpi
            label="Économies Annuelles"
            value={kpis ? formatMoney(kpis.economies_annuelles_mad) : '—'}
            unit="MAD"
            icon={CurrencyDollarIcon}
            accent="amber"
          />
          <Kpi
            label="Indice d'Adéquation"
            value={kpis ? kpis.indice_adequation_pct : '—'}
            unit="%"
            icon={ArrowTrendingUpIcon}
            accent="emerald"
          />
          <Kpi
            label="Productivité"
            value={kpis ? kpis.productivite_pct : '—'}
            unit="%"
            icon={ChartBarIcon}
            accent="blue"
          />
        </div>

        {/* Graphiques */}
        <div className="grid gap-3 lg:grid-cols-2">
          <Card title="Comparaison des Effectifs">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffingBars} barSize={50}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0B63CE" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Évolution des Masses Salariales">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={masseMensuelle} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actuel" name="Actuel (KMAD)" stroke="#0B63CE" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="recommande" name="Recommandé (KMAD)" stroke="#10B981" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Tableau comparatif Centres */}
        <Card
          title="Centres – comparatif (Actuel / Recommandé)"
          right={<span className="text-xs text-slate-500">Tri & filtres avancés à venir</span>}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-[13px]">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Centre</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Actuel</th>
                  <th className="py-2 pr-4">Recommandé</th>
                  <th className="py-2 pr-4">Écart</th>
                  <th className="py-2 pr-4">Indice (%)</th>
                  <th className="py-2 pr-4">Économie (MAD)</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {(centresRows.length ? centresRows : [
                  // Fallback si l'API n'est pas prête
                  { id: 1, centre: 'Agdal', type: 'Courrier', actuel: 12, recommande: 9, indice: 94, economie_mad: 240000 },
                  { id: 2, centre: 'Yacoub', type: 'Distribution', actuel: 18, recommande: 15, indice: 96, economie_mad: 320000 },
                ]).map((r) => {
                  const ecart = Number(r.recommande||0) - Number(r.actuel||0)
                  return (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-4 font-medium text-slate-900">{r.centre}</td>
                      <td className="py-2 pr-4 text-slate-700">{r.type}</td>
                      <td className="py-2 pr-4">{r.actuel}</td>
                      <td className="py-2 pr-4">{r.recommande}</td>
                      <td className={`py-2 pr-4 font-medium ${ecart <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{ecart}</td>
                      <td className="py-2 pr-4">{r.indice}</td>
                      <td className="py-2 pr-4">{formatMoney(r.economie_mad)} MAD</td>
                      <td className="py-2 pr-4">
                        <button className="text-primary font-semibold">Voir</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Simulations récentes */}
        <Card title="Simulations récentes">
          <div className="space-y-3">
            {[
              { id: 'S-1024', name:'Hypothèse 2026 – Prod 85% – 7.2h/j', scope:'Région Rabat-Salé', date:'03 Oct 2025' },
              { id: 'S-1017', name:'Plan centre Agdal – Prod 90%', scope:'Centre Agdal', date:'28 Sep 2025' },
            ].map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <div>
                  <div className="font-semibold text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.scope} • {s.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">Complété</span>
                  <button className="text-primary font-semibold" onClick={()=>navigate(`/simulations/${s.id}`)}>Voir</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <footer className="py-6 text-center text-sm text-slate-500">
          © 2025 – ALMAV GROUP. Tous droits réservés.
        </footer>
      </div>
    </>
  )
}
