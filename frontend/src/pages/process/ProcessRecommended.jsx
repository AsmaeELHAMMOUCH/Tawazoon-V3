// Shell au niveau des routes


import { UserGroupIcon, DocumentTextIcon, Cog6ToothIcon, ClockIcon, BookOpenIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

function Tile({ to, title, icon: Icon }){
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-card hover:shadow-lg transition">
      <Icon className="w-6 h-6 text-primary" />
      <div className="font-semibold text-slate-800">{title}</div>
    </Link>
  )
}

export default function ProcessRecommended(){
  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">RÃ©sultats de la simulation â€“ Processus recommandÃ©</h1>
          <p className="text-slate-600">Choisissez un module ci-dessous</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Tile to="/process/reco/positions" title="Simulation Par Position" icon={UserGroupIcon} />
          <Tile to="/app/effectif-global" title="Simulation Globale" icon={DocumentTextIcon} />
          <Tile to="/process/reco/norms" title="Normes de dimensionnement" icon={Cog6ToothIcon} />
          <Tile to="/process/reco/chrono" title="Chronogramme de Traitement Unitaire" icon={ClockIcon} />
          <Tile to="/process/reco/referentiel" title="RÃ©fÃ©rentiel" icon={BookOpenIcon} />
          <Tile to="/process/reco/schema" title="SchÃ©ma Process" icon={ChartBarIcon} />
        </div>
      </div>
    </>
  )
}


