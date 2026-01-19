# Correction du Bug : Double Application de l'Idle Time

## 📋 Problème Identifié

Dans la page **Vue Centre**, l'**Idle Time** (temps mort) était appliqué **deux fois** lors du calcul des heures nettes, ce qui faussait les résultats de simulation.

> **Note** : Ce bug n'affectait **que la Vue Centre**. La Vue Intervenant n'utilise pas les props `heures` et `tempsMortMinutes` dans `VolumeParamsCard`, donc elle n'était pas concernée par ce problème.

## 🔍 Analyse de la Cause

### Flux de Calcul

1. **Dans `VueCentre.jsx` (lignes 590-595)** :
   ```javascript
   const baseHeuresNet = useMemo(() => {
     const hTheo = Number(heuresNet || 0);
     const hIdle = Number(idleMinutes || 0) / 60;
     const net = hTheo - hIdle;  // ✅ Première soustraction
     return net > 0 ? net : 0;
   }, [heuresNet, idleMinutes]);
   ```

2. **Passage à `VolumeParamsCard` (ligne 1518)** :
   ```javascript
   <VolumeParamsCard
     heures={baseHeuresNet}        // ✅ Déjà net !
     tempsMortMinutes={idleMinutes}
     ...
   />
   ```

3. **Dans `VolumeParamsCard.jsx` (lignes 203-207 - AVANT correction)** :
   ```javascript
   const computeHeuresNet = () => {
     const h = typeof heures === "number" ? heures : 0;
     const tm = typeof tempsMortMinutes === "number" ? tempsMortMinutes : 0;
     return (h * 60 - tm) / 60;  // ❌ Deuxième soustraction !
   };
   ```

### Exemple Concret

- **Heures théoriques** : 8h
- **Idle time** : 30 minutes

**Calcul attendu** :
- Heures nettes = 8h - 0.5h = **7.5h**

**Calcul erroné (avant correction)** :
1. `baseHeuresNet` = 8 - 0.5 = 7.5h
2. `computeHeuresNet()` = (7.5 × 60 - 30) / 60 = (450 - 30) / 60 = **7h**
3. **Résultat final** : 7h au lieu de 7.5h ❌

## ✅ Solution Appliquée

### Modification dans `VolumeParamsCard.jsx`

```javascript
// 🔢 Calcul heures nettes
// ⚠️ IMPORTANT: 'heures' reçu en props est déjà baseHeuresNet (heures - idle time)
// Ne PAS soustraire à nouveau tempsMortMinutes pour éviter une double application
const computeHeuresNet = () => {
  const h = typeof heures === "number" ? heures : 0;
  return h; // Retourne directement les heures nettes déjà calculées
};
```

### Résultat

Maintenant, le calcul est correct :
1. `baseHeuresNet` = 8 - 0.5 = 7.5h
2. `computeHeuresNet()` = 7.5h
3. **Résultat final** : 7.5h ✅

## 📝 Fichiers Modifiés

- **`frontend/src/components/intervenant/VolumeParamsCard.jsx`**
  - Ligne 202-207 : Simplification de `computeHeuresNet()` pour éviter la double soustraction

## 🧪 Tests Recommandés

1. **Test Vue Centre** :
   - Sélectionner un centre
   - Définir des heures théoriques (ex: 8h)
   - Définir un idle time (ex: 30 min)
   - Vérifier que les heures nettes affichées = 7.5h
   - Lancer la simulation
   - Vérifier que les calculs d'ETP sont cohérents

2. **Test de Non-Régression** :
   - Vérifier que la Vue Intervenant fonctionne toujours correctement
   - Comparer les résultats entre Vue Centre et Vue Intervenant pour les mêmes paramètres

## 📅 Date de Correction

**4 janvier 2026** - 22h00

## 👤 Signalé par

Utilisateur (Asmae ELHAMMOUCH)
