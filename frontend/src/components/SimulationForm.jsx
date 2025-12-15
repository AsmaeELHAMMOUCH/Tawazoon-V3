// src/components/SimulationForm.jsx
"use client"

import { useEffect, useMemo, useState } from "react"
import Button from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { BarChart3, Play } from "lucide-react"
import { api } from "@/lib/api"

export default function SimulationForm({
  initial = {},
  onRun,        // (payload) => void
  onShowChart,  // () => void
}) {
  const [mode, setMode] = useState(initial.mode ?? "actuel")
  const [view, setView] = useState("tableau")

  const [regions, setRegions] = useState([])
  const [categories, setCategories] = useState([])
  const [centres, setCentres] = useState([])
  const [postes, setPostes] = useState([])

  const [loading, setLoading] = useState({ regions: false, categories: false, centres: false, postes: false })
  const [errors, setErrors] = useState({ regions: "", categories: "", centres: "", postes: "" })

  const [formData, setFormData] = useState({
    regionId: initial.regionId ?? "",
    categorieId: initial.categorieId ?? "",
    centreId: initial.centreId ?? "",
    posteId: initial.posteId ?? "",
    // volumes
    sacs: initial.sacs ?? "150",
    colis: initial.colis ?? "80",
    courrier: initial.courrier ?? "500",
    productivite: initial.productivite ?? "85",
    heuresNet: initial.heuresNet ?? "7.2",
  })

  // Load regions + categories on mount
  useEffect(() => {
    let cancelled = false
    async function loadRegions() {
      try {
        setLoading(l => ({ ...l, regions: true }))
        setErrors(e => ({ ...e, regions: "" }))
        const data = await api.regions()
        if (!cancelled) setRegions(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) {
          setRegions([])
          setErrors(er => ({ ...er, regions: e?.message || "Impossible de charger les régions." }))
        }
      } finally {
        if (!cancelled) setLoading(l => ({ ...l, regions: false }))
      }
    }
    async function loadCategories() {
      try {
        setLoading(l => ({ ...l, categories: true }))
        setErrors(e => ({ ...e, categories: "" }))
        const data = await api.categories()
        if (!cancelled) setCategories(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) {
          setCategories([])
          setErrors(er => ({ ...er, categories: e?.message || "Impossible de charger les catégories." }))
        }
      } finally {
        if (!cancelled) setLoading(l => ({ ...l, categories: false }))
      }
    }
    loadRegions()
    loadCategories()
    return () => { cancelled = true }
  }, [])

  // Load centres when region changes
  useEffect(() => {
    let cancelled = false
    async function loadCentres() {
      if (!formData.regionId) { setCentres([]); setFormData(f => ({ ...f, centreId: "", posteId: "" })); return }
      try {
        setLoading(l => ({ ...l, centres: true }))
        setErrors(e => ({ ...e, centres: "" }))
        const data = await api.centres(formData.regionId)
        if (!cancelled) setCentres(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) {
          setCentres([])
          setErrors(er => ({ ...er, centres: e?.message || "Impossible de charger les centres." }))
        }
      } finally {
        if (!cancelled) setLoading(l => ({ ...l, centres: false }))
      }
    }
    loadCentres()
    return () => { cancelled = true }
  }, [formData.regionId])

  // Load postes when centre changes
  useEffect(() => {
    let cancelled = false
    async function loadPostes() {
      if (!formData.centreId) { setPostes([]); setFormData(f => ({ ...f, posteId: "" })); return }
      try {
        setLoading(l => ({ ...l, postes: true }))
        setErrors(e => ({ ...e, postes: "" }))
        const data = await api.postes(formData.centreId)
        if (!cancelled) setPostes(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) {
          setPostes([])
          setErrors(er => ({ ...er, postes: e?.message || "Impossible de charger les postes." }))
        }
      } finally {
        if (!cancelled) setLoading(l => ({ ...l, postes: false }))
      }
    }
    loadPostes()
    return () => { cancelled = true }
  }, [formData.centreId])

  const canRun = useMemo(
    () => Boolean(mode && formData.regionId && formData.centreId && formData.posteId),
    [mode, formData.regionId, formData.centreId, formData.posteId]
  )

  const handleRun = () => {
    if (!canRun) return
    onRun?.({
      mode,
      region_id: formData.regionId,
      centre_id: formData.centreId,
      poste_id: formData.posteId,
      params: {
        sacs_jour: Number(formData.sacs || 0),
        colis_jour: Number(formData.colis || 0),
        courrier_jour: Number(formData.courrier || 0),
        productivite_pct: Number(formData.productivite || 0),
        heures_net_jour: Number(formData.heuresNet || 0),
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Simulation des Effectifs</h2>
        <p className="text-gray-600">Configurez vos paramètres puis lancez la simulation.</p>
      </div>

      <Card className="p-4 md:p-5 shadow-lg border border-gray-200">
        <div className="space-y-4">
          {/* Affichage */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide mr-2">
              Affichage
            </span>
            <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
              <button type="button" onClick={() => setView("tableau")} className={`px-3 py-1.5 text-xs md:text-sm ${view === "tableau" ? "bg-[#005EA8] text-white" : "bg-white hover:bg-gray-50"}`}>Tableau</button>
              <button type="button" onClick={() => { setView("graphe"); onShowChart?.({ region: formData.regionId }) }} className={`px-3 py-1.5 text-xs md:text-sm ${view === "graphe" ? "bg-[#005EA8] text-white" : "bg-white hover:bg-gray-50"}`}>Graphe</button>
            </div>
          </div>

          {/* Mode */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide mr-2">Mode</span>
            <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
              <button type="button" onClick={() => setMode("actuel")} className={`px-3 py-1.5 text-xs md:text-sm ${mode === "actuel" ? "bg-[#005EA8] text-white" : "bg-white hover:bg-gray-50"}`}>Actuel</button>
              <button type="button" onClick={() => setMode("recommande")} className={`px-3 py-1.5 text-xs md:text-sm ${mode === "recommande" ? "bg-[#005EA8] text-white" : "bg-white hover:bg-gray-50"}`}>Recommandé</button>
            </div>
          </div>

          {/* Paramètres principaux */}
          <div>
            <h3 className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Paramètres Principaux</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Région */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">Région</label>
                <select
                  value={formData.regionId}
                  onChange={(e) => setFormData({ ...formData, regionId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005EA8] focus:border-transparent transition-all"
                >
                  <option value="">{loading.regions ? "Chargement..." : "Sélectionner"}</option>
                  {(regions || []).map((r) => (
                    <option key={r.id} value={r.id}>{r.label ?? r.name}</option>
                  ))}
                </select>
                {errors.regions && <p className="mt-1 text-xs text-red-600">{errors.regions}</p>}
              </div>
              {/* Catégorie */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">Catégorie</label>
                <select
                  value={formData.categorieId}
                  onChange={(e) => setFormData({ ...formData, categorieId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005EA8] focus:border-transparent transition-all"
                >
                  <option value="">{loading.categories ? "Chargement..." : "Sélectionner"}</option>
                  {(categories || []).map((c) => (
                    <option key={c.id ?? c.label} value={c.id ?? c.label}>{c.label ?? String(c)}</option>
                  ))}
                </select>
                {errors.categories && <p className="mt-1 text-xs text-red-600">{errors.categories}</p>}
              </div>
              {/* Centre */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">Centre</label>
                <select
                  value={formData.centreId}
                  onChange={(e) => setFormData({ ...formData, centreId: e.target.value, posteId: "" })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005EA8] focus:border-transparent transition-all"
                >
                  <option value="">{loading.centres ? "Chargement..." : "Sélectionner"}</option>
                  {(centres || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                {errors.centres && <p className="mt-1 text-xs text-red-600">{errors.centres}</p>}
              </div>
              {/* Poste */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">Poste</label>
                <select
                  value={formData.posteId}
                  onChange={(e) => setFormData({ ...formData, posteId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005EA8] focus:border-transparent transition-all"
                >
                  <option value="">{loading.postes ? "Chargement..." : "Sélectionner"}</option>
                  {(postes || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                {errors.postes && <p className="mt-1 text-xs text-red-600">{errors.postes}</p>}
              </div>
            </div>
          </div>

          {/* Volumes et Productivité */}
          <div className="border-t border-gray-200" />
          <div>
            <h3 className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Volumes et Productivité</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
              {[
                { key: "sacs", label: "Sacs/Jour", type: "number" },
                { key: "colis", label: "Colis/Jour", type: "number" },
                { key: "courrier", label: "Courrier/Jour", type: "number" },
                { key: "productivite", label: "Productivité (%)", type: "number" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">{f.label}</label>
                  <input
                    type={f.type}
                    value={formData[f.key]}
                    onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005EA8] focus:border-transparent transition-all"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">Heures Net/Jour</label>
                <input
                  type="text"
                  value={formData.heuresNet}
                  onChange={(e) => setFormData({ ...formData, heuresNet: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200" />
          <div className="flex flex-wrap gap-3 pt-2">
            <Button disabled={!canRun} onClick={handleRun} className="bg-[#005EA8] hover:bg-[#004a87] text-white px-6 py-2.5 rounded-md font-medium transition-all shadow-sm disabled:opacity-60">
              <Play className="w-4 h-4 mr-2" />
              Lancer Simulation
            </Button>
            <Button variant="outline" onClick={() => onShowChart?.({ region: formData.regionId })} className="border-[#0074CC] text-[#0074CC] hover:bg-[#0074CC] hover:text-white bg-white px-6 py-2.5 rounded-md font-medium transition-all">
              <BarChart3 className="w-4 h-4 mr-2" />
              Afficher Graphe
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

