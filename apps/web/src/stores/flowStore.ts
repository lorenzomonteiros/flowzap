import { create } from 'zustand';
import type { Flow } from '../types/index.ts';

interface FlowState {
  flows: Flow[];
  currentFlow: Flow | null;
  isLoading: boolean;
  isSaving: boolean;
  setFlows: (flows: Flow[]) => void;
  addFlow: (flow: Flow) => void;
  updateFlow: (id: string, updates: Partial<Flow>) => void;
  removeFlow: (id: string) => void;
  setCurrentFlow: (flow: Flow | null) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  flows: [],
  currentFlow: null,
  isLoading: false,
  isSaving: false,

  setFlows: (flows) => set({ flows }),

  addFlow: (flow) => set((state) => ({ flows: [flow, ...state.flows] })),

  updateFlow: (id, updates) =>
    set((state) => ({
      flows: state.flows.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      currentFlow:
        state.currentFlow?.id === id ? { ...state.currentFlow, ...updates } : state.currentFlow,
    })),

  removeFlow: (id) =>
    set((state) => ({
      flows: state.flows.filter((f) => f.id !== id),
      currentFlow: state.currentFlow?.id === id ? null : state.currentFlow,
    })),

  setCurrentFlow: (flow) => set({ currentFlow: flow }),

  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
}));
