# ℹ️ Export Excel (CSV) Ajouté

## Fonctionnalité
Un bouton **Export** a été ajouté au tableau "Référentiel Temps".

- **Format** : CSV (Compatible Excel avec support des accents).
- **Contenu** : Exporte exactement les colonnes et données visibles (Famille, Tâche, Responsable, Unité, Moyennes).
- **Emplacement** : En haut à droite du tableau, à côté des boutons de vue.

## Note Technique
Le fichier généré est un `.csv` avec BOM UTF-8, garantissant que Microsoft Excel l'ouvre correctement avec les caractères spéciaux.
