import { create } from 'zustand';

// Store pour gérer l'état du drawer d'alertes
export const useAlertsDrawer = create((set) => ({
  isOpen: false,
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
}));
