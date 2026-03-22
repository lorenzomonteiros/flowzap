import api from '../lib/axios.ts';
import type { Contact } from '../types/index.ts';

interface CreateContactInput {
  phone: string;
  name?: string;
  email?: string;
  tags?: string[];
  variables?: Record<string, unknown>;
}

interface UpdateContactInput {
  name?: string;
  email?: string;
  tags?: string[];
  variables?: Record<string, unknown>;
  optOut?: boolean;
}

interface ListContactsOptions {
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

interface ContactsResult {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const contactsService = {
  async list(options: ListContactsOptions = {}): Promise<ContactsResult> {
    const params = new URLSearchParams();
    if (options.search) params.set('search', options.search);
    if (options.tag) params.set('tag', options.tag);
    if (options.page) params.set('page', String(options.page));
    if (options.limit) params.set('limit', String(options.limit));

    const response = await api.get<{ success: boolean; data: ContactsResult }>(
      `/contacts?${params.toString()}`
    );
    return response.data.data!;
  },

  async get(id: string): Promise<Contact> {
    const response = await api.get<{ success: boolean; data: Contact }>(`/contacts/${id}`);
    return response.data.data!;
  },

  async create(input: CreateContactInput): Promise<Contact> {
    const response = await api.post<{ success: boolean; data: Contact }>('/contacts', input);
    return response.data.data!;
  },

  async update(id: string, input: UpdateContactInput): Promise<Contact> {
    const response = await api.put<{ success: boolean; data: Contact }>(`/contacts/${id}`, input);
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/contacts/${id}`);
  },

  async import(contacts: CreateContactInput[]): Promise<{ created: number; skipped: number; errors: number }> {
    const response = await api.post<{ success: boolean; data: { created: number; skipped: number; errors: number } }>(
      '/contacts/import',
      { contacts }
    );
    return response.data.data!;
  },
};
