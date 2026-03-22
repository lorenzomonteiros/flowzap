import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/index.ts';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user }),

      setAccessToken: (token) => {
        localStorage.setItem('accessToken', token);
        set({ accessToken: token });
      },

      login: (user, token) => {
        localStorage.setItem('accessToken', token);
        set({ user, accessToken: token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'flowzap-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
