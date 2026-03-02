import { create } from 'zustand';
import { AuthState } from '../../shared/types';
import toast from 'react-hot-toast';

interface AuthStoreState extends AuthState {
  loading: boolean;
  connect: (code: string) => Promise<void>;
  disconnect: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  isAuthenticated: false,
  loading: false,

  connect: async (code: string) => {
    set({ loading: true });
    try {
      const result = await window.electronAPI.authConnect(code);
      set({ ...result, loading: false });
      if (result.isAuthenticated) {
        toast.success(`Connected as ${result.username || 'user'}`);
      } else {
        toast.error('Invalid authentication code');
      }
    } catch (err: any) {
      set({ isAuthenticated: false, loading: false });
      toast.error(`Auth failed: ${err.message}`);
    }
  },

  disconnect: async () => {
    await window.electronAPI.authDisconnect();
    set({ isAuthenticated: false, username: undefined, token: undefined, expiresAt: undefined });
    toast.success('Disconnected from server');
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
