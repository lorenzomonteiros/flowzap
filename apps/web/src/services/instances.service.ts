import api from '../lib/axios.ts';
import type { WhatsAppInstance } from '../types/index.ts';

export const instancesService = {
  async list(): Promise<WhatsAppInstance[]> {
    const response = await api.get<{ success: boolean; data: WhatsAppInstance[] }>('/instances');
    return response.data.data!;
  },

  async get(id: string): Promise<WhatsAppInstance> {
    const response = await api.get<{ success: boolean; data: WhatsAppInstance }>(`/instances/${id}`);
    return response.data.data!;
  },

  async create(name: string): Promise<WhatsAppInstance> {
    const response = await api.post<{ success: boolean; data: WhatsAppInstance }>('/instances', { name });
    return response.data.data!;
  },

  async connect(id: string): Promise<void> {
    await api.post(`/instances/${id}/connect`);
  },

  async getQR(id: string): Promise<{ qr: string | null }> {
    const response = await api.get<{ success: boolean; data: { qr: string | null } }>(`/instances/${id}/qr`);
    return response.data.data!;
  },

  async disconnect(id: string): Promise<void> {
    await api.post(`/instances/${id}/disconnect`);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/instances/${id}`);
  },

  async sendMessage(id: string, to: string, text: string): Promise<void> {
    await api.post(`/instances/${id}/send`, { to, text });
  },
};
