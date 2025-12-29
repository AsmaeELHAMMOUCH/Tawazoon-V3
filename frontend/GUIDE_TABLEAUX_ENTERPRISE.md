# 🎨 Guide de Stylisation des Tableaux Enterprise

## 📊 Composant EnterpriseTable

### Caractéristiques

✅ **Header sticky** : Reste visible au scroll  
✅ **Zebra striping** : 1 ligne sur 2 légèrement teintée  
✅ **Hover subtil** : Fond bleu très clair au survol  
✅ **Scrollbar fine** : 6px de largeur, discrète  
✅ **Colonnes numériques** : Police monospace, alignées à droite  
✅ **Totaux mis en évidence** : Fond bleu clair, texte semi-bold  
✅ **Toggle Tableau/Graphe** : Segmented control compact  

---

## 🔧 Utilisation

### Import

```javascript
import EnterpriseTable from '../tables/EnterpriseTable';
import '../tables/EnterpriseTable.css';
```

### Exemple Basique

```javascript
<EnterpriseTable
  title="Référentiel Temps"
  columns={[
    { key: 'seq', label: 'Seq', align: 'left', width: '50px' },
    { key: 'task', label: 'Tâche', align: 'left', ellipsis: true },
    { key: 'unit', label: 'Unité', align: 'center', width: '100px' },
    { key: 'moyenne', label: 'Moy. (min)', align: 'right', width: '80px' }
  ]}
  data={referentiel}
  height={380}
/>
```

### Exemple avec Totaux

```javascript
<EnterpriseTable
  title="Résultats de Simulation"
  columns={[
    { key: 'seq', label: 'Seq', align: 'left', width: '50px' },
    { key: 'task', label: 'Tâche', align: 'left', ellipsis: true },
    { key: 'nombre_Unite', label: 'Unit. (/jour)', align: 'right', width: '100px' },
    { key: 'heures', label: 'Heures', align: 'right', width: '80px', bold: true }
  ]}
  data={mergedResults}
  footer={
    <>
      <tr>
        <td colSpan={4} className="px-2 py-1 text-left font-semibold text-[10px]">
          <span className="text-slate-700">Total heures nécessaires : </span>
          <span className="text-indigo-600">{totalHeures.toFixed(2)} h</span>
        </td>
      </tr>
      <tr>
        <td colSpan={4} className="px-2 py-1 text-left font-semibold text-[10px]">
          <span className="text-slate-700">Effectif nécessaire : </span>
          <span className="text-indigo-600">{fteCalc.toFixed(2)} ETP</span>
        </td>
      </tr>
    </>
  }
  height={380}
/>
```

### Exemple avec Toggle Vue

```javascript
const [refDisplay, setRefDisplay] = useState('tableau');

<EnterpriseTable
  title="Référentiel Temps"
  columns={columns}
  data={referentiel}
  currentView={refDisplay}
  onViewChange={setRefDisplay}
  showViewToggle={true}
  height={380}
/>
```

---

## 📐 Configuration des Colonnes

### Propriétés

| Propriété | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `key` | string | Clé de la donnée | `'task'` |
| `label` | string | Label de la colonne | `'Tâche'` |
| `align` | string | Alignement | `'left'`, `'center'`, `'right'` |
| `width` | string | Largeur fixe | `'100px'`, `'20%'` |
| `ellipsis` | boolean | Tronquer avec ... | `true` |
| `bold` | boolean | Texte en gras | `true` |
| `color` | string | Couleur du texte | `'indigo-600'` |
| `render` | function | Rendu personnalisé | `(val) => val.toFixed(2)` |

### Exemples

```javascript
// Colonne numérique alignée à droite
{ 
  key: 'heures', 
  label: 'Heures', 
  align: 'right', 
  width: '80px',
  render: (val) => val.toFixed(2)
}

// Colonne texte avec ellipsis
{ 
  key: 'task', 
  label: 'Tâche', 
  align: 'left', 
  ellipsis: true 
}

// Colonne avec rendu personnalisé
{ 
  key: 'status', 
  label: 'Statut', 
  align: 'center',
  render: (val) => (
    <span className={val === 'ok' ? 'text-green-600' : 'text-red-600'}>
      {val}
    </span>
  )
}
```

---

## 🎨 Styles Appliqués

### Header

```css
background: #f1f5f9 (slate-100)
border-bottom: 2px solid #cbd5e1
font-size: 9px
font-weight: 600
text-transform: uppercase
padding: 6px 8px
position: sticky
top: 0
```

### Lignes

```css
/* Ligne paire */
background: #ffffff

/* Ligne impaire */
background: rgba(248, 250, 252, 0.5)

/* Hover */
background: rgba(99, 102, 241, 0.05)

/* Transition */
transition: background-color 0.15s ease
```

### Totaux (Footer)

```css
background: #eff6ff (blue-50)
border-top: 2px solid #93c5fd
font-weight: 600
color: #1e40af (blue-800)
position: sticky
bottom: 0
```

### Scrollbar

```css
width: 6px
background-track: #f1f5f9
background-thumb: #cbd5e1
border-radius: 3px
```

---

## 📊 Comparaison Avant/Après

### AVANT (Tableau Standard)

```
┌─────────────────────────────────────┐
│ Référentiel Temps                   │ ← Header basique
├─────────────────────────────────────┤
│ Seq │ Tâche │ Unité │ Moy.          │ ← Pas de sticky
├─────┼───────┼───────┼───────────────┤
│ 1   │ Tri   │ colis │ 2.5           │ ← Pas de zebra
│ 2   │ Dist  │ sac   │ 3.2           │
│ 3   │ Coll  │ colis │ 1.8           │
│ ... │ ...   │ ...   │ ...           │
└─────────────────────────────────────┘
```

**Problèmes** :
- ❌ Header disparaît au scroll
- ❌ Lignes difficiles à suivre
- ❌ Pas de hover
- ❌ Scrollbar épaisse
- ❌ Colonnes numériques mal alignées

### APRÈS (EnterpriseTable)

```
┌─────────────────────────────────────┐
│ 📊 Référentiel Temps  [📋][📊]      │ ← Header stylé + toggle
├─────────────────────────────────────┤
│ SEQ │ TÂCHE │ UNITÉ │ MOY.          │ ← Sticky, uppercase
├─────┼───────┼───────┼───────────────┤
│ 1   │ Tri   │ colis │        2.5    │ ← Zebra + align right
│ 2   │ Dist  │ sac   │        3.2    │ ← Hover effect
│ 3   │ Coll  │ colis │        1.8    │
│ ... │ ...   │ ...   │ ...           │
├─────────────────────────────────────┤
│ Total : 19.2 h                      │ ← Footer sticky
└─────────────────────────────────────┘
```

**Améliorations** :
- ✅ Header sticky (reste visible)
- ✅ Zebra striping (lecture facile)
- ✅ Hover subtil (interactivité)
- ✅ Scrollbar fine (discret)
- ✅ Colonnes numériques alignées
- ✅ Totaux mis en évidence

---

## 🎯 Bonnes Pratiques

### 1. Colonnes Numériques

**Toujours** aligner à droite :
```javascript
{ key: 'heures', label: 'Heures', align: 'right' }
```

### 2. Textes Longs

**Toujours** utiliser ellipsis :
```javascript
{ key: 'task', label: 'Tâche', ellipsis: true }
```

### 3. Hauteur Fixe

**Toujours** définir une hauteur :
```javascript
<EnterpriseTable height={380} />
```

### 4. Totaux

**Toujours** mettre dans footer :
```javascript
footer={
  <tr>
    <td colSpan={4}>Total : {total}</td>
  </tr>
}
```

---

## 📱 Responsive

### Desktop (≥1366px)
- Font-size : 10px
- Padding : 8px
- Scrollbar : 6px

### Laptop (1024-1365px)
- Font-size : 9px
- Padding : 6px
- Scrollbar : 6px

### Tablet (<1024px)
- Font-size : 9px
- Padding : 4px
- Scrollbar : 4px

---

## 🎨 Personnalisation

### Couleurs

```javascript
// Dans EnterpriseTable.jsx
const colors = {
  header: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300'
  },
  row: {
    even: 'bg-white',
    odd: 'bg-slate-50/50',
    hover: 'hover:bg-indigo-50/30'
  },
  footer: {
    bg: 'bg-blue-50',
    text: 'text-indigo-600',
    border: 'border-blue-200'
  }
};
```

### Typographie

```javascript
const typography = {
  header: 'text-[9px] font-semibold uppercase',
  body: 'text-[10px]',
  footer: 'text-[10px] font-semibold'
};
```

---

## ✅ Checklist d'Intégration

### Avant de Remplacer

- [ ] Identifier les tableaux à remplacer
- [ ] Mapper les colonnes existantes
- [ ] Vérifier les données
- [ ] Tester avec données réelles

### Pendant l'Intégration

- [ ] Importer EnterpriseTable
- [ ] Importer EnterpriseTable.css
- [ ] Définir les colonnes
- [ ] Ajouter les totaux si nécessaire
- [ ] Configurer le toggle si nécessaire

### Après l'Intégration

- [ ] Vérifier le sticky header
- [ ] Tester le scroll
- [ ] Vérifier le hover
- [ ] Tester avec 100+ lignes
- [ ] Vérifier sur différents écrans

---

## 🚀 Prochaines Étapes

### Court Terme
1. Remplacer le tableau Référentiel
2. Remplacer le tableau Résultats
3. Tester et valider

### Moyen Terme
1. Ajouter tri par colonne
2. Ajouter filtres
3. Ajouter export CSV/Excel

---

## ✅ Conclusion

**EnterpriseTable** offre :
- ✅ Design professionnel
- ✅ Lisibilité optimale
- ✅ Performance maintenue
- ✅ Facilité d'utilisation

**Prêt à être intégré ! 🚀**

---

**Date** : 26/12/2024  
**Version** : 1.0.0  
**Auteur** : Équipe Technique Simulateur RH
