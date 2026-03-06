import { IpcMain } from 'electron';
import { ServerClient } from '../services/ServerClient';
import { IPC_CHANNELS } from '../../shared/types';
import log from 'electron-log';

export function registerNotificationHandlers(ipcMain: IpcMain, serverClient: ServerClient): void {
  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS_GET, async (_e, opts?: { unread?: boolean; limit?: number }) => {
    try {
      return await serverClient.getNotifications(opts);
    } catch (err: any) {
      log.error('Failed to get notifications:', err.message);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS_MARK_READ, async (_e, id: string) => {
    try {
      await serverClient.markNotificationRead(id);
    } catch (err: any) {
      log.error('Failed to mark notification read:', err.message);
      throw new Error('Failed to mark notification read.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS_MARK_ALL_READ, async () => {
    try {
      await serverClient.markAllNotificationsRead();
    } catch (err: any) {
      log.error('Failed to mark all notifications read:', err.message);
      throw new Error('Failed to mark all notifications read.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS_DISMISS, async (_e, id: string) => {
    try {
      await serverClient.dismissNotification(id);
    } catch (err: any) {
      log.error('Failed to dismiss notification:', err.message);
      throw new Error('Failed to dismiss notification.');
    }
  });
}
