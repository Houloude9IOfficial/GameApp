import { create } from 'zustand';
import { ServerNotification } from '../../shared/types';

interface NotificationState {
  notifications: ServerNotification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const notifications = await window.electronAPI.getNotifications({ limit: 50 });
      const unreadCount = notifications.filter((n: ServerNotification) => !n.read).length;
      set({ notifications, unreadCount, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  markRead: async (id: string) => {
    try {
      await window.electronAPI.markNotificationRead(id);
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch { /* silent */ }
  },

  markAllRead: async () => {
    try {
      await window.electronAPI.markAllNotificationsRead();
      set(s => ({
        notifications: s.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch { /* silent */ }
  },

  dismiss: async (id: string) => {
    try {
      await window.electronAPI.dismissNotification(id);
      const notif = get().notifications.find(n => n.id === id);
      set(s => ({
        notifications: s.notifications.filter(n => n.id !== id),
        unreadCount: notif && !notif.read ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      }));
    } catch { /* silent */ }
  },
}));
