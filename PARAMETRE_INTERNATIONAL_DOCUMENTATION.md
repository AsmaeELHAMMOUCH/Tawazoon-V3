# 🌍 Modification du Paramètre International - Documentation

## Résumé des Changements

Le paramètre `pct_international` a été modifié pour s'appliquer **uniquement** aux tâches ayant le produit **"AMANA Dépôt International"** (au lieu de "AMANA DEPOT" standard).

---

## Nouvelles Conditions d'Application

Le paramètre `pct_international` s'applique **UNIQUEMENT** si **TOUTES** ces conditions sont remplies :

### ✅ Conditions Strictes

1. **Produit:** `AMANA DÉPÔT INTERNATIONAL` (ou variantes: `AMANA DEPOT INTERNATIONAL`, `AMANA DEPÔT INTERNATIONAL`)
2. **Famille:** `GUICHET` (strictement égal)
3. **Nom de tâche contient:** `"OPÉRATION"` **ET** `"GUICHET"` **ET** `"DÉPÔT"`
4. **Unité:** `COLIS`

---

## Exemple de Tâche Ciblée

```
Produit: AMANA DÉPÔT INTERNATIONAL
Famille: GUICHET
Nom: Opération Guichet Dépôt
Unité: COLIS
```

---

## Formule de Calcul

```
Volume Final = Volume Source × (pct_international / 100)
```

### Exemple Concret

- **Volume source:** 10,000 colis (AMANA.GUICHET.DEPOT ou fallback)
- **pct_international:** 5% (saisi par l'utilisateur)
- **Calcul:** 10,000 × 0.05 = **500 colis**

---

## Source de Volume

Le volume source est déterminé dans l'ordre de priorité suivant :

1. **Priorité 1:** Volume `AMANA.GUICHET.DEPOT` (si > 0)
2. **Fallback:** `AMANA.DEPART.AGREGAT × (1 - %Axes Départ)`

---

## Traitement des Bases de Calcul

Le paramètre international est appliqué **AVANT** le traitement des bases de calcul :

- **Base 100%:** Volume final = Volume source × pct_international
- **Base 60%:** 
  - Si unité = SAC: Division par `colis_amana_par_sac`
  - Sinon: Volume final = Volume source × pct_international × 0.60
- **Base 40%:** Volume final = Volume source × pct_international × 0.40

---

## Logs de Débogage

Le code génère des logs détaillés pour faciliter le suivi :

```python
🌍 [INTL] AMANA DEPOT INTERNATIONAL: famille='GUICHET' nom='Opération Guichet Dépôt' unite='COLIS'
   🌍 [INTL] Applying International Parameter: 5.0% on Volume=10000.0
   🌍 [INTL] NEW VOLUME after International = 500.0
   🌍 [INTL] RETURN: vol_annuel=500.00, vol_jour=1.37, path=AMANA.GUICHET.DEPOT (10000) x 5.00% (International) [Base 100%]
```

---

## Différences avec l'Ancienne Implémentation

| **Aspect** | **Avant** | **Après** |
|------------|-----------|-----------|
| **Produit** | `AMANA DEPOT` (standard) | `AMANA DÉPÔT INTERNATIONAL` (spécifique) |
| **Application** | Dans le bloc GUICHET du produit standard | Bloc dédié séparé |
| **Clarté** | Logique imbriquée | Logique isolée et claire |
| **Maintenance** | Difficile à localiser | Facile à identifier |

---

## Impact sur les Tâches Existantes

### ⚠️ Important

Les tâches avec le produit **"AMANA DEPOT"** (sans "International") ne seront **PLUS** affectées par le paramètre `pct_international`, même si elles remplissent les autres conditions.

Pour qu'une tâche soit affectée, elle **DOIT** avoir le produit **"AMANA DÉPÔT INTERNATIONAL"**.

---

## Actions Requises

### 1. Mise à Jour de la Base de Données

Vous devez mettre à jour le champ `produit` des tâches concernées :

```sql
UPDATE taches 
SET produit = 'AMANA DÉPÔT INTERNATIONAL'
WHERE produit = 'AMANA DEPOT'
  AND famille_uo = 'GUICHET'
  AND nom_tache LIKE '%OPÉRATION%'
  AND nom_tache LIKE '%GUICHET%'
  AND nom_tache LIKE '%DÉPÔT%'
  AND unite = 'COLIS';
```

### 2. Vérification

Après la mise à jour, vérifiez que les tâches sont correctement identifiées :

```sql
SELECT id, nom_tache, produit, famille_uo, unite
FROM taches
WHERE produit LIKE '%INTERNATIONAL%';
```

---

## Test de Validation

Pour tester la nouvelle implémentation :

1. **Créer/Modifier une tâche** avec :
   - Produit: `AMANA DÉPÔT INTERNATIONAL`
   - Famille: `GUICHET`
   - Nom: `Opération Guichet Dépôt`
   - Unité: `COLIS`

2. **Lancer une simulation** avec `pct_international = 5`

3. **Vérifier les logs** backend pour confirmer :
   ```
   🌍 [INTL] AMANA DEPOT INTERNATIONAL: ...
   🌍 [INTL] Applying International Parameter: 5.0% ...
   ```

4. **Vérifier le résultat** : Le volume doit être multiplié par 0.05

---

## Code Modifié

**Fichier:** `backend/app/services/simulation_data_driven.py`

**Lignes modifiées:** 433-530 (nouveau bloc), 730-748 (suppression ancienne logique)

---

## Support

En cas de problème, vérifiez :

1. ✅ Le produit de la tâche contient bien "INTERNATIONAL"
2. ✅ La famille est exactement "GUICHET" (majuscules)
3. ✅ Le nom de tâche contient les 3 mots-clés
4. ✅ L'unité est "COLIS"
5. ✅ Les logs backend montrent le traitement

---

**Date de modification:** 2026-02-03
**Version:** 2.0
