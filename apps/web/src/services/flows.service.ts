import api from '../lib/axios.ts';
import type { Flow, FlowExecution, DashboardStats } from '../types/index.ts';

interface CreateFlowInput {
  name: string;
  description?: string;
  trigger: { type: string; config: Record<string, unknown> };
  nodes: unknown[];
  edges: unknown[];
}

interface UpdateFlowInput {
  name?: string;
  description?: string;
  trigger?: { type: string; config: Record<string, unknown> };
  nodes?: unknown[];
  edges?: unknown[];
  isActive?: boolean;
}

export const flowsService = {
  async getDashboard(): Promise<DashboardStats> {
    const response = await api.get<{ success: boolean; data: DashboardStats }>('/flows/dashboard');
    return response.data.data!;
  },

  async list(): Promise<Flow[]> {
    const response = await api.get<{ success: boolean; data: Flow[] }>('/flows');
    return response.data.data!;
  },

  async get(id: string): Promise<Flow> {
    const response = await api.get<{ success: boolean; data: Flow }>(`/flows/${id}`);
    return response.data.data!;
  },

  async create(input: CreateFlowInput): Promise<Flow> {
    const response = await api.post<{ success: boolean; data: Flow }>('/flows', input);
    return response.data.data!;
  },

  async update(id: string, input: UpdateFlowInput): Promise<Flow> {
    const response = await api.put<{ success: boolean; data: Flow }>(`/flows/${id}`, input);
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/flows/${id}`);
  },

  async toggle(id: string): Promise<Flow> {
    const response = await api.post<{ success: boolean; data: Flow }>(`/flows/${id}/toggle`);
    return response.data.data!;
  },

  async getExecutions(id: string): Promise<FlowExecution[]> {
    const response = await api.get<{ success: boolean; data: FlowExecution[] }>(`/flows/${id}/executions`);
    return response.data.data!;
  },
};
