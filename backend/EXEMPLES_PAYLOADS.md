# Exemple de payload pour tester la simulation directe

## Payload minimal (AMANA uniquement)

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

## Payload complet (tous les flux)

```json
{
  "flux_arrivee": {
    "amana": {
      "GLOBAL": 15000,
      "PART": 7000,
      "PRO": 5000,
      "DIST": 3000,
      "AXES": 0
    },
    "co": {
      "GLOBAL": 80000,
      "PART": 30000,
      "PRO": 25000,
      "DIST": 15000,
      "AXES": 10000
    },
    "cr": {
      "GLOBAL": 20000,
      "PART": 8000,
      "PRO": 7000,
      "DIST": 3000,
      "AXES": 2000
    },
    "ebarkia": {
      "GLOBAL": 5000,
      "PART": 2000,
      "PRO": 1500,
      "DIST": 1000,
      "AXES": 500
    },
    "lrh": {
      "GLOBAL": 3000,
      "PART": 1200,
      "PRO": 1000,
      "DIST": 500,
      "AXES": 300
    }
  },
  "guichet": {
    "DEPOT": 2000,
    "RECUP": 1500
  },
  "flux_depart": {
    "amana": {
      "GLOBAL": 12000,
      "PART": 6000,
      "PRO": 4000,
      "DIST": 2000,
      "AXES": 0
    },
    "co": {
      "GLOBAL": 70000,
      "PART": 25000,
      "PRO": 20000,
      "DIST": 15000,
      "AXES": 10000
    }
  },
  "nb_jours_ouvres_an": 264
}
```

## Endpoints disponibles

### 1. Test de mapping
```
GET http://localhost:8000/api/simulation-direct/test-mapping/{centre_poste_id}
```

### 2. Simulation intervenant
```
POST http://localhost:8000/api/simulation-direct/intervenant/{centre_poste_id}?productivite=100&heures_par_jour=8&idle_minutes=30&debug=true

Body: [payload JSON ci-dessus]
```

### 3. Simulation centre
```
POST http://localhost:8000/api/simulation-direct/centre/{centre_id}?productivite=100&heures_par_jour=8&idle_minutes=30&debug=false

Body: [payload JSON ci-dessus]
```

## Paramètres de requête

- `productivite` (défaut: 100.0) : Productivité en %
- `heures_par_jour` (défaut: 8.0) : Heures de travail par jour
- `idle_minutes` (défaut: 0.0) : Marge d'inactivité en minutes/jour
- `debug` (défaut: True pour intervenant, False pour centre) : Activer les logs détaillés

## Exemple de réponse

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

## Comment tester avec curl

### Test de mapping
```bash
curl http://localhost:8000/api/simulation-direct/test-mapping/1
```

### Simulation intervenant
```bash
curl -X POST "http://localhost:8000/api/simulation-direct/intervenant/1?productivite=100&heures_par_jour=8&idle_minutes=30&debug=true" \
  -H "Content-Type: application/json" \
  -d @payload_minimal.json
```

## Comment tester avec Postman

1. Créer une nouvelle requête POST
2. URL: `http://localhost:8000/api/simulation-direct/intervenant/1`
3. Params:
   - productivite: 100
   - heures_par_jour: 8
   - idle_minutes: 30
   - debug: true
4. Body → raw → JSON: Coller le payload ci-dessus
5. Envoyer

## Notes importantes

- Tous les volumes sont **ANNUELS** et seront automatiquement convertis en volumes/jour (÷ 264)
- Les champs vides ou NULL sont considérés comme 0
- Le mapping est déterministe : même saisie → mêmes résultats
- Activer `debug=true` pour voir les logs détaillés du mapping
