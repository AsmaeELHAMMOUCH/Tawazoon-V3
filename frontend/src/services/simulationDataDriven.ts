// services/simulationDataDriven.ts
/**
 * Service API pour la simulation data-driven
 * Architecture 100% pilotée par les données
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================================
// TYPES
// ============================================================================

export interface VolumeSegmentInput {
    GLOBAL?: number;
    PART?: number;
    PRO?: number;
    DIST?: number;
    AXES?: number;
}

export interface FluxVolumesInput {
    amana?: VolumeSegmentInput;
    co?: VolumeSegmentInput;
    cr?: VolumeSegmentInput;
    ebarkia?: VolumeSegmentInput;
    lrh?: VolumeSegmentInput;
}

export interface GuichetVolumesInput {
    DEPOT?: number;
    RECUP?: number;
}

export interface VolumesUIInput {
    flux_arrivee?: FluxVolumesInput;
    guichet?: GuichetVolumesInput;
    flux_depart?: FluxVolumesInput;
    nb_jours_ouvres_an?: number;
}

export interface SimulationParams {
    productivite?: number;      // Défaut: 100
    heures_par_jour?: number;   // Défaut: 8
    idle_minutes?: number;      // Défaut: 0
    debug?: boolean;            // Défaut: false
}

export interface TacheDetail {
    task: string;
    phase: string;
    unit: string;
    avg_sec: number;
    heures: number;
    nombre_unite: number;
    poste_id?: number;
    centre_poste_id: number;
}

export interface SimulationResponse {
    details_taches: TacheDetail[];
    total_heures: number;
    heures_net_jour: number;
    fte_calcule: number;
    fte_arrondi: number;
    heures_par_poste: Record<number, number>;
}

export interface MappingRule {
    id: number;
    flux_id: number | null;
    sens_id: number | null;
    segment_id: number | null;
    nom_tache_keyword: string | null;
    ui_path: string;
    priority: number;
    description: string;
}

export interface ConversionRule {
    id: number;
    unite_mesure: string;
    facteur_conversion: number;
    description: string;
}

export interface MappingTestResult {
    centre_poste_id: number;
    centre_label: string;
    poste_label: string;
    nombre_taches: number;
    taches_avec_mapping: number;
    taches_sans_mapping: number;
    details: Array<{
        tache_id: number;
        nom_tache: string;
        unite_mesure: string;
        flux: string;
        sens: string;
        segment: string;
        mapping_found: boolean;
        ui_path: string | null;
        priority: number | null;
        facteur_conversion: number;
        description: string;
    }>;
}

// ============================================================================
// SERVICE
// ============================================================================

export const simulationDataDrivenService = {
    /**
     * Simulation pour un intervenant (centre/poste)
     */
    async simulateIntervenant(
        centrePosteId: number,
        volumes: VolumesUIInput,
        params?: SimulationParams
    ): Promise<SimulationResponse> {
        const response = await axios.post(
            `${API_BASE_URL}/api/simulation-dd/intervenant/${centrePosteId}`,
            volumes,
            { params }
        );
        return response.data;
    },

    /**
     * Simulation pour un centre complet
     */
    async simulateCentre(
        centreId: number,
        volumes: VolumesUIInput,
        params?: SimulationParams
    ): Promise<SimulationResponse> {
        const response = await axios.post(
            `${API_BASE_URL}/api/simulation-dd/centre/${centreId}`,
            volumes,
            { params }
        );
        return response.data;
    },

    /**
     * Simulation pour plusieurs centres
     */
    async simulateMultiCentres(
        centreIds: number[],
        volumes: VolumesUIInput,
        params?: SimulationParams
    ): Promise<SimulationResponse> {
        const payload = {
            centre_ids: centreIds,
            ...volumes
        };

        const response = await axios.post(
            `${API_BASE_URL}/api/simulation-dd/multi-centres`,
            payload,
            { params }
        );
        return response.data;
    },

    /**
     * Tester le mapping pour un centre/poste
     */
    async testMapping(centrePosteId: number): Promise<MappingTestResult> {
        const response = await axios.get(
            `${API_BASE_URL}/api/simulation-dd/test-mapping/${centrePosteId}`
        );
        return response.data;
    },

    /**
     * Lister les règles de mapping
     */
    async getMappingRules(): Promise<{ total_rules: number; rules: MappingRule[] }> {
        const response = await axios.get(`${API_BASE_URL}/api/simulation-dd/mapping-rules`);
        return response.data;
    },

    /**
     * Lister les règles de conversion
     */
    async getConversionRules(): Promise<{ total_rules: number; rules: ConversionRule[] }> {
        const response = await axios.get(`${API_BASE_URL}/api/simulation-dd/conversion-rules`);
        return response.data;
    }
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Créer un objet de volumes vide
 */
export function createEmptyVolumes(): VolumesUIInput {
    const emptySegment = (): VolumeSegmentInput => ({
        GLOBAL: 0,
        PART: 0,
        PRO: 0,
        DIST: 0,
        AXES: 0
    });

    return {
        flux_arrivee: {
            amana: emptySegment(),
            co: emptySegment(),
            cr: emptySegment(),
            ebarkia: emptySegment(),
            lrh: emptySegment()
        },
        guichet: {
            DEPOT: 0,
            RECUP: 0
        },
        flux_depart: {
            amana: emptySegment(),
            co: emptySegment(),
            cr: emptySegment(),
            ebarkia: emptySegment(),
            lrh: emptySegment()
        },
        nb_jours_ouvres_an: 264
    };
}

/**
 * Calculer le volume/jour à partir du volume annuel
 */
export function calculateVolumeJour(volumeAnnuel: number, joursOuvres: number = 264): number {
    return volumeAnnuel / joursOuvres;
}

/**
 * Formater un volume pour l'affichage
 */
export function formatVolume(volume: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(volume));
}

/**
 * Formater les heures pour l'affichage
 */
export function formatHeures(heures: number | undefined | null): string {
    if (heures === undefined || heures === null) return '0.00h';
    return heures.toFixed(2) + 'h';
}
