import { create } from 'zustand';
import { AuthState } from '../../shared/types';
import toast from 'react-hot-toast';

interface AuthStoreState extends AuthState {
  loading: boolean;
  register: (username: string, password: string) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  isAuthenticated: false,
  loading: false,

  register: async (username: string, password: string) => {
    set({ loading: true });
    try {
      const result = await window.electronAPI.authRegister(username, password);
      set({ ...result, loading: false });
      if (result.isAuthenticated) {
        toast.success(`Account created! Welcome, ${result.username}`);
        return true;
      }
      toast.error('Registration failed');
      return false;
    } catch (err: any) {
      set({ isAuthenticated: false, loading: false });
      toast.error(err.message || 'Registration failed');
      return false;
    }
  },

  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
      const result = await window.electronAPI.authLogin(username, password);
      set({ ...result, loading: false });
      if (result.isAuthenticated) {
        toast.success(`Welcome back, ${result.username}`);
        return true;
      }
      toast.error('Invalid username or password');
      return false;
    } catch (err: any) {
      set({ isAuthenticated: false, loading: false });
      toast.error(err.message || 'Login failed');
      return false;
    }
  },

  logout: async () => {
    await window.electronAPI.authLogout();
    set({ isAuthenticated: false, username: undefined, token: undefined, expiresAt: undefined });
    toast.success('Logged out');
  },

  deleteAccount: async () => {
    try {
      await window.electronAPI.authDeleteAccount();
      set({ isAuthenticated: false, username: undefined, token: undefined, expiresAt: undefined });
      toast.success('Account deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
    }
  },

  checkStatus: async () => {
    try {
      const result = await window.electronAPI.getAuthStatus();
      set(result);
    } catch {
      set({ isAuthenticated: false });
    }
  },
}));
