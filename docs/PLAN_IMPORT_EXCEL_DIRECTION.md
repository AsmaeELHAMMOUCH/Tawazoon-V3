# Plan d'Implémentation : Import Excel Multi-Centres pour Vue Direction

## 📋 Objectif

Permettre l'import en masse de volumes pour plusieurs centres depuis un fichier Excel dans la Vue Direction, en appliquant la même logique de calcul que la Vue Centre (avec gestion correcte de l'idle time).

## 🎯 Fonctionnalités Requises

### 1. **Import Excel Amélioré**
- ✅ **Déjà implémenté** : Import de base avec colonnes volumes
- 🔄 **À améliorer** : Ajouter support pour les nouveaux champs :
  - Flux/Sens/Segment (architecture data-driven)
  - Paramètres par centre (optionnel)

### 2. **Template Excel Enrichi**
Le template doit inclure :
- **Colonnes obligatoires** :
  - `Nom du Centre` ou `Centre ID`
- **Colonnes de volumes (annuels)** :
  - `Sacs / an`
  - `Colis / an`
  - `Courrier Ordinaire / an`
  - `Courrier Recommandé / an`
  - `E-Barkia / an`
  - `LRH / an`
  - `Amana / an`
- **Colonnes optionnelles** :
  - `Colis Amana par Sac` (défaut: 5)
  - `Courriers par Sac` (défaut: 4500)
  - `Colis par Collecte` (défaut: 1)

### 3. **Architecture Data-Driven (Optionnel - Phase 2)**
Pour une approche plus avancée, permettre l'import avec colonnes :
- `Centre`
- `Flux` (CO, CR, AMANA, EBARKIA, LRH)
- `Sens` (ARRIVEE, DEPART, DEPOT, RECUPERATION)
- `Segment` (PARTICULIER, PROFESSIONNEL, DISTRIBUTION, AXES, GLOBAL)
- `Volume`

## 🔧 Modifications Techniques

### Frontend

#### 1. **DirectionVolumesCard.jsx**
```javascript
// Mettre à jour le template Excel
const handleDownloadTemplate = () => {
  const headers = [
    "Nom du Centre",
    "Sacs / an",
    "Colis / an",
    "Courrier Ordinaire / an",
    "Courrier Recommandé / an",
    "E-Barkia / an",
    "LRH / an",
    "Amana / an",
    "Colis Amana par Sac",    // NOUVEAU
    "Courriers par Sac",       // NOUVEAU
    "Colis par Collecte"       // NOUVEAU
  ];
  
  const sample = [{
    "Nom du Centre": "Centre Principal",
    "Sacs / an": 100000,
    "Colis / an": 50000,
    "Courrier Ordinaire / an": 1000000,
    "Courrier Recommandé / an": 50000,
    "E-Barkia / an": 10000,
    "LRH / an": 5000,
    "Amana / an": 20000,
    "Colis Amana par Sac": 5,
    "Courriers par Sac": 4500,
    "Colis par Collecte": 1
  }];
  
  // ... reste du code
};
```

#### 2. **VueDirection.jsx - handleManualSimulate**
```javascript
const handleManualSimulate = async (importedData) => {
  if (!selectedDirection) {
    alert("Veuillez sélectionner une Direction d'abord.");
    return;
  }

  const volumes = Array.isArray(importedData)
    ? importedData.map((row) => {
        const v = {
          centre_id: undefined,
          centre_label: undefined,
          sacs: 0,
          colis: 0,
          courrier_ordinaire: 0,
          courrier_recommande: 0,
          ebarkia: 0,
          lrh: 0,
          amana: 0,
          // NOUVEAUX CHAMPS
          colis_amana_par_sac: 5,      // Défaut
          courriers_par_sac: 4500,     // Défaut
          colis_par_collecte: 1        // Défaut
        };

        Object.keys(row || {}).forEach((k) => {
          const key = normKey(k);
          const val = row[k];

          // ... mapping existant ...

          // NOUVEAUX MAPPINGS
          if (key.includes("colis") && key.includes("amana") && key.includes("sac")) {
            v.colis_amana_par_sac = toNumber(val, 5);
          } else if (key.includes("courrier") && key.includes("sac")) {
            v.courriers_par_sac = toNumber(val, 4500);
          } else if (key.includes("colis") && key.includes("collecte")) {
            v.colis_par_collecte = toNumber(val, 1);
          }
        });

        // ... reste du code ...
        return v;
      })
    : [];

  await runSim("actuel", volumes);
  initializedRef.current = true;
};
```

### Backend

#### 1. **Endpoint `/api/direction/{direction_id}/simulate`**

Le backend doit :
1. Recevoir les volumes pour plusieurs centres
2. Appliquer les paramètres globaux (productivité, idle_minutes)
3. Pour chaque centre :
   - Calculer `heures_net = heures_par_jour - (idle_minutes / 60)`
   - Appeler la logique de simulation (comme Vue Centre)
   - Agréger les résultats

```python
@router.post("/direction/{direction_id}/simulate")
async def simulate_direction(
    direction_id: int,
    payload: DirectionSimulationRequest,
    db: Session = Depends(get_db)
):
    """
    Simule pour une direction avec volumes importés
    """
    mode = payload.mode  # "database" ou "actuel"
    global_params = payload.global_params
    volumes = payload.volumes
    
    # Calcul heures nettes GLOBAL
    heures_brutes = global_params.get("heures_par_jour", 8.0)
    idle_minutes = global_params.get("idle_minutes", 0)
    heures_net = heures_brutes - (idle_minutes / 60.0)
    
    results = []
    
    if mode == "database":
        # Utiliser les volumes de la DB
        centres = get_centres_by_direction(db, direction_id)
        for centre in centres:
            result = calculer_simulation_centre_data_driven(
                db=db,
                centre_id=centre.id,
                productivite=global_params.get("productivite", 100),
                heures_net=heures_net,  # ✅ Déjà net !
                # ... autres params
            )
            results.append(result)
    
    elif mode == "actuel":
        # Utiliser les volumes importés
        for vol in volumes:
            centre_id = vol.get("centre_id")
            if not centre_id:
                continue
                
            result = calculer_simulation_centre_data_driven(
                db=db,
                centre_id=centre_id,
                productivite=global_params.get("productivite", 100),
                heures_net=heures_net,  # ✅ Déjà net !
                volumes_override=vol,  # Volumes importés
                # ... autres params
            )
            results.append(result)
    
    # Agréger les résultats
    consolidation = aggregate_results(results)
    
    return {
        "centres": results,
        "consolidation": consolidation,
        "kpis": calculate_kpis(results)
    }
```

#### 2. **Schéma Pydantic**

```python
class DirectionSimulationRequest(BaseModel):
    direction_id: int
    mode: str  # "database" | "actuel" | "scenario"
    global_params: dict  # { productivite, heures_par_jour, idle_minutes }
    volumes: List[dict] = []  # Liste des volumes par centre
```

## 📊 Flux de Données

```
1. Utilisateur télécharge le template Excel
   ↓
2. Remplit les volumes pour N centres
   ↓
3. Importe le fichier dans DirectionVolumesCard
   ↓
4. Frontend parse l'Excel → JSON
   ↓
5. Frontend appelle handleManualSimulate(data)
   ↓
6. VueDirection.runSim("actuel", volumes)
   ↓
7. Backend reçoit { mode: "actuel", volumes: [...], global_params: {...} }
   ↓
8. Pour chaque centre :
   - Calcule heures_net = heures_par_jour - (idle_minutes / 60)
   - Appelle calculer_simulation_centre_data_driven(heures_net)
   ↓
9. Backend agrège les résultats
   ↓
10. Frontend affiche les résultats consolidés
```

## ✅ Points de Validation

### Calcul Correct de l'Idle Time
- ✅ L'idle time est soustrait **une seule fois** au niveau global
- ✅ `heures_net` passé au backend est déjà net
- ✅ Le backend ne doit **pas** soustraire à nouveau l'idle time

### Cohérence avec Vue Centre
- ✅ Même logique de calcul
- ✅ Mêmes paramètres (productivité, idle_minutes, heures_net)
- ✅ Résultats identiques pour un même centre

## 🚀 Phases d'Implémentation

### Phase 1 : Amélioration Template Excel ✅
- [x] Ajouter colonnes pour paramètres de conversion
- [x] Mettre à jour le template téléchargeable
- [x] Documenter le format attendu

### Phase 2 : Backend - Endpoint Direction
- [ ] Créer/Modifier l'endpoint `/api/direction/{id}/simulate`
- [ ] Implémenter la logique de calcul multi-centres
- [ ] Gérer les modes : database, actuel, scenario
- [ ] Appliquer correctement idle_time (une seule fois)

### Phase 3 : Frontend - Intégration
- [ ] Mettre à jour le parsing Excel dans DirectionVolumesCard
- [ ] Enrichir handleManualSimulate avec nouveaux champs
- [ ] Tester l'import avec fichier réel

### Phase 4 : Tests & Validation
- [ ] Test unitaire : calcul idle_time
- [ ] Test d'intégration : import Excel → simulation
- [ ] Validation : comparer résultats Vue Centre vs Vue Direction

## 📝 Exemple de Fichier Excel

| Nom du Centre | Sacs / an | Colis / an | Courrier Ordinaire / an | Courrier Recommandé / an | E-Barkia / an | LRH / an | Amana / an | Colis Amana par Sac | Courriers par Sac | Colis par Collecte |
|----------------|-----------|------------|-------------------------|--------------------------|---------------|----------|------------|---------------------|-------------------|--------------------|
| Casablanca     | 100000    | 50000      | 1000000                 | 50000                    | 10000         | 5000     | 20000      | 5                   | 4500              | 1                  |
| Rabat          | 80000     | 40000      | 800000                  | 40000                    | 8000          | 4000     | 15000      | 5                   | 4500              | 1                  |
| Tanger         | 60000     | 30000      | 600000                  | 30000                    | 6000          | 3000     | 10000      | 5                   | 4500              | 1                  |

## 🔍 Points d'Attention

1. **Matching Centre** : Le nom du centre dans Excel doit correspondre à un centre existant en DB
2. **Volumes Annuels** : Les volumes sont annuels, le backend doit les convertir en journaliers
3. **Paramètres Globaux** : Productivité et idle_minutes s'appliquent à tous les centres
4. **Validation** : Vérifier que tous les centres importés existent

## 📅 Date de Création
**4 janvier 2026** - 22h15
