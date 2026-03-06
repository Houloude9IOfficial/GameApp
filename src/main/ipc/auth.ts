import { IpcMain } from 'electron';
import { ServerClient } from '../services/ServerClient';
import Store from 'electron-store';
import { IPC_CHANNELS } from '../../shared/types';
import log from 'electron-log';

export function registerAuthHandlers(ipcMain: IpcMain, serverClient: ServerClient, store: Store<any>): void {
  ipcMain.handle(IPC_CHANNELS.AUTH_REGISTER, async (_e, username: string, password: string) => {
    try {
      const result = await serverClient.register(username, password);
      if (result.isAuthenticated && result.token) {
        store.set('settings.authToken', result.token);
        store.set('settings.authUsername', result.username);
      }
      return result;
    } catch (err: any) {
      log.error('Registration failed:', err.message);
      throw new Error(err.message || 'Registration failed.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_e, username: string, password: string) => {
    try {
      const result = await serverClient.login(username, password);
      if (result.isAuthenticated && result.token) {
        store.set('settings.authToken', result.token);
        store.set('settings.authUsername', result.username);
      }
      return result;
    } catch (err: any) {
      log.error('Login failed:', err.message);
      throw new Error(err.message || 'Login failed.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    try {
      await serverClient.logout();
      store.delete('settings.authToken' as any);
      store.delete('settings.authUsername' as any);
      return { isAuthenticated: false };
    } catch (err: any) {
      log.error('Logout failed:', err.message);
      throw new Error('Failed to logout.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_DELETE_ACCOUNT, async () => {
    try {
      await serverClient.deleteAccount();
      store.delete('settings.authToken' as any);
      store.delete('settings.authUsername' as any);
      return { ok: true };
    } catch (err: any) {
      log.error('Account deletion failed:', err.message);
      throw new Error('Failed to delete account.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_STATUS, async () => {
    try {
      const token = store.get('settings.authToken') as string | undefined;
      if (!token) return { isAuthenticated: false };

      const result = await serverClient.verifyAuth();
      if (!result.valid) {
        store.delete('settings.authToken' as any);
        store.delete('settings.authUsername' as any);
        return { isAuthenticated: false };
      }

      return {
        isAuthenticated: true,
        token,
        username: result.username || store.get('settings.authUsername'),
      };
    } catch (err: any) {
      log.error('Auth status check failed:', err.message);
      return { isAuthenticated: false };
    }
  });

  // Library / Ownership
  ipcMain.handle(IPC_CHANNELS.LIBRARY_GET_OWNED, async () => {
    try {
      return await serverClient.getOwnedGames();
    } catch (err: any) {
      log.error('Failed to get owned games:', err.message);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.LIBRARY_ADD_GAME, async (_e, gameId: string) => {
    try {
      return await serverClient.addGameToLibrary(gameId);
    } catch (err: any) {
      log.error('Failed to add game to library:', err.message);
      throw new Error('Failed to add game to library.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.LIBRARY_REMOVE_GAME, async (_e, gameId: string) => {
    try {
      await serverClient.removeGameFromLibrary(gameId);
    } catch (err: any) {
      log.error('Failed to remove game from library:', err.message);
      throw new Error('Failed to remove game from library.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.LIBRARY_OWNS_GAME, async (_e, gameId: string) => {
    try {
      return await serverClient.ownsGame(gameId);
    } catch (err: any) {
      log.error('Failed to check game ownership:', err.message);
      return false;
    }
  });
}
