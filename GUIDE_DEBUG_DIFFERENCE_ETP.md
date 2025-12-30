# Guide de Test - Différence de Calcul ETP Centre Fès

## Problème Identifié
Le centre de Fès affiche des résultats différents entre les deux pages :
- **Vue Centre** : 2,21 ETP
- **Vue Intervenant** : 2,46 ETP

## Logs Ajoutés

J'ai ajouté des logs de débogage détaillés dans le backend pour tracer les différences :

### 1. Dans `/api/simulate` (Vue Intervenant)
- Centre ID, Poste ID
- Productivité, Heures nettes
- Volumes journaliers et annuels
- Nombre de tâches

### 2. Dans `/api/vue-centre-optimisee` (Vue Centre)
- Centre ID
- Productivité, Heures nettes, Temps mort (idle_minutes)
- Volumes journaliers et annuels
- Nombre de tâches

### 3. Dans le moteur de simulation (`calculer_simulation`)
- Total heures accumulées
- Heures nettes (après temps mort)
- ETP calculé et arrondi
- Nombre de tâches traitées

## Procédure de Test

### Étape 1 : Préparer les Données
1. Ouvrir la **Vue Centre**
2. Sélectionner la région **FES**
3. Sélectionner le centre **FES**
4. Noter les paramètres utilisés :
   - Productivité : ?
   - Temps mort : ?
   - Volumes (Sacs, Colis, Courrier, etc.)

### Étape 2 : Tester Vue Centre
1. Cliquer sur "Simuler" dans Vue Centre
2. Noter le résultat ETP affiché
3. Consulter les logs du terminal backend pour voir :
   ```
   ==================== REQUEST RECEIVED /vue-centre-optimisee ====================
   DEBUG vue-centre centre_id = ...
   DEBUG vue-centre productivite = ...
   DEBUG vue-centre heures_net = ...
   DEBUG vue-centre idle_minutes = ...
   DEBUG vue-centre volumes_journaliers = ...
   DEBUG vue-centre volumes_annuels (va_dict) = ...
   DEBUG vue-centre nb taches finales = ...
   
   🔍 SIMULATION RESULTS:
      total_heures_acc = ...
      heures_net (après idle) = ...
      fte_calcule = ...
      fte_arrondi = ...
      nombre de tâches traitées = ...
   ```

### Étape 3 : Tester Vue Intervenant
1. Ouvrir la **Vue Intervenant**
2. Sélectionner la région **FES**
3. Sélectionner le centre **FES**
4. Sélectionner un poste (noter lequel)
5. **Utiliser EXACTEMENT les mêmes paramètres** que Vue Centre :
   - Même productivité
   - Même temps mort
   - Mêmes volumes
6. Cliquer sur "Simuler"
7. Noter le résultat ETP affiché
8. Consulter les logs du terminal backend

### Étape 4 : Comparer les Logs

Comparer les valeurs suivantes entre les deux simulations :

| Paramètre | Vue Centre | Vue Intervenant | Différence |
|-----------|------------|-----------------|------------|
| centre_id | | | |
| poste_id | N/A | | |
| productivite | | | |
| heures_net | | | |
| idle_minutes | | | |
| volumes_journaliers | | | |
| volumes_annuels | | | |
| nb taches finales | | | |
| total_heures_acc | | | |
| heures_net (après idle) | | | |
| fte_calcule | | | |
| fte_arrondi | | | |

## Causes Possibles de Différence

### 1. **Filtrage par Poste**
- Vue Intervenant filtre par `poste_id` spécifique
- Vue Centre agrège TOUS les postes du centre
- **Vérification** : Comparer `nb taches finales`

### 2. **Temps Mort (idle_minutes)**
- Vue Centre peut avoir un `idle_minutes` différent
- Cela réduit les heures nettes : `heures_net = heures_brutes - (idle_minutes / 60)`
- **Vérification** : Comparer `heures_net (après idle)`

### 3. **Volumes Différents**
- Les volumes annuels ou journaliers peuvent différer
- **Vérification** : Comparer `volumes_journaliers` et `volumes_annuels`

### 4. **Regroupement de Tâches**
- Actuellement désactivé (lignes commentées)
- Si réactivé, peut créer des différences
- **Vérification** : Vérifier les lignes 95 et 223 dans `simulation.py`

### 5. **Ratios de Conversion**
- `colis_amana_par_sac`
- `courriers_par_sac`
- `colis_par_collecte`
- **Vérification** : Comparer ces valeurs dans `volumes_journaliers`

## Actions Correctives

Une fois la cause identifiée :

### Si c'est le filtrage par poste :
- C'est normal ! Vue Intervenant montre UN poste, Vue Centre montre TOUS les postes
- Solution : Vérifier que la somme des ETP de tous les postes dans Vue Centre = ETP total

### Si c'est le temps mort :
- Harmoniser le paramètre `idle_minutes` entre les deux vues
- Ou clarifier dans l'UI que Vue Centre utilise un temps mort différent

### Si ce sont les volumes :
- Vérifier que les mêmes volumes sont transmis à l'API
- Corriger le frontend pour assurer la cohérence

### Si ce sont les ratios :
- Vérifier que les ratios par défaut sont identiques
- S'assurer que les valeurs saisies sont bien transmises

## Prochaines Étapes

1. ✅ Logs ajoutés dans le backend
2. ⏳ Effectuer les tests avec le centre de Fès
3. ⏳ Analyser les logs pour identifier la cause
4. ⏳ Implémenter la correction appropriée
5. ⏳ Vérifier que les deux pages donnent des résultats cohérents

## Notes

- Les logs sont préfixés avec 🔍 pour faciliter la recherche
- Utiliser `Ctrl+F` dans le terminal pour chercher "REQUEST RECEIVED" ou "SIMULATION RESULTS"
- Les valeurs sont affichées avec 4 décimales pour une précision maximale
