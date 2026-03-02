import { create } from 'zustand';
import { AppSettings, LockedSettings } from '../../shared/types';

interface SettingsState {
  settings: AppSettings | null;
  lockedSettings: LockedSettings;
  loading: boolean;
  saved: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLocked: (key: string) => boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  lockedSettings: { serverUrl: false, apiKey: false },
  loading: false,
  saved: false,

  loadSettings: async () => {
    set({ loading: true });
    try {
      const [settings, locked] = await Promise.all([
        window.electronAPI.getSettings(),
        window.electronAPI.getLockedSettings(),
      ]);
      set({ settings, lockedSettings: locked, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateSettings: async (partial) => {
    try {
      const updated = await window.electronAPI.setSettings(partial);
      set({ settings: updated, saved: true });
      setTimeout(() => set({ saved: false }), 2000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
    }
  },

  resetSettings: async () => {
    try {
      const settings = await window.electronAPI.resetSettings();
      set({ settings });
    } catch {}
  },

  isLocked: (key: string) => {
    return get().lockedSettings[key] ?? false;
  },
}));
