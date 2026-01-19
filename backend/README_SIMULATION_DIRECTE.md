# 🎯 Simulation RH Directe - README

## 📋 Présentation

Système de simulation RH qui affecte **automatiquement** les volumes UI aux tâches pour calculer les heures nécessaires et les ETP, **sans utiliser la table VolumeSimulation**.

## ✨ Fonctionnalités principales

- ✅ **Mapping automatique** : Volumes UI → Tâches (basé sur flux/sens/segment)
- ✅ **Conversion automatique** : Annuel → Jour (÷ 264 jours ouvrés)
- ✅ **Calcul ETP** : Formule identique à l'existant (pas de changement)
- ✅ **Logs détaillés** : Mode debug pour tracer tous les mappings
- ✅ **API REST** : Endpoints pour intervenant, centre, direction, national
- ✅ **Tests automatisés** : Scripts de test et vérification des données

## 🚀 Démarrage rapide

### 1. Vérifier les données de référence

```bash
cd backend
python check_reference_data.py
```

### 2. Tester l'API

```bash
# Test de mapping
curl http://localhost:8000/api/simulation-direct/test-mapping/1

# Test de simulation
curl -X POST "http://localhost:8000/api/simulation-direct/intervenant/1?debug=true" \
  -H "Content-Type: application/json" \
  -d '{
    "flux_arrivee": {
      "amana": {"GLOBAL": 10000, "PART": 5000, "PRO": 3000, "DIST": 2000, "AXES": 0}
    },
    "guichet": {"DEPOT": 1000, "RECUP": 800},
    "flux_depart": {
      "amana": {"GLOBAL": 8000, "PART": 4000, "PRO": 2500, "DIST": 1500, "AXES": 0}
    },
    "nb_jours_ouvres_an": 264
  }'
```

### 3. Lancer les tests automatisés

```bash
cd backend
python test_simulation_direct.py
```

## 📁 Structure du projet

```
backend/
├── app/
│   ├── schemas/
│   │   └── volumes_ui.py              # Schémas Pydantic
│   ├── services/
│   │   ├── volume_mapper.py           # Service de mapping
│   │   └── simulation_direct.py       # Service de simulation
│   └── api/
│       └── simulation_direct.py       # Endpoints API
├── test_simulation_direct.py          # Tests automatisés
├── check_reference_data.py            # Vérification données
├── DOCUMENTATION_SIMULATION_DIRECTE.md
├── EXEMPLES_PAYLOADS.md
├── GUIDE_INTEGRATION_FRONTEND.md
├── RESUME_IMPLEMENTATION.md
├── LIVRAISON_FINALE.md
└── README.md                          # Ce fichier
```

## 🎯 Endpoints API

### Test de mapping
```
GET /api/simulation-direct/test-mapping/{centre_poste_id}
```

### Simulation intervenant
```
POST /api/simulation-direct/intervenant/{centre_poste_id}
  ?productivite=100
  &heures_par_jour=8
  &idle_minutes=30
  &debug=true
```

### Simulation centre
```
POST /api/simulation-direct/centre/{centre_id}
  ?productivite=100
  &heures_par_jour=8
  &idle_minutes=30
  &debug=false
```

## 📊 Structure des volumes UI

```json
{
  "flux_arrivee": {
    "amana": {"GLOBAL": 10000, "PART": 5000, "PRO": 3000, "DIST": 2000, "AXES": 0},
    "co": {"GLOBAL": 50000, "PART": 20000, "PRO": 15000, "DIST": 10000, "AXES": 5000},
    "cr": {...},
    "ebarkia": {...},
    "lrh": {...}
  },
  "guichet": {
    "DEPOT": 1000,
    "RECUP": 800
  },
  "flux_depart": {
    "amana": {...},
    "co": {...}
  },
  "nb_jours_ouvres_an": 264
}
```

**Important** : Tous les volumes sont **ANNUELS** et convertis automatiquement en volume/jour.

## 🔍 Mapping automatique

### Règles de correspondance

| Élément | DB → UI |
|---------|---------|
| **Flux** | AMANA → amana, CO → co, CR → cr, EBARKIA → ebarkia, LRH → lrh |
| **Sens** | ARRIVÉE → flux_arrivee, DÉPART → flux_depart, GUICHET → guichet |
| **Segment** | GLOBAL → GLOBAL, PART → PART, PRO → PRO, DIST → DIST, AXES → AXES |
| **Guichet** | "dépôt" dans nom → DEPOT, "récup" dans nom → RECUP |

### Exemple

```
Tâche:
  - flux_id = 1 (AMANA)
  - sens_id = 1 (ARRIVÉE)
  - segment_id = 1 (GLOBAL)

Mapping:
  → volumes_ui.flux_arrivee.amana.GLOBAL

Volume:
  - Annuel: 10000
  - Jour: 10000 / 264 = 37.88
```

## 📐 Formule de calcul

```
1. heures_necessaires = Σ (volume_jour × chrono_min) / 60
2. heures_nettes = heures_par_jour - (idle_minutes / 60)
3. heures_nettes_effectives = heures_nettes × (productivite / 100)
4. ETP_calcule = heures_necessaires / heures_nettes_effectives
5. ETP_arrondi = round_half_up(ETP_calcule) si > 0.1, sinon 0
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| `LIVRAISON_FINALE.md` | **Guide de démarrage** (commencer ici !) |
| `DOCUMENTATION_SIMULATION_DIRECTE.md` | Documentation technique complète |
| `EXEMPLES_PAYLOADS.md` | Exemples de payloads JSON |
| `GUIDE_INTEGRATION_FRONTEND.md` | Guide d'intégration frontend |
| `RESUME_IMPLEMENTATION.md` | Résumé de l'implémentation |

## 🧪 Tests

### Vérification des données
```bash
python check_reference_data.py
```

Vérifie que la base contient :
- ✅ Flux (AMANA, CO, CR, EBARKIA, LRH)
- ✅ Sens (ARRIVÉE, DÉPART, GUICHET)
- ✅ Segments (GLOBAL, PART, PRO, DIST, AXES)
- ✅ Tâches avec mapping complet

### Tests automatisés
```bash
python test_simulation_direct.py
```

Exécute 4 scénarios :
1. Test de mapping
2. Scénario simple (AMANA uniquement)
3. Scénario complet (tous les flux)
4. Simulation centre (agrégation)

## 🎨 Intégration Frontend

### Exemple de composant Vue

```vue
<template>
  <div class="volumes-form">
    <div class="info-banner">
      Volumes saisis en <strong>annuel</strong>
      <br>Conversion automatique : ÷ 264 jours ouvrés
    </div>

    <section>
      <h3>📥 Flux Arrivée - Amana</h3>
      <input v-model.number="volumes.flux_arrivee.amana.GLOBAL" 
             type="number" 
             placeholder="Global">
      <span>≈ {{ (volumes.flux_arrivee.amana.GLOBAL / 264).toFixed(2) }} / jour</span>
    </section>

    <button @click="lancerSimulation">Lancer la simulation</button>
  </div>
</template>
```

Voir `GUIDE_INTEGRATION_FRONTEND.md` pour plus de détails.

## 🆘 Support

### Problèmes courants

**"Module not found: sqlalchemy"**
→ Activer l'environnement virtuel

**"Centre/Poste non trouvé"**
→ Vérifier que le `centre_poste_id` existe

**"Aucune tâche trouvée"**
→ Vérifier que des tâches existent pour ce centre/poste

**"Volumes sans tâches correspondantes"**
→ Vérifier que les tâches ont `flux_id`, `sens_id`, `segment_id` définis

### Debug

Activer `debug=true` pour voir :
- ✅ Tous les mappings effectués
- ✅ Tâches traitées vs ignorées
- ✅ Volumes/jour calculés
- ✅ Heures par tâche

## ✅ Checklist

### Backend
- [x] Schémas Pydantic
- [x] Service de mapping
- [x] Service de simulation
- [x] Endpoints API
- [x] Tests automatisés
- [x] Documentation

### Frontend
- [ ] Composant de saisie
- [ ] Affichage volume/jour
- [ ] Service API
- [ ] Affichage résultats
- [ ] Gestion erreurs

### Tests
- [ ] Vérifier données de référence
- [ ] Tester mapping
- [ ] Tester simulation
- [ ] Valider avec cas réels

## 🎉 Conclusion

Implémentation **complète et documentée** pour :
- ✅ Saisir des volumes annuels
- ✅ Mapper automatiquement aux tâches
- ✅ Convertir en volume/jour
- ✅ Calculer heures et ETP
- ✅ Afficher résultats détaillés

**Prochaine étape** : Exécuter `check_reference_data.py` ! 🚀

## 📞 Contact

Pour toute question, consulter :
1. `LIVRAISON_FINALE.md` (guide de démarrage)
2. `DOCUMENTATION_SIMULATION_DIRECTE.md` (documentation technique)
3. Les logs de debug (`debug=true`)
