/**
 * Sidebar - Barre Latérale Isolée et Memoizée
 * 
 * Caractéristiques :
 * - ✅ Composant stateless
 * - ✅ Aucune prop dynamique
 * - ✅ Memoizé → Ne re-render JAMAIS
 * - ✅ Performance : 0ms de re-render
 */

import React, { memo } from 'react';
import FluxNavbar from '../navigation/FluxNavbar';
import { Settings, HelpCircle } from 'lucide-react';

const Sidebar = memo(() => {
    return (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">SR</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                            Simulateur RH
                        </h2>
                        <p className="text-xs text-slate-500">
                            Version 2.0
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Principale */}
            <div className="flex-1 overflow-y-auto">
                <FluxNavbar />
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200">
                {/* Actions rapides */}
                <div className="p-2 space-y-1">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded transition-colors">
                        <Settings className="w-4 h-4" />
                        <span>Paramètres</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded transition-colors">
                        <HelpCircle className="w-4 h-4" />
                        <span>Aide</span>
                    </button>
                </div>

                {/* Info version */}
                <div className="p-3 text-xs text-slate-400 text-center border-t border-slate-100">
                    © 2024 Simulateur RH
                </div>
            </div>
        </aside>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
