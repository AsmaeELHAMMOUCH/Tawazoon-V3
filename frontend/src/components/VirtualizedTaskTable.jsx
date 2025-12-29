/**
 * Composant de tableau virtualisé pour afficher de grandes listes de tâches
 * 
 * Utilise react-window pour ne rendre que les lignes visibles,
 * ce qui améliore drastiquement les performances avec 50+ lignes.
 * 
 * Usage:
 * ```jsx
 * <VirtualizedTaskTable
 *   taches={taches}
 *   onVolumeChange={(tacheId, volume) => handleVolumeChange(tacheId, volume)}
 *   height={600}
 * />
 * ```
 */

import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const VirtualizedTaskTable = ({
    taches = [],
    onVolumeChange,
    height = 600,
    rowHeight = 60,
    showHeader = true
}) => {

    // Composant pour une ligne de tâche
    const TaskRow = useCallback(({ index, style }) => {
        const tache = taches[index];

        if (!tache) return null;

        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #e5e7eb',
                    padding: '0 16px',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                }}
            >
                {/* Nom de la tâche */}
                <div style={{ flex: 2, fontWeight: 500 }}>
                    {tache.nom_tache}
                </div>

                {/* Phase */}
                <div style={{ flex: 1, color: '#6b7280' }}>
                    {tache.phase}
                </div>

                {/* Temps moyen */}
                <div style={{ flex: 1, textAlign: 'right' }}>
                    {tache.moyenne_min} min
                </div>

                {/* Input volume */}
                <div style={{ flex: 1, paddingLeft: '16px' }}>
                    <input
                        type="number"
                        value={tache.volume || 0}
                        onChange={(e) => onVolumeChange?.(tache.id, parseFloat(e.target.value) || 0)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                        min="0"
                        step="1"
                    />
                </div>

                {/* ETP calculé */}
                <div style={{
                    flex: 1,
                    textAlign: 'right',
                    fontWeight: 600,
                    color: '#4f46e5'
                }}>
                    {((tache.volume || 0) * tache.moyenne_min / 60 / 8).toFixed(2)} ETP
                </div>
            </div>
        );
    }, [taches, onVolumeChange]);

    // Header du tableau
    const TableHeader = useMemo(() => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#f3f4f6',
            borderBottom: '2px solid #d1d5db',
            fontWeight: 600,
            fontSize: '14px',
            color: '#374151'
        }}>
            <div style={{ flex: 2 }}>Tâche</div>
            <div style={{ flex: 1 }}>Phase</div>
            <div style={{ flex: 1, textAlign: 'right' }}>Temps moyen</div>
            <div style={{ flex: 1, paddingLeft: '16px' }}>Volume</div>
            <div style={{ flex: 1, textAlign: 'right' }}>ETP</div>
        </div>
    ), []);

    // Message si pas de tâches
    if (taches.length === 0) {
        return (
            <div style={{
                padding: '48px',
                textAlign: 'center',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
            }}>
                Aucune tâche à afficher
            </div>
        );
    }

    return (
        <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#ffffff'
        }}>
            {showHeader && TableHeader}

            <AutoSizer disableHeight>
                {({ width }) => (
                    <List
                        height={height}
                        itemCount={taches.length}
                        itemSize={rowHeight}
                        width={width}
                        overscanCount={5} // Pré-rendre 5 lignes au-dessus/en-dessous
                    >
                        {TaskRow}
                    </List>
                )}
            </AutoSizer>

            {/* Footer avec total */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '12px 16px',
                backgroundColor: '#f3f4f6',
                borderTop: '2px solid #d1d5db',
                fontWeight: 700,
                fontSize: '16px'
            }}>
                <div style={{ marginRight: '16px', color: '#374151' }}>
                    Total ETP:
                </div>
                <div style={{ color: '#4f46e5', minWidth: '100px', textAlign: 'right' }}>
                    {taches.reduce((sum, t) =>
                        sum + ((t.volume || 0) * t.moyenne_min / 60 / 8), 0
                    ).toFixed(2)}
                </div>
            </div>
        </div>
    );
};

// Memoization du composant pour éviter les re-renders inutiles
export default React.memo(VirtualizedTaskTable);


/**
 * Version simplifiée sans AutoSizer (si problème de compatibilité)
 */
export const SimpleVirtualizedTaskTable = React.memo(({
    taches = [],
    onVolumeChange,
    height = 600,
    width = '100%',
    rowHeight = 60
}) => {

    const TaskRow = useCallback(({ index, style }) => {
        const tache = taches[index];
        if (!tache) return null;

        return (
            <div style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid #e5e7eb',
                padding: '0 16px',
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
            }}>
                <div style={{ flex: 2, fontWeight: 500 }}>{tache.nom_tache}</div>
                <div style={{ flex: 1, color: '#6b7280' }}>{tache.phase}</div>
                <div style={{ flex: 1, textAlign: 'right' }}>{tache.moyenne_min} min</div>
                <div style={{ flex: 1, paddingLeft: '16px' }}>
                    <input
                        type="number"
                        value={tache.volume || 0}
                        onChange={(e) => onVolumeChange?.(tache.id, parseFloat(e.target.value) || 0)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px'
                        }}
                    />
                </div>
                <div style={{ flex: 1, textAlign: 'right', fontWeight: 600, color: '#4f46e5' }}>
                    {((tache.volume || 0) * tache.moyenne_min / 60 / 8).toFixed(2)} ETP
                </div>
            </div>
        );
    }, [taches, onVolumeChange]);

    return (
        <List
            height={height}
            itemCount={taches.length}
            itemSize={rowHeight}
            width={width}
        >
            {TaskRow}
        </List>
    );
});
