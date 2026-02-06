import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Service pour la simulation Intervenant Data-Driven
 */
export const simulationService = {
  /**
   * Lance la simulation pour un intervenant
   * @param {number} centrePosteId - ID du centre/poste
   * @param {Object} volumes - Payload des volumes
   * @param {Object} params - Paramètres optionnels (productivite, heures_par_jour, etc.)
   */
  simulateIntervenant: async (centrePosteId, volumes, params = {}) => {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 [FRONTEND - STEP 1] Préparation de la simulation intervenant');
    console.log('='.repeat(80));
    console.log('   Centre/Poste ID:', centrePosteId);
    console.log('   Volumes:', volumes);
    console.log('   Paramètres:', params);
    
    const defaultParams = {
      productivite: 100,
      heures_par_jour: 8,
      idle_minutes: 0,
      debug: false,
      ...params
    };
    
    console.log('   Paramètres finaux:', defaultParams);
    console.log('='.repeat(80) + '\n');

    console.log('📡 [FRONTEND - STEP 2] Envoi de la requête API...');
    console.log(`   URL: ${API_URL}/api/simulation-dd/intervenant/${centrePosteId}`);
    
    const response = await axios.post(
      `${API_URL}/api/simulation-dd/intervenant/${centrePosteId}`,
      volumes,
      { params: defaultParams }
    );
    
    console.log('\n✅ [FRONTEND - STEP 3] Réponse reçue du backend');
    console.log('   Status:', response.status);
    console.log('   ETP:', response.data.etp);
    console.log('   Total heures:', response.data.heures_totales);
    console.log('   Nombre de tâches:', response.data.taches?.length || 0);
    console.log('='.repeat(80) + '\n');
    
    return response.data;
  },

  /**
   * Lance la simulation pour un centre complet
   * @param {number} centreId - ID du centre
   * @param {Object} volumes - Payload des volumes
   * @param {Object} params - Paramètres optionnels (productivite, heures_par_jour, etc.)
   */
  simulateCentre: async (centreId, volumes, params = {}) => {
    const defaultParams = {
      productivite: 100,
      heures_par_jour: 8,
      idle_minutes: 30,
      debug: false,
      ...params
    };

    const response = await axios.post(
      `${API_URL}/api/simulation-dd/centre/${centreId}`,
      volumes,
      { params: defaultParams }
    );
    return response.data;
  },

  /**
   * Vérifie la couverture des règles pour un centre/poste
   */
  checkCoverage: async (centrePosteId) => {
    const response = await axios.get(`${API_URL}/api/simulation-dd/coverage/${centrePosteId}`);
    return response.data;
  },

  /**
   * Crée un objet de volumes vide avec la structure complète
   */
  createEmptyVolumes: () => {
    const emptyFlux = () => ({
      GLOBAL: 0,
      PART: 0,
      PRO: 0,
      DIST: 0,
      AXES: 0
    });

    return {
      flux_arrivee: {
        amana: emptyFlux(),
        co: emptyFlux(),
        cr: emptyFlux(),
        ebarkia: emptyFlux(),
        lrh: emptyFlux()
      },
      flux_depart: {
        amana: emptyFlux(),
        co: emptyFlux(),
        cr: emptyFlux(),
        ebarkia: emptyFlux(),
        lrh: emptyFlux()
      },
      guichet: {
        DEPOT: 0,
        RECUP: 0
      },
      nb_jours_ouvres_an: 264
    };
  }
};
