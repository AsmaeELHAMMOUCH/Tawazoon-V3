# 📋 Guide des Logs de Simulation - Page Intervenant

## ⚠️ IMPORTANT: Endpoint Actuellement Utilisé

**L'application utilise actuellement l'ANCIEN endpoint** `/api/simulate` et non le nouveau endpoint data-driven `/api/simulation-dd/intervenant`.

### Endpoints Disponibles

| Endpoint | Status | Logs | Fichier |
|----------|--------|------|---------|
| `/api/simulate` | ✅ **UTILISÉ ACTUELLEMENT** | STEP 1-3 | `backend/app/api/simulation.py` |
| `/api/simulation-dd/intervenant` | 🔧 Disponible mais non utilisé | STEP 1-10 | `backend/app/api/simulation_data_driven.py` |

**Conséquence**: Les logs détaillés STEP 4-10 du moteur data-driven ne s'afficheront PAS tant que l'application n'est pas migrée vers le nouvel endpoint.

---

## Vue d'ensemble

Des logs détaillés et numérotés ont été ajoutés pour tracer chaque étape de la simulation intervenant, du frontend au backend. Ces logs apparaissent dans le terminal et permettent de suivre le flux complet de l'exécution.

## 🎯 Architecture des Logs

### Frontend (Console Browser + Terminal)
Les logs frontend apparaissent dans la console du navigateur et sont préfixés par `[FRONTEND - STEP X]`

### Backend (Terminal)
Les logs backend apparaissent dans le terminal où tourne uvicorn et sont préfixés par `[BACKEND - STEP X]`

---

## 📊 Flux Complet des Logs (Endpoint Actuel: /api/simulate)

### 🚀 FRONTEND - Étapes 1-3

#### **STEP 1** - Préparation de la simulation
```
🚀 [FRONTEND - STEP 1] Préparation de la simulation intervenant
   Centre/Poste ID: <id>
   Volumes: <objet volumes>
   Paramètres: <params>
   Paramètres finaux: <params avec defaults>
```
**Fichier**: `frontend/src/services/simulationService.js`  
**Quoi**: Préparation des données avant l'envoi au backend

#### **STEP 2** - Envoi de la requête API
```
📡 [FRONTEND - STEP 2] Envoi de la requête API...
   URL: http://localhost:8000/api/simulation-dd/intervenant/<id>
```
**Fichier**: `frontend/src/services/simulationService.js`  
**Quoi**: Envoi de la requête POST au backend

#### **STEP 3** - Réception de la réponse
```
✅ [FRONTEND - STEP 3] Réponse reçue du backend
   Status: 200
   ETP: <valeur>
   Total heures: <valeur>
   Nombre de tâches: <nombre>
```
**Fichier**: `frontend/src/services/simulationService.js`  
**Quoi**: Réception et affichage des résultats

---

### 🎯 BACKEND - Étapes 1-10

#### **STEP 1** - Réception de la requête API
```
🎯 [BACKEND - STEP 1] API INTERVENANT - Requête reçue
   Centre/Poste ID: <id>
   Productivité: <valeur>%
   Heures/jour: <valeur>h
   Idle minutes: <valeur> min
   Debug: <true/false>
   Volumes UI reçus: <objet>
```
**Fichier**: `backend/app/api/simulation_data_driven.py`  
**Fonction**: `simulate_intervenant_data_driven()`  
**Quoi**: Point d'entrée de l'API, réception de la requête

#### **STEP 2** - Vérification du centre/poste
```
📋 [BACKEND - STEP 2] Vérification du centre/poste ID=<id>
✅ [BACKEND - STEP 2] Centre/Poste trouvé: <nom centre> - <nom poste>
```
**Fichier**: `backend/app/api/simulation_data_driven.py`  
**Quoi**: Validation que le centre/poste existe en base de données

#### **STEP 3** - Appel du service de calcul
```
🔄 [BACKEND - STEP 3] Appel du service de calcul data-driven...
```
**Fichier**: `backend/app/api/simulation_data_driven.py`  
**Quoi**: Délégation au service de simulation

#### **STEP 4** - Initialisation du moteur
```
🔧 [BACKEND - STEP 4] Initialisation du moteur data-driven...
✅ [BACKEND - STEP 4] Moteur data-driven initialisé
```
**Fichier**: `backend/app/services/simulation_data_driven.py`  
**Fonction**: `calculer_simulation_data_driven()`  
**Quoi**: Création de l'instance du moteur data-driven

#### **STEP 5** - Récupération des tâches
```
📋 [BACKEND - STEP 5] Récupération des tâches pour centre_poste_id=<id>...
✅ [BACKEND - STEP 5] <nombre> tâches récupérées
```
**Fichier**: `backend/app/services/simulation_data_driven.py`  
**Quoi**: Chargement de toutes les tâches du centre/poste depuis la DB

#### **STEP 6** - Traitement des tâches
```
🔄 [BACKEND - STEP 6] Traitement des tâches...
   [BACKEND - STEP 6.1] Traitement tâche 1/<total>: <nom tâche>...
   [BACKEND - STEP 6.10] Traitement tâche 10/<total>: <nom tâche>...
   [BACKEND - STEP 6.20] Traitement tâche 20/<total>: <nom tâche>...
```
**Fichier**: `backend/app/services/simulation_data_driven.py`  
**Quoi**: Boucle de traitement de chaque tâche (affiche tous les 10 tâches)

#### **STEP 7** - Calcul de l'ETP
```
📊 [BACKEND - STEP 7] Calcul de l'ETP...
   Tâches traitées: <nombre>
   Tâches ignorées: <nombre>
   Total heures calculées: <valeur>h
   Heures nettes/jour: <valeur>h
   ETP calculé: <valeur>
```
**Fichier**: `backend/app/services/simulation_data_driven.py`  
**Quoi**: Calcul de l'ETP (Équivalent Temps Plein) basé sur les heures totales

#### **STEP 8** - Arrondi de l'ETP
```
🔢 [BACKEND - STEP 8] Arrondi de l'ETP...
   ETP arrondi: <valeur>
```
**Fichier**: `backend/app/services/simulation_data_driven.py`  
**Quoi**: Application de la règle métier d'arrondi (≤0.1 → 0, sinon arrondi au plus proche)

#### **STEP 9** - Construction de la réponse
```
✅ [BACKEND - STEP 9] Construction de la réponse...
   Nombre de tâches détaillées: <nombre>
   Total heures: <valeur>h
   ETP final: <valeur>
```
**Fichier**: `backend/app/services/simulation_data_driven.py`  
**Quoi**: Création de l'objet SimulationResponse à retourner

#### **STEP 10** - Résultat final
```
✅ [BACKEND - STEP 10] Résultat final calculé:
   ETP: <valeur>
   Heures totales: <valeur>h
   Nombre de tâches: <nombre>
```
**Fichier**: `backend/app/api/simulation_data_driven.py`  
**Quoi**: Retour au contrôleur API avec les résultats finaux

---

## 🔍 Comment Utiliser Ces Logs

### 1. **Lancer le backend en mode verbose**
```bash
cd backend
uvicorn app.main:app --port 8001 --reload
```

### 2. **Ouvrir la console du navigateur**
- Chrome/Edge: F12 → Console
- Firefox: F12 → Console

### 3. **Lancer une simulation**
- Sélectionner Région, Centre, Poste
- Saisir des volumes
- Cliquer sur "Simuler"

### 4. **Observer les logs**
- **Console navigateur**: STEP 1-3 (Frontend)
- **Terminal backend**: STEP 1-10 (Backend)

---

## 🐛 Debugging avec les Logs

### Problème: Pas de résultat de simulation

**Vérifier**:
1. **STEP 1-2 (Frontend)**: Les volumes sont-ils bien envoyés ?
2. **STEP 1 (Backend)**: La requête arrive-t-elle au backend ?
3. **STEP 2 (Backend)**: Le centre/poste existe-t-il ?
4. **STEP 5 (Backend)**: Y a-t-il des tâches récupérées ?
5. **STEP 6 (Backend)**: Les tâches sont-elles traitées ou ignorées ?
6. **STEP 7 (Backend)**: Le total d'heures est-il > 0 ?

### Problème: ETP = 0

**Vérifier**:
1. **STEP 7**: Total heures calculées (doit être > 0)
2. **STEP 7**: Heures nettes/jour (doit être > 0)
3. **STEP 6**: Nombre de tâches traitées vs ignorées
4. **STEP 8**: Règle d'arrondi (si ETP ≤ 0.1 → 0)

### Problème: Erreur 500

**Vérifier**:
1. **STEP 2 (Backend)**: Centre/Poste trouvé ?
2. **Terminal backend**: Stack trace de l'erreur
3. **STEP 4-5**: Erreur lors de l'initialisation ou récupération ?

---

## 📝 Exemple de Flux Complet

```
# FRONTEND
🚀 [FRONTEND - STEP 1] Préparation de la simulation intervenant
   Centre/Poste ID: 123
   Volumes: {...}
   Paramètres finaux: {productivite: 100, heures_par_jour: 8, ...}

📡 [FRONTEND - STEP 2] Envoi de la requête API...
   URL: http://localhost:8000/api/simulation-dd/intervenant/123

# BACKEND
🎯 [BACKEND - STEP 1] API INTERVENANT - Requête reçue
   Centre/Poste ID: 123
   Productivité: 100%
   ...

📋 [BACKEND - STEP 2] Vérification du centre/poste ID=123
✅ [BACKEND - STEP 2] Centre/Poste trouvé: Fès - Agent Guichet

🔄 [BACKEND - STEP 3] Appel du service de calcul data-driven...

🔧 [BACKEND - STEP 4] Initialisation du moteur data-driven...
✅ [BACKEND - STEP 4] Moteur data-driven initialisé

📋 [BACKEND - STEP 5] Récupération des tâches pour centre_poste_id=123...
✅ [BACKEND - STEP 5] 45 tâches récupérées

🔄 [BACKEND - STEP 6] Traitement des tâches...
   [BACKEND - STEP 6.1] Traitement tâche 1/45: Dépôt colis AMANA...
   [BACKEND - STEP 6.10] Traitement tâche 10/45: Tri courrier ordinaire...
   ...

📊 [BACKEND - STEP 7] Calcul de l'ETP...
   Tâches traitées: 42
   Tâches ignorées: 3
   Total heures calculées: 18.45h
   Heures nettes/jour: 7.50h
   ETP calculé: 2.46

🔢 [BACKEND - STEP 8] Arrondi de l'ETP...
   ETP arrondi: 2

✅ [BACKEND - STEP 9] Construction de la réponse...
   Nombre de tâches détaillées: 42
   Total heures: 18.45h
   ETP final: 2

✅ [BACKEND - STEP 10] Résultat final calculé:
   ETP: 2
   Heures totales: 18.45h
   Nombre de tâches: 42

# FRONTEND
✅ [FRONTEND - STEP 3] Réponse reçue du backend
   Status: 200
   ETP: 2
   Total heures: 18.45
   Nombre de tâches: 42
```

---

## 🎨 Légende des Icônes

- 🚀 Démarrage/Initialisation
- 📡 Communication réseau
- ✅ Succès/Validation
- 📋 Récupération de données
- 🔄 Traitement/Calcul
- 🔧 Configuration
- 📊 Analyse/Statistiques
- 🔢 Calculs numériques
- ❌ Erreur
- 🎯 Point d'entrée API
- 🏢 Centre

---

## 🔧 Désactiver les Logs

### Frontend
Commenter les `console.log()` dans:
- `frontend/src/services/simulationService.js`

### Backend
Commenter les `print()` dans:
- `backend/app/api/simulation_data_driven.py`
- `backend/app/services/simulation_data_driven.py`

---

## 📚 Fichiers Modifiés

1. **Frontend**:
   - `frontend/src/services/simulationService.js` (STEP 1-3)

2. **Backend**:
   - `backend/app/api/simulation_data_driven.py` (STEP 1-3, 10)
   - `backend/app/services/simulation_data_driven.py` (STEP 4-9)

---

**Date de création**: 2026-01-08  
**Version**: 1.0
