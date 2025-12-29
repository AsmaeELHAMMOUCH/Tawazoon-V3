# 🔔 Système d'Alertes Centralisé - Simulateur RH

## Vue d'ensemble

Le système d'alertes centralisé transforme le simulateur RH en un véritable outil d'aide à la décision en détectant automatiquement les anomalies, surcharges et points d'attention.

## 📋 Architecture

### Composants créés

1. **`useAlerts.js`** - Hook Zustand pour la gestion d'état des alertes
2. **`AlertsPanel.jsx`** - Panneau latéral d'affichage des alertes
3. **`Header.jsx`** - Intégration du badge et du panneau dans le header

### Structure des alertes

```javascript
{
  id: "alert-1234567890",
  type: "critical" | "warning" | "info",
  category: "charge" | "effectif" | "volume" | "capacity" | "data",
  title: "Titre court",
  message: "Message explicatif",
  zone: "Zone impactée (Flux, Tâche, Centre)",
  data: { key: "value" }, // Données chiffrées
  targetId: "element-id", // Pour le scroll automatique
  timestamp: "2025-12-26T10:00:00Z",
  read: false
}
```

## 🎯 Types d'alertes

### 🔴 Critiques (CRITICAL)
- **Charge > Capacité** : Une tâche nécessite plus de temps que la capacité disponible
- **Effectif insuffisant** : ETP nécessaires > ETP disponibles
- **Tâche critique** : Charge élevée avec effectif nul

### 🟠 Attention (WARNING)
- **Capacité presque saturée** : Taux d'occupation > 90%
- **Déséquilibre flux** : Incohérence entre Arrivée/Départ
- **Volumes anormaux** : Valeurs inhabituellement élevées

### 🔵 Informatives (INFO)
- **Capacité sous-utilisée** : Taux d'occupation < 50%
- **Champs non applicables** : Désactivés par règle métier
- **Résultat conforme** : Simulation réussie sans problème

## 🚀 Utilisation

### 1. Générer des alertes après simulation

```javascript
import { useAlerts } from "@/hooks/useAlerts";

function VueIntervenant() {
  const { generateAlertsFromSimulation } = useAlerts();

  const handleSimuler = async () => {
    // ... votre code de simulation ...
    
    // Générer les alertes automatiquement
    generateAlertsFromSimulation(resultats, totaux, capacite);
  };

  return (
    // ... votre JSX ...
  );
}
```

### 2. Ajouter une alerte manuellement

```javascript
import { useAlerts, ALERT_TYPES, ALERT_CATEGORIES } from "@/hooks/useAlerts";

function MonComposant() {
  const { addAlert } = useAlerts();

  const checkVolumes = () => {
    if (volume > seuil) {
      addAlert({
        type: ALERT_TYPES.WARNING,
        category: ALERT_CATEGORIES.VOLUME,
        title: "Volume élevé détecté",
        message: `Le volume de ${volume} dépasse le seuil de ${seuil}`,
        zone: "Flux Arrivée",
        data: {
          volume,
          seuil,
          ecart: volume - seuil
        }
      });
    }
  };
}
```

### 3. Badge dynamique dans le Header

Le badge affiche automatiquement :
- **Nombre d'alertes non lues**
- **Couleur selon la gravité** :
  - 🔴 Rouge : Au moins une alerte critique
  - 🟠 Orange : Au moins une alerte d'attention
  - 🔵 Bleu : Seulement des alertes informatives

## 🎨 Fonctionnalités UX

### Panneau d'alertes

- **Slide-in depuis la droite** avec animation fluide
- **Résumé en haut** : Nombre d'alertes par type
- **Actions globales** :
  - "Tout marquer lu"
  - "Tout effacer"
- **Cartes d'alerte** avec :
  - Icône selon le type
  - Badge "non lu" animé
  - Zone impactée
  - Données chiffrées
  - Timestamp
  - Bouton supprimer

### Interactions

- **Clic sur une alerte** :
  - Marque comme lue
  - Scroll automatique vers l'élément concerné
  - Highlight temporaire (ring bleu 2s)

- **Clic extérieur** : Ferme le panneau

## 📊 Exemple d'intégration complète

```javascript
import { useAlerts } from "@/hooks/useAlerts";
import { useEffect } from "react";

function VueIntervenant() {
  const { generateAlertsFromSimulation } = useAlerts();
  const [resultats, setResultats] = useState([]);
  const [totaux, setTotaux] = useState(null);
  const capacite = 7.5; // heures

  // Générer les alertes après chaque simulation
  useEffect(() => {
    if (resultats.length > 0 && totaux) {
      generateAlertsFromSimulation(resultats, totaux, capacite);
    }
  }, [resultats, totaux, capacite, generateAlertsFromSimulation]);

  return (
    <div>
      {/* Votre interface */}
    </div>
  );
}
```

## 🔧 Personnalisation

### Ajouter un nouveau type d'alerte

1. Modifier `useAlerts.js` :
```javascript
export const ALERT_CATEGORIES = {
  // ... existants
  CUSTOM: 'custom',
};
```

2. Ajouter la logique de détection :
```javascript
generateAlertsFromSimulation: (resultats, totaux, capacite) => {
  // ... code existant ...
  
  // Nouvelle alerte personnalisée
  if (condition) {
    newAlerts.push({
      type: ALERT_TYPES.WARNING,
      category: ALERT_CATEGORIES.CUSTOM,
      title: "Titre personnalisé",
      message: "Message personnalisé",
      // ...
    });
  }
}
```

### Modifier les couleurs

Dans `AlertsPanel.jsx` :
```javascript
const getAlertBgColor = (type, read) => {
  switch (type) {
    case ALERT_TYPES.CRITICAL:
      return `bg-red-50 border-red-200`; // Modifier ici
    // ...
  }
};
```

## 📝 Bonnes pratiques

1. **Messages orientés métier** : Éviter le jargon technique
2. **Données chiffrées** : Toujours inclure les valeurs pertinentes
3. **Zone impactée** : Préciser le contexte (Flux, Tâche, Centre)
4. **Pas de surcharge** : Limiter le nombre d'alertes similaires
5. **Gravité appropriée** : Utiliser CRITICAL uniquement pour les vrais problèmes

## 🎯 Résultat attendu

Un centre d'alertes professionnel qui :
- ✅ Détecte automatiquement les anomalies
- ✅ Hiérarchise les problèmes par gravité
- ✅ Guide l'utilisateur vers les zones à corriger
- ✅ S'intègre de manière non-intrusive
- ✅ Améliore la prise de décision

## 🚀 Prochaines étapes

Pour activer le système dans votre page de simulation :

1. Importer le hook :
```javascript
import { useAlerts } from "@/hooks/useAlerts";
```

2. Appeler `generateAlertsFromSimulation` après chaque simulation

3. Les alertes apparaîtront automatiquement dans le header !
