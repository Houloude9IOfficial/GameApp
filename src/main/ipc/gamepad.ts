import { IpcMain } from 'electron';
import { IPC_CHANNELS, GamepadInfo } from '../../shared/types';
import log from 'electron-log';

// In-memory store for gamepad status
let gamepadCache: GamepadInfo[] = [];
let pollInterval: NodeJS.Timeout | null = null;
let subscribers: Set<(gamepads: GamepadInfo[]) => void> = new Set();

/**
 * Simulates battery and signal strength detection.
 * In production, this would use:
 * - Windows: XInput API via node.js native module
 * - macOS: IOKit via native module
 * - Linux: udev deviceinfo via native module
 *
 * For now, returns mock data based on gamepad index.
 * TODO: Replace with real native module like 'node-gamepad' or 'node-hid'
 */
function getGamepadStats(index: number, name: string): { battery: number; signalStrength: number } {
  // Mock implementation - simulates realistic values
  // In production, query native gamepad API
  const baseBattery = 50 + Math.random() * 40; // 50-90%
  const baseSignal = 60 + Math.random() * 35; // 60-95%

  return {
    battery: Math.round(baseBattery),
    signalStrength: Math.round(baseSignal),
  };
}

/**
 * Converts native Gamepad object to our GamepadInfo structure
 */
function convertGamepad(gp: Gamepad, timestamp: number): GamepadInfo {
  const stats = getGamepadStats(gp.index, gp.id);
  return {
    index: gp.index,
    id: gp.id,
    name: gp.id,
    connected: gp.connected,
    battery: stats.battery,
    signalStrength: stats.signalStrength,
    lastUpdated: timestamp,
  };
}

/**
 * Polls connected gamepads from the native API
 * This runs in the main process but queries OS-level gamepad info
 * NOTE: Standard Gamepad API is renderer-only, so this requires:
 * - A native module to query gamepad state from main process, OR
 * - Renderer-side polling that notifies main process via IPC
 *
 * Currently implemented as renderer-sourced polling (see ControllerStatus component)
 */
export function registerGamepadHandlers(ipcMain: IpcMain): void {
  /**
   * Handler: Get current connected gamepads
   * Called by renderer to fetch latest gamepad status
   */
  ipcMain.handle(IPC_CHANNELS.GAMEPAD_GET_CONNECTED, async () => {
    try {
      return gamepadCache;
    } catch (err: any) {
      log.error('Failed to get connected gamepads:', err.message);
      return [];
    }
  });

  /**
   * Handler: Update gamepad cache from renderer
   * The renderer polls navigator.getGamepads() and sends updates to main process
   * This keeps the cache in sync and allows sending updates to listening windows
   * @internal Used by renderer-side gamepad polling
   */
  ipcMain.handle('gamepad:updateCache', async (_e, gamepads: GamepadInfo[]) => {
    // Update cache
    const changed = JSON.stringify(gamepadCache) !== JSON.stringify(gamepads);
    gamepadCache = gamepads;

    // Notify all subscribers if something changed
    if (changed) {
      subscribers.forEach(cb => cb(gamepads));
    }

    return { success: true };
  });

  /**
   * Cleanup: Stop polling when app closes
   */
  if (pollInterval) {
    clearInterval(pollInterval);
  }
}

/**
 * Register a callback to be notified of gamepad status changes
 * Used internally for future enhancements (e.g., IPC send to all windows)
 */
export function onGamepadStatusChanged(callback: (gamepads: GamepadInfo[]) => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Get current gamepad cache
 */
export function getGamepadCache(): GamepadInfo[] {
  return gamepadCache;
}
