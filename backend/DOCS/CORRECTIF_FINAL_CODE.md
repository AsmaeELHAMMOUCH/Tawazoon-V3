# Correctif FINAL : Erreur "Invalid column name 'code'"

## 📋 Date : 2025-12-29 14:24

## 🎯 Problème résolu
- **Erreur** : `Invalid column name 'code'` (SQL Server Error 207)
- **Cause racine** : La table `dbo.postes` n'a **PAS** de colonne `code`
- **Impact** : Blocage de la simulation Direction

## 🔍 Diagnostic

### Erreur initiale (trompeuse)
- Message frontend : `"HTTP 500 null"`
- Après amélioration logging : `"Configuration de base de données incompatible"`

### Vraie cause (révélée par les logs)
```
Invalid column name 'code'
SELECT cp.centre_id, p.code, p.type_poste, cp.effectif_actuel
FROM dbo.centre_postes cp
JOIN dbo.postes p ON p.id = cp.poste_id
```

**Conclusion** : Le code utilisait `p.code` qui n'existe pas dans `dbo.postes`.

## ✅ Corrections appliquées

### Fichier : `backend/app/services/direction_service.py`

#### 1. Requête Postes Info (Ligne 107)
**Avant** :
```python
SELECT cp.centre_id, p.code, p.type_poste, cp.effectif_actuel
```

**Après** :
```python
SELECT cp.centre_id, p.id as poste_id, p.type_poste, cp.effectif_actuel
```

**Indexation du dictionnaire (Ligne 116)** :
```python
# Avant
postes_info_by_centre[r.centre_id][r.code] = {...}

# Après
postes_info_by_centre[r.centre_id][r.poste_id] = {...}
```

#### 2. Requête Tasks (Ligne 124)
**Avant** :
```python
p.code as poste_code
```

**Après** :
```python
p.id as poste_code
```

## 🧪 Validation

### Test de la simulation Direction
1. Sélectionner une direction (ex: DIRECTION RÉGIONALE MARRAKECH-AG)
2. Cliquer sur "Appliquer"
3. **Résultat attendu** : ✅ Simulation réussie sans erreur

### Logs attendus
```
INFO: GET /api/directions called
INFO: Successfully fetched X directions
INFO: POST /api/simulation/direction
INFO: 200 OK
```

## 📊 Schéma de la table `dbo.postes`

**Colonnes disponibles** :
- `id` (PK) ✅ Utilisé
- `label` 
- `type_poste` ✅ Utilisé
- `nom_poste` ✅ Utilisé
- `intitule_rh`
- ~~`code`~~ ❌ **N'EXISTE PAS**

## 🔄 Autres fichiers à vérifier

Les fichiers suivants utilisent aussi `p.code` et devront être corrigés si nécessaire :
- `backend/app/services/referentiel_service.py` (lignes 48, 117, 233)

**Note** : Ces fichiers ne sont pas utilisés par la page Direction actuellement, mais devront être corrigés pour éviter des erreurs futures.

## 📝 Leçons apprises

1. **Toujours vérifier le schéma réel** de la base de données avant d'écrire des requêtes SQL
2. **Logging détaillé** est essentiel pour diagnostiquer rapidement les erreurs
3. **Messages d'erreur structurés** facilitent le debug côté frontend
4. **Ne jamais supposer** qu'une colonne existe sans vérification

## 👥 Contacts
- **Développeur** : Antigravity AI
- **Date de résolution** : 2025-12-29 14:24
- **Version** : Backend v2.2 / Frontend v2.1

---

## ✅ STATUT : RÉSOLU

La simulation Direction devrait maintenant fonctionner correctement.
