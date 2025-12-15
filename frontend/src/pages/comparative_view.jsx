"use client"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell
} from "recharts"
import { TrendingDown, TrendingUp, Users, DollarSign, Activity, AlertTriangle, ArrowRight } from "lucide-react"

export default function ComparativeView() {
  const [data, setData] = useState([])
  const [departmentData, setDepartmentData] = useState([])
  const [timelineData, setTimelineData] = useState([])
  const [kpiData, setKPIData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchComparativeData = async () => {
      try {
        // Données de démonstration enrichies
        setData([
          {
            metric: "Effectifs",
            actuel: 1250,
            recommande: 1180,
            ecart: -70,
            pourcentage: -5.6,
          },
          {
            metric: "Coût (K€)",
            actuel: 2500,
            recommande: 2300,
            ecart: -200,
            pourcentage: -8,
          },
          {
            metric: "Productivité (%)",
            actuel: 82,
            recommande: 88,
            ecart: 6,
            pourcentage: 7.3,
          },
        ])
        setDepartmentData([
          {
            departement: "Production",
            actuel: 450,
            recommande: 420,
            cout_actuel: 900,
            cout_recommande: 840,
            productivite_actuel: 78,
            productivite_recommande: 85
          },
          {
            departement: "Commercial",
            actuel: 200,
            recommande: 210,
            cout_actuel: 500,
            cout_recommande: 525,
            productivite_actuel: 88,
            productivite_recommande: 92
          },
          {
            departement: "Support",
            actuel: 180,
            recommande: 165,
            cout_actuel: 360,
            cout_recommande: 330,
            productivite_actuel: 75,
            productivite_recommande: 82
          },
          {
            departement: "IT",
            actuel: 220,
            recommande: 205,
            cout_actuel: 440,
            cout_recommande: 410,
            productivite_actuel: 85,
            productivite_recommande: 90
          },
          {
            departement: "RH/Admin",
            actuel: 200,
            recommande: 180,
            cout_actuel: 300,
            cout_recommande: 195,
            productivite_actuel: 80,
            productivite_recommande: 87
          }
        ])
        setTimelineData([
          { mois: "M1", effectifs: 1250, cout: 2500 },
          { mois: "M3", effectifs: 1230, cout: 2460 },
          { mois: "M6", effectifs: 1210, cout: 2420 },
          { mois: "M9", effectifs: 1195, cout: 2390 },
          { mois: "M12", effectifs: 1180, cout: 2300 }
        ])
        setKPIData([
          { name: "Productivité", actuel: 82, recommande: 88, fullMark: 100 },
          { name: "Satisfaction", actuel: 75, recommande: 82, fullMark: 100 },
          { name: "Qualité", actuel: 80, recommande: 86, fullMark: 100 },
          { name: "Flexibilité", actuel: 70, recommande: 85, fullMark: 100 },
          { name: "Innovation", actuel: 65, recommande: 78, fullMark: 100 }
        ])
      } catch (error) {
        console.error("Erreur lors du chargement des données comparatives:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchComparativeData()
  }, [])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  const costBreakdown = [
    { name: "Salaires", value: 1800, color: '#3b82f6' },
    { name: "Charges", value: 350, color: '#10b981' },
    { name: "Avantages", value: 100, color: '#f59e0b' },
    { name: "Formation", value: 50, color: '#ef4444' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Comparatif Global</h2>
        <p className="text-gray-600">Scénario Actuel vs Scénario Recommandé</p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.map((item) => (
          <Card key={item.metric} className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">{item.metric}</h3>
              {item.metric === "Effectifs" && <Users className="w-5 h-5 text-blue-500" />}
              {item.metric.includes("Coût") && <DollarSign className="w-5 h-5 text-green-500" />}
              {item.metric === "Productivité (%)" && <Activity className="w-5 h-5 text-purple-500" />}
            </div>
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-3xl font-bold text-gray-900">{item.actuel.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Actuel</p>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400 mx-2" />
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">{item.recommande.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Recommandé</p>
              </div>
            </div>
            <div className={`flex items-center text-sm font-semibold p-3 rounded-lg ${
              item.ecart < 0 ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
            }`}>
              {item.ecart < 0 ? <TrendingDown className="w-4 h-4 mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
              {item.ecart > 0 ? "+" : ""}{item.ecart.toLocaleString()}
              <span className="ml-1">({item.pourcentage > 0 ? "+" : ""}{item.pourcentage}%)</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparaison par département */}
        <Card className="p-6 bg-white shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Département</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="departement" tick={{fontSize: 12}} />
              <YAxis />
              <Tooltip
                contentStyle={{backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px'}}
                formatter={(value) => value.toLocaleString()}
              />
              <Legend />
              <Bar dataKey="actuel" fill="#3b82f6" name="Actuel" radius={[8, 8, 0, 0]} />
              <Bar dataKey="recommande" fill="#10b981" name="Recommandé" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Radar chart multi-critères */}
        <Card className="p-6 bg-white shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Multi-Critères</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={kpiData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="name" tick={{fontSize: 12}} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Actuel" dataKey="actuel" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Radar name="Recommandé" dataKey="recommande" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Timeline et Coûts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline de transition */}
        <Card className="p-6 bg-white shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution Projetée sur 12 Mois</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mois" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px'}} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="effectifs"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                name="Effectifs"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="cout"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
                name="Coût (K€)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Répartition des coûts */}
        <Card className="p-6 bg-white shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des Coûts (K€)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={costBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {costBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toLocaleString()} K€`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tableau détaillé par département */}
      <Card className="p-6 bg-white shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyse Détaillée par Département</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Département</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Effectifs Actuel</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Recommandé</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Écart</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Coût Actuel (K€)</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Coût Rec. (K€)</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Économies</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Prod. %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departmentData.map((dept, idx) => {
                const ecartEffectif = dept.recommande - dept.actuel
                const economie = dept.cout_actuel - dept.cout_recommande
                const gainProd = dept.productivite_recommande - dept.productivite_actuel
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{dept.departement}</td>
                    <td className="px-4 py-3 text-center">{dept.actuel}</td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">{dept.recommande}</td>
                    <td className={`px-4 py-3 text-center font-semibold ${ecartEffectif < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {ecartEffectif > 0 ? '+' : ''}{ecartEffectif}
                    </td>
                    <td className="px-4 py-3 text-center">{dept.cout_actuel}</td>
                    <td className="px-4 py-3 text-center">{dept.cout_recommande}</td>
                    <td className={`px-4 py-3 text-center font-semibold ${economie > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {economie > 0 ? '-' : '+'}{Math.abs(economie)}
                    </td>
                    <td className={`px-4 py-3 text-center font-semibold ${gainProd > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                      {dept.productivite_actuel}% → {dept.productivite_recommande}% (+{gainProd}%)
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Insights et recommandations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
          <div className="flex items-center mb-4">
            <TrendingDown className="w-6 h-6 text-blue-700 mr-3" />
            <h3 className="text-lg font-semibold text-blue-900">Gains Potentiels</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <span className="text-sm text-blue-800"><strong>Réduction effectifs:</strong> -70 postes (-5.6%) → Optimisation des ressources</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <span className="text-sm text-blue-800"><strong>Économies annuelles:</strong> -200K€ (-8%) → ROI en 6 mois</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <span className="text-sm text-blue-800"><strong>Gain productivité:</strong> +6% → Amélioration continue</span>
            </li>
          </ul>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-700 mr-3" />
            <h3 className="text-lg font-semibold text-orange-900">Points d'Attention</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3"></span>
              <span className="text-sm text-orange-800"><strong>Commercial:</strong> +10 postes nécessaires pour soutenir la croissance</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3"></span>
              <span className="text-sm text-orange-800"><strong>Formation:</strong> Plan de montée en compétences à prévoir</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3"></span>
              <span className="text-sm text-orange-800"><strong>Transition:</strong> Phase de 12 mois pour atteindre l'objectif</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Call to action */}
      <Card className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold mb-2">Prêt à optimiser vos effectifs ?</h3>
            <p className="text-blue-100">Lancez une simulation détaillée pour affiner ces recommandations</p>
          </div>
          <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center">
            Commencer la Simulation
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </Card>
    </div>
  )
}
