import { create } from 'zustand';
import { DownloadTask, DownloadProgress } from '../../shared/types';
import toast from 'react-hot-toast';
import { useGamesStore } from './useGamesStore';

interface DownloadState {
  queue: DownloadTask[];
  progress: Record<string, DownloadProgress>;
  loading: boolean;

  // Actions
  fetchQueue: () => Promise<void>;
  startDownload: (gameId: string, type: 'install' | 'update' | 'repair') => Promise<void>;
  pauseDownload: (taskId: string) => Promise<void>;
  resumeDownload: (taskId: string) => Promise<void>;
  cancelDownload: (taskId: string) => Promise<void>;
  initDownloadListeners: () => () => void;
  getActiveCount: () => number;
  getTotalSpeed: () => number;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  queue: [],
  progress: {},
  loading: false,

  fetchQueue: async () => {
    set({ loading: true });
    try {
      const queue = await window.electronAPI.getDownloadQueue();
      set({ queue, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  startDownload: async (gameId, type) => {
    try {
      const task = await window.electronAPI.startDownload(gameId, type);
      set(state => ({
        queue: [...state.queue.filter(t => t.id !== task.id), task],
      }));
      toast.success(`${type === 'install' ? 'Installing' : type === 'update' ? 'Updating' : 'Repairing'} ${task.gameName || gameId}`);
    } catch (err: any) {
      toast.error(`Download failed: ${err.message}`);
    }
  },

  pauseDownload: async (taskId) => {
    await window.electronAPI.pauseDownload(taskId);
    set(state => ({
      queue: state.queue.map(t =>
        t.id === taskId ? { ...t, status: 'paused' as const } : t
      ),
    }));
  },

  resumeDownload: async (taskId) => {
    await window.electronAPI.resumeDownload(taskId);
    set(state => ({
      queue: state.queue.map(t =>
        t.id === taskId ? { ...t, status: 'queued' as const } : t
      ),
    }));
  },

  cancelDownload: async (taskId) => {
    await window.electronAPI.cancelDownload(taskId);
    set(state => ({
      queue: state.queue.filter(t => t.id !== taskId),
    }));
  },

  initDownloadListeners: () => {
    const cleanupProgress = window.electronAPI.onDownloadProgress((progress) => {
      set(state => {
        const updated = state.queue.map(t => {
          if (t.id === progress.taskId) {
            return {
              ...t,
              downloadedBytes: progress.downloadedBytes,
              progress: progress.progress,
              speed: progress.speed,
              eta: progress.eta,
              status: 'downloading' as const,
            };
          }
          return t;
        });
        return {
          queue: updated,
          progress: { ...state.progress, [progress.taskId]: progress },
        };
      });
    });

    const cleanupComplete = window.electronAPI.onDownloadComplete((task) => {
      set(state => ({
        queue: state.queue.map(t =>
          t.id === task.id ? { ...t, ...task, status: 'completed' as const } : t
        ),
      }));
      toast.success(`${task.gameName || task.gameId} download complete!`);
      // Refresh installed games so the UI recognizes the game as playable
      useGamesStore.getState().fetchInstalledGames();
    });

    const cleanupError = window.electronAPI.onDownloadError(({ taskId, error }) => {
      set(state => ({
        queue: state.queue.map(t =>
          t.id === taskId ? { ...t, status: 'failed' as const, error } : t
        ),
      }));
      toast.error(`Download failed: ${error}`);
    });

    return () => {
      cleanupProgress();
      cleanupComplete();
      cleanupError();
    };
  },

  getActiveCount: () => {
    return get().queue.filter(t => t.status === 'downloading').length;
  },

  getTotalSpeed: () => {
    const { progress } = get();
    return Object.values(progress).reduce((sum, p) => sum + (p.speed || 0), 0);
  },
}));
