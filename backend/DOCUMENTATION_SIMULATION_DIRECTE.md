# Documentation - Simulation Directe avec Mapping Automatique

## Vue d'ensemble

Cette implémentation permet de calculer automatiquement les heures nécessaires et les ETP en affectant les volumes UI saisis directement aux tâches correspondantes, **sans utiliser la table `VolumeSimulation`**.

## Architecture

### 1. Schémas Pydantic (`app/schemas/volumes_ui.py`)

Structure des volumes UI saisis par l'utilisateur :

```
VolumesUIInput
├── flux_arrivee (FluxVolumesInput)
│   ├── amana (VolumeSegmentInput)
│   │   ├── GLOBAL
│   │   ├── PART
│   │   ├── PRO
│   │   ├── DIST
│   │   └── AXES
│   ├── co (VolumeSegmentInput)
│   ├── cr (VolumeSegmentInput)
│   ├── ebarkia (VolumeSegmentInput)
│   └── lrh (VolumeSegmentInput)
├── guichet (GuichetVolumesInput)
│   ├── DEPOT
│   └── RECUP
├── flux_depart (FluxVolumesInput)
│   └── [même structure que flux_arrivee]
└── nb_jours_ouvres_an (264 par défaut)
```

**Important** : Tous les volumes sont **ANNUELS** et seront automatiquement convertis en volumes/jour (÷ 264).

### 2. Service de Mapping (`app/services/volume_mapper.py`)

Le `VolumeMapper` est responsable de résoudre le volume UI à appliquer à chaque tâche.

#### Logique de mapping

Pour chaque tâche, le mapper utilise :
- `flux_id` → détermine le flux (AMANA, CO, CR, E-BARKIA, LRH)
- `sens_id` → détermine le sens (ARRIVÉE, DÉPART, GUICHET)
- `segment_id` → détermine le segment (GLOBAL, PART, PRO, DIST, AXES)
- `nom_tache` → utilisé pour distinguer DÉPÔT vs RÉCUP au guichet

#### Règles de correspondance

##### 1. Flux concerné

Le `flux_id` de la tâche est mappé vers le flux UI correspondant :

| Code DB | Clé UI |
|---------|--------|
| AMANA | amana |
| CO | co |
| CR | cr |
| EBARKIA / E-BARKIA | ebarkia |
| LRH | lrh |

##### 2. Sens (Arrivée vs Départ vs Guichet)

Le `sens_id` détermine le bloc UI à utiliser :

| Code DB | Bloc UI |
|---------|---------|
| ARRIVÉE / ARRIVEE | flux_arrivee |
| DÉPART / DEPART | flux_depart |
| GUICHET | guichet |

##### 3. Segment (colonnes)

Le `segment_id` détermine la colonne UI :

| Code DB | Attribut UI |
|---------|-------------|
| GLOBAL | global_ |
| PART / PARTICULIER | part |
| PRO / PROFESSIONNEL | pro |
| DIST / DISTRIBUTION | dist |
| AXES | axes |

##### 4. Cas spécial : GUICHET (Dépôt vs Récupération)

Pour les tâches avec `sens_id = GUICHET`, le mapper analyse le `nom_tache` :

- Si le nom contient "dépôt", "depot", "déposer", "deposer" → utilise `guichet.DEPOT`
- Si le nom contient "récup", "recup", "récupération", "recuperation", "retrait" → utilise `guichet.RECUP`
- Sinon → volume = 0 (ou logique métier à définir)

### 3. Service de Simulation (`app/services/simulation_direct.py`)

#### Fonction principale : `calculer_simulation_direct`

```python
def calculer_simulation_direct(
    db: Session,
    centre_poste_id: int,
    volumes_ui: VolumesUIInput,
    productivite: float = 100.0,
    heures_par_jour: float = 8.0,
    idle_minutes: float = 0.0,
    debug: bool = True
) -> SimulationResponse
```

**Algorithme** :

1. Créer un `VolumeMapper` avec cache des codes de référence
2. Récupérer toutes les tâches du `centre_poste_id`
3. Pour chaque tâche :
   - Résoudre le volume annuel via le mapper
   - Convertir en volume/jour (÷ 264)
   - Si volume/jour > 0 et chrono > 0 :
     - Calculer heures = (volume/jour × chrono_min) / 60
     - Ajouter aux totaux
4. Calculer l'ETP :
   - Heures nettes = heures_par_jour - (idle_minutes / 60)
   - Heures nettes effectives = heures_nettes × (productivite / 100)
   - ETP = total_heures / heures_nettes_effectives
5. Arrondir l'ETP selon la règle métier

#### Fonction d'agrégation : `calculer_simulation_multi_centres`

Permet de calculer la simulation pour plusieurs centres/postes (utilisé pour VueCentre, VueDirection, VueNationale).

### 4. API Endpoints (`app/api/simulation_direct.py`)

#### POST `/api/simulation-direct/intervenant/{centre_poste_id}`

Simulation pour un intervenant (centre/poste).

**Paramètres** :
- `centre_poste_id` (path) : ID du centre/poste
- `volumes_ui` (body) : Volumes UI (structure VolumesUIInput)
- `productivite` (query, défaut=100.0) : Productivité en %
- `heures_par_jour` (query, défaut=8.0) : Heures de travail par jour
- `idle_minutes` (query, défaut=0.0) : Marge d'inactivité en min/jour
- `debug` (query, défaut=True) : Activer les logs de debug

**Réponse** : `SimulationResponse`

#### POST `/api/simulation-direct/centre/{centre_id}`

Simulation pour un centre (agrégation de tous les postes).

**Paramètres** : Identiques à l'endpoint intervenant, mais avec `centre_id` au lieu de `centre_poste_id`.

#### GET `/api/simulation-direct/test-mapping/{centre_poste_id}`

Endpoint de test pour vérifier le mapping des tâches.

**Réponse** : Liste des tâches avec leurs informations de mapping (flux, sens, segment, chemin UI attendu).

## Conversion Annuel → Jour

**Constante** : `nb_jours_ouvres_an = 264`

**Formule** : `volume_jour = volume_annuel / 264`

Cette conversion est appliquée automatiquement par le `VolumeMapper.resolve_volume_jour()`.

## Formule de Calcul ETP

La formule utilisée est identique à celle existante :

```
1. Heures nécessaires = Σ (volume_jour × chrono_min) / 60
2. Heures nettes = heures_par_jour - (idle_minutes / 60)
3. Heures nettes effectives = heures_nettes × (productivite / 100)
4. ETP calculé = heures_nécessaires / heures_nettes_effectives
5. ETP arrondi = round_half_up(ETP_calculé) si ETP > 0.1, sinon 0
```

## Gestion des Cas Particuliers

### Tâches sans flux/sens/segment

Si une tâche a `flux_id`, `sens_id` ou `segment_id` NULL, le mapper retourne un volume de 0 et la tâche est ignorée.

### Volumes UI vides ou NULL

Si un champ UI est vide, NULL ou non fourni, il est considéré comme 0.

### Champs désactivés dans l'UI

Les champs désactivés ("non applicable") doivent être envoyés comme 0 ou NULL.

### Déterminisme

Le mapping est **déterministe** : même saisie UI → mêmes volumes/tâches → mêmes résultats.

## Logs et Debug

Lorsque `debug=True`, le service affiche :

1. **Résumé des paramètres** :
   - Productivité, heures/jour, marge d'inactivité
   - Nombre de tâches trouvées

2. **Pour chaque tâche traitée** :
   - Nom de la tâche
   - Flux, sens, segment
   - Volume annuel et volume/jour
   - Chrono moyen
   - Heures calculées
   - Source UI utilisée

3. **Pour chaque tâche ignorée** :
   - Raison de l'exclusion (volume=0 ou chrono=0)

4. **Résultats finaux** :
   - Tâches traitées vs ignorées
   - Total heures, ETP calculé, ETP arrondi

5. **Échantillon de mappings** :
   - 5 premières tâches avec détails complets

## Tests

### Script de test : `test_simulation_direct.py`

Le script de test inclut 4 scénarios :

1. **Test de mapping** : Affiche les informations de mapping pour toutes les tâches d'un centre/poste
2. **Scénario 1** : Simulation simple avec volumes AMANA en arrivée
3. **Scénario 2** : Simulation avec tous les flux (AMANA, CO, CR, E-Barkia, LRH)
4. **Test centre** : Simulation au niveau centre (agrégation)

### Exécution des tests

```bash
cd backend
python test_simulation_direct.py
```

**Prérequis** :
- Le serveur backend doit être démarré (`uvicorn app.main:app --reload`)
- La base de données doit contenir des données de référence (flux, sens, segments, tâches)

## Exemple de Payload

```json
{
  "flux_arrivee": {
    "amana": {
      "GLOBAL": 10000,
      "PART": 5000,
      "PRO": 3000,
      "DIST": 2000,
      "AXES": 0
    },
    "co": {
      "GLOBAL": 50000,
      "PART": 20000,
      "PRO": 15000,
      "DIST": 10000,
      "AXES": 5000
    }
  },
  "guichet": {
    "DEPOT": 1000,
    "RECUP": 800
  },
  "flux_depart": {
    "amana": {
      "GLOBAL": 8000,
      "PART": 4000,
      "PRO": 2500,
      "DIST": 1500,
      "AXES": 0
    }
  },
  "nb_jours_ouvres_an": 264
}
```

## Exemple de Réponse

```json
{
  "details_taches": [
    {
      "task": "Tri colis AMANA",
      "phase": "Tri",
      "unit": "COLIS",
      "avg_sec": 120.0,
      "heures": 15.15,
      "nombre_unite": 37.88,
      "poste_id": 1,
      "centre_poste_id": 1
    }
  ],
  "total_heures": 156.25,
  "heures_net_jour": 7.5,
  "fte_calcule": 20.83,
  "fte_arrondi": 21,
  "heures_par_poste": {
    "1": 156.25
  }
}
```

## Avantages de cette Approche

1. **Simplicité** : Pas de table intermédiaire `VolumeSimulation`
2. **Traçabilité** : Logs détaillés du mapping pour chaque tâche
3. **Flexibilité** : Facile d'ajouter de nouveaux flux/sens/segments
4. **Performance** : Cache des codes de référence pour éviter les requêtes répétées
5. **Déterminisme** : Résultats reproductibles et prévisibles
6. **Maintenabilité** : Code clair et bien structuré

## Limitations et Points d'Attention

1. **Dépendance aux codes de référence** : Les codes dans les tables `flux`, `volume_sens`, `volume_segments` doivent être cohérents
2. **Distinction Dépôt/Récup** : Basée sur le nom de la tâche (mots-clés), peut nécessiter des ajustements
3. **Tâches sans mapping** : Si une tâche n'a pas de flux/sens/segment, elle sera ignorée
4. **Validation UI** : Le frontend doit envoyer des données cohérentes (pas de valeurs négatives, etc.)

## Prochaines Étapes

1. **Intégration frontend** : Adapter les composants Vue pour utiliser la nouvelle structure de volumes
2. **Validation des données de référence** : Vérifier que tous les codes (flux, sens, segments) sont corrects dans la DB
3. **Tests unitaires** : Ajouter des tests unitaires pour le `VolumeMapper`
4. **Documentation UI** : Créer un guide utilisateur pour la saisie des volumes
5. **Optimisation** : Si nécessaire, ajouter des index sur les colonnes `flux_id`, `sens_id`, `segment_id` de la table `taches`

## Support et Maintenance

Pour toute question ou problème :
1. Vérifier les logs de debug (`debug=True`)
2. Utiliser l'endpoint `/api/simulation-direct/test-mapping/{centre_poste_id}` pour diagnostiquer
3. Vérifier la cohérence des données de référence (flux, sens, segments)
