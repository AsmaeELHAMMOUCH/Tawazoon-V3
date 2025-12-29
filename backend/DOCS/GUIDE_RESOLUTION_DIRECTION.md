# 🚨 GUIDE DE RÉSOLUTION FINALE - Erreur Simulation Direction

## Date : 2025-12-29 14:48

## 📋 Problème persistant
**Erreur** : `Configuration de base de données incompatible`  
**Endpoint** : `POST /api/simulation/direction`  
**Status** : 500 Internal Server Error

## ✅ Corrections déjà appliquées

### 1. Fichiers corrompus nettoyés
- ✅ `main.py` : 52 null bytes supprimés
- ✅ Script de nettoyage exécuté sur tous les fichiers `.py`

### 2. Colonnes SQL inexistantes corrigées

#### `direction_service.py`
- ✅ Ligne 107 : `p.code` → `p.id as poste_id`
- ✅ Ligne 116 : Indexation par `r.poste_id`
- ✅ Ligne 124 : `p.code as poste_code` → `p.id as poste_code`

#### `simulation.py`
- ✅ Ligne 161 : `c.code` supprimé

#### `referentiel_service.py`
- ✅ Ligne 48 : `p.code` → `p.id`
- ✅ Ligne 85 : `c.code` supprimé
- ✅ Ligne 117 : `p.code` supprimé
- ✅ Ligne 228 : `c.code as centre_code` supprimé
- ✅ Ligne 233 : `p.code` → `p.id`
- ✅ Ligne 252 : `cd.centre_code` supprimé
- ✅ Ligne 300 : `"code": row["centre_code"]` supprimé
- ✅ Ligne 310 : `"code": row["poste_code"]` supprimé

### 3. Gestion d'erreur améliorée
- ✅ `directions.py` : Logging avec trace_id
- ✅ `api.js` : Extraction intelligente des messages d'erreur
- ✅ `useDirectionData.js` : Affichage du message réel

## 🔍 DIAGNOSTIC REQUIS

### Étape 1 : Capturer l'erreur SQL exacte

**Dans le terminal backend**, vous devez voir un message comme :

```
Direction simulation failed for direction_id=7: ProgrammingError(...)
sqlalchemy.exc.ProgrammingError: (pyodbc.ProgrammingError) ('42S22', "[42S22] ... Invalid column name 'XXXX'. (207) ...")
[SQL:
    SELECT ...
    FROM ...
    WHERE ...
]
```

**ACTION** : Copiez-collez **TOUT ce bloc d'erreur** (y compris la requête SQL complète).

### Étape 2 : Si les logs ne s'affichent pas

Activez les logs SQL détaillés :

```powershell
# Arrêtez Uvicorn (Ctrl+C)

# Relancez avec logs SQL activés
$env:SQLALCHEMY_ECHO="True"
uvicorn app.main:app --port 8000 --reload --log-level debug
```

Puis testez la simulation et copiez les logs.

## 🔧 Solutions possibles selon l'erreur

### Si erreur : `Invalid column name 'code'`
**Fichier à corriger** : Chercher dans tous les fichiers `.py` :
```powershell
cd backend
Get-ChildItem -Recurse -Filter "*.py" | Select-String "\.code" | Select-Object Path, LineNumber, Line
```

### Si erreur : `Invalid column name 'code_centre'`
**Fichier à corriger** : `direction_service.py` ou modèles ORM
- Vérifier les modèles dans `app/models/db_models.py`
- Vérifier les requêtes dans `app/services/`

### Si erreur : `Invalid column name 'nom_poste'`
**Cause** : La table `postes` n'a peut-être pas cette colonne
**Solution** : Remplacer par `p.label` ou `p.intitule_rh`

### Si erreur : Table ou vue inexistante
**Cause** : Référence à une table qui n'existe pas dans la DB
**Solution** : Vérifier le schéma SQL Server

## 📊 Script de diagnostic SQL

Exécutez ce script dans **SQL Server Management Studio** :

```sql
-- Lister TOUTES les colonnes des tables principales
SELECT 
    t.TABLE_NAME,
    c.COLUMN_NAME,
    c.DATA_TYPE
FROM INFORMATION_SCHEMA.TABLES t
JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
WHERE t.TABLE_SCHEMA = 'dbo'
  AND t.TABLE_NAME IN ('centres', 'postes', 'taches', 'directions', 'centre_postes')
ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
```

Envoyez-moi le résultat pour que je puisse corriger TOUTES les requêtes d'un coup.

## 🎯 Prochaines étapes

### Option A : Avec logs backend
1. Copiez les logs du terminal backend
2. Identifiez la colonne SQL invalide
3. Corrigez le fichier concerné
4. Redémarrez Uvicorn

### Option B : Avec audit SQL
1. Exécutez le script SQL ci-dessus dans SSMS
2. Envoyez-moi le résultat
3. Je corrige TOUTES les requêtes
4. Testez à nouveau

### Option C : Désactiver temporairement la simulation Direction
Si urgent, commentez temporairement l'endpoint dans `directions.py` :

```python
# @router.post("/simulation/direction", response_model=DirectionSimResponse)
# def simulate_direction_advanced(...):
#     ...
```

## 📝 Checklist de vérification

- [ ] Uvicorn démarre sans erreur `SyntaxError: null bytes`
- [ ] Les logs backend s'affichent dans le terminal
- [ ] L'erreur SQL exacte est visible dans les logs
- [ ] La colonne invalide est identifiée
- [ ] Le fichier Python concerné est corrigé
- [ ] Uvicorn a été redémarré après correction
- [ ] La simulation fonctionne

## 🆘 Si rien ne fonctionne

**Dernière option** : Restaurer une version antérieure du code qui fonctionnait, puis réappliquer les corrections une par une.

---

**Sans les logs exacts du terminal backend, je ne peux pas identifier quelle colonne SQL pose problème !**

Envoyez-moi les logs complets ou le résultat du script SQL pour débloquer la situation.
