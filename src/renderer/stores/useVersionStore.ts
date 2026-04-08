import { create } from 'zustand';

export interface VersionStoreState {
  serverVersion: string | null;
  appVersion: string | null;
  isCompatible: boolean | null;
  compatibilityMessage: string | null;
  loading: boolean;
  error: string | null;
  checkVersionCompatibility: () => Promise<void>;
}

export const useVersionStore = create<VersionStoreState>((set) => ({
  serverVersion: null,
  appVersion: null,
  isCompatible: null,
  compatibilityMessage: null,
  loading: false,
  error: null,

  checkVersionCompatibility: async () => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.versionCheck();
      set({
        serverVersion: result.serverVersion,
        appVersion: result.appVersion,
        isCompatible: result.isCompatible,
        compatibilityMessage: result.message,
        loading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to check version compatibility',
        loading: false,
      });
    }
  },
}));
