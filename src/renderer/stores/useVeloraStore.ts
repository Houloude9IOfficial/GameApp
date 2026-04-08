import { create } from 'zustand';

export interface CurrentTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  thumbnail_url?: string;
  duration: number;
  position: number;
  is_playing: boolean;
}

export interface PlaybackState {
  is_playing: boolean;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all' | 'on';
}

export interface VeloraState {
  // Connection
  token: string | null;
  permissions: ('read' | 'write')[] | null;
  isWSConnected: boolean;
  isConnectingWS: boolean;
  isInitializing: boolean;

  // Playback Data
  currentTrack: CurrentTrack | null;
  playbackState: PlaybackState | null;

  // UI State
  isConfigured: boolean;
  error: string | null;

  // Actions
  initialize: (token?: string, permissions?: ('read' | 'write')[]) => Promise<void>;
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => Promise<void>;
  setToken: (token: string, permissions: ('read' | 'write')[]) => void;
  clearAll: () => Promise<void>;
  updateTrack: (track: CurrentTrack | null) => void;
  updatePlaybackState: (state: PlaybackState | null) => void;
  setWSConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;

  // Playback Controls
  play: (trackId?: string) => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => Promise<void>;
  seek: (position: number) => Promise<void>;

  // Helpers
  isReady: () => boolean;
  formatTime: (ms: number) => string;
  getTrackProgress: () => number;
}

export const useVeloraStore = create<VeloraState>((set, get) => ({
  // Initial State
  token: null,
  permissions: null,
  isWSConnected: false,
  isConnectingWS: false,
  isInitializing: false,
  currentTrack: null,
  playbackState: null,
  isConfigured: false,
  error: null,

  // Initialize with token from settings
  initialize: async (token?: string, permissions?: ('read' | 'write')[]) => {
    set({ isInitializing: true });
    try {
      if (token && permissions) {
        set({
          token,
          permissions,
          isConfigured: true,
          error: null,
        });
      } else {
        set({ isConfigured: false });
      }
    } catch (err: any) {
      set({
        error: err.message,
        isConfigured: false,
      });
    } finally {
      set({ isInitializing: false });
    }
  },

  // Connect to WebSocket (via IPC)
  connectWebSocket: async () => {
    const state = get();
    if (!state.token || !state.permissions) {
      set({ error: 'Velora not configured' });
      return;
    }

    set({ isConnectingWS: true, error: null });

    try {
      // IPC call to main process to connect WebSocke
      await (window.electronAPI.velora as any).connectWebSocket?.();
      set({ isWSConnected: true, isConnectingWS: false });
    } catch (err: any) {
      set({
        error: 'Failed to connect to Velora: ' + err.message,
        isConnectingWS: false,
      });
    }
  },

  // Disconnect from WebSocket (via IPC)
  disconnectWebSocket: async () => {
    try {
      await (window.electronAPI.velora as any).disconnectWebSocket?.();
      set({ isWSConnected: false });
    } catch (err: any) {
      console.error('Error disconnecting from Velora:', err);
    }
  },

  // Set token (e.g., after registration)
  setToken: (token: string, permissions: ('read' | 'write')[]) => {
    set({
      token,
      permissions,
      isConfigured: true,
      error: null,
    });
  },

  // Clear all Velora data and disconnect
  clearAll: async () => {
    try {
      await (window.electronAPI.velora as any).disconnectWebSocket?.();
    } catch {}

    set({
      token: null,
      permissions: null,
      isWSConnected: false,
      isConnectingWS: false,
      isConfigured: false,
      currentTrack: null,
      playbackState: null,
      error: null,
    });
  },

  // Update track (called from IPC listener)
  updateTrack: (track: CurrentTrack | null) => {
    set({ currentTrack: track });
  },

  // Update playback state (called from IPC listener)
  updatePlaybackState: (state: PlaybackState | null) => {
    set({ playbackState: state });
  },

  // Set WebSocket connected status
  setWSConnected: (connected: boolean) => {
    set({ isWSConnected: connected });
  },

  // Set error message
  setError: (error: string | null) => {
    set({ error });
  },

  // Playback Controls (via IPC)
  play: async (trackId?: string) => {
    const state = get();
    if (!state.token || !state.permissions?.includes('write')) {
      set({ error: 'Missing write permission' });
      return;
    }

    try {
      await window.electronAPI.velora.play(trackId);
    } catch (err: any) {
      set({ error: 'Failed to play: ' + err.message });
    }
  },

  pause: async () => {
    const state = get();
    if (!state.token || !state.permissions?.includes('write')) {
      set({ error: 'Missing write permission' });
      return;
    }

    try {
      await window.electronAPI.velora.pause();
    } catch (err: any) {
      set({ error: 'Failed to pause: ' + err.message });
    }
  },

  togglePlayPause: async () => {
    const state = get();
    if (!state.token || !state.permissions?.includes('write')) {
      set({ error: 'Missing write permission' });
      return;
    }

    try {
      await window.electronAPI.velora.toggle();
    } catch (err: any) {
      set({ error: 'Failed to toggle: ' + err.message });
    }
  },

  next: async () => {
    const state = get();
    if (!state.token || !state.permissions?.includes('write')) {
      set({ error: 'Missing write permission' });
      return;
    }

    try {
      await window.electronAPI.velora.next();
    } catch (err: any) {
      set({ error: 'Failed to skip: ' + err.message });
    }
  },

  seek: async (position: number) => {
    const state = get();
    if (!state.token || !state.permissions?.includes('write')) {
      set({ error: 'Missing write permission' });
      return;
    }

    try {
      await window.electronAPI.velora.seek(position);
    } catch (err: any) {
      set({ error: 'Failed to seek: ' + err.message });
    }
  },

  // Helper: Check if store is ready to use
  isReady: () => {
    const state = get();
    return state.isWSConnected && state.token !== null;
  },

  // Helper: Format milliseconds to MM:SS
  formatTime: (ms: number) => {
    if (!ms || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  // Helper: Get progress percentage (0-100)
  getTrackProgress: () => {
    const state = get();
    if (!state.currentTrack || state.currentTrack.duration === 0) return 0;
    return Math.min(100, (state.currentTrack.position / state.currentTrack.duration) * 100);
  },
}));
