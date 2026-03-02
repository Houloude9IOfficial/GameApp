import { IpcMain } from 'electron';
import Store from 'electron-store';
import { ServerClient } from '../services/ServerClient';
import { DownloadManager } from '../services/DownloadManager';
import { IPC_CHANNELS, AppSettings, LockedSettings, ThemeConfig } from '../../shared/types';
import { BUILT_IN_THEMES } from '../themes';
import log from 'electron-log';

export function registerSettingsHandlers(
  ipcMain: IpcMain,
  store: Store<any>,
  lockedSettings: LockedSettings,
  serverClient: ServerClient,
  downloadManager: DownloadManager,
): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return store.get('settings') as AppSettings;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_e, partial: Partial<AppSettings>) => {
    try {
      const current = store.get('settings') as AppSettings;

      // Prevent changing locked settings
      for (const key of Object.keys(partial)) {
        if (lockedSettings[key]) {
          delete (partial as any)[key];
        }
      }

      const updated = { ...current, ...partial };
      store.set('settings', updated);

      // Apply side effects
      if (partial.serverUrl || partial.apiKey || partial.authToken) {
        serverClient.updateConfig({
          baseUrl: updated.serverUrl,
          apiKey: updated.apiKey,
          authToken: updated.authToken,
        });
      }

      if (partial.bandwidthLimit !== undefined) {
        downloadManager.setBandwidthLimit(partial.bandwidthLimit);
      }

      return updated;
    } catch (err: any) {
      log.error('Failed to save settings:', err.message);
      throw new Error('Failed to save settings.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_LOCKED, async () => {
    return lockedSettings;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_DEFAULTS, async () => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const defaultsPath = path.join(process.resourcesPath || path.join(__dirname, '..', '..'), 'defaults.json');
      if (fs.existsSync(defaultsPath)) {
        return JSON.parse(fs.readFileSync(defaultsPath, 'utf-8'));
      }
    } catch (err: any) {
      log.warn('Could not load defaults.json:', err.message);
    }
    return {};
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, async () => {
    const defaults: AppSettings = {
      serverUrl: 'http://localhost:3000',
      apiKey: '',
      installDirectory: store.get('settings.installDirectory') as string || 'C:\\Program Files\\GL\\Games',
      maxConcurrentDownloads: 3,
      bandwidthLimit: 0,
      autoUpdate: true,
      updateCheckInterval: 1800000,
      verifyAfterDownload: true,
      preferDeltaUpdates: true,
      theme: 'dark',
      uiScale: 1,
      sidebarPosition: 'left',
      defaultViewMode: 'grid',
      defaultCardSize: 3,
      launchOnStartup: false,
      minimizeToTray: true,
      startMinimized: false,
      startPage: 'store',
      language: 'en',
    };
    store.set('settings', defaults);
    return defaults;
  });

  // Theme handlers
  ipcMain.handle(IPC_CHANNELS.THEME_GET_ALL, async () => {
    const customThemes = store.get('customThemes', []) as ThemeConfig[];
    return [...BUILT_IN_THEMES, ...customThemes];
  });

  ipcMain.handle(IPC_CHANNELS.THEME_SET, async (_e, themeId: string) => {
    store.set('settings.theme', themeId);
  });

  ipcMain.handle(IPC_CHANNELS.THEME_EXPORT, async (_e, theme: ThemeConfig) => {
    try {
      const { dialog } = await import('electron');
      const result = await dialog.showSaveDialog({
        defaultPath: `${theme.name.replace(/\s+/g, '-').toLowerCase()}-theme.json`,
        filters: [{ name: 'Theme Files', extensions: ['json'] }],
      });

      if (!result.canceled && result.filePath) {
        const fs = await import('fs');
        fs.writeFileSync(result.filePath, JSON.stringify(theme, null, 2));
        return result.filePath;
      }
      return null;
    } catch (err: any) {
      log.error('Failed to export theme:', err.message);
      throw new Error('Failed to export theme.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.THEME_IMPORT, async (_e, filePath: string) => {
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      const theme = JSON.parse(content) as ThemeConfig;
      theme.id = `custom-${Date.now()}`;

      const customThemes = store.get('customThemes', []) as ThemeConfig[];
      customThemes.push(theme);
      store.set('customThemes', customThemes);

      return theme;
    } catch (err: any) {
      log.error('Failed to import theme:', err.message);
      throw new Error('Failed to import theme. Make sure the file is a valid theme JSON.');
    }
  });

  // Server connection test
  ipcMain.handle(IPC_CHANNELS.SERVER_HEALTH, async () => {
    try {
      return await serverClient.health();
    } catch (err: any) {
      log.error('Server health check failed:', err.message);
      throw new Error('Server is not reachable. Check your connection settings.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SERVER_INFO, async () => {
    try {
      return await serverClient.info();
    } catch (err: any) {
      log.error('Failed to fetch server info:', err.message);
      throw new Error('Failed to fetch server info. Check your connection.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SERVER_TEST, async (_e, url: string) => {
    try {
      return await serverClient.testConnection(url);
    } catch (err: any) {
      log.error('Connection test failed:', err.message);
      throw new Error(`Connection test failed: ${err.message}`);
    }
  });
}
