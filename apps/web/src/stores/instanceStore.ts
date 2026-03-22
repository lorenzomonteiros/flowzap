import { create } from 'zustand';
import type { WhatsAppInstance } from '../types/index.ts';

interface InstanceState {
  instances: WhatsAppInstance[];
  selectedInstance: WhatsAppInstance | null;
  isLoading: boolean;
  setInstances: (instances: WhatsAppInstance[]) => void;
  addInstance: (instance: WhatsAppInstance) => void;
  updateInstance: (id: string, updates: Partial<WhatsAppInstance>) => void;
  removeInstance: (id: string) => void;
  selectInstance: (instance: WhatsAppInstance | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useInstanceStore = create<InstanceState>((set) => ({
  instances: [],
  selectedInstance: null,
  isLoading: false,

  setInstances: (instances) => set({ instances }),

  addInstance: (instance) =>
    set((state) => ({ instances: [...state.instances, instance] })),

  updateInstance: (id, updates) =>
    set((state) => ({
      instances: state.instances.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      selectedInstance:
        state.selectedInstance?.id === id
          ? { ...state.selectedInstance, ...updates }
          : state.selectedInstance,
    })),

  removeInstance: (id) =>
    set((state) => ({
      instances: state.instances.filter((i) => i.id !== id),
      selectedInstance: state.selectedInstance?.id === id ? null : state.selectedInstance,
    })),

  selectInstance: (instance) => set({ selectedInstance: instance }),

  setLoading: (isLoading) => set({ isLoading }),
}));
