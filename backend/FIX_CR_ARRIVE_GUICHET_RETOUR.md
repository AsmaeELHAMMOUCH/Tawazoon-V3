# Fix: CR Arrivé / Guichet - Ajout du % Retour

## 🔍 Problème identifié

La tâche **"Opération guichet : Retrait CR"** (ID=13059) avec `produit='CR ARRIVÉ'` et `famille_uo='Guichet'` ne prenait **PAS en compte le % Retour**.

### Résultat AVANT la correction
```
Volume = CR.ARRIVEE.GLOBAL × (1 - %Axes)
Volume = 22335 × 0.70 = 15634.5
```

### Résultat ATTENDU
```
Volume = CR.ARRIVEE.GLOBAL × (1 - %Axes) × %Retour
```

## ✅ Solution appliquée

### Modification du code
**Fichier**: `backend/app/services/simulation_data_driven.py`  
**Lignes**: 1151-1189

### Logique ajoutée

1. **Détection des tâches de Retrait/Récupération**:
```python
is_retrait = any(kw in tache.nom_tache.upper() for kw in ["RETRAIT", "RÉCUPÉRATION", "RECUPERATION", "RECUP"])
```

2. **Application conditionnelle du % Retour**:
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
- CR ARRIVÉE GLOBAL = 22335
- % Axes Arrivée = 30%
- **% Retour = 5%** (exemple)
- Base Calcul = 100

### Calcul étape par étape

#### Étape 1: Volume de base
```
vol_aggregat = 22335
```

#### Étape 2: Application du facteur local (1 - %Axes)
```
facteur_local = 1.0 - 0.30 = 0.70
vol_source_base = 22335 × 0.70 = 15634.5
```

#### Étape 3: Détection de la tâche de Retrait
```
is_retrait = "RETRAIT" in "Opération guichet : Retrait CR".upper()
is_retrait = True
```

#### Étape 4: Application du % Retour
```
pct_retour = 5.0 / 100 = 0.05
vol_source = 15634.5 × 0.05 = 781.725
```

#### Étape 5: Volume annuel (Base 100)
```
volume_annuel = 781.725
```

#### Étape 6: Volume journalier
```
volume_jour = 781.725 / 264 = 2.96 courriers/jour
```

## 🎯 Formule finale

### Pour les tâches de Retrait CR au Guichet
```
Volume = CR.ARRIVEE.GLOBAL × (1 - %Axes_Arrivée) × %Retour
```

### Pour les autres tâches CR au Guichet
```
Volume = CR.ARRIVEE.GLOBAL × (1 - %Axes_Arrivée)
```

## 📝 UI Path affiché

### Avant (sans % Retour)
```
CR.ARRIVEE.GLOBAL x 70.00%(Local) [Base 100%]
```

### Après (avec % Retour pour Retrait)
```
CR.ARRIVEE.GLOBAL x 70.00%(Local) x 5.00%(%Retour) [Base 100%]
```

## 🧪 Test

### Données de test
- CR ARRIVÉE GLOBAL = 22335
- % Axes Arrivée = 30%
- % Retour = 5%
- Tâche: "Opération guichet : Retrait CR"

### Résultat attendu
```
Volume annuel = 22335 × 0.70 × 0.05 = 781.725
Volume/jour = 781.725 / 264 = 2.96
```

### Formule affichée
```
CR.ARRIVEE.GLOBAL x 70.00%(Local) x 5.00%(%Retour) [Base 100%]
```

## ⚠️ Notes importantes

### Mots-clés de détection
Les tâches sont détectées comme "Retrait" si leur nom contient:
- "RETRAIT"
- "RÉCUPÉRATION"
- "RECUPERATION"
- "RECUP"

### Paramètre % Retour
Le paramètre `pct_retour` doit être saisi dans l'interface:
- Valeur par défaut: 0.0
- Si > 1.0, il est divisé par 100 (ex: 5.0 → 0.05)

---

**Date**: 2026-01-20  
**Fichier modifié**: `backend/app/services/simulation_data_driven.py`  
**Lignes modifiées**: 1151-1189  
**Type de modification**: Ajout de logique conditionnelle pour % Retour
