"use client"

import { useState } from "react"
import { Play, BarChart3, RefreshCcw } from "lucide-react"

export default function SimulationParams() {
  const [formData, setFormData] = useState({
    region: "",
    categorie: "Activité Postale",
    centre: "",
    poste: "Tous",
    sacs: "",
    colis: "",
    courrier: "",
    productivite: "",
    heuresNet: "7.2",
  })

  const [mode, setMode] = useState("actuel")

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#005EA8] focus:border-transparent transition-all"

  const labelClass = "block text-xs font-medium text-gray-700 mb-1"

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Simulation des Effectifs</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configurez les paramètres de votre simulation pour analyser les effectifs.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex items-center gap-2">
        {["actuel", "recommandé"].map((item) => (
          <button
            key={item}
            onClick={() => setMode(item)}
            className={`px-4 py-1.5 text-sm rounded-md border font-medium capitalize transition-all ${
              mode === item
                ? "bg-[#005EA8] text-white border-[#005EA8]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Paramètres Principaux */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          Paramètres Principaux
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Région</label>
            <select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className={inputClass}
            >
              <option value="">Sélectionner...</option>
              <option>Casablanca</option>
              <option>Rabat</option>
              <option>Tanger</option>
              <option>Marrakech</option>
              <option>Fès</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Catégorie</label>
            <select
              value={formData.categorie}
              onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
              className={inputClass}
            >
              <option>Activité Postale</option>
              <option>Activité Financière</option>
              <option>Activité Logistique</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Centre</label>
            <select
              value={formData.centre}
              onChange={(e) => setFormData({ ...formData, centre: e.target.value })}
              className={inputClass}
            >
              <option value="">Sélectionner...</option>
              <option>Centre Principal</option>
              <option>Centre Annexe A</option>
              <option>Centre Annexe B</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Poste</label>
            <select
              value={formData.poste}
              onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
              className={inputClass}
            >
              <option>Tous</option>
              <option>Guichetier</option>
              <option>Facteur</option>
              <option>Trieur</option>
              <option>Superviseur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Volumes & Productivité */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          Volumes et Productivité
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className={labelClass}>Sacs/Jour</label>
            <input
              type="number"
              value={formData.sacs}
              onChange={(e) => setFormData({ ...formData, sacs: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Colis/Jour</label>
            <input
              type="number"
              value={formData.colis}
              onChange={(e) => setFormData({ ...formData, colis: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Courrier/Jour</label>
            <input
              type="number"
              value={formData.courrier}
              onChange={(e) => setFormData({ ...formData, courrier: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Productivité (%)</label>
            <input
              type="number"
              value={formData.productivite}
              onChange={(e) => setFormData({ ...formData, productivite: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Heures Net/Jour</label>
            <input
              type="text"
              value={formData.heuresNet}
              readOnly
              className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button className="flex items-center bg-[#005EA8] hover:bg-[#004a87] text-white px-5 py-2 rounded-md text-sm font-medium shadow-sm transition">
          <Play className="w-4 h-4 mr-2" />
          Lancer Simulation
        </button>

        <button className="flex items-center border border-[#0074CC] text-[#0074CC] hover:bg-[#0074CC] hover:text-white px-5 py-2 rounded-md text-sm font-medium transition">
          <BarChart3 className="w-4 h-4 mr-2" />
          Afficher Graphe
        </button>

        <button className="flex items-center border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-2 rounded-md text-sm font-medium transition">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Réinitialiser
        </button>
      </div>
    </div>
  )
}
