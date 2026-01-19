# 📊 Guide d'Utilisation du Template d'Import des Volumes

## 📁 Fichier Généré
`Template_Import_Volumes_TAWAZOON_RH_YYYYMMDD.xlsx`

---

## 🎯 Objectif

Ce template Excel permet d'importer des volumes de travail dans l'application TAWAZOON RH à deux niveaux :
1. **Niveau Intervenant (Centre)** : Volumes globaux par centre
2. **Niveau Centre (Détaillé)** : Volumes détaillés par poste et par flux/sens/segment

---

## 📋 Structure du Fichier

Le fichier contient **3 feuilles** :

### 1️⃣ Feuille "Import Niveau Intervenant"

**Utilisation** : Saisir les volumes globaux pour chaque centre

**Colonnes** :
- `Centre ID` : Identifiant unique du centre (obligatoire)
- `Nom du Centre` : Nom du centre (obligatoire)

**Flux Arrivée** :
- `Amana Arrivée` : Volume Amana en arrivée
- `CO Arrivée` : Volume Courrier Ordinaire en arrivée
- `CR Arrivée` : Volume Courrier Recommandé en arrivée
- `E-Barkia Arrivée` : Volume E-Barkia en arrivée
- `LRH Arrivée` : Volume LRH en arrivée

**Guichet** :
- `Guichet Dépôt` : Volume des opérations de dépôt
- `Guichet Récup` : Volume des opérations de récupération

**Flux Départ** :
- `Amana Départ` : Volume Amana en départ
- `CO Départ` : Volume Courrier Ordinaire en départ
- `CR Départ` : Volume Courrier Recommandé en départ
- `E-Barkia Départ` : Volume E-Barkia en départ
- `LRH Départ` : Volume LRH en départ

**Autres** :
- `Sacs` : Volume de sacs
- `Colis` : Volume de colis

**Exemple** :
```
Centre ID | Nom du Centre      | Amana Arr | CO Arr | ... | Sacs | Colis
1         | Centre Casablanca  | 100       | 200    | ... | 50   | 30
2         | Centre Rabat       | 120       | 220    | ... | 60   | 35
```

---

### 2️⃣ Feuille "Import Niveau Centre"

**Utilisation** : Saisir les volumes détaillés par poste avec segmentation

**Colonnes** :
- `Centre ID` : Identifiant du centre (obligatoire)
- `Centre Poste ID` : Identifiant du poste (obligatoire)
- `Nom du Centre` : Nom du centre
- `Nom du Poste` : Nom du poste

**Flux Arrivée - Segments** :
Pour chaque flux (Amana, CO, CR, E-Barkia, LRH), 5 colonnes de segmentation :
- `[Flux] Arr GLOBAL` : Volume global
- `[Flux] Arr PART` : Volume particuliers
- `[Flux] Arr PRO` : Volume professionnels
- `[Flux] Arr DIST` : Volume distribution
- `[Flux] Arr AXES` : Volume axes stratégiques

**Guichet** :
- `Guichet DÉPÔT` : Volume dépôt
- `Guichet RÉCUP` : Volume récupération

**Flux Départ - Segments** :
Même structure que Flux Arrivée pour le départ

**Exemple** :
```
Centre ID | Poste ID | Centre        | Poste      | Amana Arr GLOBAL | Amana Arr PART | ...
1         | 101      | Casablanca    | Guichetier | 20               | 15             | ...
1         | 102      | Casablanca    | Trieur     | 30               | 20             | ...
```

---

### 3️⃣ Feuille "Guide & Mapping"

**Contenu** : Tables de référence pour les IDs

#### Table 1 : FLUX DISPONIBLES
| ID | Code    | Nom                  | Description           |
|----|---------|----------------------|-----------------------|
| 1  | AMANA   | Amana                | Colis Amana           |
| 2  | CO      | Courrier Ordinaire   | Courrier standard     |
| 3  | CR      | Courrier Recommandé  | Courrier avec accusé  |
| 4  | EBARKIA | E-Barkia             | Service E-Barkia      |
| 5  | LRH     | LRH                  | Lettres recommandées  |

#### Table 2 : SENS DE FLUX
| ID | Code    | Nom     | Description      |
|----|---------|---------|------------------|
| 1  | ARRIVEE | Arrivée | Flux entrant     |
| 2  | GUICHET | Guichet | Opérations guichet |
| 3  | DEPART  | Départ  | Flux sortant     |

#### Table 3 : SEGMENTS
| ID | Code   | Nom            | Description                    |
|----|--------|----------------|--------------------------------|
| 1  | GLOBAL | Global         | Volume global non segmenté     |
| 2  | PART   | Particuliers   | Segment particuliers           |
| 3  | PRO    | Professionnels | Segment professionnels         |
| 4  | DIST   | Distribution   | Segment distribution           |
| 5  | AXES   | Axes           | Segment axes stratégiques      |
| 6  | DEPOT  | Dépôt          | Opération de dépôt (guichet)   |
| 7  | RECUP  | Récupération   | Opération de récupération      |

---

## 📝 Instructions de Remplissage

### ✅ Bonnes Pratiques

1. **Ne pas modifier les en-têtes** : Les noms de colonnes doivent rester exactement comme dans le template
2. **Respecter les types de données** :
   - IDs : Nombres entiers
   - Volumes : Nombres entiers ou décimaux
   - Noms : Texte
3. **Cellules vides** : Laisser vide = volume à 0
4. **Cohérence des IDs** : Utiliser les mêmes IDs que dans la base de données
5. **Pas de formules** : Saisir uniquement des valeurs brutes

### ⚠️ Erreurs à Éviter

- ❌ Modifier l'ordre des colonnes
- ❌ Supprimer des colonnes
- ❌ Ajouter des colonnes personnalisées
- ❌ Utiliser des caractères spéciaux dans les noms
- ❌ Laisser des lignes vides entre les données
- ❌ Dupliquer des IDs (Centre ID + Poste ID doit être unique)

---

## 🔄 Processus d'Import

### Étape 1 : Préparation
1. Ouvrir le template Excel
2. Choisir la feuille appropriée (Intervenant ou Centre)
3. Remplir les données selon le format

### Étape 2 : Validation
1. Vérifier que tous les IDs sont corrects
2. Vérifier qu'il n'y a pas de doublons
3. Vérifier que les volumes sont des nombres valides

### Étape 3 : Import dans l'Application
1. Se connecter à TAWAZOON RH
2. Aller dans la page de simulation (Vue Nationale ou Vue Direction)
3. Cliquer sur le bouton "Importer"
4. Sélectionner le fichier Excel rempli
5. Valider l'import

### Étape 4 : Vérification
1. Vérifier que les données sont correctement importées
2. Lancer une simulation pour tester
3. Vérifier les résultats

---

## 🎨 Mapping avec l'Interface UI

### Vue Intervenant / Vue Centre

L'interface affiche les volumes dans une structure matricielle :

```
┌─────────────────────────────────────────────────────┐
│ FLUX ARRIVÉE                                        │
├──────────┬────────┬──────┬─────┬──────┬──────┬─────┤
│ Flux     │ GLOBAL │ PART │ PRO │ DIST │ AXES │     │
├──────────┼────────┼──────┼─────┼──────┼──────┤     │
│ Amana    │   20   │  15  │ 10  │  5   │  0   │     │
│ CO       │   40   │  30  │ 20  │  10  │  0   │     │
│ CR       │   10   │   8  │  5  │  2   │  0   │     │
│ E-Barkia │    5   │   4  │  2  │  1   │  0   │     │
│ LRH      │    8   │   6  │  4  │  2   │  0   │     │
└──────────┴────────┴──────┴─────┴──────┴──────┴─────┘

┌─────────────────────────────┐
│ GUICHET                     │
├──────────┬────────┬─────────┤
│          │ DÉPÔT  │ RÉCUP   │
├──────────┼────────┼─────────┤
│ Volume   │   50   │   30    │
└──────────┴────────┴─────────┘

┌─────────────────────────────────────────────────────┐
│ FLUX DÉPART                                         │
├──────────┬────────┬──────┬─────┬──────┬──────┬─────┤
│ Flux     │ GLOBAL │ PART │ PRO │ DIST │ AXES │     │
├──────────┼────────┼──────┼─────┼──────┼──────┤     │
│ Amana    │   18   │  12  │  8  │  4   │  0   │     │
│ CO       │   35   │  25  │ 15  │  8   │  0   │     │
│ ...      │   ...  │  ... │ ... │  ... │  ... │     │
└──────────┴────────┴──────┴─────┴──────┴──────┴─────┘
```

**Correspondance Excel ↔ UI** :
- Chaque cellule de la matrice UI correspond à une colonne dans Excel
- Exemple : `Amana Arr GLOBAL` = cellule (Amana, GLOBAL) dans la section Flux Arrivée

---

## 🔧 Génération du Template

Pour régénérer le template avec une date actuelle :

```bash
cd backend
python scripts/generate_import_template.py
```

Le fichier sera créé dans le dossier `backend/` avec le nom :
`Template_Import_Volumes_TAWAZOON_RH_YYYYMMDD.xlsx`

---

## 📞 Support

En cas de problème :
1. Vérifier que le format du fichier est correct
2. Consulter les exemples dans le template
3. Vérifier les IDs dans la feuille "Guide & Mapping"
4. Contacter l'équipe technique TAWAZOON RH

---

## 📅 Historique des Versions

| Version | Date       | Modifications                                    |
|---------|------------|--------------------------------------------------|
| 1.0     | 2026-01-07 | Création initiale du template                    |
|         |            | - Support Niveau Intervenant et Niveau Centre   |
|         |            | - Guide de mapping intégré                       |
|         |            | - Structure Flux/Sens/Segment complète           |

---

**© 2026 TAWAZOON RH - Barid Al-Maghrib**
