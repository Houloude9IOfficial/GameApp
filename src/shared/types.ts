// ────────────────────────────────────────
// Shared types between main & renderer
// ────────────────────────────────────────

// ── Game ──

export interface GameBranding {
  logo?: string;
  banner?: string;
  icon?: string;
  video?: string;
  screenshots?: string[];
  primaryColor?: string;
  secondaryColor?: string;
}

export interface GameBrandingUrls {
  logo?: string;
  banner?: string;
  icon?: string;
  video?: string;
  screenshots?: string[];
}

export interface Game {
  id: string;
  name: string;
  version: string;
  description?: string;
  descriptionMarkdown?: string;
  developer?: string;
  folder: string;
  executable?: string;
  tags?: string[];
  category?: string;
  branding?: GameBranding;
  brandingUrls?: GameBrandingUrls;
  totalSize?: number;
  fileCount?: number;
  releaseDate?: string;
  launchArgs?: string;
  preLaunchCommand?: string;
  changelog?: string;
}

export type GameInstallStatus = 'not-installed' | 'installed' | 'installing' | 'updating' | 'repairing' | 'queued';

export interface InstalledGame {
  gameId: string;
  version: string;
  installPath: string;
  installedAt: string;
  updatedAt?: string;
  totalSize: number;
  totalFiles: number;
  integrityVerified: boolean;
  executable?: string;
  launchArgs?: string;
  preLaunchCommand?: string;
  files: FileEntry[];
  updateHistory: UpdateHistoryEntry[];
}

export interface UpdateHistoryEntry {
  version: string;
  date: string;
  type: 'install' | 'update' | 'repair';
  filesChanged: number;
}

export interface PlaySession {
  gameId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
}

export interface GamePlayStats {
  gameId: string;
  totalPlayTimeSeconds: number;
  lastPlayedAt?: string;
  sessions: PlaySession[];
}

// ── Files & Downloads ──

export interface FileEntry {
  path: string;
  size: number;
  hash: string;
}

export interface DeltaResult {
  added: (FileEntry & { downloadUrl: string })[];
  updated: (FileEntry & { downloadUrl: string })[];
  deleted: string[];
  totalDownloadSize: number;
  totalChanges: number;
}

export interface DownloadTask {
  id: string;
  gameId: string;
  gameName: string;
  type: 'install' | 'update' | 'repair';
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  files: DownloadFileTask[];
  totalBytes: number;
  downloadedBytes: number;
  speed: number;          // bytes per second
  eta: number;            // seconds remaining
  progress: number;       // 0-100
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DownloadFileTask {
  path: string;
  url: string;
  size: number;
  hash: string;
  downloaded: number;
  completed: boolean;
  error?: string;
}

export interface DownloadProgress {
  taskId: string;
  gameId: string;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  eta: number;
  progress: number;
  currentFile?: string;
  filesCompleted: number;
  filesTotal: number;
}

// ── Settings ──

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  sidebar: string;
  sidebarHover: string;
  sidebarActive: string;
  sidebarText: string;
  card: string;
  cardHover: string;
  cardBorder: string;
  titlebar: string;
  titlebarText: string;
  statusbar: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  colors: ThemeColors;
  fontFamily: string;
  fontSizeBase: string;
  borderRadius: string;
  sidebarWidth: string;
  sidebarWidthCollapsed: string;
  titlebarHeight: string;
  cardShadow: string;
  animationsEnabled: boolean;
}

export interface AppSettings {
  // Connection
  serverUrl: string;
  apiKey: string;
  authToken?: string;

  // Downloads
  installDirectory: string;
  maxConcurrentDownloads: number;
  bandwidthLimit: number; // 0 = unlimited, else bytes/sec
  autoUpdate: boolean;
  updateCheckInterval: number; // ms
  verifyAfterDownload: boolean;
  preferDeltaUpdates: boolean;

  // Appearance
  theme: string; // theme ID
  customTheme?: Partial<ThemeConfig>;
  uiScale: number; // 0.8 - 1.5
  sidebarPosition: 'left' | 'right';
  defaultViewMode: 'grid' | 'list';
  defaultCardSize: number; // 1-5

  // General
  launchOnStartup: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  startPage: 'store' | 'library';
  language: string;
}

export interface LockedSettings {
  serverUrl: boolean;
  apiKey: boolean;
  [key: string]: boolean;
}

// ── Server Info ──

export interface ServerHealth {
  status: string;
  uptime: number;
  version: string;
  gamesCount: number;
  timestamp: string;
}

export interface ServerInfo {
  name: string;
  version: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  endpoints: string[];
}

// ── Auth ──

export interface AuthToken {
  token: string;
  username: string;
  expiresAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  username?: string;
  token?: string;
  expiresAt?: string;
}

// ── Collections ──

export interface Collection {
  id: string;
  name: string;
  description?: string;
  gameIds: string[];
  createdAt: string;
  updatedAt: string;
  coverGameId?: string;
}

// ── Categories / Tags ──

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Tag {
  name: string;
  count: number;
}

// ── Notifications ──

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: { label: string; route?: string };
}

// ── IPC Channels ──

export const IPC_CHANNELS = {
  // Games
  GAMES_GET_ALL: 'games:getAll',
  GAMES_GET_ONE: 'games:getOne',
  GAMES_SEARCH: 'games:search',
  GAMES_GET_TAGS: 'games:getTags',
  GAMES_GET_CATEGORIES: 'games:getCategories',
  GAMES_CHECK_UPDATE: 'games:checkUpdate',
  GAMES_GET_FILES: 'games:getFiles',
  GAMES_GET_INSTALL_STATUS: 'games:getInstallStatus',
  GAMES_GET_ALL_INSTALLED: 'games:getAllInstalled',
  GAMES_UNINSTALL: 'games:uninstall',
  GAMES_VERIFY_INTEGRITY: 'games:verifyIntegrity',

  // Downloads
  DOWNLOADS_START: 'downloads:start',
  DOWNLOADS_PAUSE: 'downloads:pause',
  DOWNLOADS_RESUME: 'downloads:resume',
  DOWNLOADS_CANCEL: 'downloads:cancel',
  DOWNLOADS_GET_QUEUE: 'downloads:getQueue',
  DOWNLOADS_PROGRESS: 'downloads:progress',
  DOWNLOADS_COMPLETE: 'downloads:complete',
  DOWNLOADS_ERROR: 'downloads:error',
  DOWNLOADS_SET_BANDWIDTH: 'downloads:setBandwidth',

  // Launch
  LAUNCH_GAME: 'launch:game',
  LAUNCH_STATUS: 'launch:status',
  LAUNCH_STOP: 'launch:stop',
  LAUNCH_PLAY_TIME: 'launch:playTime',

  // Filesystem
  FS_SELECT_DIRECTORY: 'fs:selectDirectory',
  FS_GET_DISK_SPACE: 'fs:getDiskSpace',
  FS_OPEN_FOLDER: 'fs:openFolder',
  FS_OPEN_FILE: 'fs:openFile',
  FS_OPEN_URL: 'fs:openUrl',
  FS_ENSURE_DIR_ACCESS: 'fs:ensureDirectoryAccess',
  FS_CREATE_SHORTCUT: 'fs:createDesktopShortcut',
  FS_DELETE_SHORTCUT: 'fs:deleteDesktopShortcut',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_LOCKED: 'settings:getLocked',
  SETTINGS_GET_DEFAULTS: 'settings:getDefaults',
  SETTINGS_RESET: 'settings:reset',

  // Theme
  THEME_GET_ALL: 'theme:getAll',
  THEME_SET: 'theme:set',
  THEME_EXPORT: 'theme:export',
  THEME_IMPORT: 'theme:import',

  // Auth
  AUTH_CONNECT: 'auth:connect',
  AUTH_DISCONNECT: 'auth:disconnect',
  AUTH_STATUS: 'auth:status',

  // Server
  SERVER_HEALTH: 'server:health',
  SERVER_INFO: 'server:info',
  SERVER_TEST: 'server:test',

  // App
  APP_MINIMIZE: 'app:minimize',
  APP_MAXIMIZE: 'app:maximize',
  APP_CLOSE: 'app:close',
  APP_GET_VERSION: 'app:getVersion',
  APP_IS_MAXIMIZED: 'app:isMaximized',

  // Collections
  COLLECTIONS_GET_ALL: 'collections:getAll',
  COLLECTIONS_CREATE: 'collections:create',
  COLLECTIONS_UPDATE: 'collections:update',
  COLLECTIONS_DELETE: 'collections:delete',
} as const;

// ── Electron API exposed to renderer ──

export interface ElectronAPI {
  // Games
  getGames: () => Promise<{ games: Game[]; total: number }>;
  getGame: (id: string) => Promise<Game>;
  searchGames: (params: Record<string, string>) => Promise<{ results: Game[]; total: number }>;
  getTags: () => Promise<{ tags: Tag[] }>;
  getCategories: () => Promise<{ categories: Category[] }>;
  checkGameUpdate: (gameId: string, currentVersion: string) => Promise<{ updateAvailable: boolean; latestVersion: string }>;
  getGameFiles: (gameId: string) => Promise<{ files: FileEntry[]; totalSize: number }>;
  getInstallStatus: (gameId: string) => Promise<{ status: GameInstallStatus; installedGame?: InstalledGame }>;
  getAllInstalled: () => Promise<InstalledGame[]>;
  uninstallGame: (gameId: string) => Promise<void>;
  verifyIntegrity: (gameId: string) => Promise<DeltaResult>;

  // Downloads
  startDownload: (gameId: string, type: 'install' | 'update' | 'repair') => Promise<DownloadTask>;
  pauseDownload: (taskId: string) => Promise<void>;
  resumeDownload: (taskId: string) => Promise<void>;
  cancelDownload: (taskId: string) => Promise<void>;
  getDownloadQueue: () => Promise<DownloadTask[]>;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  onDownloadComplete: (callback: (task: DownloadTask) => void) => () => void;
  onDownloadError: (callback: (data: { taskId: string; error: string }) => void) => () => void;
  setBandwidthLimit: (bytesPerSec: number) => Promise<void>;

  // Launch
  launchGame: (gameId: string) => Promise<void>;
  getLaunchStatus: (gameId: string) => Promise<{ running: boolean; pid?: number; startedAt?: string }>;
  stopGame: (gameId: string) => Promise<void>;
  getPlayTime: (gameId: string) => Promise<GamePlayStats>;

  // Filesystem
  selectDirectory: (title?: string) => Promise<string | null>;
  getDiskSpace: (path: string) => Promise<{ free: number; total: number }>;
  openFolder: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  ensureDirectoryAccess: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
  createDesktopShortcut: (gameId: string, gameName: string, iconUrl: string) => Promise<void>;
  deleteDesktopShortcut: (gameId: string) => Promise<void>;

  // Deeplink
  onDeeplinkLaunch: (callback: (gameId: string) => void) => () => void;
  getDeeplinkPending: () => Promise<string | null>;

  // Settings
  getSettings: () => Promise<AppSettings>;
  setSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getLockedSettings: () => Promise<LockedSettings>;
  getDefaultSettings: () => Promise<Partial<AppSettings>>;
  resetSettings: () => Promise<AppSettings>;

  // Theme
  getAllThemes: () => Promise<ThemeConfig[]>;
  setTheme: (themeId: string) => Promise<void>;
  exportTheme: (theme: ThemeConfig) => Promise<string>;
  importTheme: (filePath: string) => Promise<ThemeConfig>;

  // Auth
  authConnect: (code: string) => Promise<AuthState>;
  authDisconnect: () => Promise<void>;
  getAuthStatus: () => Promise<AuthState>;

  // Server
  getServerHealth: () => Promise<ServerHealth>;
  getServerInfo: () => Promise<ServerInfo>;
  testServerConnection: (url: string) => Promise<{ success: boolean; error?: string }>;

  // App
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  getVersion: () => Promise<string>;
  isMaximized: () => Promise<boolean>;

  // Collections
  getCollections: () => Promise<Collection[]>;
  createCollection: (data: { name: string; description?: string }) => Promise<Collection>;
  updateCollection: (id: string, data: Partial<Collection>) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
