import { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import Store from 'electron-store';
import { AppSettings, LockedSettings, IPC_CHANNELS } from '../shared/types';
import { registerGamesHandlers } from './ipc/games';
import { registerDownloadHandlers } from './ipc/downloads';
import { registerSettingsHandlers } from './ipc/settings';
import { registerAuthHandlers } from './ipc/auth';
import { registerFilesystemHandlers } from './ipc/filesystem';
import { registerLaunchHandlers } from './ipc/launch';
import { registerCollectionsHandlers } from './ipc/collections';
import { ServerClient } from './services/ServerClient';
import { DownloadManager } from './services/DownloadManager';
import { GameLauncher } from './services/GameLauncher';

// ── Logging ──
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// ── Helper: extract game ID from a gameapp:// deeplink URL ──
function extractDeeplinkGameId(args: string[]): string | null {
  const url = args.find(arg => arg.startsWith('gameapp://'));
  if (!url) return null;
  const match = url.match(/^gameapp:\/\/launch\/(.+?)(?:\?|#|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ── Persistent store ──
const store = new Store<{
  settings: AppSettings;
  installedGames: Record<string, any>;
  collections: any[];
  playStats: Record<string, any>;
  downloadQueue: any[];
}>({
  defaults: {
    settings: {
      serverUrl: 'http://localhost:3000',
      apiKey: '',
      installDirectory: 'C:\\Program Files\\GL\\Games',
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
      language: 'en',
      startPage: 'store',
    },
    installedGames: {},
    collections: [],
    playStats: {},
    downloadQueue: [],
  },
});

// ── Load admin defaults ──
let lockedSettings: LockedSettings = { serverUrl: false, apiKey: false };

function loadDefaults(): void {
  try {
    const defaultsPath = path.join(process.resourcesPath || path.join(__dirname, '..', '..'), 'defaults.json');
    if (fs.existsSync(defaultsPath)) {
      const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf-8'));
      if (defaults.locked) lockedSettings = defaults.locked;
      if (defaults.serverUrl && !store.get('settings.serverUrl')) {
        store.set('settings.serverUrl', defaults.serverUrl);
      }
      if (defaults.apiKey && !store.get('settings.apiKey')) {
        store.set('settings.apiKey', defaults.apiKey);
      }
    }
  } catch (err) {
    log.warn('Failed to load defaults.json:', err);
  }
}

// ── App identity (prevents Windows from inheriting .url shortcut icon) ──
// Use icon from resources/ (outside Vite's pipeline, no filename hashing)
const APP_ICON_PATH = path.join(__dirname, '..', '..', '..', 'resources', 'icon.png');
app.setAppUserModelId('com.gamelauncher.app');

// ── Services ──
let serverClient: ServerClient;
let downloadManager: DownloadManager;
let gameLauncher: GameLauncher;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createServices(): void {
  const settings = store.get('settings') as AppSettings;

  serverClient = new ServerClient({
    baseUrl: settings.serverUrl,
    apiKey: settings.apiKey,
    authToken: settings.authToken,
    timeout: 30000,
  });

  downloadManager = new DownloadManager({
    serverClient,
    installDirectory: settings.installDirectory,
    maxConcurrent: settings.maxConcurrentDownloads,
    bandwidthLimit: settings.bandwidthLimit,
    verifyAfterDownload: settings.verifyAfterDownload,
    store,
    onProgress: (progress) => {
      mainWindow?.webContents.send(IPC_CHANNELS.DOWNLOADS_PROGRESS, progress);
    },
    onComplete: (task) => {
      mainWindow?.webContents.send(IPC_CHANNELS.DOWNLOADS_COMPLETE, task);
    },
    onError: (taskId, error) => {
      mainWindow?.webContents.send(IPC_CHANNELS.DOWNLOADS_ERROR, { taskId, error });
    },
  });

  gameLauncher = new GameLauncher({ store });
}

// ── Window ──
function createWindow(): void {
  const settings = store.get('settings') as AppSettings;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1117',
    show: false,
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load renderer
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (settings.startMinimized) {
      mainWindow?.minimize();
    } else {
      mainWindow?.show();
    }
  });

  mainWindow.on('close', (e) => {
    if (settings.minimizeToTray && tray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Window state IPC
  ipcMain.handle(IPC_CHANNELS.APP_MINIMIZE, () => mainWindow?.minimize());
  ipcMain.handle(IPC_CHANNELS.APP_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle(IPC_CHANNELS.APP_CLOSE, () => {
    const s = store.get('settings') as AppSettings;
    if (s.minimizeToTray && tray) {
      mainWindow?.hide();
    } else {
      app.quit();
    }
  });
  ipcMain.handle(IPC_CHANNELS.APP_IS_MAXIMIZED, () => mainWindow?.isMaximized() ?? false);
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => app.getVersion());
}

// ── Tray ──
function createTray(): void {
  let trayIcon: Electron.NativeImage;

  try {
    trayIcon = nativeImage.createFromPath(APP_ICON_PATH);
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Game Launcher', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit(); } },
  ]);

  tray.setToolTip('Game Launcher');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow?.show());
}

// ── Register all IPC handlers ──
function registerAllHandlers(): void {
  registerGamesHandlers(ipcMain, serverClient, store);
  registerDownloadHandlers(ipcMain, downloadManager, store);
  registerSettingsHandlers(ipcMain, store, lockedSettings, serverClient, downloadManager);
  registerAuthHandlers(ipcMain, serverClient, store);
  registerFilesystemHandlers(ipcMain);
  registerLaunchHandlers(ipcMain, gameLauncher, store);
  registerCollectionsHandlers(ipcMain, store);
}

// ── Register gameapp:// protocol ──
// In dev mode (process.defaultApp), register with explicit electron path + app entry
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('gameapp', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('gameapp');
}

// ── Single-instance lock ──
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // When a second instance launches (e.g. a gameapp:// URL click),
  // the existing instance receives the command line args here.
  app.on('second-instance', (_event, commandLine) => {
    const gameId = extractDeeplinkGameId(commandLine);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      // Re-assert the app icon so Windows doesn't keep the .url shortcut icon
      mainWindow.setIcon(APP_ICON_PATH);
      if (gameId) {
        log.info(`Second-instance deeplink for: ${gameId}`);
        mainWindow.webContents.send('deeplink:launch', gameId);
      }
    }
  });

  // ── App lifecycle ──
  app.whenReady().then(() => {
    loadDefaults();
    createServices();

    // Register deeplink handler BEFORE creating window so it's available when renderer loads
    const deeplinkGameId = extractDeeplinkGameId(process.argv);
    if (deeplinkGameId) {
      log.info(`Deeplink launch requested for: ${deeplinkGameId}`);
      (global as any).__deeplinkGameId = deeplinkGameId;
    }

    ipcMain.handle('deeplink:getPending', () => {
      const id = (global as any).__deeplinkGameId || null;
      (global as any).__deeplinkGameId = null; // consume it
      return id;
    });

    createWindow();
    createTray();
    registerAllHandlers();

    // Ensure install directory exists
    const installDir = store.get('settings.installDirectory') as string;
    if (!fs.existsSync(installDir)) {
      fs.mkdirSync(installDir, { recursive: true });
    }

    log.info('Game Launcher started');

    // Re-assert app icon in case launched from a .url shortcut with a game icon
    mainWindow?.setIcon(APP_ICON_PATH);

    // Send deeplink event once renderer is ready (for cold start via protocol)
    if (deeplinkGameId) {
      mainWindow?.webContents.once('did-finish-load', () => {
        // Give React time to mount and register listeners
        setTimeout(() => {
          mainWindow?.webContents.send('deeplink:launch', deeplinkGameId);
        }, 2500);
      });
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      if (!(store.get('settings') as AppSettings).minimizeToTray) {
        app.quit();
      }
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

app.on('before-quit', () => {
  // Save download queue state
  downloadManager?.saveState();
  // Record play sessions for any still-running games without killing them
  gameLauncher?.recordAllSessions();
  tray?.destroy();
});
