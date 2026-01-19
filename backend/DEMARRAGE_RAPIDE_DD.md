# 🚀 DÉMARRAGE RAPIDE - ARCHITECTURE DATA-DRIVEN

## ⚡ En 3 étapes (< 5 minutes)

### Étape 1 : Initialiser les règles (2 min)

```bash
cd backend
python scripts/init_mapping_rules.py
```

**Résultat attendu :**
```
================================================================================
🚀 INITIALISATION DES RÈGLES DE MAPPING ET CONVERSION
================================================================================

✅ Tables créées
✅ 125 règles de mapping créées
✅ 6 règles de conversion créées

✅ INITIALISATION TERMINÉE AVEC SUCCÈS
```

---

### Étape 2 : Tester (2 min)

```bash
python scripts/test_data_driven.py
```

**Résultat attendu :**
```
================================================================================
🧪 TESTS DE L'ARCHITECTURE DATA-DRIVEN
================================================================================

✅ TEST 1 : Vérification des règles - RÉUSSI
✅ TEST 2 : Initialisation du moteur - RÉUSSI
✅ TEST 3 : Mapping pour centre/poste - RÉUSSI
✅ TEST 4 : Simulation complète - RÉUSSI

✅ TOUS LES TESTS TERMINÉS
```

---

### Étape 3 : Utiliser (< 1 min)

```bash
# Tester le mapping
curl http://localhost:8000/api/simulation-dd/test-mapping/1

# Lancer une simulation
curl -X POST "http://localhost:8000/api/simulation-dd/intervenant/1?debug=true" \
  -H "Content-Type: application/json" \
  -d '{
    "flux_arrivee": {
      "amana": {
        "GLOBAL": 10000,
        "PART": 5000,
        "PRO": 3000,
        "DIST": 2000,
        "AXES": 0
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
  }'
```

---

## 📚 Documentation

### Pour comprendre (30 min)
1. **[README_DATA_DRIVEN.md](README_DATA_DRIVEN.md)** - Vue d'ensemble (10 min)
2. **[ARCHITECTURE_DATA_DRIVEN.md](ARCHITECTURE_DATA_DRIVEN.md)** - Architecture détaillée (20 min)

### Pour implémenter (1h)
1. **[GUIDE_INTEGRATION_FRONTEND_DD.md](GUIDE_INTEGRATION_FRONTEND_DD.md)** - Intégration frontend (30 min)
2. **[COMPARAISON_ARCHITECTURES.md](COMPARAISON_ARCHITECTURES.md)** - Comparaison (30 min)

### Pour présenter (15 min)
1. **[RESUME_EXECUTIF_DATA_DRIVEN.md](RESUME_EXECUTIF_DATA_DRIVEN.md)** - Résumé exécutif (15 min)

---

## 🎯 Endpoints disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/simulation-dd/intervenant/{id}` | POST | Simulation intervenant |
| `/api/simulation-dd/centre/{id}` | POST | Simulation centre |
| `/api/simulation-dd/multi-centres` | POST | Simulation multi-centres |
| `/api/simulation-dd/test-mapping/{id}` | GET | Test de mapping |
| `/api/simulation-dd/mapping-rules` | GET | Liste des règles |
| `/api/simulation-dd/conversion-rules` | GET | Liste des conversions |

---

## ✅ Checklist

- [ ] Exécuter `init_mapping_rules.py`
- [ ] Exécuter `test_data_driven.py`
- [ ] Tester les endpoints
- [ ] Lire la documentation
- [ ] Intégrer dans le frontend

---

## 🆘 Problèmes ?

### "Aucune règle trouvée"
→ Exécuter `python scripts/init_mapping_rules.py`

### "Volume = 0"
→ Vérifier le payload JSON

### "Erreur de connexion"
→ Vérifier que le serveur est démarré

---

## 🎉 C'est tout !

Vous êtes prêt à utiliser l'architecture data-driven ! 🚀

**Prochaine étape :** Lire [README_DATA_DRIVEN.md](README_DATA_DRIVEN.md)
