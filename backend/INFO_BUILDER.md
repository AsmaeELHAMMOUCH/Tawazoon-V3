# 🏗️ Module de Création de Centre (Builder)

Une nouvelle fonctionnalité complète a été ajoutée pour créer des centres personnalisés.

## 🚀 Accès
1. Allez dans **Simulation des Effectifs**.
2. Sélectionnez le mode **"Par Centre"** (via la barre de navigation).
3. Cliquez sur le bouton vert **"+ Nouveau"** apparu à côté du titre.

## 🛠️ Fonctionnalités du Builder
Le module se décompose en 3 étapes :
1. **Identité** : Nom du centre et Région.
2. **Postes** : Sélection multiple des postes à inclure (recherche disponible).
3. **Tâches** :
   - Sélection d'un poste à configurer.
   - Filtrage par **Produit** et **Famille** (basé sur le référentiel existant).
   - Ajout de tâches au poste sélectionné.

Une fois validé, le centre est créé et vous êtes redirigé vers la simulation pour saisir les volumes.

## ⚠️ Action Requise
Comme de nouvelles routes API ont été ajoutées (`/api/builder`), vous devez impérativement :
**Redémarrer le serveur Backend** pour que la création fonctionne.
