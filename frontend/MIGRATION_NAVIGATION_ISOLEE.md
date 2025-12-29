# 🔄 Guide de Migration - Navigation Isolée

## 🎯 Objectif

Migrer de l'architecture actuelle (206ms de commit) vers l'architecture isolée (< 5ms).

---

## 📊 Avant/Après

### ❌ Avant
```jsx
// App.jsx avec Context global
<FluxContext.Provider value={flux}>
  <AppShell>
    <Sidebar flux={flux} onFluxChange={setFlux} />
    <VueIntervenant flux={flux} />
  </AppShell>
</FluxContext.Provider>
```

**Problème** : Changement de flux → Re-render global (206ms)

### ✅ Après
```jsx
// App.jsx avec Router et URL params
<BrowserRouter>
  <Routes>
    <Route path="/" element={<AppLayout />}>
      <Route path="intervenant" element={<VueIntervenant />} />
    </Route>
  </Routes>
</BrowserRouter>
```

**Avantage** : Changement de flux → Navigation URL (< 5ms)

---

## 🔧 Étapes de Migration

### Étape 1 : Créer les Nouveaux Composants

Fichiers créés :
- ✅ `components/navigation/FluxNavbar.jsx`
- ✅ `components/layout/Sidebar.jsx`
- ✅ `components/layout/AppLayout.jsx`

### Étape 2 : Modifier App.jsx

**Avant** :
```jsx
import { useState } from 'react';

function App() {
  const [flux, setFlux] = useState('amana');
  
  return (
    <div>
      <Sidebar flux={flux} onFluxChange={setFlux} />
      <VueIntervenant flux={flux} />
    </div>
  );
}
```

**Après** :
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import VueIntervenant from './components/views/VueIntervenant';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route path="intervenant" element={<VueIntervenant />} />
          <Route path="centre" element={<VueCentre />} />
          <Route path="direction" element={<VueDirection />} />
          <Route path="national" element={<VueNational />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### Étape 3 : Modifier VueIntervenant

**Avant** :
```jsx
import { useContext } from 'react';
import { FluxContext } from '../context/FluxContext';

export default function VueIntervenant({ flux }) {
  // ou
  const flux = useContext(FluxContext);
  
  // Utilisation du flux
  const filteredData = data.filter(item => item.flux === flux);
  
  return <div>...</div>;
}
```

**Après** :
```jsx
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function VueIntervenant() {
  // ✅ Lecture des URL params
  const [searchParams] = useSearchParams();
  const flux = searchParams.get('flux') || 'amana';
  
  // ✅ Filtrage memoizé
  const filteredData = useMemo(() => {
    return data.filter(item => item.flux === flux);
  }, [flux, data]);
  
  return (
    <div className="p-6">
      <h1>Vue Intervenant - {flux}</h1>
      {/* Reste du composant */}
    </div>
  );
}
```

### Étape 4 : Supprimer l'Ancien Code

**À supprimer** :
```jsx
// ❌ Supprimer le Context
// context/FluxContext.jsx
export const FluxContext = createContext();

// ❌ Supprimer le Provider
<FluxContext.Provider value={flux}>
  ...
</FluxContext.Provider>

// ❌ Supprimer les props flux
<VueIntervenant flux={flux} />
<Sidebar flux={flux} onFluxChange={setFlux} />
```

### Étape 5 : Tester

1. **Démarrer l'app**
   ```bash
   npm run dev
   ```

2. **Ouvrir le navigateur**
   ```
   http://localhost:5173/intervenant?flux=amana
   ```

3. **Tester la navigation**
   - Cliquer sur différents flux
   - **Attendu** : Changement instantané, pas de lag

4. **Profiler**
   - React DevTools → Profiler
   - Record pendant navigation
   - **Attendu** : Commit < 5ms

---

## ✅ Checklist de Validation

### Architecture
- [ ] Pas de Context global pour le flux
- [ ] Pas de state partagé entre Sidebar et pages
- [ ] Communication via URL params uniquement
- [ ] Sidebar memoizée
- [ ] AppLayout memoizé

### Performance
- [ ] Clic navigation < 5ms
- [ ] Sidebar ne re-render jamais
- [ ] Pages re-render uniquement si URL change
- [ ] Pas de commit global > 50ms

### Fonctionnel
- [ ] Navigation fonctionne
- [ ] Flux correct affiché dans l'URL
- [ ] Données filtrées selon le flux
- [ ] Bouton retour navigateur fonctionne
- [ ] Partage d'URL fonctionne

### UX
- [ ] Changement de flux instantané
- [ ] Indicateur visuel du flux actif
- [ ] Pas de lag visible
- [ ] URL lisible et partageable

---

## 🐛 Dépannage

### Problème : "useSearchParams is not defined"

**Solution** : Installer react-router-dom
```bash
npm install react-router-dom
```

### Problème : Sidebar re-render quand même

**Cause** : Props dynamiques passées à Sidebar

**Solution** : Vérifier que Sidebar n'a AUCUNE prop
```jsx
// ❌ Mauvais
<Sidebar flux={flux} />

// ✅ Bon
<Sidebar />
```

### Problème : Flux ne change pas

**Cause** : VueIntervenant ne lit pas les URL params

**Solution** : Utiliser useSearchParams
```jsx
const [searchParams] = useSearchParams();
const flux = searchParams.get('flux');
```

### Problème : URL ne se met pas à jour

**Cause** : navigate() pas appelé correctement

**Solution** : Vérifier FluxNavbar
```jsx
const navigate = useNavigate();
navigate(`?flux=${flux}`, { replace: true });
```

---

## 📊 Mesures de Performance

### Test 1 : Avant Migration

1. Profiler → Record
2. Cliquer sur navigation
3. Stop
4. Noter : "Commit : 206ms"

### Test 2 : Après Migration

1. Profiler → Record
2. Cliquer sur navigation
3. Stop
4. Vérifier : "Commit : < 5ms" ✅

### Test 3 : Vérifier Sidebar

1. Profiler → Record
2. Cliquer plusieurs fois sur navigation
3. Stop
4. Vérifier : "Sidebar : 0 re-render" ✅

---

## 🎯 Résultat Attendu

```
Clic sur FluxNavbar
  ↓
navigate('?flux=amana')
  ↓
URL change : /intervenant?flux=amana
  ↓
VueIntervenant re-render (< 5ms)
  ↓
Sidebar : 0 re-render (memoizé)
  ↓
Total : < 5ms ✅
```

**Amélioration : 97% !** 🚀

---

## 📚 Ressources

- [React Router - useSearchParams](https://reactrouter.com/en/main/hooks/use-search-params)
- [React - memo](https://react.dev/reference/react/memo)
- [React - useCallback](https://react.dev/reference/react/useCallback)

---

## ✅ Prochaines Étapes

Après migration réussie :

1. **Appliquer** la même architecture aux autres pages
2. **Supprimer** tout le code legacy (Context, props drilling)
3. **Documenter** l'architecture pour l'équipe
4. **Former** l'équipe aux bonnes pratiques

---

**La migration élimine 97% du temps de commit de la navigation ! 🚀**

---

**Date** : 26/12/2024  
**Version** : 1.0.0  
**Auteur** : Équipe Technique Simulateur RH
