/**
 * ResultHeroCard - Carte Résultat Mise en Avant
 * 
 * Affiche le résultat principal de la simulation de manière claire et visuelle.
 * 
 * Caractéristiques :
 * - Chiffre ETP en gros et centré
 * - Indicateurs visuels (jauges)
 * - Actions claires
 * - Détails masquables
 */

import React, { memo } from 'react';
import { Gauge, Clock, AlertTriangle, Download, Eye, EyeOff } from 'lucide-react';

const ResultHeroCard = memo(({
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
        if (value > 100) return 'text-red-600 bg-red-50';
        if (value > 80) return 'text-orange-600 bg-orange-50';
        return 'text-green-600 bg-green-50';
    };

    const chargeColor = getChargeColor(charge);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                    <p className="mt-4 text-slate-600">Calcul en cours...</p>
                </div>
            </div>
        );
    }

    if (!etp) {
        return (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-lg p-8 border border-indigo-200">
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Gauge className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        Prêt à simuler
                    </h3>
                    <p className="text-slate-600">
                        Remplissez les paramètres et lancez votre première simulation
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                    <Gauge className="w-5 h-5" />
                    Résultat de la Simulation
                </h2>
            </div>

            {/* Contenu Principal */}
            <div className="p-8">
                {/* Chiffre Principal */}
                <div className="text-center py-6">
                    <div className="text-7xl font-bold text-indigo-600 mb-2">
                        {etp.toFixed(2)}
                    </div>
                    <div className="text-2xl text-slate-700 font-medium mb-1">
                        ETP nécessaires
                    </div>
                    <div className="text-lg text-slate-500">
                        ≈ {etpArrondi} {etpArrondi > 1 ? 'personnes' : 'personne'} à recruter
                    </div>
                </div>

                {/* Indicateurs */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                    {/* Charge */}
                    <div className={`rounded-lg p-4 ${chargeColor} transition-colors`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Gauge className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">
                                Charge
                            </span>
                        </div>
                        <div className="text-3xl font-bold">
                            {charge.toFixed(0)}%
                        </div>
                        <div className="text-xs mt-1 opacity-75">
                            {charge > 100 ? 'Surcharge' : charge > 80 ? 'Élevée' : 'Normale'}
                        </div>
                    </div>

                    {/* Heures */}
                    <div className="rounded-lg p-4 bg-blue-50 text-blue-600">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">
                                Heures
                            </span>
                        </div>
                        <div className="text-3xl font-bold">
                            {heuresNecessaires.toFixed(1)}
                        </div>
                        <div className="text-xs mt-1 opacity-75">
                            heures/jour
                        </div>
                    </div>

                    {/* Tâches Critiques */}
                    <div className={`rounded-lg p-4 ${tachesCritiques > 0
                            ? 'bg-red-50 text-red-600'
                            : 'bg-green-50 text-green-600'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">
                                Alertes
                            </span>
                        </div>
                        <div className="text-3xl font-bold">
                            {tachesCritiques}
                        </div>
                        <div className="text-xs mt-1 opacity-75">
                            {tachesCritiques > 0 ? 'tâches critiques' : 'Tout va bien'}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onExport}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Exporter le rapport
                    </button>
                    <button
                        onClick={onToggleDetails}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {showDetails ? (
                            <>
                                <EyeOff className="w-4 h-4" />
                                Masquer les détails
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" />
                                Voir les détails
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
});

ResultHeroCard.displayName = 'ResultHeroCard';

export default ResultHeroCard;
