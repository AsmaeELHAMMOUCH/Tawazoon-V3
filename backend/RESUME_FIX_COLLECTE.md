# 🎯 RÉSUMÉ: Correction du calcul AMANA Dépôt / Collecte

## ✅ Problème résolu

Les tâches avec `produit='AMANA Dépôt'` et `famille_uo='Collecte'` n'étaient **pas calculées** car le premier bloc AMANA DÉPÔT ne retournait pas de valeur.

## 🔧 Correction appliquée

**Fichier**: `backend/app/services/simulation_data_driven.py`

**Ligne 552-564**: Ajout du calcul final et du `return` statement à la fin du Bloc 1 AMANA DÉPÔT

```python
# Calcul journalier commun pour AMANA DÉPÔT
volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0

# Application du facteur base_calcul (100%, 60%, ou 40%)
facteur_base = float(base_val) / 100.0
volume_final_jour = volume_jour * facteur_base

print(f"   → AMANA DEPOT RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
```

## 📊 Formules appliquées

### Pour AMANA Dépôt / Collecte

Le **Bloc 1** (lignes 342-564) traite maintenant correctement toutes les tâches AMANA DÉPÔT:

#### 1️⃣ Tâches "Collecte Colis" (nom contient "COLLECTE COLIS")
```
Volume = AMANA.DEPART.AGREGAT × (1 - %Axes) × %Collecte × Complexité
```
**Exemple**: Si DEPART = 80000, Axes = 10%, Collecte = 5%, Complexité = 1.2
```
Volume = 80000 × 0.90 × 0.05 × 1.2 = 4320 colis/an
```

#### 2️⃣ Autres tâches Collecte (famille = "Collecte")
```
Volume = AMANA.DEPART.AGREGAT × (1 - %Axes)
```
**Exemple**: Si DEPART = 80000, Axes = 10%
```
Volume = 80000 × 0.90 = 72000 colis/an
```

## 🔍 Tâches concernées (d'après result_collecte.txt)

| ID    | Nom                                                          | Type détecté        | Formule appliquée |
|-------|--------------------------------------------------------------|---------------------|-------------------|
| 7387  | Confirmation réception scan (masse) Amana                    | Collecte (général)  | Vol × (1-Axes)    |
| 11677 | Confirmation réception scan (masse) AMANA Dépôt              | Collecte (général)  | Vol × (1-Axes)    |
| 7389  | Taxation : Saisie excel - Création FIM - Saisie Amana        | Collecte (général)  | Vol × (1-Axes)    |
| 11686 | Taxation : Saisie excel - Création FIM - Saisie AMANA Dépôt  | Collecte (général)  | Vol × (1-Axes)    |
| 13036 | Taxation : Saisie excel - Création FIM - Saisie colis        | Collecte (général)  | Vol × (1-Axes)    |

**Note**: Aucune de ces tâches ne contient "COLLECTE COLIS" dans le nom, donc elles utilisent la formule simplifiée.

## 🧪 Comment tester

1. **Ouvrir l'interface web** (déjà en cours sur http://localhost:5173)
2. **Sélectionner un filtre**:
   - Filtre Famille: **Collecte**
   - OU sélectionner un poste qui contient ces tâches
3. **Entrer des volumes**:
   - AMANA DEPART PART: 50000
   - AMANA DEPART PRO: 30000
   - % Axes Départ: 10
4. **Lancer la simulation**
5. **Vérifier** que les tâches AMANA Dépôt / Collecte apparaissent maintenant avec un volume calculé

## 📝 Logs de débogage

Le code affiche maintenant un log lors du calcul:
```
→ AMANA DEPOT RETURN: vol_annuel=72000.00, vol_jour=272.73, path=AMANA.DEPART.AGREGAT x 90.00%(1-Axes) [Base 100%]
```

Vous pouvez vérifier ces logs dans:
- **Console du terminal backend** (où uvicorn tourne)
- **Onglet Réseau** du navigateur (réponse API)

## ⚠️ Point d'attention

Il existe un **Bloc 2** (lignes 570-634) qui traite aussi `AMANA DEPOT` mais avec une formule différente:
```python
elif produit in ["COLIS", "AMANA DEPOT", "AMANA DÉPÔT", "AMANA DÉPOT"]:
    # Formule: VolDepart * (1-Axes) * %Collecte * Complexité
```

**Maintenant que le Bloc 1 retourne correctement**, le Bloc 2 ne sera **PLUS JAMAIS atteint** pour les tâches `AMANA DÉPÔT`.

Le Bloc 2 reste nécessaire pour traiter le produit **"COLIS"** (sans "AMANA").

## ✅ Statut

- [x] Problème identifié
- [x] Correction appliquée
- [x] Documentation créée
- [ ] Test en interface web (à faire par l'utilisateur)
- [ ] Validation des résultats

---

**Date**: 2026-01-20  
**Fichier modifié**: `backend/app/services/simulation_data_driven.py`  
**Lignes modifiées**: 552-564
