import { IpcMain, dialog, shell, app, nativeImage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { IPC_CHANNELS } from '../../shared/types';
import { ensureDirectoryAccess } from '../utils/elevate';
import log from 'electron-log';

/**
 * Download a file from a URL and return the data as a Buffer.
 */
function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Get the icon cache directory.
 */
function getIconCacheDir(): string {
  const dir = path.join(app.getPath('userData'), 'icon-cache');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Download a game icon from URL and convert to .ico for Windows shortcuts.
 * Returns the path to the local .ico file, or the app exe path as fallback.
 */
async function downloadGameIcon(gameId: string, iconUrl: string): Promise<string> {
  try {
    const cacheDir = getIconCacheDir();
    const icoPath = path.join(cacheDir, `${gameId}.ico`);

    // Use cached icon if it exists
    if (fs.existsSync(icoPath)) return icoPath;

    const buffer = await downloadBuffer(iconUrl);
    const image = nativeImage.createFromBuffer(buffer);
    if (image.isEmpty()) throw new Error('Failed to decode image');

    // Resize to 256x256 for good shortcut quality
    const resized = image.resize({ width: 256, height: 256 });

    // Write as PNG first, then convert to ICO
    // ICO format: header + directory entry + PNG data
    const pngData = resized.toPNG();
    const ico = createIco(pngData, 256, 256);
    fs.writeFileSync(icoPath, ico);

    log.info(`Game icon cached: ${icoPath}`);
    return icoPath;
  } catch (err: any) {
    log.warn(`Failed to download game icon for ${gameId}: ${err.message}`);
    return process.execPath; // fallback to app icon
  }
}

/**
 * Create a minimal ICO file from PNG data.
 */
function createIco(pngData: Buffer, width: number, height: number): Buffer {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);  // reserved
  header.writeUInt16LE(1, 2);  // type: 1 = ICO
  header.writeUInt16LE(1, 4);  // count: 1 image

  // Directory entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);   // width (0 = 256)
  entry.writeUInt8(height >= 256 ? 0 : height, 1); // height (0 = 256)
  entry.writeUInt8(0, 2);   // color palette
  entry.writeUInt8(0, 3);   // reserved
  entry.writeUInt16LE(1, 4);  // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngData.length, 8);  // image size
  entry.writeUInt32LE(6 + 16, 12);         // offset to image data

  return Buffer.concat([header, entry, pngData]);
}

/**
 * Find and delete a desktop shortcut for a game by scanning .url files.
 */
function deleteGameShortcut(gameId: string): void {
  try {
    const desktopDir = app.getPath('desktop');
    const deeplinkUrl = `gameapp://launch/${gameId}`;
    const files = fs.readdirSync(desktopDir).filter(f => f.endsWith('.url'));

    for (const file of files) {
      try {
        const shortcutPath = path.join(desktopDir, file);
        const content = fs.readFileSync(shortcutPath, 'utf-8');
        if (content.includes(deeplinkUrl)) {
          fs.unlinkSync(shortcutPath);
          log.info(`Desktop shortcut deleted: ${shortcutPath}`);
          break;
        }
      } catch {
        // skip unreadable files
      }
    }

    // Also clean up cached icon
    const iconPath = path.join(getIconCacheDir(), `${gameId}.ico`);
    if (fs.existsSync(iconPath)) {
      fs.unlinkSync(iconPath);
    }
  } catch (err: any) {
    log.warn(`Failed to delete shortcut for ${gameId}: ${err.message}`);
  }
}

export function registerFilesystemHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.FS_SELECT_DIRECTORY, async (_e, title?: string) => {
    try {
      const result = await dialog.showOpenDialog({
        title: title || 'Select Directory',
        properties: ['openDirectory', 'createDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0];
    } catch (err: any) {
      log.error('Failed to open directory picker:', err.message);
      throw new Error('Failed to open directory picker.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_GET_DISK_SPACE, async (_e, dirPath: string) => {
    try {
      const { execSync } = await import('child_process');

      if (process.platform === 'win32') {
        const drive = dirPath.charAt(0).toUpperCase();
        const output = execSync(
          `wmic logicaldisk where "DeviceID='${drive}:'" get FreeSpace,Size /format:csv`,
          { encoding: 'utf-8' }
        );
        const lines = output.trim().split('\n').filter(l => l.trim());
        const lastLine = lines[lines.length - 1];
        const parts = lastLine.split(',');
        return {
          free: parseInt(parts[1]) || 0,
          total: parseInt(parts[2]) || 0,
        };
      } else {
        const stats = fs.statfsSync(dirPath);
        return {
          free: stats.bavail * stats.bsize,
          total: stats.blocks * stats.bsize,
        };
      }
    } catch (err: any) {
      log.warn('Failed to get disk space:', err.message);
      return { free: 0, total: 0 };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_OPEN_FOLDER, async (_e, folderPath: string) => {
    try {
      await shell.openPath(folderPath);
    } catch (err: any) {
      log.error('Failed to open folder:', err.message);
      throw new Error('Failed to open folder.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_OPEN_FILE, async (_e, filePath: string) => {
    try {
      await shell.openPath(filePath);
    } catch (err: any) {
      log.error('Failed to open file:', err.message);
      throw new Error('Failed to open file.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_OPEN_URL, async (_e, url: string) => {
    try {
      await shell.openExternal(url);
    } catch (err: any) {
      log.error('Failed to open URL:', err.message);
      throw new Error('Failed to open URL.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_ENSURE_DIR_ACCESS, async (_e, dirPath: string) => {
    try {
      return await ensureDirectoryAccess(dirPath);
    } catch (err: any) {
      log.error('Failed to ensure directory access:', err.message);
      throw new Error(`Failed to create directory with elevated permissions: ${err.message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_CREATE_SHORTCUT, async (_e, gameId: string, gameName: string, iconUrl: string) => {
    try {
      const desktopDir = app.getPath('desktop');
      const shortcutPath = path.join(desktopDir, `${gameName}.url`);
      const deeplinkUrl = `gameapp://launch/${gameId}`;

      // Build .url (Internet Shortcut) content
      let content = `[InternetShortcut]\r\nURL=${deeplinkUrl}\r\n`;

      if (iconUrl) {
        const iconPath = await downloadGameIcon(gameId, iconUrl);
        if (iconPath !== process.execPath) {
          content += `IconFile=${iconPath}\r\nIconIndex=0\r\n`;
        }
      }

      fs.writeFileSync(shortcutPath, content, 'utf-8');
      log.info(`Desktop shortcut created: ${shortcutPath}`);
    } catch (err: any) {
      log.error('Failed to create desktop shortcut:', err.message);
      throw new Error('Failed to create desktop shortcut.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_DELETE_SHORTCUT, async (_e, gameId: string) => {
    deleteGameShortcut(gameId);
  });
}
