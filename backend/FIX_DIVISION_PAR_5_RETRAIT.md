# ✅ CORRECTION FINALE: Division par 5 pour les Retraits

## 🎯 Modification appliquée

**Date**: 2026-01-20  
**Fichier**: `backend/app/services/simulation_data_driven.py`  
**Lignes modifiées**: 319-322 (AMANA), 1183-1186 (CR)

---

## 📋 Formule finale

### Pour les tâches de Retrait au Guichet

**AMANA REÇU**:
```
Volume = AMANA.ARRIVEE.AGREGAT × (1 - %Axes) / 5
```

**CR Arrivé**:
```
Volume = CR.ARRIVEE.GLOBAL × (1 - %Axes) / 5
```

---

## 💡 Logique appliquée

```python
# Détection des tâches de Retrait/Récupération
is_retrait = any(kw in tache.nom_tache.upper() for kw in ["RETRAIT", "RÉCUPÉRATION", "RECUPERATION", "RECUP"])

# Application de la division par 5 pour les tâches de Retrait
if is_retrait:
    vol_source = vol_source_base / 5.0
    ui_path += " / 5 (Retrait)"
else:
    vol_source = vol_source_base
```

---

## 📊 Exemple de calcul

### AMANA REÇU - Retrait colis

**Données**:
- AMANA ARRIVÉE PART = 17397
- AMANA ARRIVÉE PRO = 92520
- AMANA ARRIVÉE AGREGAT = 109917
- % Axes Arrivée = 30%

**Calcul**:
```
vol_source_base = 109917 × (1 - 0.30) = 109917 × 0.70 = 76941.9

vol_source = 76941.9 / 5 = 15388.38

volume_annuel = 15388.38
volume_jour = 15388.38 / 264 = 58.29 colis/jour
```

**Formule affichée**:
```
AMANA.ARR.AGR(Fallback) x 70.00%(1-Ax) / 5 (Retrait) [Base 100%]
```

---

### CR Arrivé - Retrait CR

**Données**:
- CR ARRIVÉE GLOBAL = 22335
- % Axes Arrivée = 30%

**Calcul**:
```
vol_source_base = 22335 × (1 - 0.30) = 22335 × 0.70 = 15634.5

vol_source = 15634.5 / 5 = 3126.9

volume_annuel = 3126.9
volume_jour = 3126.9 / 264 = 11.84 courriers/jour
```

**Formule affichée**:
```
CR.ARRIVEE.GLOBAL x 70.00%(Local) / 5 (Retrait) [Base 100%]
```

---

## 🔄 Changement par rapport à la version précédente

### AVANT (avec % Retour)
```python
if is_retrait:
    pct_retour = context.raw_volumes.pct_retour or 0.0
    if pct_retour > 1.0: pct_retour /= 100.0
    
    if pct_retour > 0:
        vol_source = vol_source_base * pct_retour
        ui_path += f" x {pct_retour:.2%}(%Retour)"
    else:
        vol_source = vol_source_base
```

**Problème**: Nécessitait de saisir le % Retour dans l'interface

### APRÈS (division fixe par 5)
```python
if is_retrait:
    vol_source = vol_source_base / 5.0
    ui_path += " / 5 (Retrait)"
```

**Avantage**: Division fixe, pas besoin de paramètre

---

## 🧪 Tests

### Test 1: AMANA REÇU - Retrait colis
1. Saisir AMANA ARRIVÉE (PART=17397, PRO=92520)
2. % Axes Arrivée = 30%
3. **Vérifier**:
   - Volume/jour ≈ **58.29 colis/jour**
   - Formule: `AMANA.ARR.AGR(Fallback) x 70.00%(1-Ax) / 5 (Retrait) [Base 100%]`

### Test 2: CR Arrivé - Retrait CR
1. Saisir CR ARRIVÉE GLOBAL = 22335
2. % Axes Arrivée = 30%
3. **Vérifier**:
   - Volume/jour ≈ **11.84 courriers/jour**
   - Formule: `CR.ARRIVEE.GLOBAL x 70.00%(Local) / 5 (Retrait) [Base 100%]`

---

## ✅ Résumé

- ✅ Division fixe par 5 appliquée
- ✅ Plus besoin du paramètre % Retour
- ✅ Formule simplifiée et claire
- ✅ Tâches de Retrait correctement calculées

---

**Dernière mise à jour**: 2026-01-20 09:53  
**Statut**: ✅ ACTIF et prêt pour tests
