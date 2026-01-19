# 🎯 INDEX - ARCHITECTURE DATA-DRIVEN

## 📚 Documentation complète

Bienvenue dans la documentation de l'architecture data-driven pour le simulateur RH/logistique.

---

## 📖 Documents disponibles

### 1. 🚀 Démarrage rapide
- **[README_DATA_DRIVEN.md](README_DATA_DRIVEN.md)** - Vue d'ensemble et démarrage rapide
  - Architecture générale
  - Installation en 4 étapes
  - Exemples de payload
  - Structure du projet

### 2. 🏗️ Architecture technique
- **[ARCHITECTURE_DATA_DRIVEN.md](ARCHITECTURE_DATA_DRIVEN.md)** - Guide complet de l'architecture
  - Tables de référence détaillées
  - Fonctionnement du moteur data-driven
  - Configuration avancée
  - Dépannage

### 3. 📦 Livraison
- **[LIVRAISON_FINALE_DATA_DRIVEN.md](LIVRAISON_FINALE_DATA_DRIVEN.md)** - Résumé de livraison
  - Fichiers créés
  - Installation et configuration
  - Règles métier implémentées
  - Checklist de livraison

### 4. 📊 Comparaison
- **[COMPARAISON_ARCHITECTURES.md](COMPARAISON_ARCHITECTURES.md)** - Comparaison des architectures
  - Architecture 1 : Initiale (avec VolumeSimulation)
  - Architecture 2 : Directe (sans VolumeSimulation)
  - Architecture 3 : Data-Driven (100% pilotée par les données)
  - Recommandations de migration

### 5. 🎨 Intégration frontend
- **[GUIDE_INTEGRATION_FRONTEND_DD.md](GUIDE_INTEGRATION_FRONTEND_DD.md)** - Guide d'intégration frontend
  - Endpoints API
  - Service TypeScript
  - Composants Vue
  - Exemples de code

### 6. 🛠️ Scripts et outils
- **[scripts/migration_data_driven.sql](scripts/migration_data_driven.sql)** - Migration SQL
  - Création des tables
  - Index et contraintes
  - Vérification

- **[scripts/init_mapping_rules.py](scripts/init_mapping_rules.py)** - Initialisation des règles
  - Règles de mapping
  - Règles de conversion
  - Vérification

- **[scripts/test_data_driven.py](scripts/test_data_driven.py)** - Tests complets
  - Vérification des règles
  - Test du moteur
  - Test de mapping
  - Simulation complète

---

## 🎯 Parcours recommandé

### Pour comprendre l'architecture
1. Lire **[README_DATA_DRIVEN.md](README_DATA_DRIVEN.md)** (10 min)
2. Lire **[ARCHITECTURE_DATA_DRIVEN.md](ARCHITECTURE_DATA_DRIVEN.md)** (20 min)
3. Consulter **[COMPARAISON_ARCHITECTURES.md](COMPARAISON_ARCHITECTURES.md)** (15 min)

### Pour installer et tester
1. Exécuter `scripts/migration_data_driven.sql` (optionnel, SQLAlchemy le fait)
2. Exécuter `python scripts/init_mapping_rules.py`
3. Exécuter `python scripts/test_data_driven.py`
4. Tester les endpoints avec curl/Postman

### Pour intégrer dans le frontend
1. Lire **[GUIDE_INTEGRATION_FRONTEND_DD.md](GUIDE_INTEGRATION_FRONTEND_DD.md)** (30 min)
2. Créer le service API
3. Créer les composants Vue
4. Tester avec des données réelles

---

## 📁 Structure des fichiers créés

```
backend/
├── app/
│   ├── api/
│   │   └── simulation_data_driven.py          # ✅ Endpoints API
│   ├── models/
│   │   ├── db_models.py                       # (existant)
│   │   └── mapping_models.py                  # ✅ Modèles data-driven
│   ├── schemas/
│   │   └── volumes_ui.py                      # (existant)
│   ├── services/
│   │   ├── data_driven_engine.py              # ✅ Moteur data-driven
│   │   └── simulation_data_driven.py          # ✅ Services de simulation
│   └── main.py                                # ✅ Modifié (router ajouté)
│
├── scripts/
│   ├── migration_data_driven.sql              # ✅ Migration SQL
│   ├── init_mapping_rules.py                  # ✅ Initialisation des règles
│   └── test_data_driven.py                    # ✅ Tests complets
│
├── ARCHITECTURE_DATA_DRIVEN.md                # ✅ Guide complet
├── LIVRAISON_FINALE_DATA_DRIVEN.md            # ✅ Résumé de livraison
├── COMPARAISON_ARCHITECTURES.md               # ✅ Comparaison
├── GUIDE_INTEGRATION_FRONTEND_DD.md           # ✅ Guide frontend
├── README_DATA_DRIVEN.md                      # ✅ Vue d'ensemble
└── INDEX_DATA_DRIVEN.md                       # ✅ Ce fichier
```

---

## 🚀 Démarrage en 3 étapes

### Étape 1 : Initialiser les règles
```bash
cd backend
python scripts/init_mapping_rules.py
```

### Étape 2 : Tester
```bash
python scripts/test_data_driven.py
```

### Étape 3 : Utiliser
```bash
# Tester le mapping
curl http://localhost:8000/api/simulation-dd/test-mapping/1

# Lancer une simulation
curl -X POST "http://localhost:8000/api/simulation-dd/intervenant/1" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

---

## 🎯 Règles métier implémentées

### ✅ 1. Normalisation des volumes UI
Transformation des volumes saisis en structure normalisée.

### ✅ 2. Matching automatique TÂCHE ↔ VOLUME UI
Association automatique via table `volume_mapping_rules`.

### ✅ 3. Règle d'unité (conversion volume)
Conversion automatique via table `unite_conversion_rules`.

### ✅ 4. Calcul de charge
Calcul des heures nécessaires par tâche.

### ✅ 5. Calcul ETP
Formule métier centralisée dans le moteur.

---

## 📊 Endpoints API

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/simulation-dd/intervenant/{id}` | POST | Simulation intervenant |
| `/api/simulation-dd/centre/{id}` | POST | Simulation centre |
| `/api/simulation-dd/multi-centres` | POST | Simulation multi-centres |
| `/api/simulation-dd/test-mapping/{id}` | GET | Test de mapping |
| `/api/simulation-dd/mapping-rules` | GET | Liste des règles de mapping |
| `/api/simulation-dd/conversion-rules` | GET | Liste des règles de conversion |

---

## 🔧 Configuration

### Ajouter un nouveau flux

1. **Base de données :**
```sql
INSERT INTO dbo.flux (code, libelle) VALUES ('NOUVEAU_FLUX', 'Nouveau Flux');
INSERT INTO dbo.volume_mapping_rules (...) VALUES (...);
```

2. **Frontend :**
```typescript
interface FluxVolumesInput {
  nouveau_flux?: VolumeSegmentInput;
}
```

**Aucun changement dans le code backend !**

---

## 🆘 Support

### Problèmes courants

**"Aucune règle trouvée"**
→ Exécuter `python scripts/init_mapping_rules.py`

**"Volume = 0"**
→ Vérifier le `ui_path` dans les règles

**"Conversion incorrecte"**
→ Vérifier `unite_conversion_rules`

### Endpoints de debug

- `GET /api/simulation-dd/test-mapping/{id}` : Tester le mapping
- `GET /api/simulation-dd/mapping-rules` : Lister les règles
- `GET /api/simulation-dd/conversion-rules` : Lister les conversions

### Logs détaillés

Ajouter `?debug=true` aux endpoints de simulation.

---

## ✅ Checklist de livraison

### Backend
- [x] Modèles de données (`mapping_models.py`)
- [x] Moteur data-driven (`data_driven_engine.py`)
- [x] Service de simulation (`simulation_data_driven.py`)
- [x] Endpoints API (`simulation_data_driven.py`)
- [x] Script d'initialisation (`init_mapping_rules.py`)
- [x] Script de test (`test_data_driven.py`)
- [x] Enregistrement du router (`main.py`)
- [x] Documentation complète

### À faire
- [ ] Exécuter `scripts/init_mapping_rules.py`
- [ ] Exécuter `scripts/test_data_driven.py`
- [ ] Tester les endpoints
- [ ] Intégrer dans le frontend
- [ ] Valider avec des cas métier réels

---

## 🎉 Conclusion

Vous disposez maintenant d'une **architecture 100% data-driven** qui :

1. ✅ **Élimine toute logique conditionnelle** hardcodée
2. ✅ **Facilite l'ajout** de nouveaux flux/sens/segments
3. ✅ **Centralise la configuration** dans la base de données
4. ✅ **Simplifie la maintenance** et l'évolution
5. ✅ **Fournit des outils** de debug et de validation

**Prochaine étape :** Exécuter `scripts/init_mapping_rules.py` ! 🚀

---

## 📞 Contact

Pour toute question ou problème :
- Consulter la documentation
- Utiliser les endpoints de debug
- Activer les logs détaillés (`?debug=true`)

**Bonne simulation ! 🎊**
