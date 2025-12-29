# Correctif : Erreur "Invalid column name 'code_centre'"

## 📋 Contexte
**Date** : 2025-12-29  
**Erreur** : `Invalid column name 'code_centre'` (SQL Server Error 207/8180)  
**Impact** : Blocage de la page Direction / Vue Consolidée

## 🔍 Cause racine
La colonne `code_centre` n'existe plus (ou a été renommée) dans la table `dbo.taches` de SQL Server.
L'utilisation de `SELECT t.*` dans la requête de récupération des tâches tentait de sélectionner TOUTES les colonnes, y compris `code_centre` qui n'existe plus.

## ✅ Corrections appliquées

### 1. **direction_service.py** (Ligne 122-128)
**Avant** :
```python
SELECT t.*, p.code as poste_code, p.nom_poste, p.type_poste, cp.centre_id
FROM dbo.taches t
...
```

**Après** :
```python
SELECT t.id, t.nom_tache, t.phase, t.unite_mesure, t.moyenne_min, t.centre_poste_id, t.poste_id,
       p.code as poste_code, p.nom_poste, p.type_poste, cp.centre_id
FROM dbo.taches t
...
```

**Raison** : Liste explicite des colonnes nécessaires, évitant toute référence à des colonnes obsolètes.

### 2. **directions.py** (Ligne 15-37)
Amélioration de la gestion d'erreur :
- Logging détaillé côté serveur (avec traceback complet)
- Messages utilisateur clairs et actionnables
- Pas d'exposition d'erreurs SQL brutes au frontend
- Détection intelligente du type d'erreur (SQL, données manquantes, etc.)

### 3. **useDirectionData.js** (Frontend)
Affichage du message d'erreur réel au lieu d'un message générique :
```javascript
setError(err.message || "Erreur lors de la simulation direction.");
```

## 🛡️ Prévention des régressions

### Bonnes pratiques SQL
1. ✅ **Toujours lister explicitement les colonnes** au lieu d'utiliser `SELECT *`
2. ✅ **Utiliser des alias clairs** pour éviter les ambiguïtés
3. ✅ **Tester les requêtes** avec différents jeux de données

### Gestion d'erreur
1. ✅ **Logger côté serveur** avec contexte complet (traceback, paramètres)
2. ✅ **Messages utilisateur clairs** sans détails techniques sensibles
3. ✅ **HTTPException avec codes appropriés** (400 pour client, 500 pour serveur)

## 🧪 Validation

### Tests effectués
- [x] Chargement de la page Direction sans erreur
- [x] Simulation Direction avec volumes vides (mode database)
- [x] Simulation Direction avec volumes importés
- [x] Gestion d'erreur propre (pas de stack trace SQL côté frontend)

### Endpoints validés
- `/api/directions` - Liste des directions
- `/api/directions/{id}/centres` - Centres par direction
- `/api/simulation/direction` - Simulation consolidée
- `/api/consolide-postes` - Consolidation par poste

## 📊 Schéma de la table `taches` (colonnes utilisées)
```
- id (PK)
- nom_tache
- phase
- unite_mesure
- moyenne_min
- centre_poste_id (FK)
- poste_id (FK)
```

**Note** : La colonne `code_centre` n'existe PAS dans ce schéma.

## 🔄 Prochaines étapes recommandées

1. **Audit complet du schéma DB** : Documenter toutes les tables et colonnes utilisées
2. **Migration scripts** : Si `code_centre` doit être ajouté, créer un script de migration SQL
3. **Tests automatisés** : Ajouter des tests d'intégration pour les endpoints Direction
4. **Monitoring** : Ajouter des alertes sur les erreurs SQL récurrentes

## 👥 Contacts
- **Développeur** : Antigravity AI
- **Date de résolution** : 2025-12-29
- **Version** : Backend v2.0 / Frontend v2.0
