import { IpcMain, app } from 'electron';
import { ServerClient } from '../services/ServerClient';
import { checkVersionCompatibility } from '../utils/versionCompatibility';
import { IPC_CHANNELS } from '../../shared/types';
import log from 'electron-log';

export interface VersionCheckResponse {
  isCompatible: boolean;
  appVersion: string;
  serverVersion: string;
  message: string | null;
}

export function registerVersionHandlers(
  ipcMain: IpcMain,
  serverClient: ServerClient,
): void {
  ipcMain.handle(IPC_CHANNELS.SERVER_VERSION_CHECK, async (): Promise<VersionCheckResponse> => {
    try {
      const appVersion = app.getVersion();
      const health = await serverClient.health();
      const serverVersion = health.version;

      const result = checkVersionCompatibility(appVersion, serverVersion);

      log.info(`Version check: app=${appVersion}, server=${serverVersion}, compatible=${result.isCompatible}`);

      return {
        isCompatible: result.isCompatible,
        appVersion: result.appVersion,
        serverVersion: result.serverVersion,
        message: result.message,
      };
    } catch (err: any) {
      log.error('Version compatibility check failed:', err.message);
      // Return graceful error: if we can't check, assume compatible to not block app
      return {
        isCompatible: true,
        appVersion: app.getVersion(),
        serverVersion: 'unknown',
        message: null,
      };
    }
  });
}
