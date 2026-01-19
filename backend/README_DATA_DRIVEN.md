# 🎯 SIMULATEUR RH - ARCHITECTURE DATA-DRIVEN

## 📋 Vue d'ensemble

Application de simulation RH/logistique avec une **architecture 100% data-driven** qui élimine toute logique conditionnelle hardcodée.

### Caractéristiques principales

- ✅ **Mapping automatique** des volumes UI vers les tâches
- ✅ **Conversion d'unités** pilotée par table de référence
- ✅ **Scalable** : nouveaux flux/sens/segments sans changer le code
- ✅ **Centralisée** : toute la configuration dans la base de données
- ✅ **Maintenable** : code simple et lisible

---

## 🏗️ Architecture

### Composants principaux

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  (Vue.js - Saisie des volumes UI par flux/sens/segment)    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ POST /api/simulation-dd/intervenant/{id}
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                      API ENDPOINTS                          │
│  - /intervenant/{id}   - /centre/{id}                       │
│  - /multi-centres      - /test-mapping/{id}                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  DATA-DRIVEN ENGINE                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Find Matching Rule (via volume_mapping_rules)   │   │
│  │ 2. Extract Volume (via ui_path navigation)         │   │
│  │ 3. Apply Conversion (via unite_conversion_rules)   │   │
│  │ 4. Calculate Charge (volume × chrono)              │   │
│  │ 5. Calculate ETP (formule métier)                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   BASE DE DONNÉES                           │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ volume_mapping_  │  │ unite_conversion_│                │
│  │ rules            │  │ rules            │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ taches           │  │ flux / sens /    │                │
│  │                  │  │ segments         │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Tables de référence

#### `volume_mapping_rules`
Définit les règles de correspondance UI ↔ Tâche.

| Colonne | Description | Exemple |
|---------|-------------|---------|
| `flux_id` | ID du flux (NULL = wildcard) | 1 (AMANA) |
| `sens_id` | ID du sens (NULL = wildcard) | 1 (ARRIVEE) |
| `segment_id` | ID du segment (NULL = wildcard) | 1 (GLOBAL) |
| `nom_tache_keyword` | Mot-clé dans nom_tache | "dépôt" |
| `ui_path` | Chemin dans la structure UI | "flux_arrivee.amana.global_" |
| `priority` | Priorité (plus élevé = prioritaire) | 100 |

#### `unite_conversion_rules`
Définit les facteurs de conversion d'unités.

| Colonne | Description | Exemple |
|---------|-------------|---------|
| `unite_mesure` | Unité de mesure | "SAC" |
| `facteur_conversion` | Facteur à appliquer | 0.2 (1 sac = 5 colis) |

---

## 🚀 Démarrage rapide

### 1. Initialiser les règles de mapping

```bash
cd backend
python scripts/init_mapping_rules.py
```

### 2. Tester l'architecture

```bash
python scripts/test_data_driven.py
```

### 3. Démarrer le serveur

```bash
uvicorn app.main:app --port 8000 --reload
```

### 4. Tester les endpoints

```bash
# Lister les règles de mapping
curl http://localhost:8000/api/simulation-dd/mapping-rules

# Tester le mapping pour un centre/poste
curl http://localhost:8000/api/simulation-dd/test-mapping/1

# Lancer une simulation
curl -X POST "http://localhost:8000/api/simulation-dd/intervenant/1?debug=true" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

---

## 📊 Exemple de payload

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

---

## 📁 Structure du projet

```
backend/
├── app/
│   ├── api/
│   │   └── simulation_data_driven.py    # Endpoints API
│   ├── models/
│   │   ├── db_models.py                 # Modèles existants
│   │   └── mapping_models.py            # Modèles data-driven
│   ├── schemas/
│   │   └── volumes_ui.py                # Schémas Pydantic
│   ├── services/
│   │   ├── data_driven_engine.py        # Moteur data-driven
│   │   └── simulation_data_driven.py    # Services de simulation
│   └── main.py                          # Application FastAPI
├── scripts/
│   ├── init_mapping_rules.py            # Initialisation des règles
│   └── test_data_driven.py              # Tests complets
├── ARCHITECTURE_DATA_DRIVEN.md          # Guide complet
└── LIVRAISON_FINALE_DATA_DRIVEN.md      # Résumé de livraison
```

---

## 🎯 Règles métier

### 1. Normalisation des volumes UI

Volumes saisis par :
- `volume_sens` : ARRIVEE / DEPOT / RECUP / DEPART
- `volume_segment` : GLOBAL / PARTICULIER / PRO_B2B / DISTRIBUTION / AXES
- `centre_poste_id`
- `produit` (Amana, CO, CR, etc.)

### 2. Matching automatique

Pour chaque tâche :
1. Trouver la règle de mapping correspondante
2. Extraire le volume UI via le chemin
3. Appliquer le facteur de conversion d'unité
4. Convertir en volume/jour (÷ 264)

### 3. Conversion d'unités

```
Si unite_mesure = "SAC"
  → volume_applicable = volume × 0.2  (1 sac = 5 colis)

Sinon
  → volume_applicable = volume × facteur_conversion
```

### 4. Calcul de charge

```
charge_minutes = moyenne_min × volume_applicable
```

### 5. Calcul ETP

```
1. heures_necessaires = Σ (volume_jour × chrono_min) / 60
2. heures_nettes = heures_par_jour - (idle_minutes / 60)
3. heures_nettes_effectives = heures_nettes × (productivite / 100)
4. ETP_calcule = heures_necessaires / heures_nettes_effectives
5. ETP_arrondi = round_half_up(ETP_calcule) si > 0.1, sinon 0
```

---

## 🔧 Configuration

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

3. **Mettre à jour le schéma UI (frontend) :**
```typescript
interface FluxVolumesInput {
  amana?: VolumeSegmentInput;
  nouveau_flux?: VolumeSegmentInput;  // ← Ajouter ici
}
```

**Aucun changement dans le code backend !**

---

## 📚 Documentation

- **[ARCHITECTURE_DATA_DRIVEN.md](ARCHITECTURE_DATA_DRIVEN.md)** : Guide complet de l'architecture
- **[LIVRAISON_FINALE_DATA_DRIVEN.md](LIVRAISON_FINALE_DATA_DRIVEN.md)** : Résumé de livraison
- **[EXEMPLES_PAYLOADS.md](EXEMPLES_PAYLOADS.md)** : Exemples de payloads JSON

---

## 🆘 Dépannage

### Endpoints de debug

- `GET /api/simulation-dd/test-mapping/{centre_poste_id}` : Tester le mapping
- `GET /api/simulation-dd/mapping-rules` : Lister les règles de mapping
- `GET /api/simulation-dd/conversion-rules` : Lister les règles de conversion

### Logs détaillés

Ajouter `?debug=true` aux endpoints de simulation.

### Problèmes courants

**"Aucune règle trouvée"**
→ Exécuter `python scripts/init_mapping_rules.py`

**"Volume = 0"**
→ Vérifier que le `ui_path` correspond à la structure UI

**"Conversion incorrecte"**
→ Vérifier la règle dans `unite_conversion_rules`

---

## 🎉 Conclusion

Architecture **100% data-driven** qui :
- ✅ Élimine toute logique conditionnelle
- ✅ Facilite l'ajout de nouveaux flux/sens/segments
- ✅ Centralise la configuration
- ✅ Simplifie la maintenance

**Prêt à l'emploi ! 🚀**
