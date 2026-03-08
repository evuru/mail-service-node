import { create } from 'zustand';
import type { PayloadSchema } from '../types';
import client from '../api/client';

interface SchemaState {
  schemas: PayloadSchema[];
  isLoading: boolean;
  error: string | null;
  fetchSchemas: () => Promise<void>;
  createSchema: (data: Partial<PayloadSchema>) => Promise<PayloadSchema>;
  updateSchema: (id: string, data: Partial<PayloadSchema>) => Promise<PayloadSchema>;
  deleteSchema: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useSchemaStore = create<SchemaState>()((set) => ({
  schemas: [],
  isLoading: false,
  error: null,

  fetchSchemas: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await client.get<PayloadSchema[]>('/payload-schemas');
      set({ schemas: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createSchema: async (schemaData) => {
    const { data } = await client.post<PayloadSchema>('/payload-schemas', schemaData);
    set((s) => ({ schemas: [data, ...s.schemas] }));
    return data;
  },

  updateSchema: async (id, schemaData) => {
    const { data } = await client.put<PayloadSchema>(`/payload-schemas/${id}`, schemaData);
    set((s) => ({ schemas: s.schemas.map((sc) => (sc._id === id ? data : sc)) }));
    return data;
  },

  deleteSchema: async (id) => {
    await client.delete(`/payload-schemas/${id}`);
    set((s) => ({ schemas: s.schemas.filter((sc) => sc._id !== id) }));
  },

  clearError: () => set({ error: null }),
}));
