import { IpcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { GameLauncher } from '../services/GameLauncher';
import { ServerClient } from '../services/ServerClient';
import { IPC_CHANNELS, InstalledGame, Game } from '../../shared/types';
import log from 'electron-log';

export function registerLaunchHandlers(ipcMain: IpcMain, gameLauncher: GameLauncher, store: Store<any>, serverClient: ServerClient): void {
  ipcMain.handle(IPC_CHANNELS.LAUNCH_GAME, async (_e, gameId: string) => {
    const installed = store.get(`installedGames.${gameId}`) as InstalledGame | undefined;
    if (!installed) throw new Error('Game not installed');

    try {
      // 1. Use stored executable from InstalledGame record (from server metadata)
      let executablePath = installed.executable || null;

      // 2. Fallback: read .game metadata file from install directory
      if (!executablePath) {
        const gameFilePath = path.join(installed.installPath, `${gameId}.game`);
        if (fs.existsSync(gameFilePath)) {
          try {
            const gameFileData = JSON.parse(fs.readFileSync(gameFilePath, 'utf-8'));
            executablePath = gameFileData.executable || null;
          } catch {}
        }
      }

      // 3. Fallback: heuristic search among downloaded files
      if (!executablePath) {
        executablePath = findExecutable(installed.installPath, installed.files);
      }

      if (!executablePath) throw new Error('No executable found for this game. Check the game configuration.');

      // Resolve launch arguments: prefer installed record, then fetch from server
      let launchArgs = installed.launchArgs;
      if (!launchArgs) {
        try {
          const gameData = await serverClient.getGame(gameId);
          if (gameData.launchArgs) {
            launchArgs = gameData.launchArgs;
          }
        } catch {
          // non-fatal, just launch without extra args
        }
      }

      await gameLauncher.launch(
        gameId,
        executablePath,
        installed.installPath,
        launchArgs,
        installed.preLaunchCommand,
      );
    } catch (err: any) {
      log.error(`Failed to launch game ${gameId}:`, err.message);
      throw new Error(`Failed to launch game: ${err.message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCH_STATUS, async (_e, gameId: string) => {
    try {
      return gameLauncher.getStatus(gameId);
    } catch (err: any) {
      log.error(`Failed to get launch status for ${gameId}:`, err.message);
      return { running: false };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCH_STOP, async (_e, gameId: string) => {
    try {
      return gameLauncher.stop(gameId);
    } catch (err: any) {
      log.error(`Failed to stop game ${gameId}:`, err.message);
      throw new Error('Failed to stop the game.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCH_PLAY_TIME, async (_e, gameId: string) => {
    try {
      return gameLauncher.getPlayStats(gameId);
    } catch (err: any) {
      log.error(`Failed to get play time for ${gameId}:`, err.message);
      return { totalPlayTime: 0, lastPlayed: null, sessions: [] };
    }
  });
}

function findExecutable(installPath: string, files: { path: string }[]): string | null {
  // Look for common executable patterns
  const exeFiles = files
    .map(f => f.path)
    .filter(p => p.endsWith('.exe') || p.endsWith('.bat') || p.endsWith('.cmd'));

  if (exeFiles.length === 1) return exeFiles[0];

  // Prefer files in root directory
  const rootExes = exeFiles.filter(p => !p.includes('/') && !p.includes('\\'));
  if (rootExes.length === 1) return rootExes[0];

  // Return first .exe found
  return exeFiles[0] || null;
}
