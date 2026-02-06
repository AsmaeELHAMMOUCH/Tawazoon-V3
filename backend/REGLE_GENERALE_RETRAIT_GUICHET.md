# 📋 RÈGLE GÉNÉRALE: Tâches de Retrait au Guichet

## 🎯 Règle implémentée

### Conditions d'application

La division par 5 s'applique **automatiquement** pour toutes les tâches qui répondent à ces critères:

1. **Produit**: `CR Arrivé` OU `AMANA REÇU`
2. **Famille**: `Guichet`
3. **Nom de tâche** contient l'un de ces mots-clés:
   - "RETRAIT"
   - "RÉCUPÉRATION"
   - "RECUPERATION"
   - "RECUP"

### Exemples de tâches concernées

✅ **CR Arrivé / Guichet**:
- "Opération guichet : Retrait CR"
- "Récupération CR au guichet"
- "Retrait courrier recommandé"

✅ **AMANA REÇU / Guichet**:
- "Opération guichet : Retrait colis"
- "Récupération colis AMANA"
- "Retrait AMANA au guichet"

---

## 📐 Formule générale

### Pour CR Arrivé / Guichet - Retrait
```
Volume = CR.ARRIVEE.GLOBAL × (1 - %Axes_Arrivée) / 5
```

### Pour AMANA REÇU / Guichet - Retrait
```
Volume = AMANA.ARRIVEE.AGREGAT × (1 - %Axes_Arrivée) / 5
```

---

## 💻 Code implémenté

### Détection automatique
```python
# Détection des tâches de Retrait/Récupération
is_retrait = any(kw in tache.nom_tache.upper() for kw in ["RETRAIT", "RÉCUPÉRATION", "RECUPERATION", "RECUP"])

# Application de la division par 5 pour les tâches de Retrait
if is_retrait:
    vol_source = vol_source_base / 5.0
    ui_path += " / 5 (Retrait)"
else:
    vol_source = vol_source_base
```

### Localisation dans le code

**AMANA REÇU / Guichet**:
- Fichier: `backend/app/services/simulation_data_driven.py`
- Lignes: 316-322
- Bloc: AMANA REÇU - BRANCHE 5 : Guichet

**CR Arrivé / Guichet**:
- Fichier: `backend/app/services/simulation_data_driven.py`
- Lignes: 1173-1179
- Bloc: CR ARRIVÉ - BRANCHE 4 : Guichet

---

## 📊 Exemple concret: "Opération guichet : Retrait CR"

### Données d'entrée
- **Produit**: CR Arrivé
- **Famille**: Guichet
- **Nom**: "Opération guichet : Retrait CR"
- **CR ARRIVÉE GLOBAL**: 22335
- **% Axes Arrivée**: 30%

### Calcul étape par étape

#### Étape 1: Vérification des conditions
```
Produit = "CR Arrivé" ✅
Famille = "Guichet" ✅
"RETRAIT" in "Opération guichet : Retrait CR".upper() ✅
→ Division par 5 applicable
```

#### Étape 2: Calcul du volume de base
```
vol_aggregat = 22335 (CR.ARRIVEE.GLOBAL)
pct_axes = 30% = 0.30
facteur_local = 1.0 - 0.30 = 0.70

vol_source_base = 22335 × 0.70 = 15634.5
```

#### Étape 3: Application de la division par 5
```
vol_source = 15634.5 / 5.0 = 3126.9
```

#### Étape 4: Volume annuel et journalier
```
volume_annuel = 3126.9
volume_jour = 3126.9 / 264 = 11.84 courriers/jour
```

#### Étape 5: Formule affichée
```
CR.ARRIVEE.GLOBAL x 70.00%(Local) / 5 (Retrait) [Base 100%]
```

---

## 🧪 Tests de validation

### Test 1: CR Arrivé - Retrait CR
**Input**:
- CR ARRIVÉE GLOBAL = 22335
- % Axes = 30%
- Tâche: "Opération guichet : Retrait CR"

**Output attendu**:
- Volume/jour = **11.84 courriers/jour**
- Formule: `CR.ARRIVEE.GLOBAL x 70.00%(Local) / 5 (Retrait) [Base 100%]`

### Test 2: AMANA REÇU - Retrait colis
**Input**:
- AMANA ARRIVÉE AGREGAT = 109917
- % Axes = 30%
- Tâche: "Opération guichet : Retrait colis"

**Output attendu**:
- Volume/jour = **58.29 colis/jour**
- Formule: `AMANA.ARR.AGR(Fallback) x 70.00%(1-Ax) / 5 (Retrait) [Base 100%]`

### Test 3: Tâche NON-Retrait (contrôle)
**Input**:
- CR ARRIVÉE GLOBAL = 22335
- % Axes = 30%
- Tâche: "Opération guichet : Autre tâche"

**Output attendu**:
- Volume/jour = **59.22 courriers/jour** (PAS de division par 5)
- Formule: `CR.ARRIVEE.GLOBAL x 70.00%(Local) [Base 100%]`

---

## ✅ Avantages de cette approche

### 1. Générique
- S'applique automatiquement à toutes les tâches de Retrait
- Pas besoin de coder chaque tâche individuellement

### 2. Robuste
- Détection basée sur des mots-clés multiples
- Fonctionne même avec des variations de nom

### 3. Maintenable
- Code centralisé (2 blocs seulement)
- Facile à modifier si la règle change

### 4. Traçable
- Formule affichée indique clairement "/ 5 (Retrait)"
- Facile de vérifier dans les logs

---

## 📝 Notes importantes

### Mots-clés de détection
La détection est **case-insensitive** et cherche ces mots dans le nom de la tâche:
- RETRAIT
- RÉCUPÉRATION
- RECUPERATION
- RECUP

### Produits concernés
Cette règle s'applique uniquement pour:
- **CR Arrivé** (Courrier Recommandé)
- **AMANA REÇU** (Colis AMANA)

### Famille concernée
Uniquement pour la famille **Guichet**.

---

**Date**: 2026-01-20  
**Statut**: ✅ ACTIF  
**Type**: Règle générale automatique  
**Division**: Fixe par 5 pour tous les Retraits
