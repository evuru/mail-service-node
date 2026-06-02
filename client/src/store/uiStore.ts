import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedDark: () => boolean;
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      resolvedDark: () => {
        const { theme } = get();
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      },
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen, theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);
