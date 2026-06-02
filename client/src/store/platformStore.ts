import { create } from 'zustand';
import type { PlatformLlmConfig, PlatformVerificationConfig, PlatformMailer } from '../types';
import client from '../api/client';

interface PlatformResponse {
  llm: PlatformLlmConfig;
  verification: PlatformVerificationConfig;
}

export interface MailerStatus {
  configured: boolean;
  has_db_mailer: boolean;
  has_env_mailer: boolean;
  env_vars_needed: string[] | null;
}

interface PlatformState {
  llm: PlatformLlmConfig | null;
  verification: PlatformVerificationConfig | null;
  mailers: PlatformMailer[];
  isLoading: boolean;
  mailersLoading: boolean;

  fetchPlatform: () => Promise<void>;
  saveLlm: (update: Partial<PlatformLlmConfig> & { api_key?: string }) => Promise<void>;
  saveVerification: (update: Partial<PlatformVerificationConfig>) => Promise<void>;
  testLlm: () => Promise<string>;

  fetchMailers: () => Promise<void>;
  createMailer: (data: Omit<PlatformMailer, '_id' | 'created_at' | 'pass_set'> & { pass: string }) => Promise<PlatformMailer>;
  updateMailer: (id: string, data: Partial<Omit<PlatformMailer, '_id' | 'created_at' | 'pass_set'>> & { pass?: string }) => Promise<PlatformMailer>;
  deleteMailer: (id: string) => Promise<void>;
  testMailer: (cfg: { host: string; port: number; secure: boolean; user: string; pass: string; from_name: string; from_email: string; test_to: string }) => Promise<void>;

  checkMailerStatus: () => Promise<MailerStatus>;
  sendTestCode: (email: string) => Promise<string>;
  verifyTestCode: (testId: string, code: string) => Promise<void>;
  testActiveMailer: (to: string) => Promise<void>;
}

export const usePlatformStore = create<PlatformState>()((set) => ({
  llm: null,
  verification: null,
  mailers: [],
  isLoading: false,
  mailersLoading: false,

  fetchPlatform: async () => {
    set({ isLoading: true });
    try {
      const { data } = await client.get<PlatformResponse>('/admin/platform');
      set({ llm: data.llm, verification: data.verification, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  saveLlm: async (update) => {
    const { data } = await client.put<PlatformResponse>('/admin/platform', { llm: update });
    set({ llm: data.llm, verification: data.verification });
  },

  saveVerification: async (update) => {
    const { data } = await client.put<PlatformResponse>('/admin/platform', { verification: update });
    set({ llm: data.llm, verification: data.verification });
  },

  testLlm: async () => {
    const { data } = await client.post<{ ok: boolean; response?: string; error?: string }>('/ai/test');
    if (!data.ok) throw new Error(data.error ?? 'Test failed');
    return data.response ?? 'OK';
  },

  fetchMailers: async () => {
    set({ mailersLoading: true });
    try {
      const { data } = await client.get<PlatformMailer[]>('/admin/mailers');
      set({ mailers: data, mailersLoading: false });
    } catch {
      set({ mailersLoading: false });
    }
  },

  createMailer: async (data) => {
    const { data: created } = await client.post<PlatformMailer>('/admin/mailers', data);
    set((s) => ({ mailers: [...s.mailers, created].sort((a, b) => a.priority - b.priority) }));
    return created;
  },

  updateMailer: async (id, data) => {
    const { data: updated } = await client.put<PlatformMailer>(`/admin/mailers/${id}`, data);
    set((s) => ({
      mailers: s.mailers.map((m) => (m._id === id ? updated : m)).sort((a, b) => a.priority - b.priority),
    }));
    return updated;
  },

  deleteMailer: async (id) => {
    await client.delete(`/admin/mailers/${id}`);
    set((s) => ({ mailers: s.mailers.filter((m) => m._id !== id) }));
  },

  testMailer: async (cfg) => {
    const { data } = await client.post<{ ok: boolean; error?: string }>('/admin/mailers/test', cfg);
    if (!data.ok) throw new Error(data.error ?? 'Mailer test failed');
  },

  checkMailerStatus: async () => {
    const { data } = await client.get<MailerStatus>('/admin/platform/mailer-status');
    return data;
  },

  sendTestCode: async (email) => {
    const { data } = await client.post<{ test_id: string }>('/admin/platform/send-test-code', { email });
    return data.test_id;
  },

  verifyTestCode: async (testId, code) => {
    const { data } = await client.post<{ ok: boolean; error?: string }>('/admin/platform/verify-test-code', { test_id: testId, code });
    if (!data.ok) throw new Error(data.error ?? 'Verification failed');
  },

  testActiveMailer: async (to) => {
    const { data } = await client.post<{ ok: boolean; error?: string }>('/admin/platform/test-active-mailer', { to });
    if (!data.ok) throw new Error(data.error ?? 'Test failed');
  },
}));
