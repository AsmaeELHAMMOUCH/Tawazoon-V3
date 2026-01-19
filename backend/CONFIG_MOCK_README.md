# Configuration Mock Data - Flux Arrivée Amana Particuliers

## ✅ Étape 1: Tables de référence peuplées

Les tables suivantes ont été configurées avec les données de référence:

- **`dbo.flux`**: 5 entrées (AMANA, CO, CR, EB, LRH)
- **`dbo.volume_sens`**: 4 entrées (ARRIVEE, DEPOT, RECUP, DEPART)  
- **`dbo.volume_segments`**: 5 entrées (GLOBAL, PART, PRO, DIST, AXES)

## ✅ Étape 2: Données de test configurées

**Centre de test:**
- **Centre Poste ID**: 8248
- **Nombre de tâches**: 5 tâches configurées
- **IDs des tâches**: 4644, 4645, 4646, 4647, 4648

**Configuration des clés:**
- **Flux ID**: 1 (AMANA)
- **Sens ID**: 1 (ARRIVÉE)
- **Segment ID**: 2 (PARTICULIERS)

## 📋 Instructions pour tester dans le Frontend

### Étape 1: Accéder au simulateur
- Ouvrir http://localhost:5173/app/simulation

### Étape 2: Sélectionner le centre
- Chercher et sélectionner le centre avec l'ID **8248**
- (Le nom exact du centre dépend de vos données)

### Étape 3: Entrer les volumes
Dans la grille de saisie des volumes:
- **Flux**: AMANA
- **Sens**: ARRIVÉE  
- **Segment**: PARTICULIERS
- **Volume**: 1000 (unités annuelles)

### Étape 4: Lancer la simulation
- Cliquer sur le bouton "Lancer Simulation"

### Étape 5: Vérifier les résultats

**Résultats attendus:**
- ✅ Les 5 tâches devraient être traitées
- ✅ Des heures nécessaires devraient être calculées
- ✅ Un ETP devrait être affiché
- ✅ Les logs backend devraient montrer les calculs

**Si aucun résultat n'apparaît:**
1. Vérifier les logs backend dans `debug_log.txt`
2. Chercher les messages "[Simulation SQL]"
3. Vérifier si des volumes sont "Ignored" ou "AVAILABLE"

## 🔍 Logs de debug

Les logs détaillés incluent maintenant:
- Nombre de volumes entrés
- Nombre de tâches identifiées
- Liste des volumes non matchés (avec les clés disponibles en base)
- Détails de calcul par tâche
- Résumé final (heures, ETP)

## 📝 Prochaines étapes

Une fois ce test validé avec **Amana / Arrivée / Particuliers**:

1. **Tester d'autres combinaisons** (CO, CR, etc.)
2. **Configurer plus de tâches** pour d'autres flux/sens/segments
3. **Valider la logique de calcul** (formules, productivité, ETP)
4. **Intégrer avec le frontend** pour toutes les combinaisons

## 🛠️ Scripts utiles créés

- `setup_json.py`: Configure les données mock
- `check_db_stats.py`: Vérifie les statistiques de la base
- `seed_refs.py`: Peuple les tables de référence
- `RESUME_CONFIG.py`: Affiche ce résumé

---

**Date de configuration**: 2025-12-30  
**Status**: ✅ Prêt pour le test
