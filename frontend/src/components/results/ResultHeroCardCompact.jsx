/**
 * ResultHeroCard - VERSION COMPACTE
 * 
 * Design "Enterprise Dashboard" optimisé pour laptop (1366×768)
 * 
 * Caractéristiques :
 * - Layout 2 colonnes (KPI principal + indicateurs)
 * - Hauteur réduite (~120px au lieu de 300px)
 * - Typographie compacte
 * - Padding minimal
 * - Pas d'espace vide
 */

import React, { memo } from 'react';
import { Gauge, Clock, AlertTriangle, Download, Eye, EyeOff } from 'lucide-react';

const ResultHeroCardCompact = memo(({
    etp,
    etpArrondi,
    heuresNecessaires,
    charge,
    tachesCritiques = 0,
    onExport,
    onToggleDetails,
    showDetails = false,
    loading = false
}) => {

    // Déterminer la couleur selon la charge
    const getChargeColor = (value) => {
        if (value > 100) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
        if (value > 80) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
        return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    };

    const chargeColors = getChargeColor(charge);

    if (loading) {
        return (
            <div className="bg-white rounded border border-slate-200 p-3">
                <div className="flex items-center justify-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                    <span className="ml-2 text-xs text-slate-600">Calcul en cours...</span>
                </div>
            </div>
        );
    }

    if (!etp) {
        return (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded border border-indigo-200 p-3">
                <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-slate-700">
                        Remplissez les paramètres et lancez la simulation
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded border border-slate-200 overflow-hidden">
            {/* Header Compact */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-white" />
                    <h3 className="text-white font-semibold text-xs">Résultat de la Simulation</h3>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={onExport}
                        className="text-white/80 hover:text-white transition-colors p-1"
                        title="Exporter"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onToggleDetails}
                        className="text-white/80 hover:text-white transition-colors p-1"
                        title={showDetails ? 'Masquer' : 'Afficher'}
                    >
                        {showDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Contenu 2 Colonnes */}
            <div className="p-3 grid grid-cols-[auto_1fr] gap-4">
                {/* Colonne Gauche : KPI Principal */}
                <div className="flex flex-col justify-center border-r border-slate-200 pr-4">
                    <div className="text-4xl font-bold text-indigo-600 leading-none">
                        {etp.toFixed(2)}
                    </div>
                    <div className="text-xs font-medium text-slate-700 mt-0.5">
                        ETP nécessaires
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                        ≈ {etpArrondi} {etpArrondi > 1 ? 'personnes' : 'personne'}
                    </div>
                </div>

                {/* Colonne Droite : Mini KPI Cards */}
                <div className="grid grid-cols-3 gap-2">
                    {/* Charge */}
                    <div className={`rounded border ${chargeColors.border} ${chargeColors.bg} p-2`}>
                        <div className="flex items-center gap-1 mb-1">
                            <Gauge className="w-3 h-3" />
                            <span className="text-[9px] font-semibold uppercase tracking-wide opacity-75">
                                Charge
                            </span>
                        </div>
                        <div className={`text-2xl font-bold ${chargeColors.text} leading-none`}>
                            {charge.toFixed(0)}%
                        </div>
                        <div className="text-[9px] opacity-75 mt-0.5">
                            {charge > 100 ? 'Surcharge' : charge > 80 ? 'Élevée' : 'Normale'}
                        </div>
                    </div>

                    {/* Heures */}
                    <div className="rounded border border-blue-200 bg-blue-50 p-2">
                        <div className="flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3 text-blue-700" />
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-blue-700 opacity-75">
                                Heures
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-blue-700 leading-none">
                            {heuresNecessaires.toFixed(1)}
                        </div>
                        <div className="text-[9px] text-blue-700 opacity-75 mt-0.5">
                            heures/jour
                        </div>
                    </div>

                    {/* Alertes */}
                    <div className={`rounded border ${tachesCritiques > 0
                            ? 'border-red-200 bg-red-50'
                            : 'border-green-200 bg-green-50'
                        } p-2`}>
                        <div className="flex items-center gap-1 mb-1">
                            <AlertTriangle className={`w-3 h-3 ${tachesCritiques > 0 ? 'text-red-700' : 'text-green-700'
                                }`} />
                            <span className={`text-[9px] font-semibold uppercase tracking-wide opacity-75 ${tachesCritiques > 0 ? 'text-red-700' : 'text-green-700'
                                }`}>
                                Alertes
                            </span>
                        </div>
                        <div className={`text-2xl font-bold leading-none ${tachesCritiques > 0 ? 'text-red-700' : 'text-green-700'
                            }`}>
                            {tachesCritiques}
                        </div>
                        <div className={`text-[9px] opacity-75 mt-0.5 ${tachesCritiques > 0 ? 'text-red-700' : 'text-green-700'
                            }`}>
                            {tachesCritiques > 0 ? 'critiques' : 'OK'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

ResultHeroCardCompact.displayName = 'ResultHeroCardCompact';

export default ResultHeroCardCompact;
