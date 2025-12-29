import { create } from 'zustand';

// Types d'alertes
export const ALERT_TYPES = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
};

// Catégories d'alertes
export const ALERT_CATEGORIES = {
  CHARGE: 'charge',
  EFFECTIF: 'effectif',
  VOLUME: 'volume',
  CAPACITY: 'capacity',
  DATA: 'data',
};

// Store Zustand pour les alertes
export const useAlertsStore = create((set, get) => ({
  alerts: [],
  unreadCount: 0,
  isOpen: false,

  // Ajouter une alerte
  addAlert: (alert) => {
    const newAlert = {
      id: `alert-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...alert,
    };
    
    set((state) => ({
      alerts: [newAlert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    }));
  },

  // Marquer une alerte comme lue
  markAsRead: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === alertId ? { ...alert, read: true } : alert
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  // Marquer toutes comme lues
  markAllAsRead: () => {
    set((state) => ({
      alerts: state.alerts.map((alert) => ({ ...alert, read: true })),
      unreadCount: 0,
    }));
  },

  // Supprimer une alerte
  removeAlert: (alertId) => {
    set((state) => {
      const alert = state.alerts.find((a) => a.id === alertId);
      return {
        alerts: state.alerts.filter((a) => a.id !== alertId),
        unreadCount: alert && !alert.read ? state.unreadCount - 1 : state.unreadCount,
      };
    });
  },

  // Vider toutes les alertes
  clearAll: () => {
    set({ alerts: [], unreadCount: 0 });
  },

  // Ouvrir/fermer le panneau
  setIsOpen: (isOpen) => set({ isOpen }),
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),

  // Générer des alertes depuis les résultats de simulation
  generateAlertsFromSimulation: (resultats, totaux, capacite) => {
    const newAlerts = [];

    // 🔴 Alertes critiques : Charge > Capacité
    resultats.forEach((task) => {
      const charge = Number(task.heures ?? 0);
      if (charge > capacite) {
        newAlerts.push({
          type: ALERT_TYPES.CRITICAL,
          category: ALERT_CATEGORIES.CHARGE,
          title: 'Surcharge détectée',
          message: `La tâche "${task.task}" nécessite ${charge.toFixed(1)}h mais la capacité est de ${capacite.toFixed(1)}h`,
          zone: task.task,
          data: {
            charge: charge.toFixed(1),
            capacite: capacite.toFixed(1),
            ratio: ((charge / capacite) * 100).toFixed(0),
          },
          targetId: `task-${task.task}`,
        });
      }
    });

    // 🔴 Effectif nécessaire > Effectif disponible
    if (totaux?.etp_calcule && totaux?.etp_arrondi) {
      const needed = Number(totaux.etp_calcule);
      const available = Number(totaux.etp_arrondi);
      if (needed > available) {
        newAlerts.push({
          type: ALERT_TYPES.CRITICAL,
          category: ALERT_CATEGORIES.EFFECTIF,
          title: 'Effectif insuffisant',
          message: `${needed.toFixed(2)} ETP nécessaires mais seulement ${available} ETP disponibles`,
          zone: 'Global',
          data: {
            needed: needed.toFixed(2),
            available,
            gap: (needed - available).toFixed(2),
          },
        });
      }
    }

    // 🟠 Alertes d'attention : Taux d'occupation élevé
    if (totaux?.total_heures && capacite) {
      const utilisation = (totaux.total_heures / capacite) * 100;
      if (utilisation > 90 && utilisation <= 100) {
        newAlerts.push({
          type: ALERT_TYPES.WARNING,
          category: ALERT_CATEGORIES.CAPACITY,
          title: 'Capacité presque saturée',
          message: `Taux d'occupation à ${utilisation.toFixed(0)}%`,
          zone: 'Global',
          data: {
            utilisation: utilisation.toFixed(0),
          },
        });
      }
    }

    // 🔵 Alertes informatives : Capacité sous-utilisée
    if (totaux?.total_heures && capacite) {
      const utilisation = (totaux.total_heures / capacite) * 100;
      if (utilisation < 50) {
        newAlerts.push({
          type: ALERT_TYPES.INFO,
          category: ALERT_CATEGORIES.CAPACITY,
          title: 'Capacité sous-utilisée',
          message: `Taux d'occupation à seulement ${utilisation.toFixed(0)}%`,
          zone: 'Global',
          data: {
            utilisation: utilisation.toFixed(0),
          },
        });
      }
    }

    // Ajouter toutes les nouvelles alertes
    newAlerts.forEach((alert) => get().addAlert(alert));
  },
}));

// Hook personnalisé pour utiliser les alertes
export const useAlerts = () => {
  const store = useAlertsStore();

  return {
    alerts: store.alerts,
    unreadCount: store.unreadCount,
    isOpen: store.isOpen,
    addAlert: store.addAlert,
    markAsRead: store.markAsRead,
    markAllAsRead: store.markAllAsRead,
    removeAlert: store.removeAlert,
    clearAll: store.clearAll,
    setIsOpen: store.setIsOpen,
    togglePanel: store.togglePanel,
    generateAlertsFromSimulation: store.generateAlertsFromSimulation,
    
    // Statistiques
    criticalCount: store.alerts.filter((a) => a.type === ALERT_TYPES.CRITICAL).length,
    warningCount: store.alerts.filter((a) => a.type === ALERT_TYPES.WARNING).length,
    infoCount: store.alerts.filter((a) => a.type === ALERT_TYPES.INFO).length,
    
    // Gravité maximale
    maxSeverity: store.alerts.length === 0
      ? null
      : store.alerts.some((a) => a.type === ALERT_TYPES.CRITICAL)
      ? ALERT_TYPES.CRITICAL
      : store.alerts.some((a) => a.type === ALERT_TYPES.WARNING)
      ? ALERT_TYPES.WARNING
      : ALERT_TYPES.INFO,
  };
};
