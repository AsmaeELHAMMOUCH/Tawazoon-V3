# Fix: AMANA REÇU / Guichet - Ajout du % Retour pour Retrait

## 🔍 Problème identifié

La tâche **"Opération guichet : Retrait colis"** (ID=13085) avec `produit='AMANA REÇU'` et `famille_uo='Guichet'` ne prenait **PAS en compte le % Retour**.

### Résultat AVANT la correction
```
Volume = AMANA.ARRIVEE.AGREGAT × (1 - %Axes)
Volume = 109917 × 0.70 = 76941.90
```

### Résultat ATTENDU
```
Volume = AMANA.ARRIVEE.AGREGAT × (1 - %Axes) × %Retour
```

## ✅ Solution appliquée

### Modification du code
**Fichier**: `backend/app/services/simulation_data_driven.py`  
**Lignes**: 304, 312-327

### Logique ajoutée

Identique à la correction appliquée pour CR Arrivé / Guichet:

1. **Renommage de `vol_source` en `vol_source_base`** pour distinguer le volume de base du volume final

2. **Détection des tâches de Retrait/Récupération**:
```python
is_retrait = any(kw in tache.nom_tache.upper() for kw in ["RETRAIT", "RÉCUPÉRATION", "RECUPERATION", "RECUP"])
```

3. **Application conditionnelle du % Retour**:
```python
if is_retrait:
    pct_retour = context.raw_volumes.pct_retour or 0.0
    if pct_retour > 1.0: pct_retour /= 100.0
    
    vol_source = vol_source_base * pct_retour
    ui_path += f" x {pct_retour:.2%}(%Retour)"
else:
    vol_source = vol_source_base
```

## 📊 Exemple de calcul

### Données d'entrée
- AMANA ARRIVÉE AGREGAT = 109917 (PART + PRO)
- % Axes Arrivée = 30%
- **% Retour = 5%** (exemple)
- Base Calcul = 100

### Calcul étape par étape

#### Étape 1: Volume de base
```
vol_aggregat = 109917
```

#### Étape 2: Application du facteur local (1 - %Axes)
```
facteur_local = 1.0 - 0.30 = 0.70
vol_source_base = 109917 × 0.70 = 76941.9
```

#### Étape 3: Détection de la tâche de Retrait
```
is_retrait = "RETRAIT" in "Opération guichet : Retrait colis".upper()
is_retrait = True
```

#### Étape 4: Application du % Retour
```
pct_retour = 5.0 / 100 = 0.05
vol_source = 76941.9 × 0.05 = 3847.095
```

#### Étape 5: Volume annuel (Base 100)
```
volume_annuel = 3847.095
```

#### Étape 6: Volume journalier
```
volume_jour = 3847.095 / 264 = 14.57 colis/jour
```

## 🎯 Formule finale

### Pour les tâches de Retrait AMANA au Guichet
```
Volume = AMANA.ARRIVEE.AGREGAT × (1 - %Axes_Arrivée) × %Retour
```

### Pour les autres tâches AMANA au Guichet
```
Volume = AMANA.ARRIVEE.AGREGAT × (1 - %Axes_Arrivée)
```

## 📝 UI Path affiché

### Avant (sans % Retour)
```
AMANA.ARR.AGR(Fallback) x 70.00%(1-Ax) [Base 100%]
```

### Après (avec % Retour pour Retrait)
```
AMANA.ARR.AGR(Fallback) x 70.00%(1-Ax) x 5.00%(%Retour) [Base 100%]
```

## 🧪 Test

### Données de test
- AMANA ARRIVÉE PART = 17397
- AMANA ARRIVÉE PRO = 92520
- AMANA ARRIVÉE AGREGAT = 109917
- % Axes Arrivée = 30%
- % Retour = 5%
- Tâche: "Opération guichet : Retrait colis"

### Résultat attendu
```
Volume annuel = 109917 × 0.70 × 0.05 = 3847.095
Volume/jour = 3847.095 / 264 = 14.57 colis/jour
```

### Formule affichée
```
AMANA.ARR.AGR(Fallback) x 70.00%(1-Ax) x 5.00%(%Retour) [Base 100%]
```

## ⚠️ Notes importantes

### Mots-clés de détection
Les tâches sont détectées comme "Retrait" si leur nom contient:
- "RETRAIT"
- "RÉCUPÉRATION"
- "RECUPERATION"
- "RECUP"

### Cohérence avec CR
Cette correction applique la **même logique** que pour CR Arrivé / Guichet, assurant une cohérence dans le traitement des tâches de Retrait au Guichet.

### Paramètre % Retour
Le paramètre `pct_retour` doit être saisi dans l'interface:
- Valeur par défaut: 0.0
- Si > 1.0, il est divisé par 100 (ex: 5.0 → 0.05)

---

**Date**: 2026-01-20  
**Fichier modifié**: `backend/app/services/simulation_data_driven.py`  
**Lignes modifiées**: 304, 312-327  
**Type de modification**: Ajout de logique conditionnelle pour % Retour (identique à CR)
