import { create } from 'zustand';
import client from '../api/client';
import type { Organization, OrgLlmConfig, LlmProvider, OrgVerificationConfig, User } from '../types';

interface OrgState {
  org: Organization | null;
  members: User[];
  orgLlm: OrgLlmConfig | null;
  orgVerification: OrgVerificationConfig | null;
  loading: boolean;
  error: string | null;

  fetchOrg: () => Promise<void>;
  updateOrg: (data: { name?: string; logo_base64?: string }) => Promise<Organization>;
  fetchMembers: () => Promise<void>;
  inviteMember: (email: string, is_org_admin?: boolean) => Promise<User>;
  updateMember: (userId: string, is_org_admin: boolean) => Promise<User>;
  removeMember: (userId: string) => Promise<void>;
  fetchOrgLlm: () => Promise<void>;
  saveOrgLlm: (update: Partial<OrgLlmConfig> & { api_key?: string; provider?: LlmProvider }) => Promise<void>;
  testOrgLlm: () => Promise<string>;
  fetchOrgVerification: () => Promise<void>;
  saveOrgVerification: (update: Partial<OrgVerificationConfig>) => Promise<void>;
  clearOrg: () => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  org: null,
  members: [],
  orgLlm: null,
  orgVerification: null,
  loading: false,
  error: null,

  fetchOrg: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await client.get<Organization>('/orgs/me');
      set({ org: data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  updateOrg: async (data) => {
    const { data: updated } = await client.put<Organization>('/orgs/me', data);
    set({ org: updated });
    return updated;
  },

  fetchMembers: async () => {
    const { data } = await client.get<User[]>('/orgs/me/members');
    set({ members: data });
  },

  inviteMember: async (email, is_org_admin = false) => {
    const { data } = await client.post<User>('/orgs/me/members', { email, is_org_admin });
    set((s) => ({ members: [...s.members, data] }));
    return data;
  },

  updateMember: async (userId, is_org_admin) => {
    const { data } = await client.put<User>(`/orgs/me/members/${userId}`, { is_org_admin });
    set((s) => ({ members: s.members.map((m) => (m._id === userId ? { ...m, is_org_admin } : m)) }));
    return data;
  },

  removeMember: async (userId) => {
    await client.delete(`/orgs/me/members/${userId}`);
    set((s) => ({ members: s.members.filter((m) => m._id !== userId) }));
  },

  fetchOrgLlm: async () => {
    const { data } = await client.get<OrgLlmConfig>('/orgs/me/llm');
    set({ orgLlm: data });
  },

  saveOrgLlm: async (update) => {
    const { data } = await client.put<OrgLlmConfig>('/orgs/me/llm', update);
    set({ orgLlm: data });
  },

  testOrgLlm: async () => {
    const { data } = await client.post<{ ok: boolean; response?: string; error?: string }>('/orgs/me/llm/test');
    if (!data.ok) throw new Error(data.error ?? 'Test failed');
    return data.response ?? 'OK';
  },

  fetchOrgVerification: async () => {
    const { data } = await client.get<OrgVerificationConfig>('/orgs/me/verification');
    set({ orgVerification: data });
  },

  saveOrgVerification: async (update) => {
    const { data } = await client.put<OrgVerificationConfig>('/orgs/me/verification', update);
    set({ orgVerification: data });
  },

  clearOrg: () => set({ org: null, members: [], orgLlm: null, orgVerification: null, error: null }),
}));
