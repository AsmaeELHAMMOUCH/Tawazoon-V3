# Guide d'intégration Frontend - Simulation Directe

## 📋 Vue d'ensemble

Ce guide explique comment adapter le frontend pour utiliser la nouvelle API de simulation directe.

## 🎯 Structure des volumes UI à envoyer

### Format JSON attendu

```javascript
const volumesUI = {
  flux_arrivee: {
    amana: {
      GLOBAL: 10000,  // Volume annuel
      PART: 5000,
      PRO: 3000,
      DIST: 2000,
      AXES: 0
    },
    co: {
      GLOBAL: 50000,
      PART: 20000,
      PRO: 15000,
      DIST: 10000,
      AXES: 5000
    },
    cr: { /* ... */ },
    ebarkia: { /* ... */ },
    lrh: { /* ... */ }
  },
  guichet: {
    DEPOT: 1000,   // Volume annuel de dépôts
    RECUP: 800     // Volume annuel de récupérations
  },
  flux_depart: {
    amana: { /* même structure que flux_arrivee */ },
    co: { /* ... */ }
  },
  nb_jours_ouvres_an: 264  // Fixe (configurable plus tard)
};
```

## 🔧 Composant Vue - Formulaire de saisie

### Structure du formulaire

```vue
<template>
  <div class="volumes-form">
    <!-- En-tête avec info conversion -->
    <div class="info-banner">
      <i class="icon-info"></i>
      <span>Les volumes sont saisis en <strong>annuel</strong></span>
      <span class="conversion-info">Conversion automatique : ÷ 264 jours ouvrés</span>
    </div>

    <!-- FLUX ARRIVÉE -->
    <section class="flux-section">
      <h3>📥 Flux Arrivée</h3>
      
      <!-- AMANA -->
      <div class="flux-row">
        <label>Amana</label>
        <input v-model.number="volumes.flux_arrivee.amana.GLOBAL" 
               type="number" 
               placeholder="Global"
               @input="updateVolumeJour('amana', 'GLOBAL', $event.target.value)">
        <span class="volume-jour">≈ {{ calculateVolumeJour(volumes.flux_arrivee.amana.GLOBAL) }} / jour</span>
        
        <input v-model.number="volumes.flux_arrivee.amana.PART" 
               type="number" 
               placeholder="Particulier">
        <span class="volume-jour">≈ {{ calculateVolumeJour(volumes.flux_arrivee.amana.PART) }} / jour</span>
        
        <!-- PRO, DIST, AXES... -->
      </div>

      <!-- CO, CR, E-Barkia, LRH... -->
    </section>

    <!-- GUICHET -->
    <section class="guichet-section">
      <h3>🏢 Guichet</h3>
      
      <div class="guichet-row">
        <label>Dépôt</label>
        <input v-model.number="volumes.guichet.DEPOT" 
               type="number" 
               placeholder="Volume annuel">
        <span class="volume-jour">≈ {{ calculateVolumeJour(volumes.guichet.DEPOT) }} / jour</span>
      </div>

      <div class="guichet-row">
        <label>Récupération</label>
        <input v-model.number="volumes.guichet.RECUP" 
               type="number" 
               placeholder="Volume annuel">
        <span class="volume-jour">≈ {{ calculateVolumeJour(volumes.guichet.RECUP) }} / jour</span>
      </div>
    </section>

    <!-- FLUX DÉPART -->
    <section class="flux-section">
      <h3>📤 Flux Départ</h3>
      <!-- Même structure que Flux Arrivée -->
    </section>

    <!-- Bouton de simulation -->
    <button @click="lancerSimulation" class="btn-simulate">
      Lancer la simulation
    </button>
  </div>
</template>

<script>
export default {
  name: 'VolumesForm',
  
  data() {
    return {
      volumes: {
        flux_arrivee: {
          amana: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          co: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          cr: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          ebarkia: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          lrh: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 }
        },
        guichet: {
          DEPOT: 0,
          RECUP: 0
        },
        flux_depart: {
          amana: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          co: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          cr: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          ebarkia: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 },
          lrh: { GLOBAL: 0, PART: 0, PRO: 0, DIST: 0, AXES: 0 }
        },
        nb_jours_ouvres_an: 264
      },
      
      // Paramètres de simulation
      productivite: 100,
      heuresParJour: 8,
      idleMinutes: 30,
      
      // Résultats
      resultatSimulation: null,
      loading: false
    };
  },
  
  methods: {
    calculateVolumeJour(volumeAnnuel) {
      if (!volumeAnnuel || volumeAnnuel <= 0) return '0.00';
      return (volumeAnnuel / this.volumes.nb_jours_ouvres_an).toFixed(2);
    },
    
    async lancerSimulation() {
      this.loading = true;
      
      try {
        const centrePosteId = this.$route.params.centrePosteId; // ou depuis le store
        
        const response = await fetch(
          `http://localhost:8000/api/simulation-direct/intervenant/${centrePosteId}?` +
          `productivite=${this.productivite}&` +
          `heures_par_jour=${this.heuresParJour}&` +
          `idle_minutes=${this.idleMinutes}&` +
          `debug=true`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.volumes)
          }
        );
        
        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${await response.text()}`);
        }
        
        this.resultatSimulation = await response.json();
        
        // Afficher les résultats
        console.log('Résultats de la simulation:', this.resultatSimulation);
        
        // Émettre un événement pour le composant parent
        this.$emit('simulation-complete', this.resultatSimulation);
        
      } catch (error) {
        console.error('Erreur lors de la simulation:', error);
        alert(`Erreur: ${error.message}`);
      } finally {
        this.loading = false;
      }
    },
    
    // Méthode pour charger des volumes pré-remplis (optionnel)
    async chargerVolumesReference(centreId) {
      // Appeler l'API pour récupérer les volumes de référence du centre
      // et pré-remplir le formulaire
    }
  }
};
</script>

<style scoped>
.volumes-form {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.info-banner {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 15px;
  margin-bottom: 30px;
  border-radius: 4px;
}

.info-banner strong {
  color: #1976d2;
}

.conversion-info {
  display: block;
  font-size: 0.9em;
  color: #666;
  margin-top: 5px;
}

.flux-section, .guichet-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.flux-section h3, .guichet-section h3 {
  margin-bottom: 15px;
  color: #333;
}

.flux-row, .guichet-row {
  display: grid;
  grid-template-columns: 150px repeat(5, 1fr);
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
}

.flux-row label, .guichet-row label {
  font-weight: 600;
}

.flux-row input, .guichet-row input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.volume-jour {
  font-size: 0.85em;
  color: #666;
  font-style: italic;
}

.btn-simulate {
  background: #4caf50;
  color: white;
  padding: 15px 30px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: 20px;
}

.btn-simulate:hover {
  background: #45a049;
}

.btn-simulate:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
```

## 🔄 Service API (optionnel)

Créer un service dédié pour les appels API :

```javascript
// services/simulationDirectService.js

const API_BASE_URL = 'http://localhost:8000';

export const simulationDirectService = {
  /**
   * Lance une simulation pour un intervenant
   */
  async simulerIntervenant(centrePosteId, volumesUI, params = {}) {
    const {
      productivite = 100,
      heuresParJour = 8,
      idleMinutes = 30,
      debug = true
    } = params;
    
    const queryParams = new URLSearchParams({
      productivite,
      heures_par_jour: heuresParJour,
      idle_minutes: idleMinutes,
      debug
    });
    
    const response = await fetch(
      `${API_BASE_URL}/api/simulation-direct/intervenant/${centrePosteId}?${queryParams}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(volumesUI)
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur ${response.status}: ${error}`);
    }
    
    return await response.json();
  },
  
  /**
   * Lance une simulation pour un centre
   */
  async simulerCentre(centreId, volumesUI, params = {}) {
    const {
      productivite = 100,
      heuresParJour = 8,
      idleMinutes = 30,
      debug = false
    } = params;
    
    const queryParams = new URLSearchParams({
      productivite,
      heures_par_jour: heuresParJour,
      idle_minutes: idleMinutes,
      debug
    });
    
    const response = await fetch(
      `${API_BASE_URL}/api/simulation-direct/centre/${centreId}?${queryParams}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(volumesUI)
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur ${response.status}: ${error}`);
    }
    
    return await response.json();
  },
  
  /**
   * Teste le mapping des volumes pour un centre/poste
   */
  async testerMapping(centrePosteId) {
    const response = await fetch(
      `${API_BASE_URL}/api/simulation-direct/test-mapping/${centrePosteId}`
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur ${response.status}: ${error}`);
    }
    
    return await response.json();
  }
};
```

## 📊 Composant d'affichage des résultats

```vue
<template>
  <div class="simulation-results" v-if="results">
    <h2>📊 Résultats de la simulation</h2>
    
    <!-- Résumé -->
    <div class="summary-cards">
      <div class="card">
        <div class="card-label">Total heures nécessaires</div>
        <div class="card-value">{{ results.total_heures }}h</div>
      </div>
      
      <div class="card">
        <div class="card-label">Heures nettes / jour</div>
        <div class="card-value">{{ results.heures_net_jour }}h</div>
      </div>
      
      <div class="card">
        <div class="card-label">ETP calculé</div>
        <div class="card-value">{{ results.fte_calcule }}</div>
      </div>
      
      <div class="card highlight">
        <div class="card-label">ETP arrondi</div>
        <div class="card-value">{{ results.fte_arrondi }}</div>
      </div>
    </div>
    
    <!-- Détails des tâches -->
    <div class="tasks-details">
      <h3>Détails par tâche</h3>
      
      <table>
        <thead>
          <tr>
            <th>Tâche</th>
            <th>Phase</th>
            <th>Unité</th>
            <th>Volume/jour</th>
            <th>Chrono (sec)</th>
            <th>Heures</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(tache, index) in results.details_taches" :key="index">
            <td>{{ tache.task }}</td>
            <td>{{ tache.phase }}</td>
            <td>{{ tache.unit }}</td>
            <td>{{ tache.nombre_unite.toFixed(2) }}</td>
            <td>{{ tache.avg_sec.toFixed(0) }}s</td>
            <td>{{ tache.heures }}h</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SimulationResults',
  props: {
    results: {
      type: Object,
      required: true
    }
  }
};
</script>

<style scoped>
.simulation-results {
  margin-top: 30px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.card.highlight {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.card-label {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 10px;
}

.card.highlight .card-label {
  color: rgba(255,255,255,0.9);
}

.card-value {
  font-size: 2em;
  font-weight: 700;
}

.tasks-details {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background: #f5f5f5;
  font-weight: 600;
}

tr:hover {
  background: #f9f9f9;
}
</style>
```

## 🎨 Recommandations UX

### 1. Labels clairs
- ✅ "Volume annuel" (pas juste "Volume")
- ✅ Info-bulle : "Conversion automatique en volume/jour : ÷ 264 jours ouvrés"

### 2. Feedback visuel
- ✅ Afficher "≈ X / jour" sous chaque input (lecture seule)
- ✅ Désactiver les champs non applicables (griser)
- ✅ Validation en temps réel (pas de valeurs négatives)

### 3. Aide contextuelle
- ✅ Icône d'aide avec tooltip pour chaque section
- ✅ Exemples de valeurs typiques
- ✅ Message d'erreur clair si simulation échoue

### 4. Performance
- ✅ Debounce sur les calculs de volume/jour
- ✅ Loader pendant la simulation
- ✅ Cache des résultats si volumes inchangés

## 🔍 Debug et Logs

Pour activer les logs détaillés côté backend :

```javascript
// Passer debug=true dans les paramètres
const params = {
  productivite: 100,
  heuresParJour: 8,
  idleMinutes: 30,
  debug: true  // ← Active les logs détaillés
};

const result = await simulationDirectService.simulerIntervenant(
  centrePosteId,
  volumesUI,
  params
);
```

Les logs apparaîtront dans la console du serveur backend.

## ✅ Checklist d'intégration

- [ ] Créer le composant de formulaire de saisie des volumes
- [ ] Implémenter le calcul "≈ X / jour" en temps réel
- [ ] Créer le service API pour les appels
- [ ] Créer le composant d'affichage des résultats
- [ ] Ajouter la validation des inputs (pas de négatifs, etc.)
- [ ] Ajouter les tooltips et l'aide contextuelle
- [ ] Tester avec des données réelles
- [ ] Gérer les cas d'erreur (affichage, retry, etc.)
- [ ] Optimiser les performances (debounce, cache)
- [ ] Documenter pour les autres développeurs

## 📞 Support

En cas de problème :
1. Vérifier la console du navigateur (erreurs JS)
2. Vérifier la console du serveur backend (logs Python)
3. Utiliser l'endpoint `/test-mapping` pour diagnostiquer
4. Vérifier que les volumes envoyés respectent la structure attendue
