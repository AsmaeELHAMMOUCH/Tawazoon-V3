/**
 * VueIntervenant - Version Optimisée & Performante
 * 
 * Page principale pour la simulation des besoins en effectifs au niveau intervenant.
 * 
 * Optimisations appliquées :
 * - ✅ Debounce sur tous les inputs (300ms)
 * - ✅ Memoization des calculs lourds
 * - ✅ Virtualisation du tableau (react-window)
 * - ✅ Lazy loading des graphiques
 * - ✅ React.memo sur les composants
 * - ✅ Composants isolés pour éviter re-renders globaux
 * - ✅ Chargement progressif
 */

import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import {
    MapPin, Building, User, Gauge, Clock,
    Package, Mail, TrendingUp, AlertCircle
} from 'lucide-react';

import { useDebouncedValue } from '../../hooks/useDebounce';
import VirtualizedTaskTable from '../VirtualizedTaskTable';

// ✅ Lazy loading des graphiques (ne bloquent pas le rendu initial)
const GraphResultats = lazy(() => import('../charts/GraphResultats'));
const GraphReferentiel = lazy(() => import('../charts/GraphReferentiel'));

// ========================================
// Constantes
// ========================================

const JOURS_OUVRES_AN = 264;
const HEURES_BASE = 8.0;

// ========================================
// Composant Principal
// ========================================

export default function VueIntervenant() {
    // ========================================
    // État - Sélection
    // ========================================

    const [selectedRegion, setSelectedRegion] = useState(null);
    const [selectedCentre, setSelectedCentre] = useState(null);
    const [selectedPoste, setSelectedPoste] = useState(null);

    // ========================================
    // État - Volumes (valeurs immédiates pour réactivité UI)
    // ========================================

    const [volumes, setVolumes] = useState({
        colis: 0,
        courrierOrdinaire: 0,
        courrierRecommande: 0,
        ebarkia: 0,
        lrh: 0,
        amana: 0
    });

    // ========================================
    // État - Paramètres
    // ========================================

    const [productivite, setProductivite] = useState(70);
    const [tempsInactif, setTempsInactif] = useState(30);
    const [joursOuvres, setJoursOuvres] = useState(264);

    // ========================================
    // État - Données
    // ========================================

    const [taches, setTaches] = useState([]);
    const [referentiel, setReferentiel] = useState([]);
    const [loading, setLoading] = useState({});

    // ========================================
    // État - UI
    // ========================================

    const [showGraphs, setShowGraphs] = useState(false);
    const [activeTab, setActiveTab] = useState('tableau');

    // ========================================
    // Debounce des valeurs pour les calculs
    // ========================================

    const debouncedVolumes = useDebouncedValue(volumes, 300);
    const debouncedProductivite = useDebouncedValue(productivite, 500);
    const debouncedTempsInactif = useDebouncedValue(tempsInactif, 500);

    // ========================================
    // Calculs memoizés
    // ========================================

    // ✅ Heures nettes (recalculées uniquement si paramètres changent)
    const heuresNettes = useMemo(() => {
        const prod = debouncedProductivite / 100;
        const heuresProductives = HEURES_BASE * prod;
        const heuresInactif = debouncedTempsInactif / 60;
        return Math.max(0, heuresProductives - heuresInactif);
    }, [debouncedProductivite, debouncedTempsInactif]);

    // ✅ Volumes journaliers (recalculés uniquement si volumes changent)
    const volumesJournaliers = useMemo(() => ({
        colis: debouncedVolumes.colis / joursOuvres,
        courrierOrdinaire: debouncedVolumes.courrierOrdinaire / joursOuvres,
        courrierRecommande: debouncedVolumes.courrierRecommande / joursOuvres,
        ebarkia: debouncedVolumes.ebarkia / joursOuvres,
        lrh: debouncedVolumes.lrh / joursOuvres,
        amana: debouncedVolumes.amana / joursOuvres
    }), [debouncedVolumes, joursOuvres]);

    // ✅ Calcul des résultats de simulation
    const resultatsSimulation = useMemo(() => {
        if (!taches.length) return null;

        // Calculer les heures pour chaque tâche
        const tachesAvecHeures = taches.map(tache => {
            const volumeJour = volumesJournaliers[tache.indicateur] || 0;
            const minutesNecessaires = volumeJour * tache.moyenne_min;
            const heures = minutesNecessaires / 60;

            return {
                ...tache,
                volumeJour,
                heures
            };
        });

        // Totaux
        const totalHeures = tachesAvecHeures.reduce((sum, t) => sum + t.heures, 0);
        const etpCalcule = heuresNettes > 0 ? totalHeures / heuresNettes : 0;
        const etpArrondi = Math.round(etpCalcule);
        const effectifActuel = selectedPoste?.effectif_actuel || 0;
        const ecart = etpArrondi - effectifActuel;
        const tauxCharge = effectifActuel > 0 ? (etpCalcule / effectifActuel) * 100 : 0;

        return {
            taches: tachesAvecHeures,
            totalHeures,
            etpCalcule,
            etpArrondi,
            effectifActuel,
            ecart,
            tauxCharge
        };
    }, [taches, volumesJournaliers, heuresNettes, selectedPoste]);

    // ========================================
    // Callbacks memoizés
    // ========================================

    // ✅ Handler pour changement de volume
    const handleVolumeChange = useCallback((indicateur, value) => {
        setVolumes(prev => ({
            ...prev,
            [indicateur]: value
        }));
    }, []);

    // ✅ Handler pour simulation
    const handleSimuler = useCallback(async () => {
        if (!selectedCentre || !selectedPoste) return;

        setLoading(prev => ({ ...prev, simulation: true }));

        try {
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    centre_id: selectedCentre.id,
                    poste_id: selectedPoste.id,
                    volumes: debouncedVolumes,
                    productivite: debouncedProductivite,
                    temps_inactif: debouncedTempsInactif,
                    jours_ouvres: joursOuvres
                })
            });

            const data = await response.json();
            setTaches(data.taches || []);
        } catch (error) {
            console.error('Erreur simulation:', error);
        } finally {
            setLoading(prev => ({ ...prev, simulation: false }));
        }
    }, [
        selectedCentre,
        selectedPoste,
        debouncedVolumes,
        debouncedProductivite,
        debouncedTempsInactif,
        joursOuvres
    ]);

    // ========================================
    // Rendu
    // ========================================

    return (
        <div className="h-screen flex flex-col bg-slate-50">
            {/* ========================================
          1️⃣ HEADER LÉGER
          ======================================== */}
            <Header
                centre={selectedCentre}
                poste={selectedPoste}
            />

            {/* ========================================
          2️⃣ PARAMÈTRES DE SIMULATION (1 ligne)
          ======================================== */}
            <div className="flex-none px-4 py-3 bg-white border-b border-slate-200">
                <ParametresSimulation
                    volumes={volumes}
                    onVolumeChange={handleVolumeChange}
                    productivite={productivite}
                    onProductiviteChange={setProductivite}
                    tempsInactif={tempsInactif}
                    onTempsInactifChange={setTempsInactif}
                    heuresNettes={heuresNettes}
                    onSimuler={handleSimuler}
                    disabled={!selectedCentre || !selectedPoste}
                    loading={loading.simulation}
                />
            </div>

            {/* ========================================
          3️⃣ TABLEAU DES TÂCHES (zone principale)
          ======================================== */}
            <div className="flex-1 min-h-0 px-4 py-3">
                {resultatsSimulation?.taches ? (
                    <VirtualizedTaskTable
                        taches={resultatsSimulation.taches}
                        height="100%"
                        showHeader={true}
                    />
                ) : (
                    <EmptyState
                        message="Sélectionnez un centre et un poste, puis cliquez sur Simuler"
                        icon={AlertCircle}
                    />
                )}
            </div>

            {/* ========================================
          4️⃣ RÉSULTATS & SYNTHÈSE (footer)
          ======================================== */}
            {resultatsSimulation && (
                <div className="flex-none px-4 py-3 bg-white border-t border-slate-200">
                    <SyntheseResultats resultats={resultatsSimulation} />
                </div>
            )}

            {/* ========================================
          5️⃣ GRAPHIQUES (chargement différé)
          ======================================== */}
            {showGraphs && resultatsSimulation && (
                <div className="flex-none px-4 py-3 bg-white border-t border-slate-200">
                    <Suspense fallback={<GraphSkeleton />}>
                        <GraphResultats data={resultatsSimulation} />
                    </Suspense>
                </div>
            )}
        </div>
    );
}

// ========================================
// Composants optimisés avec React.memo
// ========================================

/**
 * Header léger avec badges
 */
const Header = React.memo(({ centre, poste }) => (
    <div className="flex-none px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">
                Simulation – Vue Intervenant
            </h1>

            <div className="flex items-center gap-2">
                {centre && (
                    <Badge icon={Building} label={centre.label} />
                )}
                {poste && (
                    <Badge icon={User} label={poste.nom_poste} />
                )}
            </div>
        </div>
    </div>
));

/**
 * Paramètres de simulation - TOUS sur 1 ligne
 */
const ParametresSimulation = React.memo(({
    volumes,
    onVolumeChange,
    productivite,
    onProductiviteChange,
    tempsInactif,
    onTempsInactifChange,
    heuresNettes,
    onSimuler,
    disabled,
    loading
}) => (
    <div className="flex items-center gap-3">
        {/* Volumes */}
        <CompactInput
            icon={Package}
            label="Colis"
            value={volumes.colis}
            onChange={(v) => onVolumeChange('colis', v)}
            width="w-24"
        />

        <CompactInput
            icon={Mail}
            label="Courrier"
            value={volumes.courrierOrdinaire}
            onChange={(v) => onVolumeChange('courrierOrdinaire', v)}
            width="w-24"
        />

        <CompactInput
            icon={Package}
            label="Amana"
            value={volumes.amana}
            onChange={(v) => onVolumeChange('amana', v)}
            width="w-24"
        />

        {/* Séparateur */}
        <div className="h-8 w-px bg-slate-300" />

        {/* Paramètres */}
        <CompactInput
            icon={Gauge}
            label="Productivité"
            value={productivite}
            onChange={onProductiviteChange}
            suffix="%"
            width="w-20"
        />

        <CompactInput
            icon={Clock}
            label="Temps mort"
            value={tempsInactif}
            onChange={onTempsInactifChange}
            suffix="min"
            width="w-20"
        />

        {/* Heures nettes (lecture seule) */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-blue-900 font-medium">
                {heuresNettes.toFixed(2)}h/j
            </span>
        </div>

        {/* Bouton Simuler */}
        <button
            onClick={onSimuler}
            disabled={disabled || loading}
            className="ml-auto px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            {loading ? 'Calcul...' : 'Simuler'}
        </button>
    </div>
));

/**
 * Input compact pour les paramètres
 */
const CompactInput = React.memo(({
    icon: Icon,
    label,
    value,
    onChange,
    suffix,
    width = 'w-24'
}) => (
    <div className={`flex items-center gap-1.5 ${width}`}>
        <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
            <div className="text-[10px] text-slate-500 mb-0.5">{label}</div>
            <div className="relative">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    min="0"
                />
                {suffix && (
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    </div>
));

/**
 * Synthèse des résultats - KPI horizontaux
 */
const SyntheseResultats = React.memo(({ resultats }) => {
    const getChargeColor = (taux) => {
        if (taux < 80) return 'text-green-600 bg-green-50 border-green-200';
        if (taux < 100) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    return (
        <div className="flex items-center gap-4">
            <KPICard
                label="Heures nécessaires"
                value={`${resultats.totalHeures.toFixed(2)}h`}
                color="text-slate-700"
            />

            <KPICard
                label="ETP calculé"
                value={resultats.etpCalcule.toFixed(2)}
                color="text-indigo-600"
            />

            <KPICard
                label="ETP arrondi"
                value={resultats.etpArrondi}
                color="text-indigo-700"
                bold
            />

            <KPICard
                label="Effectif actuel"
                value={resultats.effectifActuel}
                color="text-slate-600"
            />

            <KPICard
                label="Écart"
                value={resultats.ecart > 0 ? `+${resultats.ecart}` : resultats.ecart}
                color={resultats.ecart > 0 ? 'text-red-600' : resultats.ecart < 0 ? 'text-green-600' : 'text-slate-600'}
            />

            <div className={`flex items-center gap-2 px-3 py-2 border rounded ${getChargeColor(resultats.tauxCharge)}`}>
                <TrendingUp className="w-4 h-4" />
                <div>
                    <div className="text-[10px] font-medium opacity-75">Taux de charge</div>
                    <div className="text-sm font-bold">{resultats.tauxCharge.toFixed(0)}%</div>
                </div>
            </div>
        </div>
    );
});

/**
 * Carte KPI simple
 */
const KPICard = React.memo(({ label, value, color, bold }) => (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded">
        <div>
            <div className="text-[10px] text-slate-500">{label}</div>
            <div className={`text-sm ${color} ${bold ? 'font-bold' : 'font-medium'}`}>
                {value}
            </div>
        </div>
    </div>
));

/**
 * Badge simple
 */
const Badge = React.memo(({ icon: Icon, label }) => (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs">
        <Icon className="w-3 h-3 text-slate-500" />
        <span className="text-slate-700">{label}</span>
    </div>
));

/**
 * État vide
 */
const EmptyState = React.memo(({ message, icon: Icon }) => (
    <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400">
            <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{message}</p>
        </div>
    </div>
));

/**
 * Skeleton pour graphique
 */
const GraphSkeleton = () => (
    <div className="h-64 bg-slate-100 rounded animate-pulse flex items-center justify-center">
        <span className="text-slate-400 text-sm">Chargement du graphique...</span>
    </div>
);
