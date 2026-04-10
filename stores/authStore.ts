import { create } from 'zustand';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { user, token } = await api.login({ email, password });
    api.setToken(token);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  register: async (email, name, password) => {
    const { user, token } = await api.register({ email, name, password });
    api.setToken(token);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    api.setToken(null);
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    try {
      const token = api.getToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const user = await api.getMe();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      api.setToken(null);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
