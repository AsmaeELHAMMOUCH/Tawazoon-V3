"use client";
import React from "react";
import { useAlerts, ALERT_TYPES, ALERT_CATEGORIES } from "@/hooks/useAlerts";
import { AlertTriangle, TestTube } from "lucide-react";

export default function AlertsTestButton() {
    const { addAlert } = useAlerts();

    const generateTestAlerts = () => {
        // Alerte critique
        addAlert({
            type: ALERT_TYPES.CRITICAL,
            category: ALERT_CATEGORIES.CHARGE,
            title: "Surcharge critique détectée",
            message: "La tâche 'Distribution courrier' nécessite 8.5h mais la capacité est de 7.5h",
            zone: "Distribution courrier",
            data: {
                charge: "8.5h",
                capacité: "7.5h",
                ratio: "113%",
            },
        });

        // Alerte d'attention
        addAlert({
            type: ALERT_TYPES.WARNING,
            category: ALERT_CATEGORIES.CAPACITY,
            title: "Capacité presque saturée",
            message: "Taux d'occupation à 95%",
            zone: "Global",
            data: {
                utilisation: "95%",
            },
        });

        // Alerte info
        addAlert({
            type: ALERT_TYPES.INFO,
            category: ALERT_CATEGORIES.DATA,
            title: "Simulation réussie",
            message: "Les calculs ont été effectués avec succès",
            zone: "Global",
        });
    };

    return (
        <button
            onClick={generateTestAlerts}
            className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
            <TestTube className="w-4 h-4" />
            <span className="text-xs font-bold">Tester les alertes</span>
        </button>
    );
}
