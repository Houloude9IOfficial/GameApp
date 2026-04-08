import { IpcMain } from 'electron';
import Store from 'electron-store';
import { IPC_CHANNELS, AppSettings } from '../../shared/types';
import log from 'electron-log';
import { VeloraClient } from 'velora-node-sdk';
import WebSocket from 'ws';

// Polyfill WebSocket for Node.js environment (required by velora-node-sdk)
if (typeof (global as any).WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

let veloraClient: VeloraClient | null = null;
let mainWindow: any = null;

export function registerVeloraHandlers(ipcMain: IpcMain, store: Store<any>, mw?: any): void {
  if (mw) mainWindow = mw;

  // Initialize client with stored token if available
  function initializeClient(): VeloraClient {
    if (!veloraClient) {
      const settings = store.get('settings') as AppSettings;
      const token = settings.veloraToken;
      const permissions = settings.veloraPermissions;

      veloraClient = new VeloraClient({
        host: '127.0.0.1',
        port: 39031,
        token: token,
        requestedPermissions: permissions,
      });

      // Set up event listeners for WebSocket events
      if (veloraClient) {
        veloraClient.on('track_changed', (data: any) => {
          mainWindow?.webContents.send('velora:track-changed', data);
        });

        veloraClient.on('playback_state_changed', (data: any) => {
          mainWindow?.webContents.send('velora:playback-state-changed', data);
        });

        veloraClient.on('ws:connected', () => {
          mainWindow?.webContents.send('velora:ws-connected');
        });

        veloraClient.on('ws:disconnected', () => {
          mainWindow?.webContents.send('velora:ws-disconnected');
        });

        veloraClient.on('ws:error', (error: any) => {
          mainWindow?.webContents.send('velora:ws-error', { error: error.message });
        });
      }
    }
    return veloraClient;
  }

  // Register app with Velora
  ipcMain.handle(
    IPC_CHANNELS.VELORA_REGISTER,
    async (
      _e,
      appConfig: {
        app: { name: string; description?: string; developer?: string; website?: string; icon?: string };
        permissions?: ('read' | 'write')[];
      }
    ) => {
      try {
        const client = initializeClient();
        const requestId = await client.registerApp(appConfig);

        // Store request ID temporarily in settings
        const settings = store.get('settings') as AppSettings;
        store.set('settings', { ...settings, veloraRequestId: requestId });

        log.info(`Velora registration initiated with request ID: ${requestId}`);
        return { request_id: requestId, status: 'pending' };
      } catch (err: any) {
        log.error('Velora registration failed:', err.message);
        throw new Error('Failed to register with Velora: ' + err.message);
      }
    }
  );

  // Poll registration status
  ipcMain.handle(
    IPC_CHANNELS.VELORA_POLL_STATUS,
    async (_e, requestId: string) => {
      try {
        const client = initializeClient();

        // Poll for approval with 1 second interval, 5 minute timeout
        let isApproved = false;
        let isDenied = false;
        let attempts = 0;
        const maxAttempts = 300; // 300 seconds / 1s per attempt = 5 minutes

        while (attempts < maxAttempts) {
          try {
            // requestAccessToken will resolve once approved, or throw if denied
            await client.requestAccessToken(requestId, 2000);
            isApproved = true;
            log.info('Velora registration approved');
            break;
          } catch (err: any) {
            // Check if request was explicitly denied
            if (err.code === 'DENIED' || err.message?.includes('denied') || err.message?.includes('Denied')) {
              isDenied = true;
              log.warn('Velora registration was denied by user');
              break;
            }
            
            // Not approved yet, continue polling
            attempts++;
            if (attempts < maxAttempts) {
              // Wait 1 second before next attempt
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (isDenied) {
          log.warn('Velora registration denied');
          return { request_id: requestId, status: 'denied', error: 'denied' };
        }

        if (isApproved) {
          const token = client.getToken();
          // Get actual permissions from the client - these are the granted permissions
          const grantedPermissions = (client as any).grantedPermissions || (client as any).permissions || ['read', 'write'];

          log.info(`Velora approved with permissions: ${grantedPermissions.join(', ')}`);

          return {
            request_id: requestId,
            status: 'approved',
            access_token: token,
            token_type: 'Bearer',
            permissions: grantedPermissions,
          };
        } else {
          log.warn('Velora registration polling timeout');
          return { request_id: requestId, status: 'pending' };
        }
      } catch (err: any) {
        log.error('Velora status polling failed:', err.message);
        throw new Error('Failed to poll Velora status: ' + err.message);
      }
    }
  );

  // Save token to settings
  ipcMain.handle(
    IPC_CHANNELS.VELORA_SAVE_TOKEN,
    async (_e, token: string, permissions: ('read' | 'write')[]) => {
      try {
        const settings = store.get('settings') as AppSettings;

        // Update settings with token
        const updated = {
          ...settings,
          veloraToken: token,
          veloraPermissions: permissions,
          veloraRequestId: undefined, // Clear temporary request ID
        };

        store.set('settings', updated);

        // Reinitialize client with new token
        veloraClient = null;
        initializeClient();

        log.info('Velora token saved successfully');
      } catch (err: any) {
        log.error('Failed to save Velora token:', err.message);
        throw new Error('Failed to save Velora token: ' + err.message);
      }
    }
  );

  // Clear token from settings
  ipcMain.handle(IPC_CHANNELS.VELORA_CLEAR_TOKEN, async (_e) => {
    try {
      const settings = store.get('settings') as AppSettings;

      // Remove Velora settings
      const updated = {
        ...settings,
        veloraToken: undefined,
        veloraPermissions: undefined,
        veloraRequestId: undefined,
      };

      store.set('settings', updated);

      // Disconnect and reset client
      if (veloraClient) {
        try {
          await veloraClient.disconnectWebSocket();
        } catch {}
        veloraClient = null;
      }

      log.info('Velora token cleared');
    } catch (err: any) {
      log.error('Failed to clear Velora token:', err.message);
      throw new Error('Failed to clear Velora token: ' + err.message);
    }
  });

  // Connect WebSocket
  ipcMain.handle('velora:connectWebSocket', async (_e) => {
    try {
      const client = initializeClient();
      const settings = store.get('settings') as AppSettings;
      const permissions = settings.veloraPermissions || [];

      // Verify read permission exists
      if (!permissions.includes('read')) {
        const err = new Error('Missing read permission for WebSocket. Please re-register with read and write permissions.');
        (err as any).code = 'AUTH_ERROR';
        throw err;
      }

      await client.connectWebSocket();
      log.info('Velora WebSocket connected');
    } catch (err: any) {
      // Parse error details for better messaging
      if (err.message?.includes('read permission') || err.code === 'AUTH_ERROR') {
        log.error('WebSocket permission denied:', err.message);
      } else if (err.message?.includes('ECONNREFUSED') || err.code === 'ECONNREFUSED') {
        log.error('Velora server not accessible:', err.message);
      } else {
        log.error('Failed to connect Velora WebSocket:', err.message);
      }
      throw err;
    }
  });

  // Disconnect WebSocket
  ipcMain.handle('velora:disconnectWebSocket', async (_e) => {
    try {
      if (veloraClient) {
        await veloraClient.disconnectWebSocket();
      }
      log.info('Velora WebSocket disconnected');
    } catch (err: any) {
      log.error('Failed to disconnect Velora WebSocket:', err.message);
      throw err;
    }
  });

  // Playback controls
  ipcMain.handle('velora:play', async (_e, trackId?: string) => {
    try {
      const client = initializeClient();
      await client.play(trackId);
    } catch (err: any) {
      log.error('Failed to play:', err.message);
      throw err;
    }
  });

  ipcMain.handle('velora:pause', async (_e) => {
    try {
      const client = initializeClient();
      await client.pause();
    } catch (err: any) {
      log.error('Failed to pause:', err.message);
      throw err;
    }
  });

  ipcMain.handle('velora:toggle', async (_e) => {
    try {
      const client = initializeClient();
      await client.toggle();
    } catch (err: any) {
      log.error('Failed to toggle:', err.message);
      throw err;
    }
  });

  ipcMain.handle('velora:next', async (_e) => {
    try {
      const client = initializeClient();
      await client.next();
    } catch (err: any) {
      log.error('Failed to skip:', err.message);
      throw err;
    }
  });

  ipcMain.handle('velora:seek', async (_e, position: number) => {
    try {
      const client = initializeClient();
      await client.seek(position);
    } catch (err: any) {
      log.error('Failed to seek:', err.message);
      throw err;
    }
  });
}
