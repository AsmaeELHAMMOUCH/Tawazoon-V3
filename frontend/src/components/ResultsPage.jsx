import { useCallback } from 'react'
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ClockIcon,
  BookOpenIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

export default function ResultsPage({ onBack, onNavigate }) {
  const globalViewCards = [
    { icon: ArrowTrendingUpIcon, label: 'Tableau De Bord Global' },
    { icon: ChartPieIcon, label: 'Ratios' },
    { icon: CurrencyDollarIcon, label: 'Economies Budgétaires Estimées' },
    { icon: UsersIcon, label: 'Comparatif Positions' },
    { icon: ArrowTrendingDownIcon, label: 'Projection' },
  ]

  const currentProcessCards = [
    { icon: UsersIcon, label: 'Simulation Par Position' },
    { icon: DocumentTextIcon, label: 'Simulation Globale' },
    { icon: BookOpenIcon, label: 'Normes de dimensionnement' },
    { icon: ClockIcon, label: 'Chronogramme de Traitement Unitaire' },
    { icon: BookOpenIcon, label: 'Référentiel' },
    { icon: Cog6ToothIcon, label: 'Schéma Process' },
  ]

  const recommendedProcessCards = [
    { icon: UsersIcon, label: 'Simulation Par Position recommandé' },
    { icon: DocumentTextIcon, label: 'Simulation Globale recommandé' },
    { icon: BookOpenIcon, label: 'Normes de dimensionnement recommandé' },
    { icon: ClockIcon, label: 'Chronogramme de Traitement Unitaire recommandé' },
    { icon: BookOpenIcon, label: 'Référentiel recommandé' },
    { icon: Cog6ToothIcon, label: 'Schéma Process recommandé' },
  ]

  const handleCardClick = useCallback((label) => {
    if (!onNavigate) return
    if (label === 'Tableau De Bord Global') onNavigate('global-dashboard')
    else if (label === 'Ratios') onNavigate('productivity-ratios')
    else if (label === 'Economies Budgétaires Estimées') onNavigate('budget-savings')
    else if (label === 'Comparatif Positions') onNavigate('position-comparison')
  }, [onNavigate])

  const Section = ({ title, cards, clickable }) => (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <button
            key={idx}
            onClick={clickable ? () => handleCardClick(card.label) : undefined}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 flex items-center gap-4 text-left border border-gray-200 hover:border-[#005EA8]"
          >
            <div className="flex-shrink-0">
              <card.icon className="w-8 h-8 text-[#005EA8]" />
            </div>
            <span className="text-sm font-semibold text-[#005EA8]">{card.label}</span>
          </button>
        ))}
      </div>
    </section>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-[#005EA8] transition-colors group">
          <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Retour</span>
        </button>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Résultats du dimensionnement simulé – Activité E-Sign</h1>
      </div>

      <Section title="Vue Globale des Effectifs" cards={globalViewCards} clickable />
      <Section title="Résultats de la simulation – Processus actuel" cards={currentProcessCards} />
      <Section title="Résultats de la simulation – Processus recommandé" cards={recommendedProcessCards} />
    </div>
  )
}

