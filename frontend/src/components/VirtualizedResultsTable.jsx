/**
 * VirtualizedResultsTable - Tableau virtualisé simple pour les résultats
 * 
 * Version simplifiée sans dépendance externe
 * Utilise une virtualisation basique avec CSS
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';

const VirtualizedResultsTable = ({
    results = [],
    height = 380,
    rowHeight = 32,
    showHeader = true,
    formatUnit
}) => {
    const containerRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);

    // Calculer quelles lignes afficher
    const visibleRange = useMemo(() => {
        const startIndex = Math.floor(scrollTop / rowHeight);
        const endIndex = Math.min(
            results.length,
            Math.ceil((scrollTop + height) / rowHeight)
        );
        return { startIndex, endIndex };
    }, [scrollTop, rowHeight, height, results.length]);

    // Gérer le scroll
    const handleScroll = useCallback((e) => {
        setScrollTop(e.target.scrollTop);
    }, []);

    // Lignes visibles
    const visibleResults = useMemo(() => {
        return results.slice(visibleRange.startIndex, visibleRange.endIndex);
    }, [results, visibleRange]);

    // Message si pas de résultats
    if (results.length === 0) {
        return (
            <div style={{
                padding: '8px',
                textAlign: 'center',
                color: '#64748b',
                backgroundColor: '#f9fafb',
                fontSize: '10px'
            }}>
                Aucune donnée
            </div>
        );
    }

    const totalHeight = results.length * rowHeight;
    const offsetY = visibleRange.startIndex * rowHeight;

    return (
        <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: '#ffffff'
        }}>
            {/* Header */}
            {showHeader && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px 0',
                    backgroundColor: '#f1f5f9',
                    borderBottom: '1px solid #cbd5e1',
                    fontWeight: 600,
                    fontSize: '8px',
                    color: '#334155'
                }}>
                    <div style={{ width: '50px', paddingLeft: '6px', paddingRight: '6px' }}>Seq</div>
                    <div style={{ flex: 1, paddingLeft: '6px', paddingRight: '6px' }}>Tâche</div>
                    <div style={{ width: '100px', textAlign: 'center', paddingLeft: '6px', paddingRight: '6px' }}>Unit. (/jour)</div>
                    <div style={{ width: '80px', textAlign: 'center', paddingLeft: '6px', paddingRight: '6px' }}>Heures</div>
                </div>
            )}

            {/* Conteneur scrollable */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                style={{
                    height,
                    overflow: 'auto',
                    position: 'relative'
                }}
            >
                {/* Spacer pour la hauteur totale */}
                <div style={{ height: totalHeight, position: 'relative' }}>
                    {/* Lignes visibles */}
                    <div style={{ transform: `translateY(${offsetY}px)` }}>
                        {visibleResults.map((result, idx) => {
                            const actualIndex = visibleRange.startIndex + idx;
                            return (
                                <div
                                    key={actualIndex}
                                    style={{
                                        height: rowHeight,
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderBottom: '1px solid #e2e8f0',
                                        backgroundColor: actualIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
                                    }}
                                    className="text-[10px]"
                                >
                                    {/* Seq */}
                                    <div style={{ width: '50px', paddingLeft: '6px', paddingRight: '6px' }}>
                                        {result.seq}
                                    </div>

                                    {/* Tâche */}
                                    <div style={{ flex: 1, paddingLeft: '6px', paddingRight: '6px' }}>
                                        {result.task}
                                    </div>

                                    {/* Unités */}
                                    <div style={{ width: '100px', textAlign: 'center', paddingLeft: '6px', paddingRight: '6px' }}>
                                        {formatUnit ? formatUnit(result.nombre_Unite) : result.nombre_Unite.toFixed(2)}
                                    </div>

                                    {/* Heures */}
                                    <div style={{ width: '80px', textAlign: 'center', paddingLeft: '6px', paddingRight: '6px' }}>
                                        {Number(result.heures || 0).toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(VirtualizedResultsTable);
