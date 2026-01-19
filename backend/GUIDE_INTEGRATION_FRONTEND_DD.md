# 🎨 GUIDE D'INTÉGRATION FRONTEND - ARCHITECTURE DATA-DRIVEN

## 📋 Vue d'ensemble

Ce guide explique comment intégrer l'architecture data-driven dans le frontend Vue.js.

---

## 🔌 Endpoints API

### Base URL
```
http://localhost:8000/api/simulation-dd
```

### Endpoints disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/intervenant/{centre_poste_id}` | POST | Simulation pour un intervenant |
| `/centre/{centre_id}` | POST | Simulation pour un centre |
| `/multi-centres` | POST | Simulation pour plusieurs centres |
| `/test-mapping/{centre_poste_id}` | GET | Tester le mapping |
| `/mapping-rules` | GET | Lister les règles de mapping |
| `/conversion-rules` | GET | Lister les règles de conversion |

---

## 📊 Structure des données

### Payload de simulation

```typescript
interface VolumeSegmentInput {
  GLOBAL?: number;
  PART?: number;
  PRO?: number;
  DIST?: number;
  AXES?: number;
}

interface FluxVolumesInput {
  amana?: VolumeSegmentInput;
  co?: VolumeSegmentInput;
  cr?: VolumeSegmentInput;
  ebarkia?: VolumeSegmentInput;
  lrh?: VolumeSegmentInput;
}

interface GuichetVolumesInput {
  DEPOT?: number;
  RECUP?: number;
}

interface VolumesUIInput {
  flux_arrivee?: FluxVolumesInput;
  guichet?: GuichetVolumesInput;
  flux_depart?: FluxVolumesInput;
  nb_jours_ouvres_an?: number;  // Défaut: 264
}
```

### Réponse de simulation

```typescript
interface TacheDetail {
  task: string;
  phase: string;
  unit: string;
  avg_sec: number;
  heures: number;
  nombre_unite: number;
  poste_id?: number;
  centre_poste_id: number;
}

interface SimulationResponse {
  details_taches: TacheDetail[];
  total_heures: number;
  heures_net_jour: number;
  fte_calcule: number;
  fte_arrondi: number;
  heures_par_poste: Record<number, number>;
}
```

---

## 🛠️ Service API

### Créer le service

```typescript
// services/simulationDataDriven.ts

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/simulation-dd';

export interface SimulationParams {
  productivite?: number;      // Défaut: 100
  heures_par_jour?: number;   // Défaut: 8
  idle_minutes?: number;      // Défaut: 0
  debug?: boolean;            // Défaut: false
}

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
      `${API_BASE_URL}/intervenant/${centrePosteId}`,
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
      `${API_BASE_URL}/centre/${centreId}`,
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
    const response = await axios.post(
      `${API_BASE_URL}/multi-centres`,
      { centre_ids: centreIds, ...volumes },
      { params }
    );
    return response.data;
  },

  /**
   * Tester le mapping pour un centre/poste
   */
  async testMapping(centrePosteId: number) {
    const response = await axios.get(
      `${API_BASE_URL}/test-mapping/${centrePosteId}`
    );
    return response.data;
  },

  /**
   * Lister les règles de mapping
   */
  async getMappingRules() {
    const response = await axios.get(`${API_BASE_URL}/mapping-rules`);
    return response.data;
  },

  /**
   * Lister les règles de conversion
   */
  async getConversionRules() {
    const response = await axios.get(`${API_BASE_URL}/conversion-rules`);
    return response.data;
  }
};
```

---

## 🎨 Composant Vue - Formulaire de saisie

### Composant de saisie des volumes

```vue
<template>
  <div class="volumes-form">
    <!-- Info banner -->
    <div class="info-banner">
      <i class="icon-info"></i>
      <div>
        <strong>Volumes annuels</strong>
        <p>Les volumes seront automatiquement convertis en volumes/jour (÷ 264)</p>
      </div>
    </div>

    <!-- FLUX ARRIVÉE -->
    <section class="flux-section">
      <h3>📥 Flux Arrivée</h3>
      
      <!-- AMANA -->
      <div class="flux-group">
        <h4>Amana</h4>
        <div class="segment-inputs">
          <div class="input-group">
            <label>Global</label>
            <input 
              v-model.number="volumes.flux_arrivee.amana.GLOBAL" 
              type="number" 
              placeholder="Volume annuel"
            />
            <span class="volume-jour">
              ≈ {{ volumeJour(volumes.flux_arrivee.amana.GLOBAL) }} / jour
            </span>
          </div>
          
          <div class="input-group">
            <label>Particulier</label>
            <input 
              v-model.number="volumes.flux_arrivee.amana.PART" 
              type="number" 
              placeholder="Volume annuel"
            />
            <span class="volume-jour">
              ≈ {{ volumeJour(volumes.flux_arrivee.amana.PART) }} / jour
            </span>
          </div>
          
          <!-- Autres segments... -->
        </div>
      </div>
      
      <!-- Autres flux (CO, CR, etc.)... -->
    </section>

    <!-- GUICHET -->
    <section class="guichet-section">
      <h3>🏢 Guichet</h3>
      
      <div class="guichet-inputs">
        <div class="input-group">
          <label>Dépôt</label>
          <input 
            v-model.number="volumes.guichet.DEPOT" 
            type="number" 
            placeholder="Volume annuel"
          />
          <span class="volume-jour">
            ≈ {{ volumeJour(volumes.guichet.DEPOT) }} / jour
          </span>
        </div>
        
        <div class="input-group">
          <label>Récupération</label>
          <input 
            v-model.number="volumes.guichet.RECUP" 
            type="number" 
            placeholder="Volume annuel"
          />
          <span class="volume-jour">
            ≈ {{ volumeJour(volumes.guichet.RECUP) }} / jour
          </span>
        </div>
      </div>
    </section>

    <!-- FLUX DÉPART -->
    <section class="flux-section">
      <h3>📤 Flux Départ</h3>
      <!-- Même structure que Flux Arrivée -->
    </section>

    <!-- Actions -->
    <div class="actions">
      <button @click="lancerSimulation" :disabled="loading">
        <i class="icon-play"></i>
        {{ loading ? 'Calcul en cours...' : 'Lancer la simulation' }}
      </button>
      
      <button @click="testerMapping" class="btn-secondary">
        <i class="icon-test"></i>
        Tester le mapping
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { simulationDataDrivenService } from '@/services/simulationDataDriven';

const props = defineProps<{
  centrePosteId: number;
}>();

const emit = defineEmits<{
  (e: 'simulation-complete', result: SimulationResponse): void;
}>();

const loading = ref(false);

const volumes = reactive<VolumesUIInput>({
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
});

const volumeJour = (volumeAnnuel: number) => {
  return (volumeAnnuel / 264).toFixed(2);
};

const lancerSimulation = async () => {
  loading.value = true;
  
  try {
    const result = await simulationDataDrivenService.simulateIntervenant(
      props.centrePosteId,
      volumes,
      {
        productivite: 100,
        heures_par_jour: 8,
        idle_minutes: 30,
        debug: false
      }
    );
    
    emit('simulation-complete', result);
  } catch (error) {
    console.error('Erreur lors de la simulation:', error);
    // Gérer l'erreur (afficher un message, etc.)
  } finally {
    loading.value = false;
  }
};

const testerMapping = async () => {
  try {
    const result = await simulationDataDrivenService.testMapping(props.centrePosteId);
    console.log('Résultat du test de mapping:', result);
    // Afficher les résultats dans une modal ou un panneau
  } catch (error) {
    console.error('Erreur lors du test de mapping:', error);
  }
};
</script>

<style scoped>
.volumes-form {
  padding: 2rem;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.flux-section, .guichet-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.flux-group {
  margin-bottom: 1.5rem;
}

.segment-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-weight: 600;
  color: #4a5568;
}

.input-group input {
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.input-group input:focus {
  outline: none;
  border-color: #667eea;
}

.volume-jour {
  font-size: 0.875rem;
  color: #718096;
  font-style: italic;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

button {
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

button:not(.btn-secondary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

button:not(.btn-secondary):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover {
  background: #f7fafc;
}
</style>
```

---

## 📊 Composant Vue - Affichage des résultats

```vue
<template>
  <div class="simulation-results">
    <div class="results-header">
      <h2>Résultats de la simulation</h2>
      <div class="etp-badge">
        <span class="label">ETP calculé</span>
        <span class="value">{{ result.fte_arrondi }}</span>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <i class="icon-clock"></i>
        <div>
          <span class="metric-label">Total heures</span>
          <span class="metric-value">{{ result.total_heures }}h</span>
        </div>
      </div>

      <div class="metric-card">
        <i class="icon-calendar"></i>
        <div>
          <span class="metric-label">Heures nettes/jour</span>
          <span class="metric-value">{{ result.heures_net_jour }}h</span>
        </div>
      </div>

      <div class="metric-card">
        <i class="icon-users"></i>
        <div>
          <span class="metric-label">ETP calculé</span>
          <span class="metric-value">{{ result.fte_calcule.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <div class="tasks-table">
      <h3>Détails des tâches</h3>
      <table>
        <thead>
          <tr>
            <th>Tâche</th>
            <th>Phase</th>
            <th>Unité</th>
            <th>Nombre d'unités</th>
            <th>Temps moyen</th>
            <th>Heures</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tache in result.details_taches" :key="tache.task">
            <td>{{ tache.task }}</td>
            <td>{{ tache.phase }}</td>
            <td>{{ tache.unit }}</td>
            <td>{{ tache.nombre_unite.toFixed(2) }}</td>
            <td>{{ (tache.avg_sec / 60).toFixed(2) }} min</td>
            <td>{{ tache.heures }}h</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  result: SimulationResponse;
}>();
</script>

<style scoped>
/* Styles pour l'affichage des résultats */
</style>
```

---

## 🎯 Intégration dans les vues existantes

### Vue Intervenant

```vue
<template>
  <div class="vue-intervenant">
    <!-- Sélection du centre/poste -->
    <SelectionCentrePoste v-model="selectedCentrePosteId" />

    <!-- Formulaire de saisie des volumes -->
    <VolumesForm 
      v-if="selectedCentrePosteId"
      :centre-poste-id="selectedCentrePosteId"
      @simulation-complete="handleSimulationComplete"
    />

    <!-- Résultats -->
    <SimulationResults 
      v-if="simulationResult"
      :result="simulationResult"
    />
  </div>
</template>
```

### Vue Centre

```typescript
// Utiliser simulateCentre au lieu de simulateIntervenant
const result = await simulationDataDrivenService.simulateCentre(
  centreId,
  volumes,
  params
);
```

### Vue Direction/Nationale

```typescript
// Utiliser simulateMultiCentres
const result = await simulationDataDrivenService.simulateMultiCentres(
  centreIds,
  volumes,
  params
);
```

---

## 🔍 Debug et validation

### Composant de test de mapping

```vue
<template>
  <div class="mapping-test">
    <button @click="testMapping">Tester le mapping</button>
    
    <div v-if="mappingResult" class="mapping-results">
      <h3>Résultats du mapping</h3>
      <p>Tâches avec mapping : {{ mappingResult.taches_avec_mapping }}</p>
      <p>Tâches sans mapping : {{ mappingResult.taches_sans_mapping }}</p>
      
      <table>
        <thead>
          <tr>
            <th>Tâche</th>
            <th>Flux</th>
            <th>Sens</th>
            <th>Segment</th>
            <th>UI Path</th>
            <th>Facteur conversion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="detail in mappingResult.details" :key="detail.tache_id">
            <td>{{ detail.nom_tache }}</td>
            <td>{{ detail.flux }}</td>
            <td>{{ detail.sens }}</td>
            <td>{{ detail.segment }}</td>
            <td>{{ detail.ui_path || 'N/A' }}</td>
            <td>{{ detail.facteur_conversion }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
```

---

## ✅ Checklist d'intégration

- [ ] Créer le service API (`simulationDataDriven.ts`)
- [ ] Créer le composant de saisie des volumes (`VolumesForm.vue`)
- [ ] Créer le composant d'affichage des résultats (`SimulationResults.vue`)
- [ ] Intégrer dans Vue Intervenant
- [ ] Intégrer dans Vue Centre
- [ ] Intégrer dans Vue Direction/Nationale
- [ ] Ajouter la gestion des erreurs
- [ ] Ajouter le composant de test de mapping
- [ ] Tester avec des données réelles

---

## 🎉 Conclusion

L'intégration frontend est simple et directe :
1. ✅ Utiliser le service API fourni
2. ✅ Créer les composants de saisie et d'affichage
3. ✅ Gérer les erreurs et le loading
4. ✅ Tester avec les endpoints de debug

**L'architecture data-driven est prête à l'emploi ! 🚀**
