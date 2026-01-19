# 🎯 ARCHITECTURE DATA-DRIVEN - GUIDE COMPLET

## 📋 Vue d'ensemble

Cette implémentation fournit une **architecture 100% data-driven** pour le moteur de simulation RH/logistique, éliminant toute logique conditionnelle hardcodée.

## ✨ Avantages de l'architecture data-driven

### ❌ Avant (logique hardcodée)
```python
# Logique conditionnelle dispersée
if sens_code == "ARRIVEE":
    if flux_code == "AMANA":
        if segment_code == "GLOBAL":
            volume = volumes_ui.flux_arrivee.amana.global_
```

### ✅ Après (100% data-driven)
```python
# Tout piloté par les tables de référence
rule = engine.find_matching_rule(tache)
volume = engine.get_volume_from_ui_path(rule.ui_path, volumes_ui)
```

**Résultat :**
- ✅ Aucun `if/else` dans le code métier
- ✅ Nouveaux flux/sens/segments sans changer le code
- ✅ Configuration centralisée dans la base de données
- ✅ Scalable et maintenable

---

## 🏗️ Architecture

### 1. Tables de référence

#### `volume_mapping_rules`
Définit les règles de correspondance UI ↔ Tâche.

| Colonne | Type | Description |
|---------|------|-------------|
| `flux_id` | INT (nullable) | ID du flux (NULL = wildcard) |
| `sens_id` | INT (nullable) | ID du sens (NULL = wildcard) |
| `segment_id` | INT (nullable) | ID du segment (NULL = wildcard) |
| `nom_tache_keyword` | VARCHAR | Mot-clé dans nom_tache (pour guichet) |
| `ui_path` | VARCHAR | Chemin dans la structure UI |
| `priority` | INT | Priorité (plus élevé = prioritaire) |

**Exemple de règles :**
```sql
-- Flux Arrivée AMANA GLOBAL
flux_id=1, sens_id=1, segment_id=1 → ui_path="flux_arrivee.amana.global_"

-- Guichet Dépôt (avec keyword)
flux_id=NULL, sens_id=3, segment_id=NULL, keyword="dépôt" → ui_path="guichet.depot"
```

#### `unite_conversion_rules`
Définit les facteurs de conversion d'unités.

| Colonne | Type | Description |
|---------|------|-------------|
| `unite_mesure` | VARCHAR | Unité de mesure (ex: "SAC", "COLIS") |
| `facteur_conversion` | FLOAT | Facteur à appliquer au volume |

**Exemple de règles :**
```sql
-- 1 sac = 5 colis → volume / 5 = volume * 0.2
unite_mesure="SAC", facteur_conversion=0.2

-- Pas de conversion pour les colis
unite_mesure="COLIS", facteur_conversion=1.0
```

### 2. Moteur data-driven

Le `DataDrivenEngine` effectue :

1. **Matching automatique** : Trouve la règle correspondant à une tâche
2. **Extraction du volume** : Navigue dans la structure UI via le chemin
3. **Conversion d'unité** : Applique le facteur de conversion
4. **Calcul de charge** : Calcule les heures nécessaires
5. **Calcul ETP** : Applique la formule métier

**Aucune logique conditionnelle dans le code !**

---

## 🚀 Installation et configuration

### Étape 1 : Créer les tables

Les tables sont créées automatiquement via SQLAlchemy :

```bash
cd backend
python scripts/init_mapping_rules.py
```

Ce script :
- ✅ Crée les tables `volume_mapping_rules` et `unite_conversion_rules`
- ✅ Initialise les règles de base (flux, sens, segments)
- ✅ Configure les conversions d'unités

### Étape 2 : Vérifier les règles

```bash
# Lister les règles de mapping
curl http://localhost:8000/api/simulation-dd/mapping-rules

# Lister les règles de conversion
curl http://localhost:8000/api/simulation-dd/conversion-rules
```

### Étape 3 : Tester le mapping

```bash
# Tester le mapping pour un centre/poste
curl http://localhost:8000/api/simulation-dd/test-mapping/1
```

**Résultat attendu :**
```json
{
  "centre_poste_id": 1,
  "nombre_taches": 45,
  "taches_avec_mapping": 42,
  "taches_sans_mapping": 3,
  "details": [
    {
      "tache_id": 1,
      "nom_tache": "Tri colis AMANA",
      "flux": "AMANA",
      "sens": "ARRIVEE",
      "segment": "GLOBAL",
      "mapping_found": true,
      "ui_path": "flux_arrivee.amana.global_",
      "facteur_conversion": 1.0
    }
  ]
}
```

---

## 📊 Utilisation

### API Endpoints

#### 1. Simulation Intervenant
```bash
POST /api/simulation-dd/intervenant/{centre_poste_id}
```

**Payload :**
```json
{
  "flux_arrivee": {
    "amana": {
      "global_": 10000,
      "part": 5000,
      "pro": 3000,
      "dist": 2000,
      "axes": 0
    }
  },
  "guichet": {
    "depot": 1000,
    "recup": 800
  },
  "flux_depart": {
    "amana": {
      "global_": 8000,
      "part": 4000,
      "pro": 2500,
      "dist": 1500,
      "axes": 0
    }
  },
  "nb_jours_ouvres_an": 264
}
```

**Query params :**
- `productivite` : 100.0 (défaut)
- `heures_par_jour` : 8.0 (défaut)
- `idle_minutes` : 0.0 (défaut)
- `debug` : false (défaut)

#### 2. Simulation Centre
```bash
POST /api/simulation-dd/centre/{centre_id}
```

Même payload, agrège tous les postes du centre.

#### 3. Simulation Multi-Centres
```bash
POST /api/simulation-dd/multi-centres?centre_ids=1&centre_ids=2&centre_ids=3
```

Agrège plusieurs centres (pour vue direction/nationale).

---

## 🔧 Configuration avancée

### Ajouter un nouveau flux

1. **Ajouter le flux dans la table `flux` :**
```sql
INSERT INTO dbo.flux (code, libelle) VALUES ('NOUVEAU_FLUX', 'Nouveau Flux');
```

2. **Ajouter les règles de mapping :**
```sql
INSERT INTO dbo.volume_mapping_rules 
(flux_id, sens_id, segment_id, ui_path, priority, description)
VALUES 
(6, 1, 1, 'flux_arrivee.nouveau_flux.global_', 100, 'Flux Arrivée - NOUVEAU_FLUX - GLOBAL');
```

3. **Mettre à jour le schéma UI** (frontend) :
```typescript
interface FluxVolumesInput {
  amana?: VolumeSegmentInput;
  co?: VolumeSegmentInput;
  nouveau_flux?: VolumeSegmentInput;  // ← Ajouter ici
}
```

**C'est tout ! Aucun changement dans le code backend.**

### Ajouter une nouvelle unité de mesure

1. **Ajouter la règle de conversion :**
```sql
INSERT INTO dbo.unite_conversion_rules 
(unite_mesure, facteur_conversion, description)
VALUES 
('PALETTE', 0.05, '1 palette = 20 colis');
```

**C'est tout ! Le moteur l'appliquera automatiquement.**

---

## 🎯 Règles métier implémentées

### 1. Normalisation des volumes UI

Les volumes sont saisis dans l'UI selon :
- `volume_sens` : ARRIVEE / DEPOT / RECUP / DEPART
- `volume_segment` : GLOBAL / PARTICULIER / PRO_B2B / DISTRIBUTION / AXES
- `centre_poste_id`
- `produit` (Amana, CO, CR, etc.)

### 2. Matching automatique TÂCHE ↔ VOLUME UI

Pour chaque tâche `t` :
- Associer le volume UI par : `t.centre_poste_id`, `t.sens_id`, `t.segment_id`
- Utiliser la table `volume_mapping_rules` pour trouver le `ui_path`
- Extraire le volume via navigation dans la structure UI

### 3. Règle d'unité (conversion volume)

Avant calcul :
```
Si t.unite_mesure = "SAC"
  → volume_applicable = volume × 0.2  (1 sac = 5 colis)

Sinon
  → volume_applicable = volume × facteur_conversion
```

### 4. Calcul de charge

Pour chaque tâche :
```
charge_minutes = t.moyenne_min × volume_applicable
```

Puis agrégation :
- Par centre
- Par sens (Arrivée / Départ / Guichet)
- Par segment
- Globalement

### 5. Calcul ETP

```
1. heures_necessaires = Σ (volume_jour × chrono_min) / 60
2. heures_nettes = heures_par_jour - (idle_minutes / 60)
3. heures_nettes_effectives = heures_nettes × (productivite / 100)
4. ETP_calcule = heures_necessaires / heures_nettes_effectives
5. ETP_arrondi = round_half_up(ETP_calcule) si > 0.1, sinon 0
```

---

## 📝 Checklist de migration

### Backend
- [x] Créer les modèles de données (`mapping_models.py`)
- [x] Créer le moteur data-driven (`data_driven_engine.py`)
- [x] Créer le service de simulation (`simulation_data_driven.py`)
- [x] Créer les endpoints API (`simulation_data_driven.py`)
- [x] Créer le script d'initialisation (`init_mapping_rules.py`)
- [ ] Enregistrer le router dans `main.py`
- [ ] Exécuter le script d'initialisation
- [ ] Tester les endpoints

### Frontend
- [ ] Adapter les composants pour utiliser les nouveaux endpoints
- [ ] Gérer les erreurs de mapping (tâches sans règle)
- [ ] Afficher les logs de debug si nécessaire

### Tests
- [ ] Tester le mapping pour tous les centres/postes
- [ ] Vérifier les conversions d'unités
- [ ] Valider les résultats avec des cas métier connus
- [ ] Comparer avec l'ancien système

---

## 🆘 Dépannage

### Problème : "Aucune règle trouvée"

**Cause :** La tâche n'a pas de règle de mapping correspondante.

**Solution :**
1. Vérifier que `flux_id`, `sens_id`, `segment_id` sont définis dans la tâche
2. Vérifier qu'une règle existe dans `volume_mapping_rules`
3. Utiliser `/test-mapping/{centre_poste_id}` pour débugger

### Problème : "Volume = 0"

**Cause :** Le chemin UI ne correspond pas à la structure des volumes.

**Solution :**
1. Vérifier que le `ui_path` dans la règle est correct
2. Vérifier que le volume est bien saisi dans l'UI
3. Activer `debug=true` pour voir les logs

### Problème : "Conversion incorrecte"

**Cause :** Le facteur de conversion n'est pas correct.

**Solution :**
1. Vérifier la règle dans `unite_conversion_rules`
2. Vérifier que `unite_mesure` correspond exactement (case-insensitive)
3. Utiliser `/conversion-rules` pour lister les règles

---

## 🎉 Conclusion

Vous disposez maintenant d'une **architecture 100% data-driven** qui :

✅ Élimine toute logique conditionnelle hardcodée
✅ Permet d'ajouter de nouveaux flux/sens/segments sans changer le code
✅ Centralise la configuration dans la base de données
✅ Facilite la maintenance et l'évolution
✅ Fournit des outils de debug et de validation

**Prochaine étape :** Enregistrer le router et exécuter le script d'initialisation !
