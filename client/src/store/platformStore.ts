import { create } from 'zustand';
import type { PlatformLlmConfig } from '../types';
import client from '../api/client';

interface PlatformState {
  llm: PlatformLlmConfig | null;
  isLoading: boolean;
  fetchPlatform: () => Promise<void>;
  saveLlm: (update: Partial<PlatformLlmConfig> & { api_key?: string }) => Promise<void>;
  testLlm: () => Promise<string>;
}

export const usePlatformStore = create<PlatformState>()((set) => ({
  llm: null,
  isLoading: false,

  fetchPlatform: async () => {
    set({ isLoading: true });
    try {
      const { data } = await client.get<{ llm: PlatformLlmConfig }>('/admin/platform');
      set({ llm: data.llm, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  saveLlm: async (update) => {
    const { data } = await client.put<{ llm: PlatformLlmConfig }>('/admin/platform', { llm: update });
    set({ llm: data.llm });
  },

  testLlm: async () => {
    const { data } = await client.post<{ ok: boolean; response?: string; error?: string }>('/ai/test');
    if (!data.ok) throw new Error(data.error ?? 'Test failed');
    return data.response ?? 'OK';
  },
}));
