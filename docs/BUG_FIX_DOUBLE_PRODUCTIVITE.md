# 🐛 BUG RÉSOLU : Double Application de la Productivité

## 📋 Problème Identifié

La page **Vue Centre** donnait des résultats différents de la page **Vue Intervenant** pour les mêmes paramètres et volumes, en raison d'une **double application de la productivité**.

## 🔍 Analyse du Bug

### Comportement Attendu
- **Vue Intervenant** : ETP calculé = 2.46
- **Vue Centre** : ETP calculé = 2.46 (devrait être identique)

### Comportement Observé
- **Vue Intervenant** : ETP calculé = 2.46 ✅
- **Vue Centre** : ETP calculé = ~2.89 ❌ (environ 17% de plus)

## 🎯 Cause Racine

Le problème se situait dans `frontend/src/pages/Simulation.jsx` aux lignes 1736-1742.

### Code Problématique (AVANT)
```javascript
const params = {
  productivite: Number(productivite),
  heures_par_jour: Number(heuresNet || 8.0),  // ❌ ERREUR: heuresNet est déjà ajusté
  idle_minutes: overrides.idle_minutes !== undefined ? Number(overrides.idle_minutes) : Number(idleMinutes || 0),
  debug: true
};
```

### Flux de Calcul Erroné

1. **Frontend** (lignes 1659-1664) :
   ```javascript
   useEffect(() => {
     const baseHeures = 8;
     const calcul = (productivite / 100) * baseHeures;
     setHeuresNet(calcul);  // Si prod=85%, heuresNet=6.8h
   }, [productivite]);
   ```

2. **Frontend envoie** :
   - `productivite = 85%`
   - `heures_par_jour = 6.8h` ❌ (déjà réduit par la productivité)

3. **Backend calcule** (`backend/app/services/simulation_data_driven.py`, lignes 111-113) :
   ```python
   prod_factor = productivite / 100.0  # = 0.85
   heures_calculees = (charge_minutes / 60.0) / prod_factor  # Division par 0.85
   ```

4. **Backend calcule l'ETP** (ligne 163) :
   ```python
   heures_nettes = max(0.0, heures_par_jour - idle_heures)  # = 6.8h
   fte_calcule = total_heures / heures_nettes  # Division par 6.8h
   ```

### Résultat
- Les heures calculées sont **augmentées** par `/prod_factor` (division par 0.85 = multiplication par 1.176)
- L'ETP est calculé avec `heures_nettes` **déjà réduit** (6.8h au lieu de 8h)
- **Double pénalité** : les heures sont gonflées ET divisées par une base réduite

## ✅ Solution Appliquée

### Code Corrigé (APRÈS)
```javascript
const params = {
  productivite: Number(productivite),
  heures_par_jour: 8.0,  // ✅ CORRECTION: Toujours 8.0, le backend appliquera la productivité
  idle_minutes: overrides.idle_minutes !== undefined ? Number(overrides.idle_minutes) : Number(idleMinutes || 0),
  debug: true
};
```

### Flux de Calcul Correct

1. **Frontend envoie** :
   - `productivite = 85%`
   - `heures_par_jour = 8.0h` ✅ (valeur de base)

2. **Backend calcule** :
   ```python
   prod_factor = 0.85
   heures_calculees = (charge_minutes / 60.0) / prod_factor  # Ajustement correct
   heures_nettes = 8.0 - idle_heures  # Base correcte
   fte_calcule = total_heures / heures_nettes  # Calcul correct
   ```

### Résultat
- Les heures sont correctement ajustées par la productivité
- L'ETP est calculé avec la bonne base (8h)
- **Application unique** de la productivité

## 📊 Impact

### Avant la Correction
- Productivité 100% : Résultats corrects ✅
- Productivité 85% : ETP surestimé de ~17% ❌
- Productivité 70% : ETP surestimé de ~43% ❌

### Après la Correction
- Productivité 100% : Résultats corrects ✅
- Productivité 85% : Résultats corrects ✅
- Productivité 70% : Résultats corrects ✅

## 🧪 Test de Validation

Pour vérifier que la correction fonctionne :

1. Ouvrir la **Vue Intervenant**
2. Sélectionner un centre/poste
3. Saisir des volumes (ex: Amana=1000, CO=2000, CR=500)
4. Définir productivité = 85%
5. Noter l'ETP calculé (ex: 2.46)

6. Ouvrir la **Vue Centre**
7. Sélectionner le même centre
8. Saisir les mêmes volumes
9. Définir productivité = 85%
10. Vérifier que l'ETP calculé est identique (2.46) ✅

## 📝 Fichiers Modifiés

- `frontend/src/pages/Simulation.jsx` (ligne 1739)

## 🔗 Références

- Backend : `backend/app/services/simulation_data_driven.py`
  - Fonction `calculer_simulation_data_driven` (lignes 14-209)
  - Fonction `calculer_simulation_centre_data_driven` (lignes 212-423)

## ✨ Conclusion

Le bug était subtil car il ne se manifestait que lorsque la productivité était différente de 100%. La correction garantit maintenant que :

1. **Vue Intervenant** et **Vue Centre** donnent les mêmes résultats
2. La productivité est appliquée **une seule fois** par le backend
3. Le calcul de l'ETP est cohérent quelle que soit la productivité

---

**Date de résolution** : 2026-01-04  
**Complexité** : 8/10 (bug subtil nécessitant une analyse approfondie du flux de données)  
**Impact** : Critique (affectait tous les calculs avec productivité ≠ 100%)
