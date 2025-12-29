# 🔧 Guide d'Installation - Optimisations Frontend

Ce guide vous accompagne pas à pas pour installer et utiliser les optimisations frontend.

---

## 📋 Prérequis

- Node.js 16+
- npm ou yarn
- Projet React existant

---

## 1️⃣ Installation des Dépendances

```bash
cd c:\Users\Aelhammouch\simulateur-rh-V2\frontend

# Installer les packages d'optimisation
npm install react-window react-virtualized-auto-sizer
npm install lodash.debounce use-debounce

# Optionnel : pour le debugging
npm install --save-dev @welldone-software/why-did-you-render
```

---

## 2️⃣ Configuration

### Package.json

Vérifier que ces dépendances sont présentes :

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-window": "^1.8.10",
    "react-virtualized-auto-sizer": "^1.0.24",
    "use-debounce": "^10.0.0"
  },
  "devDependencies": {
    "@welldone-software/why-did-you-render": "^8.0.1"
  }
}
```

---

## 3️⃣ Utilisation des Hooks

### Debounce sur les inputs

```jsx
import { useDebouncedValue } from './hooks/useDebounce';

function MyComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // ✅ La valeur debouncée se met à jour 300ms après la dernière frappe
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  
  // ✅ Utiliser debouncedSearchTerm pour les calculs/API calls
  useEffect(() => {
    if (debouncedSearchTerm) {
      // Faire la recherche
      fetchResults(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);
  
  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Rechercher..."
    />
  );
}
```

### Memoization des calculs

```jsx
import { useMemo } from 'react';

function SimulationComponent({ volumes, productivite }) {
  // ✅ Ce calcul ne sera refait que si volumes ou productivite changent
  const volumesJournaliers = useMemo(() => ({
    colis: volumes.colis / 22,
    courrier: volumes.courrier / 22,
    amana: volumes.amana / 22
  }), [volumes]);
  
  // ✅ Calcul complexe memoizé
  const etpCalcule = useMemo(() => {
    return Object.values(volumesJournaliers).reduce((sum, vol) => {
      return sum + (vol * 5 / 60 / 8); // Exemple
    }, 0);
  }, [volumesJournaliers]);
  
  return <div>ETP: {etpCalcule.toFixed(2)}</div>;
}
```

### Callbacks memoizés

```jsx
import { useCallback } from 'react';

function ParentComponent() {
  const [data, setData] = useState([]);
  
  // ✅ Cette fonction ne sera recréée que si setData change
  const handleUpdate = useCallback((id, value) => {
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, value } : item
    ));
  }, []); // Pas de dépendances car setData est stable
  
  return (
    <div>
      {data.map(item => (
        <ChildComponent
          key={item.id}
          item={item}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}

// ✅ Composant enfant memoizé
const ChildComponent = React.memo(({ item, onUpdate }) => {
  return (
    <input
      value={item.value}
      onChange={(e) => onUpdate(item.id, e.target.value)}
    />
  );
});
```

---

## 4️⃣ Virtualisation des Tableaux

### Utilisation de VirtualizedTaskTable

```jsx
import VirtualizedTaskTable from './components/VirtualizedTaskTable';

function TaskListPage() {
  const [taches, setTaches] = useState([]);
  
  const handleVolumeChange = (tacheId, volume) => {
    setTaches(prev => prev.map(t =>
      t.id === tacheId ? { ...t, volume } : t
    ));
  };
  
  return (
    <VirtualizedTaskTable
      taches={taches}
      onVolumeChange={handleVolumeChange}
      height={600}
      rowHeight={60}
    />
  );
}
```

### Virtualisation personnalisée

```jsx
import { FixedSizeList } from 'react-window';

function CustomVirtualList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );
  
  return (
    <FixedSizeList
      height={400}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

## 5️⃣ Lazy Loading

### Lazy loading des composants

```jsx
import { lazy, Suspense } from 'react';

// ✅ Import lazy
const GraphResultats = lazy(() => import('./components/GraphResultats'));
const HeavyComponent = lazy(() => import('./components/HeavyComponent'));

function App() {
  return (
    <div>
      {/* ✅ Wrapper avec Suspense */}
      <Suspense fallback={<LoadingSpinner />}>
        <GraphResultats data={data} />
      </Suspense>
      
      <Suspense fallback={<div>Chargement...</div>}>
        <HeavyComponent />
      </Suspense>
    </div>
  );
}
```

### Skeleton pour le loading

```jsx
const GraphSkeleton = () => (
  <div className="graph-skeleton">
    <div className="skeleton-bar" />
    <div className="skeleton-bar" />
    <div className="skeleton-bar" />
  </div>
);

// CSS
.skeleton-bar {
  height: 40px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  margin: 8px 0;
  border-radius: 4px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 6️⃣ Optimisation des Graphiques ECharts

```jsx
import { useMemo, useRef, useEffect } from 'react';
import * as echarts from 'echarts';

function OptimizedChart({ data }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  // ✅ Options memoizées
  const chartOptions = useMemo(() => ({
    // Désactiver animations pour gros datasets
    animation: data.length < 50,
    
    // Lazy update
    lazyUpdate: true,
    
    // Progressive rendering
    progressive: 1000,
    progressiveThreshold: 3000,
    
    series: [{
      type: 'bar',
      data: data,
      // Autres options...
    }]
  }), [data]);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Initialiser le chart une seule fois
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    
    // Mettre à jour avec notMerge: false pour performance
    chartInstance.current.setOption(chartOptions, {
      notMerge: false,
      lazyUpdate: true
    });
    
    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [chartOptions]);
  
  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}

export default React.memo(OptimizedChart);
```

---

## 7️⃣ Debugging des Performances

### React DevTools Profiler

```jsx
import { Profiler } from 'react';

function onRenderCallback(
  id, // l'id du Profiler
  phase, // "mount" ou "update"
  actualDuration, // temps passé à rendre
  baseDuration, // temps estimé sans memoization
  startTime,
  commitTime
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
  
  if (actualDuration > 16) {
    console.warn(`⚠️ Slow render detected in ${id}`);
  }
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <YourComponents />
    </Profiler>
  );
}
```

### Why Did You Render

```jsx
// index.jsx
if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    logOnDifferentValues: true,
  });
}

// Dans vos composants
MyComponent.whyDidYouRender = true;
```

---

## 8️⃣ Checklist d'Optimisation

### Pour chaque composant

- [ ] **Inputs** : Debounce sur les champs de saisie (300ms)
- [ ] **Calculs** : useMemo pour les calculs lourds
- [ ] **Callbacks** : useCallback pour les fonctions passées aux enfants
- [ ] **Composants** : React.memo pour les composants de liste
- [ ] **Listes** : Virtualisation si > 20 éléments
- [ ] **Graphiques** : Lazy loading + Suspense
- [ ] **Images** : Lazy loading + compression

### Pour l'application

- [ ] **Routes** : Code splitting par route
- [ ] **Bundle** : Analyser avec vite-bundle-visualizer
- [ ] **Profiling** : Tester avec React DevTools
- [ ] **Performance** : Lighthouse score > 90

---

## 9️⃣ Tests de Performance

### Script de test

```jsx
// test-performance.jsx
import { useState, useEffect } from 'react';

function PerformanceTest() {
  const [renderCount, setRenderCount] = useState(0);
  const [renderTimes, setRenderTimes] = useState([]);
  
  useEffect(() => {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      setRenderTimes(prev => [...prev, duration]);
      
      if (duration > 16) {
        console.warn(`⚠️ Slow render: ${duration.toFixed(2)}ms`);
      }
    };
  });
  
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  });
  
  const avgRenderTime = renderTimes.length > 0
    ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
    : 0;
  
  return (
    <div>
      <p>Renders: {renderCount}</p>
      <p>Avg time: {avgRenderTime.toFixed(2)}ms</p>
      <p>Last render: {renderTimes[renderTimes.length - 1]?.toFixed(2)}ms</p>
    </div>
  );
}
```

---

## 🎯 Résultats Attendus

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Temps rendu initial** | ~2s | <500ms | **75% plus rapide** |
| **Input lag** | 100-200ms | <16ms | **90% plus fluide** |
| **Scroll (50 lignes)** | Lag visible | 60fps | **Fluide** |
| **Bundle size** | ~800KB | <400KB | **50% plus léger** |

---

## 🚨 Troubleshooting

### Le debounce ne fonctionne pas

```jsx
// ❌ Mauvais : le debounce est recréé à chaque render
const debouncedValue = useDebouncedValue(value, 300);

// ✅ Bon : utiliser le hook correctement
import { useDebouncedValue } from './hooks/useDebounce';
const debouncedValue = useDebouncedValue(value, 300);
```

### Les composants re-render trop

```jsx
// Utiliser Why Did You Render pour identifier
MyComponent.whyDidYouRender = true;

// Vérifier les dépendances de useMemo/useCallback
const value = useMemo(() => {
  // ...
}, [dep1, dep2]); // ⚠️ Vérifier que dep1 et dep2 sont stables
```

### La virtualisation ne fonctionne pas

```jsx
// Vérifier que react-window est bien installé
npm list react-window

// Vérifier la hauteur du conteneur
<FixedSizeList
  height={600} // ⚠️ Doit être un nombre, pas "100%"
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
```

---

## 📚 Ressources

- [React Performance](https://react.dev/learn/render-and-commit)
- [react-window](https://github.com/bvaughn/react-window)
- [useMemo](https://react.dev/reference/react/useMemo)
- [useCallback](https://react.dev/reference/react/useCallback)
- [React.memo](https://react.dev/reference/react/memo)

---

**Bon développement ! 🚀**
