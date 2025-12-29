# 🚀 Activation Rapide des Alertes

## ✅ Installation terminée

1. ✅ Zustand installé
2. ✅ Hook `useAlerts` créé
3. ✅ Composant `AlertsPanel` créé
4. ✅ Header mis à jour avec badge
5. ✅ Bouton de test ajouté

## 🧪 Tester le système maintenant

1. **Ouvrez votre application** dans le navigateur
2. **Cliquez sur le bouton violet** en bas à gauche : "Tester les alertes"
3. **Regardez le header** : Un badge rouge devrait apparaître avec le nombre "3"
4. **Cliquez sur l'icône Bell** dans le header
5. **Le panneau s'ouvre** avec 3 alertes de test

## 🔧 Activer les alertes automatiques dans VueIntervenant

Ouvrez `VueIntervenant.jsx` et ajoutez ces lignes :

### 1. Importer le hook (en haut du fichier)

```javascript
import { useAlerts } from "@/hooks/useAlerts";
```

### 2. Utiliser le hook dans le composant

```javascript
export default function VueIntervenant(props) {
  const { generateAlertsFromSimulation } = useAlerts();
  
  // ... votre code existant ...
```

### 3. Générer les alertes après simulation

Ajoutez cet `useEffect` après vos autres hooks :

```javascript
// Générer les alertes après simulation
useEffect(() => {
  if (mergedResults && mergedResults.length > 0 && totaux) {
    const capacite = Number(totaux?.heures_net ?? 8);
    generateAlertsFromSimulation(mergedResults, totaux, capacite);
  }
}, [mergedResults, totaux, generateAlertsFromSimulation]);
```

## 📍 Où placer le code exactement

Cherchez dans `VueIntervenant.jsx` la ligne qui contient :

```javascript
const [display, setDisplay] = useState("tableau");
```

Juste après cette ligne, ajoutez :

```javascript
// Hook pour les alertes
const { generateAlertsFromSimulation } = useAlerts();
```

Puis cherchez les autres `useEffect` et ajoutez le nouveau juste après.

## 🎯 Résultat attendu

Après avoir ajouté ce code :
1. Lancez une simulation
2. Si une tâche dépasse la capacité → Alerte rouge automatique
3. Le badge dans le header s'affiche
4. Cliquez sur la cloche pour voir les détails

## 🗑️ Retirer le bouton de test

Une fois que tout fonctionne, retirez le bouton de test dans `App.jsx` :

```javascript
// Supprimez ces lignes :
import AlertsTestButton from "./components/alerts/AlertsTestButton";
<AlertsTestButton />
```

## 💡 Personnaliser les alertes

Vous pouvez ajouter vos propres alertes n'importe où :

```javascript
import { useAlerts, ALERT_TYPES } from "@/hooks/useAlerts";

const { addAlert } = useAlerts();

// Ajouter une alerte personnalisée
addAlert({
  type: ALERT_TYPES.WARNING,
  category: ALERT_CATEGORIES.VOLUME,
  title: "Mon titre",
  message: "Mon message",
  zone: "Ma zone",
  data: { key: "value" }
});
```

## 🐛 En cas de problème

1. **Vérifiez que Zustand est installé** : `npm list zustand`
2. **Vérifiez la console** pour les erreurs
3. **Testez avec le bouton violet** avant d'activer les alertes automatiques
4. **Vérifiez les imports** : Tous les chemins doivent commencer par `@/`

## 📚 Documentation complète

Voir `ALERTS_SYSTEM.md` pour la documentation complète.
