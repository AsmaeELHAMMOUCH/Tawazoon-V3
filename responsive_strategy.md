# 📐 Stratégie Responsive & UX - TAWAZOON RH

Ce document définit les règles et l'approche technique pour rendre l'application TAWAZOON RH parfaitement responsive, du mobile aux écrans ultra-larges.

---

## 🧩 1. Analyse de l'UI Actuelle

### 🔍 Diagnostic par Device

| Device | Résolution | Comportement Actuel | Problèmes Identifiés | Impact UX |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile** | ≤ 576px | **Cassé**. Sidebar absente ou écrase le contenu. Tableaux illisibles (scroll horizontal infini). Graphiques écrasés. Intitulés tronqués. | `Simulation.jsx` force une largeur minimale. Inputs trop petits pour le tactile. Headers surchargés. | 🔴 Critique (Inutilisable) |
| **Tablette** | 768px - 1024px | **Partiel**. Sidebar peut gêner. Grilles souvent trop denses (3 cols forcées). | Chevauchement des boutons dans le Header. Manque de marge latérale. | 🟠 Moyen (Inconfortable) |
| **Desktop** | 1366px - 1440px | **Correct**. Cible actuelle du design. | Espace perdu sur les côtés si `max-w` trop petit. | 🟢 Bon |
| **Large** | ≥ 1920px | **Non optimisé**. Contenu centré avec beaucoup de vide ou étiré à l'infini. | Les tableaux deviennent des lignes illisibles car trop larges. Pas d'exploitation de l'espace pour afficher plus de context. | ⚪ Neutre |

### 🚨 Points de Douleur (Pain Points)
1.  **Layout Rigide** : `AppShell.jsx` utilise des calculs JS (`window.matchMedia`) pour la largeur de la sidebar, causant des sauts au chargement et des bugs de redimensionnement.
2.  **Tableaux Monolithiques** : Les tableaux de résultats (FTE par tâche) ont trop de colonnes pour tenir sur < 1000px.
3.  **Header Surchargé** : `HeaderSimulation.jsx` essaie de tout afficher (Titre + Scope + Toggle Mode) sur une seule ligne.
4.  **Navigation à Onglets** : `FluxNavbar.jsx` utilise un dézoom (`zoom: 0.9`) qui est une mauvaise pratique CSS.

---

## 📐 2. Stratégie Responsive Globale

### 📏 Breakpoints Recommandés (Tailwind Default + Ultra)

*   `xs`: **< 640px** (Mobile Portrait)
*   `sm`: **640px** (Mobile Landscape / Grandes Phablettes)
*   `md`: **768px** (Tablette Portrait / iPad Mini)
*   `lg`: **1024px** (Tablette Paysage / Laptop tactile)
*   `xl`: **1280px** (Desktop Standard)
*   `2xl`: **1536px** (Grands Écrans)
*   `3xl`: **1920px** (Ultra-Wide / Workstations) -> *Nouveau breakpoint personnalisé*

### 🏗 Structure du Layout (AppShell)

La sidebar doit devenir un **Drawer** (tiroir) sur mobile et une barre latérale collapsable sur Desktop.

| Zone | Mobile (`< md`) | Desktop (`md - xl`) | Large (`> xl`) |
| :--- | :--- | :--- | :--- |
| **Sidebar** | **Masquée par défaut**. Bouton "Burger" pour ouvrir un Overlay (Sheet). | **Icon-only** (Collapsed w-16) par défaut, extensible au survol ou clic. | **Étendu** (Expanded w-64) fixe. |
| **Header** | Sticky. Titre court. Actions principales dans un menu "..." (Dropdown). | Sticky. Titre complet. Actions visibles. | Sticky. Titre + Breadcrumbs + Filtres globaux. |
| **Contenu** | 1 colonne (Stack). Padding `px-4`. | Grille fluide (auto-fit). Padding `px-6`. | Grille dense ou Dashboard modulaire (Masonry). Padding `px-8`. |

---

## 🛠 3. Refonte Technique & Recommandations

### A. Layout Principal (`AppShell`)
Utiliser CSS Grid pour le layout au lieu de calculs JS margin-left.

```jsx
// Structure cible
<div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
  <aside className="hidden md:block border-r bg-muted/40">...</aside>
  <div className="flex flex-col">
    <header className="sticky top-0 z-10 h-14 bg-background px-4 border-b flex items-center lg:h-[60px]">
      <Sheet> {/* Mobile Trigger */} </Sheet>
      ...
    </header>
    <main className="flex-1 gap-4 p-4 lg:gap-6 lg:p-6">
      {children}
    </main>
  </div>
</div>
```

### B. Tableaux de Résultats (DataTables)
Sur mobile, **transformer les lignes en cartes**.

*   **Pattern** : "Card View" pour Mobile, "Table View" pour Tablette+.
*   **Technique** : Utiliser `hidden md:table-cell` pour les colonnes secondaires.
*   **Composant** :
    ```jsx
    <div className="md:hidden space-y-4">
      {data.map(row => <MobileResultCard row={row} />)}
    </div>
    <table className="hidden md:table w-full">...</table>
    ```

### C. Cartes KPI (Dashboard)
Utiliser CSS Grid avec `auto-fit` pour s'adapter à toutes les largeurs sans Media Queries explicites.

```jsx
// Grille auto-magique : min 300px par carte
<div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
  <KpiCard />
  <KpiCard />
  ...
</div>
```

### D. Formulaires (Inputs)
Passer de listes verticales longues à des grilles adaptatives.

*   **Mobile** : 1 colonne (`grid-cols-1`). Inputs hauteur 44px (touch target).
*   **Desktop** : Multi-colonnes (`grid-cols-2 lg:grid-cols-4`).

---

## 📅 4. Plan de Mise en Œuvre

### 🏁 Étape 1 : Layout Shell Responsive (Priorité Haute)
Refondre `AppShell.jsx` et `Sidebar.jsx`.
*   Supprimer les calculs JS de largeur (`style={{ marginLeft... }}`).
*   Intégrer le composant **Sheet** (Shadcn) pour la sidebar mobile.
*   Ajouter le composant **Breadcrumb** pour la navigation hiérarchique sur grand écran.

### 📊 Étape 2 : Composants Atomiques (Priorité Moyenne)
Adapter les composants de base dans `src/components/ui/`.
*   **KPI Cards** : Adapter la taille du texte (`text-sm` vs `text-base`).
*   **Graphiques** : Forcer `w-full` et hauteur dynamique (300px mobile, 500px desktop).

### 🚀 Étape 3 : Écrans Critiques (Priorité Haute)
*   **Dashboard** : Appliquer la Grid `auto-fit` pour les KPIs.
*   **Page Simulation** :
    *   Header : Masquer les filtres secondaires sur mobile (bouton "Filtres").
    *   Tableau : Implémenter la "Card View" mobile pour les résultats par tâche.

### 🖼 Étape 4 : Optimisation Grand Écran (Priorité Basse)
Pour les écrans > 1920px :
*   Passer le conteneur principal en `max-w-[2400px]` (au lieu de 1450px).
*   Afficher les "Détails" (Panneau latéral) à droite du tableau principal au lieu d'une modale.
