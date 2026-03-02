import { IpcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ServerClient } from '../services/ServerClient';
import Store from 'electron-store';
import { IPC_CHANNELS, InstalledGame } from '../../shared/types';
import log from 'electron-log';

export function registerGamesHandlers(ipcMain: IpcMain, serverClient: ServerClient, store: Store<any>): void {
  ipcMain.handle(IPC_CHANNELS.GAMES_GET_ALL, async () => {
    try {
      return await serverClient.getGames();
    } catch (err: any) {
      log.error('Failed to fetch games:', err.message);
      throw new Error('Failed to fetch games from server. Check your connection.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.GAMES_GET_ONE, async (_e, id: string) => {
    try {
      return await serverClient.getGame(id);
    } catch (err: any) {
      log.error(`Failed to fetch game ${id}:`, err.message);
      throw new Error(`Failed to fetch game details: ${err.message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GAMES_SEARCH, async (_e, params: Record<string, string>) => {
    try {
      return await serverClient.searchGames(params);
    } catch (err: any) {
      log.error('Search failed:', err.message);
      throw new Error('Search failed. Check your connection.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.GAMES_GET_TAGS, async () => {
    try {
      return await serverClient.getTags();
    } catch (err: any) {
      log.error('Failed to fetch tags:', err.message);
      throw new Error('Failed to fetch tags from server.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.GAMES_GET_CATEGORIES, async () => {
    try {
      return await serverClient.getCategories();
    } catch (err: any) {
      log.error('Failed to fetch categories:', err.message);
      throw new Error('Failed to fetch categories from server.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.GAMES_CHECK_UPDATE, async (_e, gameId: string, currentVersion: string) => {
    try {
      return await serverClient.checkVersion(gameId, currentVersion);
    } catch (err: any) {
      log.error(`Failed to check update for ${gameId}:`, err.message);
      throw new Error('Failed to check for updates. Check your connection.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.GAMES_GET_FILES, async (_e, gameId: string) => {
    try {
      return await serverClient.getFiles(gameId);
    } catch (err: any) {
      log.error(`Failed to get files for ${gameId}:`, err.message);
      throw new Error('Failed to fetch file list from server.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.GAMES_GET_INSTALL_STATUS, async (_e, gameId: string) => {
    const installed = store.get(`installedGames.${gameId}`) as InstalledGame | undefined;
    if (!installed) {
      return { status: 'not-installed' };
    }
    return { status: 'installed', installedGame: installed };
  });

  ipcMain.handle(IPC_CHANNELS.GAMES_GET_ALL_INSTALLED, async () => {
    const all = store.get('installedGames', {}) as Record<string, InstalledGame>;
    return Object.values(all);
  });

  ipcMain.handle(IPC_CHANNELS.GAMES_UNINSTALL, async (_e, gameId: string) => {
    const installed = store.get(`installedGames.${gameId}`) as InstalledGame | undefined;
    if (!installed) throw new Error('Game is not installed');
    try {
      if (fs.existsSync(installed.installPath)) {
        fs.rmSync(installed.installPath, { recursive: true, force: true });
      }
      store.delete(`installedGames.${gameId}` as any);

      // Delete desktop shortcut if one exists
      try {
        const { app } = require('electron');
        const desktopDir = app.getPath('desktop');
        const deeplinkUrl = `gameapp://launch/${gameId}`;
        const files = fs.readdirSync(desktopDir).filter((f: string) => f.endsWith('.url'));
        for (const file of files) {
          try {
            const shortcutPath = path.join(desktopDir, file);
            const content = fs.readFileSync(shortcutPath, 'utf-8');
            if (content.includes(deeplinkUrl)) {
              fs.unlinkSync(shortcutPath);
              log.info(`Desktop shortcut deleted on uninstall: ${shortcutPath}`);
              break;
            }
          } catch { /* skip unreadable files */ }
        }
        // Clean up cached icon
        const iconCacheDir = path.join(app.getPath('userData'), 'icon-cache');
        const iconPath = path.join(iconCacheDir, `${gameId}.ico`);
        if (fs.existsSync(iconPath)) fs.unlinkSync(iconPath);
      } catch (err: any) {
        log.warn(`Failed to clean up shortcut for ${gameId}: ${err.message}`);
      }
    } catch (err: any) {
      log.error(`Failed to uninstall ${gameId}:`, err.message);
      throw new Error(`Failed to uninstall: ${err.message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GAMES_VERIFY_INTEGRITY, async (_e, gameId: string) => {
    const installed = store.get(`installedGames.${gameId}`) as InstalledGame | undefined;
    if (!installed) throw new Error('Game not installed');

    try {
      // Re-hash files from disk for true integrity verification
      const localFiles: { path: string; hash: string }[] = [];
      for (const file of installed.files) {
        const fullPath = path.join(installed.installPath, file.path);
        if (fs.existsSync(fullPath)) {
          const hash = crypto.createHash('sha256');
          const content = fs.readFileSync(fullPath);
          hash.update(content);
          localFiles.push({ path: file.path, hash: hash.digest('hex') });
        }
        // If file doesn't exist on disk, don't include it — the delta will detect it as missing
      }

      return await serverClient.getDelta(gameId, localFiles);
    } catch (err: any) {
      log.error(`Verification failed for ${gameId}:`, err.message);
      throw new Error(`Verification failed: ${err.message}`);
    }
  });
}
