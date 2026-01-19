# 🔍 Diagnostic: Volumes à 0 dans les Logs Backend

## 🚨 Problème Identifié

**Symptôme**: Les volumes saisis dans l'interface arrivent à 0 au backend, alors qu'ils sont correctement affichés dans l'UI.

## 📊 Logs Ajoutés pour Diagnostic

### 1. **Frontend - Console Navigateur**

Des logs détaillés ont été ajoutés dans `frontend/src/lib/api.js` (fonction `simulate()`):

```
📤 [FRONTEND - API] Envoi de la simulation au backend
================================================================================
📍 Centre ID: 1913
📍 Poste ID: null
⚙️  Productivité: 100%
⏱️  Heures nettes: 8h
💤 Idle minutes: 0 min

📦 Volumes Journaliers:
   - sacs: 0
   - colis: 0
   - courriers_par_sac: 4500
   - colis_amana_par_sac: 5
   - colis_par_collecte: 1

📅 Volumes Annuels:
   - courrier_ordinaire: 0
   - courrier_recommande: 0
   - ebarkia: 0
   - lrh: 0
   - amana: 0

🔍 Payload Original Reçu:
   payload.volumes: {...}
================================================================================
```

### 2. **Backend - Terminal**

Des logs numérotés ont été ajoutés dans `backend/app/api/simulation.py`:

```
🎯 [BACKEND - STEP 1] API /simulate - Requête reçue (VUE INTERVENANT)
================================================================================
   Centre ID: 1913
   Poste ID: None
   Productivité: 100%
   Heures nettes: 8h
   Volumes journaliers: {...}
   Volumes annuels: {...}
   Nombre de tâches: 69
================================================================================
```

## 🎯 Comment Utiliser Ces Logs

### Étape 1: Ouvrir la Console du Navigateur
1. Appuyer sur **F12**
2. Aller dans l'onglet **Console**

### Étape 2: Saisir des Volumes dans l'Interface
1. Sélectionner Région, Centre, Poste
2. **Saisir des volumes** (ex: Amana = 1000, CO = 5000, etc.)
3. Cliquer sur **"Simuler"**

### Étape 3: Observer les Logs

#### **Dans la Console Navigateur**:
Chercher le bloc `📤 [FRONTEND - API] Envoi de la simulation au backend`

**Vérifier**:
- ✅ Les volumes saisis apparaissent-ils dans "Volumes Annuels" ?
- ✅ Le `payload.volumes` contient-il les bonnes valeurs ?

#### **Dans le Terminal Backend**:
Chercher le bloc `🎯 [BACKEND - STEP 1] API /simulate`

**Vérifier**:
- ✅ Les volumes reçus correspondent-ils à ceux envoyés ?
- ❌ Si les volumes sont à 0, il y a un problème de transmission

## 🔍 Causes Possibles

### Cause 1: Mapping Incorrect des Champs
Le frontend envoie les volumes avec des clés différentes de celles attendues par le backend.

**Exemple**:
```javascript
// Frontend envoie:
{ amana: 1000, courrier_ordinaire: 5000 }

// Backend attend:
{ AMANA: 1000, CO: 5000 }
```

**Solution**: Vérifier le mapping dans `api.js` lignes 350-368

### Cause 2: Conversion en Nombre Échoue
Les valeurs sont des strings vides `""` au lieu de nombres.

**Exemple**:
```javascript
Number("") // = 0
Number(undefined) // = NaN
Number(null) // = 0
```

**Solution**: Vérifier que les champs de saisie renvoient bien des nombres

### Cause 3: Payload Non Transmis
Le composant qui appelle `api.simulate()` ne passe pas les volumes.

**Solution**: Vérifier l'appel dans le composant parent

## 📝 Prochaines Étapes

### 1. **Tester avec les Nouveaux Logs**
1. Ouvrir la console (F12)
2. Saisir des volumes dans l'interface
3. Cliquer sur "Simuler"
4. **Copier les logs** de la console et du terminal
5. **Partager les logs** pour analyse

### 2. **Vérifier le Payload**
Dans les logs frontend, chercher:
```
🔍 Payload Original Reçu:
   payload.volumes: {...}
```

**Questions**:
- Les volumes sont-ils présents dans `payload.volumes` ?
- Sous quelle forme ? (objet, tableau, valeurs)

### 3. **Comparer Frontend vs Backend**
Comparer les valeurs entre:
- `📤 [FRONTEND - API]` (ce qui est envoyé)
- `🎯 [BACKEND - STEP 1]` (ce qui est reçu)

Si différent → Problème de transmission HTTP
Si identique mais à 0 → Problème de mapping/conversion

## 🛠️ Fichiers Modifiés

1. **`frontend/src/lib/api.js`**
   - Ajout de logs détaillés dans `simulate()`
   - Affiche volumes journaliers et annuels
   - Affiche payload original

2. **`backend/app/api/simulation.py`**
   - Ajout de logs numérotés STEP 1-3
   - Affiche volumes reçus par le backend

## 📚 Documentation Associée

- **`LOGS_SIMULATION_GUIDE.md`** - Guide complet des logs
- **`ANALYSE_ED_PERCENT.md`** - Analyse du problème ed_percent

---

**Date**: 2026-01-08  
**Auteur**: Assistant  
**Statut**: Logs Ajoutés - En Attente de Test Utilisateur
