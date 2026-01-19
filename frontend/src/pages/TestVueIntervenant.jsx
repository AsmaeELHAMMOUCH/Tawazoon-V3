/**
 * Page de Test pour VueIntervenantPerformante
 * 
 * Cette page permet de tester la nouvelle vue Intervenant optimisée
 * avec des données de test simulées.
 */

import React, { useState } from 'react';
import VueIntervenant from '../components/views/VueIntervenant';

export default function TestVueIntervenant() {
    const [showInstructions, setShowInstructions] = useState(true);

    return (
        <div className="h-screen flex flex-col bg-slate-100">
            {/* Barre de test */}
            <div className="flex-none bg-yellow-100 border-b-2 border-yellow-400 px-4 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-yellow-800 font-bold">🧪 MODE TEST</span>
                        <span className="text-yellow-700 text-sm">
                            Vraie VueIntervenant (Production)
                        </span>
                    </div>

                    <button
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="px-3 py-1 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 text-sm rounded transition-colors"
                    >
                        {showInstructions ? 'Masquer' : 'Afficher'} les instructions
                    </button>
                </div>
            </div>

            {/* Instructions */}
            {showInstructions && (
                <div className="flex-none bg-blue-50 border-b border-blue-200 px-4 py-3">
                    <div className="max-w-4xl">
                        <h3 className="font-semibold text-blue-900 mb-2">
                            📋 Instructions de Test
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                            <div>
                                <p className="font-medium mb-1">✅ Tests à effectuer :</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>Saisir E-Barkia dans la grille "Départ" (colonne Global)</li>
                                    <li>Cliquer sur "Simuler"</li>
                                    <li>Vérifier que le volume NOIR est bien pris en compte</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Page à tester */}
            <div className="flex-1 min-h-0 overflow-auto">
                <VueIntervenant />
            </div>

            {/* Footer de test */}
            <div className="flex-none bg-slate-800 text-white px-4 py-2">
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                        <span>⚡ Page réelle chargée</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
