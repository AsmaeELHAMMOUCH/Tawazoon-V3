# ℹ️ Mise à jour Référentiel Temps

## Modifications effectuées
1. **Backend** : La requête `/api/taches` récupère désormais le **Label du Poste** associé à chaque tâche (via `INNER JOIN postes`).
2. **Frontend** : 
   - Ajout de la colonne **Responsable** indexée sur le Label du Poste.
   - Ajout de la colonne **Moy. (sec)** calculée (`Moy. min * 60`).

## Résultat
Le tableau "Référentiel Temps" affiche maintenant :
- **Responsable** : Le nom du poste responsable de la tâche.
- **Moy. (sec)** : Le temps unitaire en secondes.

Veuillez recharger la page pour voir les changements.
