# 🔍 RÉSULTATS DU TEST DE COVERAGE

## 📅 Date
**31 décembre 2025 - 12:30**

---

## 📊 Résultats du test

### Endpoint testé
```
GET http://localhost:8000/api/simulation-dd/coverage/8284
```

### Statistiques
- **Taux de couverture :** **63.64%** ❌
- **Tâches totales :** 11
- **Tâches avec règle :** 7 ✅
- **Tâches sans règle :** 4 ❌

---

## ❌ Problème identifié

### Tâches sans règle de mapping
Les 4 tâches suivantes n'ont pas de règle :

1. **Expédition** - Flux: CO, Sens: DEPART, Segment: PART
2. **Récupération facture MAG** - Flux: CO, Sens: DEPART, Segment: PART
3. **Passation sur Registre** - Flux: CO, Sens: DEPART, Segment: PART
4. **Edition PART** - Flux: CO, Sens: DEPART, Segment: PART

**Toutes les tâches manquantes ont la même combinaison : CO / DEPART / PART**

---

## 🔍 Analyse du problème

### Cause probable
Le code de segment dans la base de données est probablement **"PART"** et non **"PARTICULIER"**.

Le script `init_mapping_rules.py` cherche à créer des règles avec le code **"PARTICULIER"**, mais si la base contient **"PART"**, les règles ne seront pas créées.

### Vérification nécessaire
```sql
SELECT id, code, libelle FROM dbo.volume_segments;
```

**Résultat attendu :**
- Si le code est "PART" → Le script doit utiliser "PART"
- Si le code est "PARTICULIER" → Le script est correct

---

## ✅ Solution

### Option 1 : Adapter le script aux codes existants

Modifier `scripts/init_mapping_rules.py` ligne 76-82 :

```python
segment_ids = {
    "GLOBAL": get_or_create_segment(db, "GLOBAL", "Global"),
    "PART": get_or_create_segment(db, "PART", "Particulier"),  # ← Utiliser PART
    "PRO": get_or_create_segment(db, "PRO", "Professionnel"),
    "DIST": get_or_create_segment(db, "DIST", "Distribution"),
    "AXES": get_or_create_segment(db, "AXES", "Axes"),
}

segment_to_field = {
    "GLOBAL": "global_",
    "PART": "part",  # ← Utiliser PART
    "PRO": "pro",
    "DIST": "dist",
    "AXES": "axes",
}
```

### Option 2 : Normaliser les codes dans la base

```sql
UPDATE dbo.volume_segments SET code = 'PARTICULIER' WHERE code = 'PART';
UPDATE dbo.volume_segments SET code = 'PRO_B2B' WHERE code = 'PRO';
UPDATE dbo.volume_segments SET code = 'DISTRIBUTION' WHERE code = 'DIST';
```

---

## 🚀 Actions à effectuer

### 1. Vérifier les codes de segments
```bash
python scripts/debug_segments.py
```

### 2. Adapter le script selon les codes trouvés

Si les codes sont PART, PRO, DIST :
- Modifier `init_mapping_rules.py` pour utiliser ces codes

Si les codes sont PARTICULIER, PRO_B2B, DISTRIBUTION :
- Le script est déjà correct

### 3. Réexécuter l'initialisation
```bash
python scripts/init_mapping_rules.py
```

### 4. Retester la couverture
```bash
curl http://localhost:8000/api/simulation-dd/coverage/8284
```

**Résultat attendu :** Taux de couverture = **100%**

---

## 📋 UI Paths requis

Les champs suivants sont nécessaires dans le payload UI :
- ✅ `flux_arrivee.co.global_`
- ✅ `flux_arrivee.cr.global_`
- ❌ `flux_depart.co.part` ← **MANQUANT DANS LES RÈGLES**
- ✅ `flux_depart.cr.global_`
- ✅ `guichet.depot`
- ✅ `guichet.recup`

---

## 💡 Recommandations

### Immédiat
1. ✅ Vérifier les codes de segments dans la base
2. ✅ Adapter le script `init_mapping_rules.py`
3. ✅ Réexécuter l'initialisation
4. ✅ Retester la couverture

### Court terme
1. Ajouter des tests unitaires pour vérifier la création des règles
2. Ajouter une validation des codes de référentiels au démarrage
3. Créer un script de migration pour normaliser les codes

---

## 🎯 Objectif

**Atteindre 100% de couverture** en créant la règle manquante :
- Flux: CO
- Sens: DEPART
- Segment: PART (ou PARTICULIER selon la base)
- UI Path: `flux_depart.co.part`

---

## 📝 Conclusion

Le test de coverage a révélé un **problème de cohérence des codes** entre le script d'initialisation et la base de données.

**Prochaine étape :** Vérifier les codes réels dans la base et adapter le script en conséquence.

**Une fois corrigé, le taux de couverture devrait atteindre 100% ! 🎯**
