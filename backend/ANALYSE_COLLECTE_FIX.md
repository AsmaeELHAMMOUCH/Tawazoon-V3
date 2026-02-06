# Analyse du problème: AMANA Dépôt / Collecte non calculé

## 🔍 Problème identifié

Les tâches avec `produit='AMANA Dépôt'` et `famille_uo='Collecte'` n'étaient **PAS calculées** correctement.

## 🎯 Cause racine

Il y avait **DEUX blocs** dans le code qui traitaient le produit `AMANA DÉPÔT`:

### Bloc 1 (lignes 342-555) - Premier bloc AMANA DÉPÔT
```python
elif produit in ["AMANA DEPOT", "AMANA DÉPÔT", "AMANA DEPÔT", "AMANA DÉPOT"]:
    # ... calculs pour différentes familles ...
    
    # BRANCHE 4 : Autres tâches Famille COLLECTE
    elif "COLLECTE" in famille:
        # Formule: Vol(Depart) * (1 - %Axes)
        vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
        pct_axes = context.raw_volumes.pct_axes_depart or 0.0
        if pct_axes > 1.0: pct_axes = pct_axes / 100.0
        facteur_hors_axes = 1.0 - pct_axes
        
        vol_source = vol_aggregat * facteur_hors_axes
        ui_path = f"AMANA.DEPART.AGREGAT x {facteur_hors_axes:.2%}(1-Axes)"
        
        # Calcul de volume_annuel selon base_calcul...
        volume_annuel = vol_source  # (simplifié)
        
    # ❌ PROBLÈME: Pas de return statement ici !
    # Le code continuait vers le Bloc 2...
```

### Bloc 2 (lignes 560-624) - Deuxième bloc COLIS/AMANA DEPOT
```python
elif produit in ["COLIS", "AMANA DEPOT", "AMANA DÉPÔT", "AMANA DÉPOT"]:
    # Ce bloc recalculait avec une formule différente !
    # Formule: VolDepart * (1-Axes) * %Collecte * Complexité
    vol_source = vol_ref * (1.0 - pct_axes) * pct_collecte * taux_complexite
    
    # ✅ Ce bloc avait un return statement
    return volume_annuel * facteur_base, volume_final_jour, ...
```

## 🐛 Comportement erroné

Quand une tâche `AMANA Dépôt / Collecte` arrivait:

1. ✅ Elle entrait dans le **Bloc 1** (ligne 342)
2. ✅ Elle entrait dans la branche `elif "COLLECTE" in famille:` (ligne 467)
3. ✅ Elle calculait `volume_annuel` avec la formule: `Vol(Depart) * (1 - %Axes)`
4. ❌ **MAIS** le Bloc 1 ne retournait rien !
5. ❌ Le code continuait et tombait dans le **Bloc 2** (ligne 560)
6. ❌ Le Bloc 2 recalculait avec une formule **DIFFÉRENTE**: `Vol * (1-Axes) * %Collecte * Complexité`

**Résultat**: Les tâches étaient calculées avec la mauvaise formule ou retournaient 0.

## ✅ Solution appliquée

Ajout du calcul final et du `return` statement à la fin du Bloc 1:

```python
elif "COLLECTE" in famille:
    # ... calculs ...
    volume_annuel = vol_source
    ui_path += " [Base 100%]"

# ✅ AJOUT: Calcul journalier commun pour AMANA DÉPÔT
volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0

# Application du facteur base_calcul (100%, 60%, ou 40%)
facteur_base = float(base_val) / 100.0
volume_final_jour = volume_jour * facteur_base

print(f"   → AMANA DEPOT RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
```

## 📊 Tâches concernées

D'après `result_collecte.txt`, les tâches suivantes sont concernées:

| ID    | Nom                                                          | Produit      | Famille  | Base |
|-------|--------------------------------------------------------------|--------------|----------|------|
| 7387  | Confirmation réception scan (masse) Amana                    | AMANA Dépôt  | Collecte | 100  |
| 11677 | Confirmation réception scan (masse) AMANA Dépôt              | AMANA Dépôt  | Collecte | 100  |
| 7389  | Taxation : Saisie excel - Création FIM - Saisie Amana        | AMANA Dépôt  | Collecte | -    |
| 11686 | Taxation : Saisie excel - Création FIM - Saisie AMANA Dépôt  | AMANA Dépôt  | Collecte | -    |
| 13036 | Taxation : Saisie excel - Création FIM - Saisie colis        | AMANA Dépôt  | Collecte | -    |

## 🧪 Test

Pour tester, lancer une simulation avec:
- Filtre Famille: **Collecte**
- Volumes AMANA DEPART (PART + PRO) > 0
- Observer que les tâches AMANA Dépôt sont maintenant calculées

**Formule appliquée** (Bloc 1, Branche COLLECTE):
```
Volume = AMANA.DEPART.AGREGAT × (1 - %Axes)
```

**Note**: Le Bloc 2 applique une formule différente avec `%Collecte` et `Complexité`. 
Il faudra clarifier quelle formule est la bonne pour les tâches COLLECTE.

## 📝 Recommandations

1. **Vérifier la formule correcte**: Confirmer avec les règles métier quelle formule doit être appliquée pour les tâches COLLECTE
2. **Supprimer le Bloc 2** si le Bloc 1 est suffisant, ou vice-versa
3. **Renommer les commentaires**: Le commentaire "FIN BLOC AMANA RECU" était incorrect (ligne 555), maintenant corrigé en "FIN BLOC AMANA DEPOT"
