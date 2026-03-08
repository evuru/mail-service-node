import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EmailApp } from '../types';

interface AppState {
  apps: EmailApp[];
  selectedApp: EmailApp | null;
  setApps: (apps: EmailApp[]) => void;
  setSelectedApp: (app: EmailApp | null) => void;
  updateApp: (updated: EmailApp) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apps: [],
      selectedApp: null,
      setApps: (apps) => set({ apps }),
      setSelectedApp: (app) => set({ selectedApp: app }),
      updateApp: (updated) =>
        set((state) => ({
          apps: state.apps.map((a) => (a._id === updated._id ? updated : a)),
          selectedApp: state.selectedApp?._id === updated._id ? updated : state.selectedApp,
        })),
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ selectedApp: state.selectedApp }),
    }
  )
);
