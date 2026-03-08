import { create } from 'zustand';
import type { Template } from '../types';
import client from '../api/client';

interface TemplateState {
  templates: Template[];
  isLoading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  createTemplate: (data: Partial<Template>) => Promise<Template>;
  updateTemplate: (slug: string, data: Partial<Template>) => Promise<Template>;
  deleteTemplate: (slug: string) => Promise<void>;
  clearError: () => void;
}

export const useTemplateStore = create<TemplateState>()((set) => ({
  templates: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await client.get<Template[]>('/templates');
      set({ templates: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createTemplate: async (templateData) => {
    const { data } = await client.post<Template>('/templates', templateData);
    set((s) => ({ templates: [data, ...s.templates] }));
    return data;
  },

  updateTemplate: async (slug, templateData) => {
    const { data } = await client.put<Template>(`/templates/${slug}`, templateData);
    set((s) => ({ templates: s.templates.map((t) => (t.slug === slug ? data : t)) }));
    return data;
  },

  deleteTemplate: async (slug) => {
    await client.delete(`/templates/${slug}`);
    set((s) => ({ templates: s.templates.filter((t) => t.slug !== slug) }));
  },

  clearError: () => set({ error: null }),
}));
