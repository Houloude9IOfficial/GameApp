import { IpcMain } from 'electron';
import Store from 'electron-store';
import { DownloadManager } from '../services/DownloadManager';
import { IPC_CHANNELS } from '../../shared/types';
import log from 'electron-log';

export function registerDownloadHandlers(ipcMain: IpcMain, downloadManager: DownloadManager, store: Store<any>): void {
  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_START, async (_e, gameId: string, type: 'install' | 'update' | 'repair') => {
    try {
      const games = store.get('installedGames', {}) as Record<string, any>;
      const gameName = games[gameId]?.name || gameId;
      return await downloadManager.startDownload(gameId, gameName, type);
    } catch (err: any) {
      log.error(`Failed to start download for ${gameId}:`, err.message);
      throw new Error(`Failed to start download: ${err.message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_PAUSE, async (_e, taskId: string) => {
    try {
      return await downloadManager.pauseDownload(taskId);
    } catch (err: any) {
      log.error(`Failed to pause download ${taskId}:`, err.message);
      throw new Error('Failed to pause download.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_RESUME, async (_e, taskId: string) => {
    try {
      return await downloadManager.resumeDownload(taskId);
    } catch (err: any) {
      log.error(`Failed to resume download ${taskId}:`, err.message);
      throw new Error('Failed to resume download.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_CANCEL, async (_e, taskId: string) => {
    try {
      return await downloadManager.cancelDownload(taskId);
    } catch (err: any) {
      log.error(`Failed to cancel download ${taskId}:`, err.message);
      throw new Error('Failed to cancel download.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_GET_QUEUE, async () => {
    try {
      return await downloadManager.getQueue();
    } catch (err: any) {
      log.error('Failed to get download queue:', err.message);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_SET_BANDWIDTH, async (_e, bytesPerSec: number) => {
    try {
      downloadManager.setBandwidthLimit(bytesPerSec);
    } catch (err: any) {
      log.error('Failed to set bandwidth limit:', err.message);
      throw new Error('Failed to set bandwidth limit.');
    }
  });
}
