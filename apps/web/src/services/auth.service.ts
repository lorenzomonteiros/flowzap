import api from '../lib/axios.ts';
import type { User } from '../types/index.ts';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
}

export const authService = {
  async login(input: LoginInput): Promise<AuthResponse> {
    const response = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', input);
    return response.data.data!;
  },

  async register(input: RegisterInput): Promise<AuthResponse> {
    const response = await api.post<{ success: boolean; data: AuthResponse }>('/auth/register', input);
    return response.data.data!;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getMe(): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>('/auth/me');
    return response.data.data!;
  },

  async refresh(): Promise<{ accessToken: string }> {
    const response = await api.post<{ success: boolean; data: { accessToken: string } }>('/auth/refresh');
    return response.data.data!;
  },
};
