# Nouvelle Architecture Flux/Sens/Segment - État d'avancement

## ✅ Ce qui a été implémenté

### 1. Backend - Modèles et Services

- ✅ **Modèle SQLAlchemy** (`VolumeSimulation`) - déjà correct
- ✅ **Schémas Pydantic** (`BulkVolumeUpsertRequest`, `VolumeItem`)
- ✅ **Service volume_service.py** avec:
  - `upsert_volumes_bulk()` - MERGE SQL pour upsert en batch
  - `calculate_heures_necessaires()` - Calcul basé sur JOIN avec taches
  - `calculate_etp()` - Calcul ETP avec règles d'arrondi
- ✅ **API endpoints** (`/api/volumes/*`):
  - `POST /bulk-upsert` - Upsert bulk
  - `GET /calculate/{simulation_id}` - Calcul heures/ETP
  - `POST /calculate-direct` - Upsert + Calcul en une requête
- ✅ **Script de migration SQL** (`fix_volume_simulation.sql`)
- ✅ **Migration exécutée** avec succès

### 2. Scripts de test

- ✅ `test_new_architecture.py` - Tests complets
- ✅ `test_simple.py` - Test minimal
- ✅ `run_migration.py` - Exécution migration

## ⚠️ Problèmes rencontrés

### Erreur SQL actuelle

Le backend retourne une erreur 500 lors de l'upsert. Causes possibles:

1. **Colonne manquante** dans `volume_simulation`
2. **Contrainte FK** qui échoue (flux_id, sens_id, segment_id)
3. **Syntaxe MERGE** incompatible avec la version SQL Server

### Actions de debug nécessaires

```python
# Vérifier la structure de la table
SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'volume_simulation'

# Vérifier les contraintes
SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_NAME = 'volume_simulation'

# Tester un INSERT simple
INSERT INTO dbo.volume_simulation 
(simulation_id, centre_poste_id, flux_id, sens_id, segment_id, volume)
VALUES (1, 8248, 1, 1, 2, 1000)
```

## 🔄 Prochaines étapes

### Backend

1. **Débugger l'erreur SQL**:
   - Vérifier la structure exacte de `volume_simulation`
   - Tester la requête MERGE manuellement
   - Simplifier si nécessaire (DELETE + INSERT au lieu de MERGE)

2. **Valider les FK**:
   - S'assurer que flux_id=1, sens_id=1, segment_id=2 existent
   - Vérifier que centre_poste_id=8248 existe

3. **Tester le calcul**:
   - Une fois l'upsert fonctionnel
   - Vérifier que le JOIN avec taches fonctionne
   - Valider les formules de calcul

### Frontend

Une fois le backend validé:

1. **Créer le composant de grille de saisie**:
   ```vue
   <template>
     <div class="volume-grid">
       <!-- Flux Arrivée -->
       <div v-for="flux in fluxArrivee" :key="flux.id">
         <input 
           v-for="segment in segments" 
           :key="segment.id"
           v-model="volumes[`${flux.id}:1:${segment.id}`]"
           type="number"
         />
       </div>
     </div>
   </template>
   ```

2. **Fonction de conversion grille → payload**:
   ```javascript
   function buildPayload() {
     const volumesList = [];
     for (const [key, value] of Object.entries(volumes.value)) {
       if (value > 0) {
         const [flux_id, sens_id, segment_id] = key.split(':').map(Number);
         volumesList.push({
           centre_poste_id: selectedCentrePoste.value,
           flux_id,
           sens_id,
           segment_id,
           volume: value
         });
       }
     }
     return {
       simulation_id: currentSimulationId.value,
       centre_poste_id: selectedCentrePoste.value,
       volumes: volumesList
     };
   }
   ```

3. **Appel API**:
   ```javascript
   async function launcerSimulation() {
     const payload = buildPayload();
     const response = await axios.post('/api/volumes/calculate-direct', payload, {
       params: {
         capacite_nette_h_j: parametres.heuresNet,
         productivite_pct: parametres.productivite
       }
     });
     // Afficher les résultats
     resultats.value = response.data;
   }
   ```

## 📊 Architecture finale

```
Frontend (Vue)
  ↓ Grille de saisie (Flux × Sens × Segment)
  ↓ Conversion en payload bulk
  ↓
API /api/volumes/calculate-direct
  ↓
Service volume_service.py
  ├─ upsert_volumes_bulk() → VolumeSimulation (MERGE)
  ├─ calculate_heures_necessaires() → JOIN avec taches
  └─ calculate_etp() → Formule ETP
  ↓
Response {
  total_heures,
  etp_calcule,
  etp_arrondi,
  details: [{flux_id, sens_id, segment_id, heures}],
  warnings: [...]
}
```

## 🎯 Objectif final

L'utilisateur saisit les volumes dans la grille UI, et le système:

1. ✅ Stocke correctement dans `VolumeSimulation` (par Flux/Sens/Segment)
2. ✅ Calcule les heures en joignant avec `taches`
3. ✅ Applique les formules de productivité et capacité
4. ✅ Retourne ETP calculé et arrondi
5. ✅ Affiche les warnings pour volumes sans tâches

---

**Status actuel**: Backend implémenté, en cours de debug SQL  
**Prochaine action**: Résoudre l'erreur 500 sur l'upsert
