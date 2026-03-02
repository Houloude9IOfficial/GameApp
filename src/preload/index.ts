import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, ElectronAPI } from '../shared/types';

const electronAPI: ElectronAPI = {
  // Games
  getGames: () => ipcRenderer.invoke(IPC_CHANNELS.GAMES_GET_ALL),
  getGame: (id) => ipcRenderer.invoke(IPC_CHANNELS.GAMES_GET_ONE, id),
  searchGames: (params) => ipcRenderer.invoke(IPC_CHANNELS.GAMES_SEARCH, params),
  getTags: () => ipcRenderer.invoke(IPC_CHANNELS.GAMES_GET_TAGS),
  getCategories: () => ipcRenderer.invoke(IPC_CHANNELS.GAMES_GET_CATEGORIES),
  checkGameUpdate: (gameId, currentVersion) =>
    ipcRenderer.invoke(IPC_CHANNELS.GAMES_CHECK_UPDATE, gameId, currentVersion),
  getGameFiles: (gameId) => ipcRenderer.invoke(IPC_CHANNELS.GAMES_GET_FILES, gameId),
  getInstallStatus: (gameId) => ipcRenderer.invoke(IPC_CHANNELS.GAMES_GET_INSTALL_STATUS, gameId),
  getAllInstalled: () => ipcRenderer.invoke(IPC_CHANNELS.GAMES_GET_ALL_INSTALLED),
  uninstallGame: (gameId) => ipcRenderer.invoke(IPC_CHANNELS.GAMES_UNINSTALL, gameId),
  verifyIntegrity: (gameId) => ipcRenderer.invoke(IPC_CHANNELS.GAMES_VERIFY_INTEGRITY, gameId),

  // Downloads
  startDownload: (gameId, type) => ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_START, gameId, type),
  pauseDownload: (taskId) => ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_PAUSE, taskId),
  resumeDownload: (taskId) => ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_RESUME, taskId),
  cancelDownload: (taskId) => ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_CANCEL, taskId),
  getDownloadQueue: () => ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_GET_QUEUE),
  onDownloadProgress: (callback) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.DOWNLOADS_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOADS_PROGRESS, handler);
  },
  onDownloadComplete: (callback) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.DOWNLOADS_COMPLETE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOADS_COMPLETE, handler);
  },
  onDownloadError: (callback) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.DOWNLOADS_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOADS_ERROR, handler);
  },
  setBandwidthLimit: (bytesPerSec) => ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_SET_BANDWIDTH, bytesPerSec),

  // Launch
  launchGame: (gameId) => ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_GAME, gameId),
  getLaunchStatus: (gameId) => ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_STATUS, gameId),
  stopGame: (gameId) => ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_STOP, gameId),
  getPlayTime: (gameId) => ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_PLAY_TIME, gameId),

  // Filesystem
  selectDirectory: (title) => ipcRenderer.invoke(IPC_CHANNELS.FS_SELECT_DIRECTORY, title),
  getDiskSpace: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_GET_DISK_SPACE, path),
  openFolder: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_OPEN_FOLDER, path),
  openFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_OPEN_FILE, path),
  openUrl: (url) => ipcRenderer.invoke(IPC_CHANNELS.FS_OPEN_URL, url),
  ensureDirectoryAccess: (dirPath) => ipcRenderer.invoke(IPC_CHANNELS.FS_ENSURE_DIR_ACCESS, dirPath),
  createDesktopShortcut: (gameId, gameName, iconUrl) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_SHORTCUT, gameId, gameName, iconUrl),
  deleteDesktopShortcut: (gameId) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE_SHORTCUT, gameId),

  // Deeplink
  onDeeplinkLaunch: (callback) => {
    const handler = (_e: any, gameId: string) => callback(gameId);
    ipcRenderer.on('deeplink:launch', handler);
    return () => ipcRenderer.removeListener('deeplink:launch', handler);
  },
  getDeeplinkPending: () => ipcRenderer.invoke('deeplink:getPending'),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),
  getLockedSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_LOCKED),
  getDefaultSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_DEFAULTS),
  resetSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET),

  // Theme
  getAllThemes: () => ipcRenderer.invoke(IPC_CHANNELS.THEME_GET_ALL),
  setTheme: (themeId) => ipcRenderer.invoke(IPC_CHANNELS.THEME_SET, themeId),
  exportTheme: (theme) => ipcRenderer.invoke(IPC_CHANNELS.THEME_EXPORT, theme),
  importTheme: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.THEME_IMPORT, filePath),

  // Auth
  authConnect: (code) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_CONNECT, code),
  authDisconnect: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_DISCONNECT),
  getAuthStatus: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_STATUS),

  // Server
  getServerHealth: () => ipcRenderer.invoke(IPC_CHANNELS.SERVER_HEALTH),
  getServerInfo: () => ipcRenderer.invoke(IPC_CHANNELS.SERVER_INFO),
  testServerConnection: (url) => ipcRenderer.invoke(IPC_CHANNELS.SERVER_TEST, url),

  // App
  minimize: () => ipcRenderer.invoke(IPC_CHANNELS.APP_MINIMIZE),
  maximize: () => ipcRenderer.invoke(IPC_CHANNELS.APP_MAXIMIZE),
  close: () => ipcRenderer.invoke(IPC_CHANNELS.APP_CLOSE),
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.APP_IS_MAXIMIZED),

  // Collections
  getCollections: () => ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_GET_ALL),
  createCollection: (data) => ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_CREATE, data),
  updateCollection: (id, data) => ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_UPDATE, id, data),
  deleteCollection: (id) => ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_DELETE, id),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
