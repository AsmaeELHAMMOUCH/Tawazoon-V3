# 📋 Résumé des corrections: AMANA Dépôt

## 🎯 Deux problèmes identifiés et corrigés

### 1️⃣ AMANA Dépôt / Collecte - Tâches non calculées

**Problème**: Les tâches avec `produit='AMANA Dépôt'` et `famille_uo='Collecte'` n'étaient **pas calculées**.

**Cause**: Le premier bloc AMANA DÉPÔT calculait `volume_annuel` mais **ne retournait jamais la valeur**. Le code continuait vers un deuxième bloc qui recalculait avec une formule différente.

**Solution**: Ajout du calcul final et du `return` statement à la fin du premier bloc AMANA DÉPÔT (lignes 555-564).

**Fichiers modifiés**:
- `backend/app/services/simulation_data_driven.py` (lignes 555-564)

**Documentation**: `backend/RESUME_FIX_COLLECTE.md`

---

### 2️⃣ AMANA Dépôt / Guichet - Volume GUICHET.DEPOT non récupéré

**Problème**: Les tâches avec `produit='AMANA Dépôt'` et `famille_uo='Guichet'` utilisaient le **Fallback** au lieu du volume GUICHET.DEPOT saisi.

**Cause**: Le code utilisait `context.get_volume("AMANA", "GUICHET", "DEPOT")` qui cherche dans `volumes_flux`, mais les volumes GUICHET ne sont **pas dans cette liste**. Ils sont dans `guichet.depot` et `guichet.recup`.

**Solution**: 
1. Ajout d'une méthode `get_guichet_volume()` dans `VolumeContext` (lignes 64-79)
2. Utilisation de cette méthode dans le bloc AMANA DÉPÔT / Guichet (ligne 525)

**Fichiers modifiés**:
- `backend/app/services/simulation_data_driven.py` (lignes 64-79, 525)

**Documentation**: `backend/FIX_GUICHET_DEPOT.md`

---

## 📊 Tâches concernées

### Collecte (Fix #1)
| ID    | Nom                                                          |
|-------|--------------------------------------------------------------|
| 7387  | Confirmation réception scan (masse) Amana                    |
| 11677 | Confirmation réception scan (masse) AMANA Dépôt              |
| 7389  | Taxation : Saisie excel - Création FIM - Saisie Amana        |
| 11686 | Taxation : Saisie excel - Création FIM - Saisie AMANA Dépôt  |
| 13036 | Taxation : Saisie excel - Création FIM - Saisie colis        |

### Guichet (Fix #2)
| Exemple | Nom                                |
|---------|------------------------------------|
| Tâche   | Opération guichet : Dépôt colis    |

---

## 🧪 Tests à effectuer

### Test 1: Collecte
1. Sélectionner un poste avec des tâches AMANA Dépôt / Collecte
2. Saisir des volumes AMANA DEPART (ex: PART=50000, PRO=30000)
3. Définir % Axes Départ = 10%
4. Lancer la simulation
5. **Vérifier**: Les tâches COLLECTE apparaissent avec un volume calculé (non 0)

### Test 2: Guichet
1. Sélectionner un poste avec des tâches AMANA Dépôt / Guichet
2. Saisir un volume GUICHET.DEPOT = 15000
3. Lancer la simulation
4. **Vérifier**: La formule affiche `GUICHET.DEPOT (15000)` et **PAS** "Fallback"

---

## ✅ Checklist

- [x] Problème #1 (Collecte) identifié
- [x] Problème #1 corrigé
- [x] Problème #2 (Guichet) identifié
- [x] Problème #2 corrigé
- [x] Documentation créée
- [ ] Tests effectués
- [ ] Validation par l'utilisateur

---

**Date**: 2026-01-20  
**Fichier principal modifié**: `backend/app/services/simulation_data_driven.py`  
**Nombre de corrections**: 2  
**Lignes modifiées**: 64-79, 525, 555-564
