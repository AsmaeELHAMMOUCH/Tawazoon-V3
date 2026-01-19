# 📊 Import Multi-Centres - Documentation Finale

## 🎯 Principe de Fonctionnement

Le système d'import permet de charger les volumes de **plusieurs centres** simultanément via un fichier Excel.

### ⚠️ Règle Importante

**Les centres doivent EXISTER dans la base de données.**

- ✅ **Centre existant** → Volumes importés
- ❌ **Centre inexistant** → IGNORÉ (pas de création automatique)

---

## 📋 Structure du Template

### Format Simplifié

```
Nom du Centre: Centre Casablanca

A) FLUX ARRIVÉE
┌─────────────┬────────┬────────┬─────┬───────┬──────┐
│ FLUX\SEGMENT│ GLOBAL │ PART.  │ PRO │ DIST. │ AXES │
├─────────────┼────────┼────────┼─────┼───────┼──────┤
│ Amana       │   100  │   50   │  30 │   15  │   5  │
│ CO          │   200  │  100   │  60 │   30  │  10  │
│ CR          │    50  │   25   │  15 │    8  │   2  │
│ E-Barkia    │    30  │   15   │  10 │    4  │   1  │
│ LRH         │    20  │   10   │   6 │    3  │   1  │
└─────────────┴────────┴────────┴─────┴───────┴──────┘

B) GUICHET
┌───────────┬───────┬────────┐
│ OPÉRATION │ DÉPÔT │ RÉCUP. │
├───────────┼───────┼────────┤
│ Volume    │  150  │   80   │
└───────────┴───────┴────────┘

C) FLUX DÉPART
┌─────────────┬────────┬────────┬─────┬───────┬──────┐
│ FLUX\SEGMENT│ GLOBAL │ PART.  │ PRO │ DIST. │ AXES │
├─────────────┼────────┼────────┼─────┼───────┼──────┤
│ Amana       │    90  │   45   │  27 │   13  │   5  │
│ CO          │   180  │   90   │  54 │   27  │   9  │
│ CR          │    45  │   22   │  13 │    7  │   3  │
│ E-Barkia    │    25  │   12   │   8 │    4  │   1  │
│ LRH         │    15  │    8   │   5 │    2  │   0  │
└─────────────┴────────┴────────┴─────┴───────┴──────┘

=== CENTRE 2 (Optionnel) ===
Nom du Centre: Centre Rabat
[Même structure A, B, C]
```

---

## 🔄 Workflow d'Import

### Étape 1 : Préparation
1. Télécharger le modèle via le bouton "Modèle"
2. Ouvrir le fichier Excel
3. Vérifier la liste des centres existants dans votre base

### Étape 2 : Remplissage
1. **Premier centre** :
   - Saisir le nom EXACT du centre (ex: "Centre Casablanca")
   - Remplir les matrices de volumes
   
2. **Centres supplémentaires** (optionnel) :
   - Copier les sections A, B, C
   - Coller plus bas
   - Changer le nom du centre
   - Remplir les nouvelles matrices

### Étape 3 : Import
1. Cliquer sur "Importer"
2. Sélectionner le fichier rempli
3. Vérifier la prévisualisation :
   ```
   ✓ Prêt à importer
   3 centre(s) détecté(s)
     ├─ Centre Casablanca (25 volumes)
     ├─ Centre Rabat (30 volumes)
     └─ Centre Marrakech (20 volumes)
   ```
4. Valider l'import

### Étape 4 : Traitement Backend
Le backend va :
1. Recevoir la liste des centres
2. **Vérifier l'existence** de chaque centre par son nom
3. **Importer** uniquement les centres existants
4. **Ignorer** les centres non trouvés
5. Retourner un rapport :
   ```json
   {
       "imported": ["Centre Casablanca", "Centre Rabat"],
       "ignored": ["Centre Inconnu"],
       "total_volumes": 55
   }
   ```

---

## ✅ Règles de Validation

### Côté Frontend (Parsing)
- ✅ Au moins un centre détecté
- ✅ Tous les centres ont un nom
- ✅ Au moins un volume par centre
- ✅ Format matriciel correct

### Côté Backend (Import)
- ✅ Centre existe dans la base → Import
- ❌ Centre inexistant → Ignoré
- ✅ Nom exact (case-sensitive)
- ✅ Volumes valides (> 0)

---

## 📝 Exemples

### Exemple 1 : Import Réussi
**Fichier Excel** :
```
Nom du Centre: Centre Casablanca
[Volumes...]

Nom du Centre: Centre Rabat
[Volumes...]
```

**Résultat** :
- ✅ Centre Casablanca : 25 volumes importés
- ✅ Centre Rabat : 30 volumes importés
- **Total** : 2 centres, 55 volumes

### Exemple 2 : Centre Inexistant
**Fichier Excel** :
```
Nom du Centre: Centre Casablanca
[Volumes...]

Nom du Centre: Centre Inconnu
[Volumes...]
```

**Résultat** :
- ✅ Centre Casablanca : 25 volumes importés
- ⚠️ Centre Inconnu : IGNORÉ (n'existe pas)
- **Total** : 1 centre, 25 volumes

### Exemple 3 : Erreur de Nom
**Fichier Excel** :
```
Nom du Centre: centre casablanca  ❌ (minuscules)
[Volumes...]
```

**Résultat** :
- ❌ Aucun centre importé
- **Raison** : Le nom doit être EXACTEMENT "Centre Casablanca"

---

## 🎨 Mapping des Données

### Structure Parsée (Frontend)
```javascript
[
    {
        nom_centre: "Centre Casablanca",
        volumes: [
            {
                flux_id: 1,      // Amana
                sens_id: 1,      // Arrivée
                segment_id: 1,   // GLOBAL
                volume: 100
            },
            // ... autres volumes
        ]
    },
    {
        nom_centre: "Centre Rabat",
        volumes: [...]
    }
]
```

### Envoi au Backend
```javascript
POST /api/volumes/import-bulk
{
    "centres": [
        {
            "nom_centre": "Centre Casablanca",
            "volumes": [...]
        },
        {
            "nom_centre": "Centre Rabat",
            "volumes": [...]
        }
    ]
}
```

### Traitement Backend
```python
for centre_data in request.centres:
    # Chercher le centre par nom
    centre = db.query(Centre).filter(
        Centre.label == centre_data.nom_centre
    ).first()
    
    if centre:
        # Importer les volumes
        for vol in centre_data.volumes:
            import_volume(centre.id, vol)
    else:
        # Ignorer et logger
        logger.warning(f"Centre ignoré: {centre_data.nom_centre}")
```

---

## ⚠️ Points d'Attention

### Orthographe des Noms
- ❌ "centre casablanca"
- ❌ "CENTRE CASABLANCA"
- ❌ "Centre casablanca"
- ✅ "Centre Casablanca" (exactement comme en base)

### Vérification Préalable
Avant l'import, vérifier la liste des centres :
```sql
SELECT label FROM centres ORDER BY label;
```

### Gestion des Erreurs
- Centres ignorés → Pas d'erreur, juste un warning
- Aucun centre valide → Erreur
- Format incorrect → Erreur de parsing

---

## 🔧 Maintenance

### Ajouter un Nouveau Centre
1. Créer le centre en base de données
2. Le centre devient immédiatement importable
3. Utiliser le nom exact dans le fichier Excel

### Renommer un Centre
1. Mettre à jour le nom en base
2. Utiliser le nouveau nom dans les imports futurs
3. Les anciens imports avec l'ancien nom seront ignorés

---

## 📊 Statistiques d'Import

Après chaque import, le système affiche :
- Nombre de centres détectés
- Nombre de centres importés
- Nombre de centres ignorés
- Total de volumes importés
- Liste des centres ignorés (si applicable)

---

**© 2026 TAWAZOON RH - Barid Al-Maghrib**
