# 🔍 Analyse du Problème: ed_percent Non Pris en Compte

## 📊 Diagnostic

D'après les logs de simulation #231, le paramètre `ed_percent` est bien **reçu** par le backend mais **n'est pas utilisé** dans les calculs.

### Logs Observés
```
DEBUG simulate ed_percent (obj): 0.0
🔍 ED% FINAL UTILISÉ: 0.0%
⚠️  ED% INACTIF (0%)
```

## 🔎 Cause Racine

### 1. **Endpoint Utilisé**
L'application utilise actuellement l'**ancien endpoint** `/api/simulate` et non le nouveau endpoint data-driven `/api/simulation-dd/intervenant`.

**Fichier**: `backend/app/api/simulation.py` (ligne 67)

### 2. **Moteur de Calcul**
L'endpoint `/api/simulate` appelle la fonction `calculer_simulation()` dans:
- **Fichier**: `backend/app/services/simulation.py`

### 3. **Paramètre Manquant**
La fonction `calculer_simulation()` **ne reçoit PAS** le paramètre `ed_percent` et ne l'utilise donc pas dans ses calculs.

**Signature actuelle** (ligne 199-206 de `simulation.py`):
```python
resultat = calculer_simulation(
    taches=taches_finales,
    volumes=volumes_journaliers,
    productivite=request.productivite,
    heures_net_input=request.heures_net,
    volumes_annuels=va_dict,
    volumes_mensuels=None,
    # ❌ ed_percent n'est PAS passé ici !
)
```

## 🔧 Solutions Possibles

### Option 1: Ajouter ed_percent au Moteur Actuel (Recommandé)

**Avantages**:
- Correction rapide
- Pas de changement d'architecture
- Compatible avec le code existant

**Étapes**:
1. Modifier la signature de `calculer_simulation()` pour accepter `ed_percent`
2. Passer `ed_percent` depuis l'endpoint `/api/simulate`
3. Utiliser `ed_percent` dans la logique de calcul des volumes

**Fichiers à modifier**:
- `backend/app/services/simulation.py` (signature + logique)
- `backend/app/api/simulation.py` (passage du paramètre)

### Option 2: Migrer vers le Nouveau Endpoint Data-Driven

**Avantages**:
- Architecture plus moderne
- Meilleure séparation des responsabilités
- Déjà instrumenté avec logs détaillés

**Inconvénients**:
- Changement plus important
- Nécessite des tests approfondis
- Migration du frontend

**Fichiers concernés**:
- Frontend: Changer l'appel API de `/api/simulate` vers `/api/simulation-dd/intervenant`
- Backend: Ajouter support de `ed_percent` dans le moteur data-driven

## 📝 Recommandation

**Option 1** est recommandée car:
1. Plus rapide à implémenter
2. Moins de risques de régression
3. Pas de changement d'architecture nécessaire

## 🎯 Plan d'Action (Option 1)

### Étape 1: Modifier `calculer_simulation()`
**Fichier**: `backend/app/services/simulation.py`

Ajouter le paramètre `ed_percent` à la signature:
```python
def calculer_simulation(
    taches: List[Dict],
    volumes: Dict,
    productivite: float = 100.0,
    heures_net_input: Optional[float] = None,
    idle_minutes: Optional[float] = None,
    ed_percent: Optional[float] = 0.0,  # ✅ AJOUTER ICI
    *,
    volumes_annuels: Optional[Dict[str, float]] = None,
    volumes_mensuels: Optional[Dict[str, float]] = None,
):
```

### Étape 2: Utiliser ed_percent dans la Logique
Dans la même fonction, utiliser `ed_percent` pour ajuster les volumes:
```python
# Exemple: Réduire les volumes "en dehors" selon ed_percent
if ed_percent > 0:
    # Logique d'ajustement des volumes
    # À définir selon les règles métier
    pass
```

### Étape 3: Passer ed_percent depuis l'API
**Fichier**: `backend/app/api/simulation.py` (ligne 199)

```python
resultat = calculer_simulation(
    taches=taches_finales,
    volumes=volumes_journaliers,
    productivite=request.productivite,
    heures_net_input=request.heures_net,
    ed_percent=volumes_journaliers.get('ed_percent', 0.0),  # ✅ AJOUTER ICI
    volumes_annuels=va_dict,
    volumes_mensuels=None,
)
```

### Étape 4: Ajouter des Logs
Ajouter des logs pour tracer l'utilisation de `ed_percent`:
```python
print(f"📊 [BACKEND - STEP X] Application de ED%: {ed_percent}%", flush=True)
if ed_percent > 0:
    print(f"   Volumes ajustés selon ED%", flush=True)
```

## ❓ Questions à Clarifier

### 1. Quelle est la règle métier pour ed_percent ?
- Comment `ed_percent` doit-il affecter les volumes ?
- S'applique-t-il à tous les flux ou seulement certains ?
- Est-ce une réduction ou un ajustement ?

### 2. Exemple Concret
Si `ed_percent = 20%` et `colis = 100`:
- Les colis "en dehors" = 20 ?
- Les colis "dans le centre" = 80 ?
- Ou autre logique ?

## 📚 Références

**Fichiers Concernés**:
1. `backend/app/api/simulation.py` - Endpoint `/simulate`
2. `backend/app/services/simulation.py` - Moteur de calcul
3. `frontend/src/pages/Simulation.jsx` - Appel API frontend

**Logs Actuels**:
- Les logs montrent que `ed_percent` arrive bien au backend
- Mais il n'est jamais utilisé dans `calculer_simulation()`

---

**Date**: 2026-01-08  
**Auteur**: Assistant  
**Statut**: Analyse Complète - En Attente de Clarification Règles Métier
