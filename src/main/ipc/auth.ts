import { IpcMain } from 'electron';
import { ServerClient } from '../services/ServerClient';
import Store from 'electron-store';
import { IPC_CHANNELS } from '../../shared/types';
import log from 'electron-log';

export function registerAuthHandlers(ipcMain: IpcMain, serverClient: ServerClient, store: Store<any>): void {
  ipcMain.handle(IPC_CHANNELS.AUTH_CONNECT, async (_e, code: string) => {
    try {
      const result = await serverClient.authenticateWithCode(code);
      if (result.isAuthenticated && result.token) {
        store.set('settings.authToken', result.token);
      }
      return result;
    } catch (err: any) {
      log.error('Authentication failed:', err.message);
      throw new Error('Authentication failed. Check your code and try again.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_DISCONNECT, async () => {
    try {
      store.delete('settings.authToken' as any);
      serverClient.updateConfig({ authToken: undefined });
      return { isAuthenticated: false };
    } catch (err: any) {
      log.error('Disconnect failed:', err.message);
      throw new Error('Failed to disconnect.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_STATUS, async () => {
    try {
      const token = store.get('settings.authToken') as string | undefined;
      if (!token) return { isAuthenticated: false };

      const valid = await serverClient.verifyAuth();
      if (!valid) {
        store.delete('settings.authToken' as any);
        return { isAuthenticated: false };
      }

      return { isAuthenticated: true, token };
    } catch (err: any) {
      log.error('Auth status check failed:', err.message);
      return { isAuthenticated: false };
    }
  });
}
