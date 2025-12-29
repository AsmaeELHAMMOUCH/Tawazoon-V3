// Exemple d'intégration du système d'alertes dans VueIntervenant.jsx

import { useAlerts } from "@/hooks/useAlerts";
import { useEffect } from "react";

// Ajouter dans votre composant VueIntervenant :

export default function VueIntervenant(props) {
  const { generateAlertsFromSimulation } = useAlerts();
  
  // ... votre code existant ...

  // Générer les alertes après une simulation réussie
  useEffect(() => {
    if (mergedResults && mergedResults.length > 0 && totaux) {
      const capacite = Number(totaux?.heures_net ?? 8);
      generateAlertsFromSimulation(mergedResults, totaux, capacite);
    }
  }, [mergedResults, totaux, generateAlertsFromSimulation]);

  // ... reste de votre code ...
}

// C'est tout ! Les alertes seront automatiquement générées et affichées dans le header.
