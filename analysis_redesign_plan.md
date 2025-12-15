# 🎯 PLAN DE REFONTE & ANALYSE - TAWAZOON RH

Ce document contient l'analyse complète de l'existant, la proposition de Design System, le planning de refonte et les recommandations techniques pour le projet **TAWAZOON RH**.

---

## 🧩 1. Analyse du Projet & Logique

### 🏗 Architecture Actuelle

Le projet suit une architecture moderne **Monorepo** avec une sépatation claire Frontend/Backend.

*   **Backend (`/backend`)** :
    *   **Framework** : Python **FastAPI**.
    *   **Data** : **SQLAlchemy** (ORM) + pyodbc (connexion SQL Server probable).
    *   **Structure** :
        *   `api/` : Endpoints API.
        *   `models/` : Modèles de base de données (`Activite`, `Centre`, `Poste`, `Tache`...).
        *   `services/` : Logique métier pure (moteur de calcul).
        *   `schemas/` : Validation des données (Pydantic).
*   **Frontend (`/frontend`)** :
    *   **Framework** : **React** (Vite).
    *   **Styling** : **Tailwind CSS**.
    *   **UI Libs** : Mélange de HeadlessUI, RadixUI, et composants custom.
    *   **Charts** : **ECharts** (principalement) et Recharts (traces).
    *   **Structure** :
        *   `pages/` : Contient des "Écrans Monolithiques" (ex: `Simulation.jsx` > 2500 lignes).
        *   `components/ui/` : Début de bibliothèque de composants basiques.

### 🧠 Logique Métier (Calcul FTE)

Le cœur du simulateur réside dans `backend/app/services/simulation.py`.

*   **Objectif** : Calculer le nombre d'Équivalents Temps Plein (**FTE**) nécessaires pour traiter un volume de tâches.
*   **Formule Fondamentale** :
    $$ FTE = \frac{\text{Total Heures Nécessaires}}{\text{Heures Nettes Travaillées par Jour}} $$
*   **Composantes** :
    1.  **Volume Journalier** :
        *   Calculé à partir des volumes annuels (divisé par **264 jours ouvrés**).
        *   Différenciation **Courrier** vs **Colis (AMANA)**.
        *   Ratios spécifiques pour les sacheries : `colis_amana_par_sac` (ex: 5.0) et `courriers_par_sac` (ex: 4500.0).
    2.  **Charge de Travail (Total Heures)** :
        *   $\sum (\text{Volume Journalier} \times \text{Temps Moyen par Tâche})$.
    3.  **Capacité (Heures Nettes)** :
        *   Base de 8h/jour.
        *   Ajustée par le **Taux de Productivité** (%) (paramètre utilisateur).
        *   Ajustée par la **Marge d'Inactivité** (`idle_minutes`).
        *   Formule : $\text{Net} = (8 \times \text{Productivité}) - \text{Inactivité}$.

### ⚠️ Diagnostic UX/UI & Technique

| Points Forts | Points à Améliorer |
| :--- | :--- |
| ✅ Stack technique moderne et performante (FastAPI/Vite). | ❌ **Responsive absent** : Les tableaux et graphiques complexes cassent sur mobile/tablette. |
| ✅ Moteur de calcul robuste et isolé dans le backend. | ❌ **Composants Monolithiques** : `Simulation.jsx` est trop gros, mélangeant logique, UI, et styles. |
| ✅ Design visuel de base professionnel (Bleu/Gris). | ❌ **Incohérence Graphique** : Mélange de styles de graphiques (ECharts/Recharts) et de boutons. |
| | ❌ **Surcharge Cognitive** : Trop d'inputs affichés simultanément sans regroupement logique clair sur les petits écrans. |

---

## 🎨 2. Proposition de Design System & Responsive

L'objectif est de créer une interface **"Premium & Airy"** qui inspire confiance et fluidité.

### 🧬 Design System : "Tawazoon Core"

#### Palette de Couleurs
*   **Primary** : `Slate Blue` `#005EA8` (Action principale, Headers, KPIs clés).
*   **Secondary** : `Sky Blue` `#00A0E0` (Accents, Graphiques secondaires).
*   **Surface** :
    *   `Background` : `#F8FAFC` (Slate-50) - Fond global doux.
    *   `Card` : `#FFFFFF` (White) - Avec ombres portées légères (`shadow-sm`).
*   **Text** :
    *   `Headings` : `#0F172A` (Slate-900).
    *   `Body` : `#334155` (Slate-700).
    *   `Muted` : `#64748B` (Slate-500).
*   **Feedback** :
    *   `Success` : `#10B981` (Emerald).
    *   `Warning` : `#F59E0B` (Amber).
    *   `Error` : `#EF4444` (Red).

#### Typographie
*   Postes & Chiffres clés : **Inter** ou **Plus Jakarta Sans** (Moderne, lisible).
*   Tailles :
    *   `h1`: 24px/32px (Mobile/Desktop) - Bold.
    *   `h2`: 20px/24px - Semibold.
    *   `body`: 14px - Regular.
    *   `small`: 12px - Medium (pour les labels et tableaux).

#### Bibliothèques UI Recommandées
*   **Base** : **Tailwind CSS**.
*   **Composants** : **shadcn/ui** (basé sur RadixUI) pour avoir des composants accessibles, beaux et copier-collables dans le code (Boutons, Inputs, Dialogs, Selects, Tabs).
*   **Icônes** : **Lucide React** (déjà présent, à conserver).
*   **Graphiques** : Standardiser sur **Recharts** (plus "React-friendly" et léger que ECharts) OU conserver **ECharts** si les besoins sont très complexes (cartes, drilldown), mais l'encapsuler proprement. *Recommandation : Recharts pour la simplicité.*

### 📱 Stratégie Responsive

| Composant | 📱 Mobile (< 768px) | 💻 Tablette (768px - 1024px) | 🖥️ Desktop (> 1024px) |
| :--- | :--- | :--- | :--- |
| **Navigation** | Menu Burger ou Bottom Bar (façon app native). | Sidebar rétractable (icones uniquement). | Sidebar latérale complète fixe. |
| **Formulaires (Inputs)** | **Une seule colonne**. Groupes repliables (Accordéons). | Grille 2 colonnes. | Grille 3 ou 4 colonnes ou ligne horizontale. |
| **Tableaux de données** | **Vue "Carte"** : Chaque ligne devient une carte détaillée. Scroll horizontal évité. | Scroll horizontal avec colonne "Actions" sticky. | Tableau complet large. |
| **Graphiques** | Hauteur réduite (300px). Légende masquée ou simplifiée. | Hauteur standard. Légende en bas. | Hauteur confortable. Légende à droite. |
| **KPI Cards** | Carrousel horizontal ou Stack vertical. | Grille 2x2. | Ligne horizontale (4 ou 5 cartes). |

---

## 📅 3. Planning de Refonte (Sprints)

Ce planning est structuré pour délivrer de la valeur rapidement sans casser l'existant.

### Phase 1 : Fondations & Design System 🧱 (Charge: ~3j)
*   **Objectif** : Mettre en place les outils et l'isolation des styles.
*   [Haute] Installer et configurer **shadcn/ui** (Bouton, Input, Card, Select, Tabs).
*   [Haute] Nettoyer `index.css` et `tailwind.config.js` pour définir les variables de couleurs (CSS Variables).
*   [Moyenne] Créer des composants atomiques réutilisables pour remplacer les styles <div> inline.

### Phase 2 : Refonte du Dashboard & Navigation 🧭 (Charge: ~4j)
*   [Haute] Créer un **Layout App Shell** responsive (Header + Sidebar adaptive).
*   [Haute] Refondre `GlobalDashboard.jsx` : Transformer les KPIs hardcodés en composants `<StatCard />`.
*   [Haute] Adapter les graphiques du dashboard pour mobile (taille dynamique).

### Phase 3 : Refonte Écran "Simulation" (Le plus gros morceau) ⚙️ (Charge: ~6j)
*   **Objectif** : Casser le monolithe `Simulation.jsx`.
*   [Haute] Extraire le formulaire de saisie dans `SimulationFormWizard.jsx`.
    *   *Mobile* : Mode "Step-by-step" (Assistant) pour éviter de scroller 3km.
    *   *Desktop* : Vue d'ensemble.
*   [Haute] Refaire la vue Résultats dans `SimulationResults.jsx`.
    *   Utiliser des Tabs pour séparer "Vue Globale", "Par Poste", "Détails".
*   [Moyenne] Transformer le grand tableau de résultats en composants `<DataTable />` responsive (TanStack Table).

### Phase 4 : Améliorations UX & Polish ✨ (Charge: ~3j)
*   [Moyenne] Ajouter des **Squelettes de chargement (Skeletons)** pendant les calculs API.
*   [Basse] Ajouter des micro-interactions (animations Framer Motion légères sur les cartes).
*   [Basse] Mode "Impression / PDF" propre pour les rapports (déjà présent mais à styliser).

### Phase 5 : Nettoyage & Optimisation 🧹 (Charge: ~2j)
*   [Basse] Supprimer les fichiers `.bak`, `copy.jsx` et le code mort.
*   [Moyenne] Optimiser les imports (Lazy loading des graphiques lourds).

---

## 🧱 4. Recommandations Techniques Actionnables

1.  **Refactoring du Backend** :
    *   Supprimer les fichiers dupliqués dans `services/` (`simulate.py` vs `simulateOK.py`). Garder une seule source de vérité.
    *   Utiliser Pydantic plus strictement pour valider les entrées (éviter les `Dict` génériques).

2.  **Architecture Frontend** :
    *   Adopter une structure "Feature-based" :
        ```
        src/
          features/
            simulation/
              components/     # Composants spécifiques (Form, Charts)
              hooks/          # Logique (useSimulation)
              types/          # TS Types (si passage à TS strict)
              SimulationPage.jsx
            dashboard/
          components/
            ui/               # Composants génériques (shadcn)
            layout/           # AppShell, Sidebar
        ```

3.  **Gestion d'État** :
    *   Utiliser **React Query (TanStack Query)** pour les appels API (`/simulate`). Cela gère le caching, le loading et les erreurs nativement, remplaçant les `useEffect` complexes.

4.  **Formatage & Qualité** :
    *   Installer **Prettier** + **ESLint** avec une config stricte pour éviter les incohérences de style de code.
