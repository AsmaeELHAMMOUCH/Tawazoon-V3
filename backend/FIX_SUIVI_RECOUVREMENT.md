# ✅ CORRECTION SPÉCIFIQUE: Suivi de Recouvrement (Reporting)

## 🎯 Problème résolu

La tâche **"Suivi de recouvrement colis"** était incorrectement calculée en utilisant la logique `Arrivée Camions Axes` (application de 30% d'axes), alors qu'elle devrait être considérée comme du **Reporting** (100% du volume AMANA DÉPART AGREGAT).

Raisons probables du problème initial:
1. La famille de la tâche dans la base de données n'est pas "REPORTING" (probablement "ARRIVÉE CAMIONS AXES").
2. Le nom de la tâche ne correspondait pas exactement à "SUIVI DE RECOUVREMENT".

## 🔧 Solution appliquée

### 1. Création d'une branche prioritaire "Reporting"
Cette branche (Branche 0) est placée **avant** la Branche 1 (Axes) pour intercepter le calcul.

### 2. Élargissement de la détection
La condition vérifie maintenant:
- Si la famille contient "REPORTING"
- **OU** si le nom de la tâche contient "RECOUVREMENT" (sans casse)

### Code implémenté (Lignes 382-385)

```python
# --- BRANCHE 0 : Reporting (Prioritaire) ---
nom_tache_safe = str(getattr(tache, 'nom_tache', '') or '').upper()
if "REPORTING" in famille or "RECOUVREMENT" in nom_tache_safe:
    # Source : AGREGAT DEPART (PART + PRO) - 100%
    vol_source = context.get_aggregated_volume("AMANA", "DEPART")
    ui_path = "AMANA.DEPART.AGREGAT (Reporting)"
```

## 📊 Résultat attendu

**Avant**:
```
Vol = AMANA.DEPART.AGREGAT x 30.00%(AxesD) [Base 100%]
Ex: 24.83 / jour
```

**Après**:
```
Vol = AMANA.DEPART.AGREGAT (Reporting) [Base 100%]
Ex: ~82.76 / jour (si 30% d'axes, le volume sera ~3.3 fois plus grand)
```

## 🧪 Statut
✅ **Correctif appliqué**. La tâche "Suivi de recouvrement colis" sera désormais traitée correctement comme du Reporting.
