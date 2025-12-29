/**
 * AppLayout - Layout Principal Optimisé
 * 
 * Caractéristiques :
 * - ✅ Layout statique
 * - ✅ Sidebar isolée (memoizée)
 * - ✅ Outlet pour le contenu dynamique
 * - ✅ Pas de state partagé
 * - ✅ Re-render uniquement si route change
 */

import React, { memo } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const AppLayout = memo(() => {
    return (
        <div className="h-screen flex overflow-hidden bg-slate-50">
            {/* Sidebar - Isolée et Memoizée */}
            <Sidebar />

            {/* Contenu Principal - Isolé */}
            <main className="flex-1 overflow-auto">
                {/* Outlet pour les routes enfants */}
                <Outlet />
            </main>
        </div>
    );
});

AppLayout.displayName = 'AppLayout';

export default AppLayout;
