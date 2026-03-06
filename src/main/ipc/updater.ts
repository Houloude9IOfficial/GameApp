import { IpcMain, BrowserWindow, app } from 'electron';
import Store from 'electron-store';
import log from 'electron-log';
import { IPC_CHANNELS, AppSettings } from '../../shared/types';

export function registerUpdaterHandlers(ipcMain: IpcMain, mainWindow: BrowserWindow | null, store: Store<any>): void {
  let autoUpdater: any;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch {
    log.warn('electron-updater not available, auto-update disabled');
    ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, () => null);
    ipcMain.handle(IPC_CHANNELS.UPDATER_DOWNLOAD, () => {});
    ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL, () => {});
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = log;

  let updateInfo: any = null;

  /** Read serverUrl from store and point electron-updater at it */
  function applyFeedUrl(): void {
    const settings = store.get('settings') as AppSettings | undefined;
    const serverUrl = settings?.serverUrl || 'http://localhost:3000';
    const feedUrl = serverUrl.replace(/\/+$/, '') + '/api/updates';
    try {
      autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });
      log.info('Updater feed URL set to', feedUrl);
    } catch (err: any) {
      log.warn('Failed to set feed URL:', err.message);
    }
  }

  autoUpdater.on('update-available', (info: any) => {
    updateInfo = { version: info.version, releaseNotes: info.releaseNotes, mandatory: false };
    mainWindow?.webContents.send('updater:available', updateInfo);
  });

  autoUpdater.on('update-not-available', () => {
    updateInfo = null;
  });

  autoUpdater.on('download-progress', (progress: any) => {
    mainWindow?.webContents.send('updater:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('updater:downloaded');
  });

  autoUpdater.on('error', (err: Error) => {
    log.error('Auto-updater error:', err.message);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, async () => {
    try {
      applyFeedUrl();
      const result = await autoUpdater.checkForUpdates();
      if (result?.updateInfo) {
        return { version: result.updateInfo.version, releaseNotes: result.updateInfo.releaseNotes };
      }
      return null;
    } catch (err: any) {
      log.error('Update check failed:', err.message);
      return null;
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_DOWNLOAD, async () => {
    await autoUpdater.downloadUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL, () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_STATUS, () => {
    return updateInfo;
  });

  // ── Automatic background update check ──
  const settings = store.get('settings') as AppSettings | undefined;
  if (settings?.autoUpdate) {
    const interval = settings.updateCheckInterval || 1800000; // default 30 min
    log.info(`Auto-update enabled, checking every ${interval / 60000} min`);

    // Initial check after a short delay (let the app fully load)
    const initialTimeout = setTimeout(() => {
      applyFeedUrl();
      autoUpdater.checkForUpdates().catch((e: any) => log.warn('Auto-update check failed:', e.message));
    }, 15000);

    const periodicInterval = setInterval(() => {
      applyFeedUrl();
      autoUpdater.checkForUpdates().catch((e: any) => log.warn('Auto-update check failed:', e.message));
    }, interval);

    app.on('before-quit', () => {
      clearTimeout(initialTimeout);
      clearInterval(periodicInterval);
    });
  }
}
