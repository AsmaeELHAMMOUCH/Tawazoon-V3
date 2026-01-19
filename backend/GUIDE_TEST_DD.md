# 🧪 GUIDE DE TEST - ARCHITECTURE DATA-DRIVEN

## ✅ Étape 1 : Initialisation (TERMINÉE)

Les règles de mapping et de conversion ont été initialisées avec succès !

```bash
✅ Script exécuté : scripts/init_mapping_rules.py
✅ Règles créées en base de données
```

---

## 🔄 Étape 2 : Redémarrer le serveur backend

Le serveur uvicorn doit être redémarré pour charger les nouveaux endpoints.

### Dans le terminal backend :

1. **Arrêter le serveur actuel** (si il tourne) : `Ctrl+C`

2. **Redémarrer le serveur** :
```bash
cd backend
uvicorn app.main:app --port 8000 --reload
```

3. **Vérifier le démarrage** - Vous devriez voir :
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

## 🌐 Étape 3 : Tester les endpoints

### Test 1 : Lister les règles de mapping

Ouvrez dans votre navigateur :
```
http://localhost:8000/api/simulation-dd/mapping-rules
```

**Résultat attendu :**
```json
{
  "total_rules": 125,
  "rules": [
    {
      "id": 1,
      "flux_id": 1,
      "sens_id": 1,
      "segment_id": 1,
      "nom_tache_keyword": null,
      "ui_path": "flux_arrivee.amana.global_",
      "priority": 100,
      "description": "Flux Arrivée - AMANA - GLOBAL"
    },
    ...
  ]
}
```

### Test 2 : Lister les règles de conversion

```
http://localhost:8000/api/simulation-dd/conversion-rules
```

**Résultat attendu :**
```json
{
  "total_rules": 6,
  "rules": [
    {
      "id": 1,
      "unite_mesure": "SAC",
      "facteur_conversion": 0.2,
      "description": "1 sac = 5 colis"
    },
    ...
  ]
}
```

### Test 3 : Tester le mapping pour un centre/poste

```
http://localhost:8000/api/simulation-dd/test-mapping/1
```

**Résultat attendu :**
```json
{
  "centre_poste_id": 1,
  "centre_label": "...",
  "poste_label": "...",
  "nombre_taches": 45,
  "taches_avec_mapping": 42,
  "taches_sans_mapping": 3,
  "details": [...]
}
```

---

## 🧪 Étape 4 : Tester une simulation complète

### Avec Postman ou curl

**URL :**
```
POST http://localhost:8000/api/simulation-dd/intervenant/1?debug=true
```

**Headers :**
```
Content-Type: application/json
```

**Body (JSON) :**
```json
{
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
}
```

**Résultat attendu :**
```json
{
  "details_taches": [...],
  "total_heures": 156.25,
  "heures_net_jour": 7.5,
  "fte_calcule": 20.83,
  "fte_arrondi": 21,
  "heures_par_poste": {...}
}
```

---

## ✅ Checklist de validation

- [ ] Serveur redémarré
- [ ] Endpoint `/mapping-rules` accessible
- [ ] Endpoint `/conversion-rules` accessible
- [ ] Endpoint `/test-mapping/1` accessible
- [ ] Simulation complète fonctionne
- [ ] Résultats cohérents

---

## 🆘 Problèmes courants

### "404 Not Found"
→ Le serveur n'a pas rechargé les nouveaux endpoints
→ **Solution :** Redémarrer le serveur (Ctrl+C puis relancer)

### "Connection refused"
→ Le serveur n'est pas démarré
→ **Solution :** Lancer `uvicorn app.main:app --port 8000 --reload`

### "Aucune règle trouvée" (total_rules: 0)
→ Le script d'initialisation n'a pas été exécuté
→ **Solution :** Exécuter `python scripts/init_mapping_rules.py`

---

## 📊 Résultats attendus

Si tout fonctionne correctement, vous devriez avoir :

- ✅ **125 règles de mapping** (tous les flux × sens × segments)
- ✅ **6 règles de conversion** (SAC, COLIS, COURRIER, etc.)
- ✅ **Mapping automatique** pour toutes les tâches
- ✅ **Simulation fonctionnelle** avec calcul ETP

---

## 🎉 Prochaines étapes

Une fois les tests validés :

1. **Intégrer dans le frontend** (Vue.js)
2. **Tester avec des données réelles**
3. **Valider avec l'équipe métier**
4. **Déployer en production**

---

## 📞 Documentation

- **Guide complet** : `ARCHITECTURE_DATA_DRIVEN.md`
- **Guide frontend** : `GUIDE_INTEGRATION_FRONTEND_DD.md`
- **Comparaison** : `COMPARAISON_ARCHITECTURES.md`

**Bonne chance ! 🚀**
