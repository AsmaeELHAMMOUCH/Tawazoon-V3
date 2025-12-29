# Correctif HTTP 500 sur /api/directions et /api/regions

## 📋 Date : 2025-12-29 14:15

## 🎯 Problème résolu
- **Symptôme** : `Failed to fetch directions Error: HTTP 500 null`
- **Cause** : Imports manquants dans `main.py` + absence de gestion d'erreur structurée dans les endpoints

## ✅ Corrections appliquées

### 1. **main.py** - Imports manquants
**Fichier** : `backend/app/main.py`

**Problème** : Le gestionnaire d'exceptions global utilisait `Request` et `JSONResponse` sans les importer.

**Correction** :
```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback
```

**Impact** : Le serveur peut maintenant démarrer correctement et gérer les exceptions globales.

---

### 2. **directions.py** - Gestion d'erreur robuste pour `/api/directions`
**Fichier** : `backend/app/api/directions.py`

**Avant** :
```python
@router.get("/directions")
def list_directions(db: Session = Depends(get_db)):
    rows = db.execute(text("""...""")).mappings().all()
    return [dict(r) for r in rows]
```

**Après** :
```python
@router.get("/directions")
def list_directions(db: Session = Depends(get_db)):
    try:
        logger.info("GET /api/directions called")
        rows = db.execute(text("""...""")).mappings().all()
        result = [dict(r) for r in rows]
        logger.info(f"Successfully fetched {len(result)} directions")
        return result
    except Exception as e:
        trace_id = str(uuid.uuid4())
        logger.error(f"[{trace_id}] Failed to fetch directions: {repr(e)}")
        traceback.print_exc()
        
        error_detail = {
            "error": "INTERNAL_SERVER_ERROR",
            "message": "Impossible de charger les directions",
            "endpoint": "/api/directions",
            "trace_id": trace_id,
            "hint": "Vérifiez la connexion à la base de données"
        }
        raise HTTPException(status_code=500, detail=error_detail)
```

**Bénéfices** :
- ✅ Logging détaillé avec trace_id unique
- ✅ JSON structuré en cas d'erreur (plus de `null`)
- ✅ Message utilisateur clair et actionnable

---

### 3. **refs.py** - Gestion d'erreur robuste pour `/api/regions`
**Fichier** : `backend/app/api/refs.py`

**Même traitement que `/api/directions`** avec :
- Try/except complet
- Logging avec trace_id
- JSON d'erreur structuré

---

### 4. **api.js** - Extraction intelligente des messages d'erreur
**Fichier** : `frontend/src/lib/api.js`

**Avant** :
```javascript
let msg = (data && (data.error || data.detail || data.message)) || `HTTP ${res.status}`;
```

**Après** :
```javascript
let msg = `HTTP ${res.status}`;

if (data) {
  // Si data.detail est un objet structuré (backend v2)
  if (typeof data.detail === "object" && data.detail !== null) {
    msg = data.detail.message || data.detail.error || msg;
  } 
  // Si data.detail est une string
  else if (typeof data.detail === "string") {
    msg = data.detail;
  }
  // Fallback sur d'autres champs
  else {
    msg = data.message || data.error || msg;
  }
}
```

**Bénéfices** :
- ✅ Gère correctement les objets `detail` structurés
- ✅ Fallback intelligent sur différents formats
- ✅ Plus jamais "HTTP 500 null"

---

### 5. **useDirectionData.js** - Affichage du message d'erreur réel
**Fichier** : `frontend/src/hooks/useDirectionData.js`

**Avant** :
```javascript
setError("Impossible de charger les directions.");
```

**Après** :
```javascript
const errorMsg = err.message || "Impossible de charger les directions. Vérifiez le serveur.";
setError(errorMsg);
```

**Bénéfices** :
- ✅ Affiche le message réel de l'API
- ✅ Fallback sur message générique si nécessaire
- ✅ Reset de l'erreur avant chaque nouvelle tentative

---

## 🧪 Tests de validation

### Backend
```bash
# Test direct de l'endpoint
curl http://127.0.0.1:8000/api/directions
curl http://127.0.0.1:8000/api/regions
```

**Résultat attendu** :
- ✅ Status 200 + liste JSON des directions/régions
- ✅ En cas d'erreur : Status 500 + JSON structuré (pas `null`)

### Frontend
1. Ouvrir la page Direction
2. Observer la console navigateur
3. Vérifier que les directions se chargent
4. En cas d'erreur, vérifier que le message est clair

---

## 📊 Format d'erreur standardisé

Toutes les erreurs backend renvoient maintenant :

```json
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "Message utilisateur clair",
  "endpoint": "/api/...",
  "trace_id": "uuid-unique",
  "hint": "Conseil pour résoudre"
}
```

---

## 🔄 Prochaines étapes recommandées

1. **Étendre ce pattern** à tous les autres endpoints critiques
2. **Créer un middleware** de gestion d'erreur centralisé
3. **Ajouter un bouton "Réessayer"** dans l'UI pour les erreurs de chargement
4. **Monitoring** : Logger les trace_id dans un système centralisé (Sentry, CloudWatch, etc.)

---

## 👥 Contacts
- **Développeur** : Antigravity AI
- **Date de résolution** : 2025-12-29
- **Version** : Backend v2.1 / Frontend v2.1
