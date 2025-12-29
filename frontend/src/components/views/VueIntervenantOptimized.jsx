/**
 * Exemple d'optimisation de VueIntervenant avec toutes les techniques
 * 
 * Ce fichier montre comment appliquer :
 * - Debounce sur les inputs
 * - Memoization des calculs
 * - Lazy loading des graphiques
 * - Virtualisation des tableaux
 * - React.memo sur les composants
 */

import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useDebouncedValue } from '../hooks/useDebounce';
import VirtualizedTaskTable from '../components/VirtualizedTaskTable';

// ✅ Lazy loading du graphique
const GraphResultats = lazy(() => import('../components/GraphResultats'));

// ✅ Skeleton pour le loading
const GraphSkeleton = () => (
    <div style={{
        height: '400px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
    }}>
        <div className="animate-pulse">Chargement du graphique...</div>
    </div>
);

function VueIntervenantOptimized() {
    // ========================================
    // État
    // ========================================

    const [selectedCentre, setSelectedCentre] = useState(null);
    const [selectedPoste, setSelectedPoste] = useState(null);
    const [taches, setTaches] = useState([]);

    // Volumes (état local pour réactivité immédiate)
    const [volumes, setVolumes] = useState({
        colis: 0,
        courrierOrdinaire: 0,
        courrierRecommande: 0,
        amana: 0,
        lrh: 0,
        eboutique: 0
    });

    // Paramètres
    const [productivite, setProductivite] = useState(0.7);
    const [heuresJour, setHeuresJour] = useState(8);
    const [tempsInactif, setTempsInactif] = useState(30);

    // ✅ Debounce des volumes pour les calculs
    const debouncedVolumes = useDebouncedValue(volumes, 300);

    // ✅ Debounce des paramètres
    const debouncedProductivite = useDebouncedValue(productivite, 500);
    const debouncedHeuresJour = useDebouncedValue(heuresJour, 500);

    // ========================================
    // Calculs memoizés
    // ========================================

    // ✅ Volumes journaliers (recalculés seulement si volumes changent)
    const volumesJournaliers = useMemo(() => ({
        colis: debouncedVolumes.colis / 22,
        courrierOrdinaire: debouncedVolumes.courrierOrdinaire / 22,
        courrierRecommande: debouncedVolumes.courrierRecommande / 22,
        amana: debouncedVolumes.amana / 22,
        lrh: debouncedVolumes.lrh / 22,
        eboutique: debouncedVolumes.eboutique / 22
    }), [debouncedVolumes]);

    // ✅ Heures nettes (recalculées seulement si paramètres changent)
    const heuresNettes = useMemo(() => {
        return debouncedHeuresJour * debouncedProductivite - (tempsInactif / 60);
    }, [debouncedHeuresJour, debouncedProductivite, tempsInactif]);

    // ✅ Résultats de simulation (recalculés seulement si nécessaire)
    const simulationResults = useMemo(() => {
        if (!taches.length) return null;

        // Logique de calcul de simulation
        const totalMinutes = taches.reduce((sum, tache) => {
            const volume = volumesJournaliers[tache.indicateur] || 0;
            return sum + (volume * tache.moyenne_min);
        }, 0);

        const etpCalcule = totalMinutes / 60 / heuresNettes;
        const effectifActuel = selectedPoste?.effectif_actuel || 0;
        const ecart = etpCalcule - effectifActuel;

        return {
            etpCalcule,
            effectifActuel,
            ecart,
            totalMinutes,
            tauxOccupation: (etpCalcule / effectifActuel) * 100
        };
    }, [taches, volumesJournaliers, heuresNettes, selectedPoste]);

    // ========================================
    // Callbacks memoizés
    // ========================================

    // ✅ Handler pour changement de volume (memoizé)
    const handleVolumeChange = useCallback((indicateur, value) => {
        setVolumes(prev => ({
            ...prev,
            [indicateur]: value
        }));
    }, []);

    // ✅ Handler pour changement de tâche volume (memoizé)
    const handleTacheVolumeChange = useCallback((tacheId, volume) => {
        setTaches(prev => prev.map(t =>
            t.id === tacheId ? { ...t, volume } : t
        ));
    }, []);

    // ✅ Handler pour simulation (memoizé)
    const handleSimulate = useCallback(async () => {
        if (!selectedCentre || !selectedPoste) return;

        try {
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    centre_id: selectedCentre.id,
                    poste_id: selectedPoste.id,
                    volumes: debouncedVolumes,
                    productivite: debouncedProductivite,
                    heures_jour: debouncedHeuresJour,
                    temps_inactif: tempsInactif
                })
            });

            const data = await response.json();
            // Traiter les résultats...
        } catch (error) {
            console.error('Erreur simulation:', error);
        }
    }, [
        selectedCentre,
        selectedPoste,
        debouncedVolumes,
        debouncedProductivite,
        debouncedHeuresJour,
        tempsInactif
    ]);

    // ========================================
    // Rendu
    // ========================================

    return (
        <div className="vue-intervenant-optimized">
            <h1>Vue Intervenant (Optimisée)</h1>

            {/* Section Sélection */}
            <div className="selection-card">
                <h2>Sélection</h2>
                {/* Sélecteurs de centre et poste */}
            </div>

            {/* Section Volumes */}
            <div className="volumes-card">
                <h2>Volumes Mensuels</h2>

                <div className="volumes-grid">
                    {/* ✅ Inputs avec debounce automatique */}
                    <VolumeInput
                        label="Colis"
                        value={volumes.colis}
                        onChange={(value) => handleVolumeChange('colis', value)}
                    />

                    <VolumeInput
                        label="Courrier Ordinaire"
                        value={volumes.courrierOrdinaire}
                        onChange={(value) => handleVolumeChange('courrierOrdinaire', value)}
                    />

                    <VolumeInput
                        label="Courrier Recommandé"
                        value={volumes.courrierRecommande}
                        onChange={(value) => handleVolumeChange('courrierRecommande', value)}
                    />

                    <VolumeInput
                        label="Amana"
                        value={volumes.amana}
                        onChange={(value) => handleVolumeChange('amana', value)}
                    />
                </div>
            </div>

            {/* Section Paramètres */}
            <div className="params-card">
                <h2>Paramètres</h2>

                <ParameterInput
                    label="Productivité"
                    value={productivite}
                    onChange={setProductivite}
                    min={0}
                    max={1}
                    step={0.01}
                    suffix="%"
                />

                <ParameterInput
                    label="Heures par jour"
                    value={heuresJour}
                    onChange={setHeuresJour}
                    min={1}
                    max={12}
                    step={0.5}
                    suffix="h"
                />
            </div>

            {/* ✅ Tableau virtualisé pour les tâches */}
            {taches.length > 0 && (
                <div className="taches-card">
                    <h2>Tâches ({taches.length})</h2>

                    <VirtualizedTaskTable
                        taches={taches}
                        onVolumeChange={handleTacheVolumeChange}
                        height={600}
                    />
                </div>
            )}

            {/* ✅ Graphique avec lazy loading */}
            {simulationResults && (
                <div className="results-card">
                    <h2>Résultats</h2>

                    <Suspense fallback={<GraphSkeleton />}>
                        <GraphResultats data={simulationResults} />
                    </Suspense>

                    {/* Résumé textuel */}
                    <ResultsSummary results={simulationResults} />
                </div>
            )}

            {/* Bouton de simulation */}
            <button
                onClick={handleSimulate}
                disabled={!selectedCentre || !selectedPoste}
                className="btn-simulate"
            >
                Lancer la simulation
            </button>
        </div>
    );
}

// ========================================
// Composants optimisés avec React.memo
// ========================================

// ✅ Input de volume memoizé
const VolumeInput = React.memo(({ label, value, onChange }) => {
    return (
        <div className="volume-input">
            <label>{label}</label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                min="0"
                step="1"
            />
        </div>
    );
});

// ✅ Input de paramètre memoizé
const ParameterInput = React.memo(({ label, value, onChange, min, max, step, suffix }) => {
    return (
        <div className="parameter-input">
            <label>{label}</label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                min={min}
                max={max}
                step={step}
            />
            {suffix && <span className="suffix">{suffix}</span>}
        </div>
    );
});

// ✅ Résumé des résultats memoizé
const ResultsSummary = React.memo(({ results }) => {
    if (!results) return null;

    return (
        <div className="results-summary">
            <div className="result-item">
                <span className="label">ETP Calculé:</span>
                <span className="value">{results.etpCalcule.toFixed(2)}</span>
            </div>

            <div className="result-item">
                <span className="label">Effectif Actuel:</span>
                <span className="value">{results.effectifActuel}</span>
            </div>

            <div className="result-item">
                <span className="label">Écart:</span>
                <span className={`value ${results.ecart > 0 ? 'surplus' : 'deficit'}`}>
                    {results.ecart > 0 ? '+' : ''}{results.ecart.toFixed(2)}
                </span>
            </div>

            <div className="result-item">
                <span className="label">Taux d'occupation:</span>
                <span className="value">{results.tauxOccupation.toFixed(1)}%</span>
            </div>
        </div>
    );
});

export default VueIntervenantOptimized;
