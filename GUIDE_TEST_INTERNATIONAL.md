# 🧪 Guide de Test - Paramètre International

## Objectif

Vérifier que le paramètre `pct_international` s'applique **uniquement** aux tâches avec le produit "AMANA DÉPÔT INTERNATIONAL" et **PAS** aux tâches avec le produit "AMANA DEPOT" (standard).

---

## Configuration des Tâches de Test

Vous devez avoir **2 tâches identiques** sauf pour le champ `produit` :

### Tâche 1 : AVEC International
```
Produit: AMANA DÉPÔT INTERNATIONAL
Famille: GUICHET
Nom: Opération Guichet Dépôt
Unité: COLIS
Base de calcul: 100
```

### Tâche 2 : SANS International
```
Produit: AMANA DEPOT  (ou AMANA DÉPÔT)
Famille: GUICHET
Nom: Opération Guichet Dépôt
Unité: COLIS
Base de calcul: 100
```

---

## Scénario de Test

### Étape 1 : Vérifier les Tâches dans la Base

```sql
SELECT id, nom_tache, produit, famille_uo, unite_mesure
FROM taches
WHERE famille_uo = 'GUICHET'
  AND nom_tache LIKE '%Opération%Guichet%Dépôt%'
  AND unite_mesure = 'COLIS'
ORDER BY produit;
```

Vous devriez voir 2 lignes :
- Une avec `produit = 'AMANA DÉPÔT INTERNATIONAL'`
- Une avec `produit = 'AMANA DEPOT'` (ou variante)

---

### Étape 2 : Configurer la Simulation

1. Ouvrir la page de simulation
2. Sélectionner un centre qui contient ces 2 tâches
3. **Définir `pct_international = 10`** (10%)
4. Lancer la simulation

---

### Étape 3 : Vérifier les Logs Backend

Dans les logs du serveur (`uvicorn`), vous devriez voir :

#### Pour la tâche AVEC International :
```
🌍 [INTL] ✅ MATCH BLOC 2A - Produit normalisé: 'AMANA DÉPÔT INTERNATIONAL'
🌍 [INTL] AMANA DEPOT INTERNATIONAL: famille='GUICHET' nom='Opération Guichet Dépôt' unite='COLIS'
   🌍 [INTL] Applying International Parameter: 10.0% on Volume=XXXX
   🌍 [INTL] NEW VOLUME after International = YYYY
   🌍 [INTL] RETURN: vol_annuel=YYYY, vol_jour=ZZZ, path=...x 10.00% (International)...
```

#### Pour la tâche SANS International :
```
DEBUG AMANA DEPOT (standard): famille='GUICHET' nom='Opération Guichet Dépôt'
   → AMANA DEPOT RETURN: vol_annuel=XXXX, vol_jour=YYYY, path=... (PAS de mention "International")
```

---

### Étape 4 : Vérifier les Résultats

#### Tâche 1 (AVEC International)
- **Volume attendu** : `Volume_Source × 0.10`
- **UI Path** : Doit contenir `"x 10.00% (International)"`

#### Tâche 2 (SANS International)
- **Volume attendu** : `Volume_Source` (sans modification)
- **UI Path** : Ne doit **PAS** contenir "International"

---

## Exemple Concret

### Données de Test
- Volume AMANA.GUICHET.DEPOT = 10,000 colis
- pct_international = 10%

### Résultats Attendus

| Tâche | Produit | Volume Calculé | Formule |
|-------|---------|----------------|---------|
| Tâche 1 | AMANA DÉPÔT INTERNATIONAL | **1,000** | 10,000 × 0.10 |
| Tâche 2 | AMANA DEPOT | **10,000** | 10,000 (pas de modification) |

---

## Cas d'Erreur à Vérifier

### ❌ Erreur 1 : Les 2 tâches ont le même volume
**Problème** : Le paramètre international n'est pas appliqué à la tâche 1
**Cause possible** : Le produit ne contient pas exactement "INTERNATIONAL" (vérifier la casse/accents)

### ❌ Erreur 2 : Les 2 tâches ont un volume réduit
**Problème** : Le paramètre international est appliqué aux 2 tâches
**Cause possible** : Le bloc 2B (AMANA DEPOT standard) ne filtre pas correctement

### ❌ Erreur 3 : La tâche 1 retourne 0 ou N/A
**Problème** : La tâche INTERNATIONAL n'est pas traitée
**Cause possible** : Le produit n'est pas reconnu (vérifier les variantes d'accents)

---

## Commandes SQL Utiles

### Créer une tâche de test INTERNATIONAL
```sql
INSERT INTO taches (nom_tache, produit, famille_uo, unite_mesure, base_calcul, etat)
VALUES ('Opération Guichet Dépôt International', 'AMANA DÉPÔT INTERNATIONAL', 'GUICHET', 'COLIS', 100, 'ACTIF');
```

### Créer une tâche de test STANDARD
```sql
INSERT INTO taches (nom_tache, produit, famille_uo, unite_mesure, base_calcul, etat)
VALUES ('Opération Guichet Dépôt Standard', 'AMANA DEPOT', 'GUICHET', 'COLIS', 100, 'ACTIF');
```

### Mettre à jour une tâche existante vers INTERNATIONAL
```sql
UPDATE taches 
SET produit = 'AMANA DÉPÔT INTERNATIONAL'
WHERE id = <ID_DE_LA_TACHE>;
```

---

## Checklist de Validation

- [ ] 2 tâches créées avec les bons produits
- [ ] Simulation lancée avec `pct_international = 10`
- [ ] Logs backend affichent "MATCH BLOC 2A" pour la tâche INTERNATIONAL
- [ ] Logs backend affichent "DEPOT (standard)" pour la tâche DEPOT
- [ ] Volume tâche 1 = Volume tâche 2 × 0.10
- [ ] UI Path tâche 1 contient "International"
- [ ] UI Path tâche 2 ne contient PAS "International"

---

## Support

Si les tests échouent, vérifiez :

1. ✅ Les produits dans la base de données (accents, casse)
2. ✅ Les logs backend pour voir quel bloc est matché
3. ✅ La valeur de `pct_international` dans le payload de simulation
4. ✅ Les conditions de la tâche (Famille, Nom, Unité)

---

**Date** : 2026-02-03
**Version** : 2.1
