# 🧪 Guide de Test - Page Intervenant Optimisée

## 📋 Vue d'ensemble

Ce guide vous explique comment tester la nouvelle page Intervenant optimisée.

---

## 🚀 Étape 1 : Installation des Dépendances

```bash
cd c:\Users\Aelhammouch\simulateur-rh-V2\frontend

# Installer les dépendances manquantes
npm install react-window react-virtualized-auto-sizer

# Vérifier que tout est installé
npm list react-window
npm list react-virtualized-auto-sizer
```

---

## 🔧 Étape 2 : Intégration dans App.jsx

### Option A : Remplacer temporairement la vue actuelle

```jsx
// frontend/src/App.jsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import VueIntervenantPerformante from './components/views/VueIntervenantPerformante';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Remplacer temporairement */}
        <Route path="/intervenant" element={<VueIntervenantPerformante />} />
        
        {/* Ou créer une nouvelle route pour comparer */}
        <Route path="/intervenant-v2" element={<VueIntervenantPerformante />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### Option B : Créer une page de test dédiée

```jsx
// frontend/src/pages/TestVueIntervenant.jsx

import React from 'react';
import VueIntervenantPerformante from '../components/views/VueIntervenantPerformante';

export default function TestVueIntervenant() {
  return (
    <div className="h-screen">
      <VueIntervenantPerformante />
    </div>
  );
}
```

Puis dans `App.jsx` :

```jsx
import TestVueIntervenant from './pages/TestVueIntervenant';

<Route path="/test-intervenant" element={<TestVueIntervenant />} />
```

---

## 🌐 Étape 3 : Lancer l'Application

```bash
# Le serveur devrait déjà tourner
# Si ce n'est pas le cas :
npm run dev
```

Ouvrir le navigateur :
- **Option A** : http://localhost:5173/intervenant
- **Option B** : http://localhost:5173/test-intervenant

---

## 🧪 Étape 4 : Tests Fonctionnels

### Test 1 : Rendu Initial ✅

**Vérifier** :
- [ ] La page se charge en moins de 500ms
- [ ] Header visible avec titre
- [ ] Barre de paramètres sur 1 ligne
- [ ] Tableau vide ou avec message
- [ ] Pas d'erreur dans la console

**Console Chrome** :
```
F12 → Console
Vérifier qu'il n'y a pas d'erreurs rouges
```

---

### Test 2 : Saisie des Volumes ⚡

**Actions** :
1. Taper rapidement dans le champ "Colis" : `1000`
2. Taper dans "Courrier" : `5000`
3. Taper dans "Amana" : `2000`

**Vérifier** :
- [ ] Aucun lag pendant la saisie
- [ ] Les valeurs s'affichent immédiatement
- [ ] Pas de freeze de l'interface
- [ ] Console : pas d'erreur

**Mesure du lag** :
```
F12 → Performance
Enregistrer pendant que vous tapez
Vérifier que les frames restent à 60fps
```

---

### Test 3 : Modification des Paramètres 🎛️

**Actions** :
1. Changer "Productivité" : `70` → `80`
2. Changer "Temps mort" : `30` → `45`
3. Observer "Heures nettes/jour"

**Vérifier** :
- [ ] Heures nettes se mettent à jour automatiquement
- [ ] Calcul correct : `8h × 80% - 45min/60 = 5.65h`
- [ ] Pas de lag

---

### Test 4 : Simulation 🔄

**Actions** :
1. Sélectionner un centre (si sélecteurs présents)
2. Sélectionner un poste
3. Cliquer sur "Simuler"

**Vérifier** :
- [ ] Bouton affiche "Calcul..."
- [ ] Requête API envoyée
- [ ] Tableau se remplit avec les tâches
- [ ] Synthèse KPI affichée en bas
- [ ] Pas d'erreur

**Console Network** :
```
F12 → Network
Vérifier la requête POST /api/simulate
Status: 200 OK
```

---

### Test 5 : Virtualisation du Tableau 📊

**Prérequis** : Avoir au moins 50 lignes de tâches

**Actions** :
1. Scroller rapidement dans le tableau
2. Scroller jusqu'en bas
3. Scroller jusqu'en haut

**Vérifier** :
- [ ] Scroll fluide à 60fps
- [ ] Pas de lag
- [ ] Header reste sticky
- [ ] Pas de "saut" visuel

**Mesure FPS** :
```
F12 → Performance
Enregistrer pendant le scroll
Vérifier que FPS ≈ 60
```

**Inspecter le DOM** :
```
F12 → Elements
Chercher le tableau
Compter les <div> de lignes
Devrait être ~15-20 au lieu de 100+
```

---

### Test 6 : Synthèse des Résultats 📈

**Vérifier** :
- [ ] KPI "Heures nécessaires" affiché
- [ ] KPI "ETP calculé" affiché
- [ ] KPI "ETP arrondi" affiché
- [ ] KPI "Effectif actuel" affiché
- [ ] KPI "Écart" affiché avec couleur
- [ ] KPI "Taux de charge" avec couleur appropriée :
  - Vert si < 80%
  - Orange si 80-100%
  - Rouge si > 100%

---

### Test 7 : Graphiques (Lazy Loading) 📉

**Actions** :
1. Activer l'affichage des graphiques (si option présente)
2. Observer le chargement

**Vérifier** :
- [ ] Skeleton affiché pendant le chargement
- [ ] Graphique apparaît après
- [ ] Pas de freeze de la page
- [ ] Graphique interactif

---

## 🔍 Étape 5 : Tests de Performance

### Test Performance 1 : React DevTools Profiler

```bash
# Installer React DevTools (extension Chrome)
# https://chrome.google.com/webstore/detail/react-developer-tools/

1. Ouvrir React DevTools (F12 → Components)
2. Aller dans l'onglet "Profiler"
3. Cliquer sur "Record"
4. Taper dans un input
5. Arrêter l'enregistrement
6. Analyser les re-renders
```

**Vérifier** :
- [ ] Seulement les composants concernés re-render
- [ ] Pas de re-render global
- [ ] Durée de render < 16ms

---

### Test Performance 2 : Chrome DevTools Performance

```bash
1. F12 → Performance
2. Cliquer sur "Record"
3. Taper rapidement dans plusieurs inputs
4. Scroller dans le tableau
5. Arrêter l'enregistrement
6. Analyser
```

**Vérifier** :
- [ ] FPS constant à ~60
- [ ] Pas de "long tasks" (> 50ms)
- [ ] Pas de "layout thrashing"

---

### Test Performance 3 : Lighthouse

```bash
1. F12 → Lighthouse
2. Mode: Desktop
3. Catégories: Performance
4. Cliquer "Analyze page load"
```

**Objectifs** :
- [ ] Performance score > 90
- [ ] First Contentful Paint < 1s
- [ ] Time to Interactive < 2s
- [ ] Total Blocking Time < 200ms

---

### Test Performance 4 : Bundle Size

```bash
# Analyser la taille du bundle
npm run build

# Installer l'analyseur
npm install --save-dev vite-bundle-visualizer

# Ajouter dans vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({ open: true })
  ]
}

# Rebuild
npm run build
```

**Vérifier** :
- [ ] Bundle total < 400KB
- [ ] Graphiques dans un chunk séparé (lazy)
- [ ] Pas de dépendances inutiles

---

## 🧪 Étape 6 : Tests de Charge

### Test Charge 1 : 50 Lignes

**Données de test** :
```json
{
  "taches": [
    { "id": 1, "nom_tache": "Tâche 1", "moyenne_min": 5, "indicateur": "colis" },
    { "id": 2, "nom_tache": "Tâche 2", "moyenne_min": 3, "indicateur": "courrier" },
    ...
    // 50 lignes
  ]
}
```

**Vérifier** :
- [ ] Rendu < 500ms
- [ ] Scroll fluide
- [ ] Mémoire < 30MB

---

### Test Charge 2 : 100 Lignes

**Vérifier** :
- [ ] Rendu < 600ms
- [ ] Scroll fluide
- [ ] Mémoire < 40MB

---

### Test Charge 3 : 200 Lignes

**Vérifier** :
- [ ] Rendu < 800ms
- [ ] Scroll fluide
- [ ] Mémoire < 50MB

---

## 🐛 Étape 7 : Tests de Régression

### Test 1 : Changement Rapide de Valeurs

**Actions** :
1. Taper `1000` dans Colis
2. Immédiatement taper `2000`
3. Immédiatement taper `3000`

**Vérifier** :
- [ ] Pas d'erreur
- [ ] Valeur finale = 3000
- [ ] Calcul correct

---

### Test 2 : Valeurs Extrêmes

**Actions** :
1. Taper `0` dans tous les champs
2. Taper `999999999` dans Colis
3. Taper `-100` (devrait être bloqué)

**Vérifier** :
- [ ] Gestion des valeurs nulles
- [ ] Gestion des grandes valeurs
- [ ] Pas de valeurs négatives

---

### Test 3 : Navigation Rapide

**Actions** :
1. Changer de centre rapidement
2. Changer de poste rapidement
3. Simuler plusieurs fois de suite

**Vérifier** :
- [ ] Pas de requêtes en double
- [ ] Pas de memory leak
- [ ] État cohérent

---

## 📊 Checklist Finale

### Fonctionnel
- [ ] Page se charge correctement
- [ ] Inputs réactifs sans lag
- [ ] Simulation fonctionne
- [ ] Tableau virtualisé
- [ ] Synthèse affichée
- [ ] Graphiques lazy-loaded

### Performance
- [ ] Rendu initial < 500ms
- [ ] Input lag < 16ms
- [ ] Scroll 60fps
- [ ] Bundle < 400KB
- [ ] Re-renders < 3/sec

### UX
- [ ] Pas de scroll global
- [ ] Paramètres sur 1 ligne
- [ ] Feedback visuel clair
- [ ] Pas d'espace vide inutile

### Qualité Code
- [ ] Pas d'erreur console
- [ ] Pas de warning React
- [ ] Code bien commenté
- [ ] Composants isolés

---

## 🔧 Dépannage

### Problème : "Cannot find module 'react-window'"

```bash
npm install react-window react-virtualized-auto-sizer
```

### Problème : "useDebouncedValue is not defined"

Vérifier que le fichier `useDebounce.jsx` existe :
```bash
ls src/hooks/useDebounce.jsx
```

Si absent, le créer (voir GUIDE_UTILISATION_FRONTEND.md)

### Problème : Tableau ne s'affiche pas

Vérifier dans la console :
```jsx
console.log('Taches:', resultatsSimulation?.taches);
```

### Problème : Lag pendant la saisie

Vérifier le debounce :
```jsx
console.log('Debounced:', debouncedVolumes);
// Devrait se mettre à jour 300ms après la dernière frappe
```

---

## 📸 Captures d'Écran Attendues

### Vue Normale
```
┌─────────────────────────────────────────┐
│ Simulation – Vue Intervenant  [Centre]  │
├─────────────────────────────────────────┤
│ [📦Colis] [✉️Courrier] [📦Amana] [Simuler]│
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐   │
│ │ Tâche 1    │ 100 │ 5min │ 0.5h   │   │
│ │ Tâche 2    │ 50  │ 3min │ 0.3h   │   │
│ │ ...                                │   │
│ └───────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ [Heures] [ETP] [Écart] [Taux]           │
└─────────────────────────────────────────┘
```

---

## ✅ Validation Finale

Si tous les tests passent :
- ✅ La page est prête pour la production
- ✅ Performance optimale atteinte
- ✅ UX conforme aux spécifications

Si des tests échouent :
- 🔍 Consulter la section Dépannage
- 📝 Vérifier les logs console
- 💬 Contacter l'équipe technique

---

**Bon test ! 🚀**

**Date** : 26/12/2024  
**Version** : 1.0.0  
**Auteur** : Équipe Technique Simulateur RH
