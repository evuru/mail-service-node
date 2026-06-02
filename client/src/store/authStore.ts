import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import client from '../api/client';

export interface PlatformRequirements {
  require_email_verification: boolean;
  require_phone_for_non_org: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  platformRequirements: PlatformRequirements | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  fetchMe: () => Promise<void>;
  fetchPlatformRequirements: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      platformRequirements: null,

      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null, platformRequirements: null }),

      fetchMe: async () => {
        if (!get().token) return;
        try {
          const { data } = await client.get<User>('/auth/me');
          set({ user: data });
        } catch { /* expired token — ProtectedRoute will redirect */ }
      },

      fetchPlatformRequirements: async () => {
        if (!get().token) return;
        try {
          const { data } = await client.get<PlatformRequirements>('/auth/platform-requirements');
          set({ platformRequirements: data });
        } catch { /* non-critical */ }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
