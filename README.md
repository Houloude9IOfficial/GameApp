# GameApp

An all-in-one game store and launcher built with Electron — download, manage, and play games from your [GameServer](https://github.com/Houloude9IOfficial/GameServer).

Built with [Electron](https://www.electronjs.org/) 30, [React](https://react.dev/) 18, [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/) 5, [Tailwind CSS](https://tailwindcss.com/) 3, and [Zustand](https://zustand-demo.pmnd.rs/) 4.

---

## Features

- **Game Store** — Browse and search the remote game catalog with a hero carousel, grid/list views, tag & category filtering
- **Library Management** — View all/installed/not-installed games, sort by name, last played, size, install date, or developer
- **Download Manager** — Concurrent downloads with queue, pause/resume, bandwidth throttling, byte-range resume, SHA-256 integrity verification, delta updates, streaming hash support for files >2 GiB
- **Bandwidth Graph** — Real-time canvas-based download speed visualization with current, peak, and average metrics
- **Install Modal** — Pre-download confirmation with storage validation, disk space visualization, and optional desktop shortcut creation
- **Game Launching** — Spawn executables with custom args and pre-launch commands, play time tracking with per-session statistics
- **Activity Feed** — Recently played games and install/update history grouped by date with timestamps
- **Friends & Social** — Friend requests, online/offline status, search & add users, block/remove friends
- **Game Reviews & Ratings** — Submit, edit, and delete reviews with 1–5 star ratings, rating distribution chart, review summaries
- **Notifications** — Real-time notification dropdown with unread badge, mark read/dismiss, auto-refresh polling
- **Self-Hosted Auto-Updater** — Background update checking with dynamic feed URL derived from server settings, manual download & install flow
- **Gamepad / Controller Detection & UI** — End-to-end gamepad detection with ControllerStatus widget in Sidebar, RAF-based polling, real-time connection state, per-gamepad info (up to 4 controllers with battery/signal mock stats)
- **Velora Music Integration** — Connect to Velora music service for in-app playback control, track metadata, album art, play/pause/next controls; extensible framework for future integrations (Spotify, Apple Music, etc.)
- **Version Compatibility Checking** — Automatic app ↔ server version validation with semantic versioning, compatibility matrix, and user-friendly messaging
- **Deep Links & Desktop Shortcuts** — `gameapp://launch/<gameId>` protocol handler; create Windows desktop shortcuts that launch games through the app
- **Verify & Repair** — Verify game file integrity against server hashes, auto-repair corrupted or missing files
- **Theming** — 3 built-in themes (Dark, Light, Midnight), full CSS-variable color system, import/export custom themes as JSON
- **Markdown Descriptions** — Render rich game descriptions from `description.md` files served by the GameServer (via `react-markdown` + `remark-gfm`)
- **Screenshot Lightbox** — Full-screen screenshot viewer with keyboard and swipe navigation
- **YouTube Trailers** — Embedded trailer thumbnails that open in the default browser
- **Platform Icons** — Display source platform icons (Steam, Epic, GOG, Ubisoft, EA, Xbox, PlayStation, Rockstar, Microsoft Store)
- **Collections** — Create and manage custom game collections
- **Authentication** — Register / login with the GameServer, token management, library ownership
- **LAN Discovery** — Scan local network for GameServer instances (ARP-based with TCP probing)
- **System Tray** — Minimize to tray, restore on double-click, quit from context menu
- **Custom Title Bar** — Frameless window with custom minimize/maximize/close buttons and integrated search bar
- **Admin Defaults** — `defaults.json` allows pre-configuring and locking server URL / API key for managed deployments
- **Configurable Start Page** — Choose whether the app opens to the Store or Library
- **Single Instance** — Prevents duplicate windows; deep links bring the existing instance to front
- **Status Bar** — Real-time server connection status, response time, uptime, and active download speed

---

## Quick Start

```bash
# Install dependencies
npm install

# Build everything (main + preload + renderer)
npm run build

# Start the app
npm start

# Or build and start in one step
npm run bs

# Development mode (Vite dev server + Electron with hot reload)
npm run dev:electron
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server only |
| `npm run build` | Build main + preload + renderer |
| `npm run start` | Launch Electron |
| `npm run bs` | Build then start |
| `npm run dev:electron` | Concurrent Vite + Electron for development |
| `npm run dist` | Build + package with electron-builder (NSIS + portable) |
| `npm run build:installer` | Build a branded installer using `scripts/build-config.json` (see below) |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
GameApp/
├── defaults.json               # Admin-deployable defaults (server URL, API key, lockable fields)
├── package.json
├── vite.config.ts              # Vite config (renderer build)
├── tailwind.config.ts          # Tailwind CSS with CSS-variable color system
├── tsconfig.json               # Base TypeScript config
├── tsconfig.main.json          # Main process TS config
├── tsconfig.preload.json       # Preload TS config
├── postcss.config.js
├── resources/
│   └── icon.png                # App icon (tray, window, shortcuts)
├── scripts/
│   ├── build-installer.js      # Branded setup.exe builder script
│   └── build-config.example.json # Template for build-config.json
├── src/
│   ├── shared/
│   │   └── types.ts            # Shared types between main & renderer
│   ├── main/
│   │   ├── index.ts            # Electron main entry (window, tray, protocol, lifecycle)
│   │   ├── themes.ts           # Built-in theme definitions (Dark, Light, Midnight)
│   │   ├── ipc/
│   │   │   ├── auth.ts         # Auth IPC handlers (register, login, logout, library)
│   │   │   ├── collections.ts  # Collections CRUD
│   │   │   ├── discovery.ts    # LAN server scanning
│   │   │   ├── downloads.ts    # Download queue management
│   │   │   ├── filesystem.ts   # File system, disk space, desktop shortcuts
│   │   │   ├── gamepad.ts      # Gamepad connection state management
│   │   │   ├── games.ts        # Game catalog & install management
│   │   │   ├── launch.ts       # Game launching & play time tracking
│   │   │   ├── notifications.ts # Notification fetch, read, dismiss
│   │   │   ├── reviews.ts      # Game reviews CRUD
│   │   │   ├── settings.ts     # Settings, themes, server connection
│   │   │   ├── social.ts       # Friends, requests, status, search
│   │   │   ├── updater.ts      # Auto-updater check, download, install
│   │   │   ├── velora.ts       # Velora music integration (register, poll, token, query, playback)
│   │   │   └── version.ts      # Version compatibility checking
│   │   ├── services/
│   │   │   ├── ServerClient.ts # HTTP client for GameServer API
│   │   │   ├── DownloadManager.ts # Queue-based concurrent downloader with throttling
│   │   │   └── GameLauncher.ts # Game process spawner & session tracker
│   │   └── utils/
│   │       ├── elevate.ts      # UAC elevation helper (Windows)
│   │       └── versionCompatibility.ts # Version parsing, comparison, and matrix lookup
│   ├── preload/
│   │   └── index.ts            # Context bridge (~50 API methods)
│   └── renderer/
│       ├── App.tsx             # Root layout (router, sidebar, title bar, status bar)
│       ├── main.tsx            # React entry point
│       ├── index.html          # HTML shell
│       ├── assets/
│       │   ├── favicon.ico     # App icon (installer)
│       │   ├── site.webmanifest
│       │   └── integrations/
│       │       └── velora_rounded.png # Velora service icon
│       ├── pages/
│       │   ├── ActivityPage.tsx    # Activity feed (recently played, install history)
│       │   ├── LibraryPage.tsx     # User's game library (grid/list, filters, sort)
│       │   ├── StorePage.tsx       # Browse server catalog (hero carousel, featured)
│       │   ├── DownloadsPage.tsx   # Download queue management
│       │   ├── FriendsPage.tsx     # Friends list, requests, search & add users
│       │   ├── SettingsPage.tsx    # Tabbed settings UI (6 tabs: Appearance, Downloads, Connection, General, Integrations, About)
│       │   ├── GameDetailPage.tsx  # Game detail view wrapper
│       │   ├── CollectionsPage.tsx # Custom game collections
│       │   └── LoginPage.tsx       # Authentication page
│       ├── components/
│       │   ├── common/
│       │   │   ├── Badge.tsx
│       │   │   ├── BandwidthGraph.tsx    # Real-time download speed canvas graph
│       │   │   ├── Button.tsx           # Variants: primary, secondary, ghost, danger, accent
│       │   │   ├── ControllerStatus.tsx # Gamepad status widget for Sidebar
│       │   │   ├── GamepadHandler.tsx    # Gamepad/controller spatial navigation
│       │   │   ├── InstallModal.tsx      # Pre-download dialog with storage info
│       │   │   ├── Modal.tsx            # Generic modal with AnimatePresence
│       │   │   ├── MusicPlayer.tsx      # Generic music player (multi-service)
│       │   │   ├── NotificationDropdown.tsx # Bell icon dropdown with unread badge
│       │   │   ├── PlatformIcon.tsx     # SVG icons for game platforms
│       │   │   ├── ProgressBar.tsx
│       │   │   ├── ScreenshotLightbox.tsx # Full-screen gallery with keyboard/swipe nav
│       │   │   ├── StarRating.tsx        # Reusable star rating (display & interactive)
│       │   │   ├── Tooltip.tsx
│       │   │   ├── VeloraPlayer.tsx     # Velora-specific music player
│       │   │   └── YouTubePlayer.tsx    # Trailer thumbnail → opens in browser
│       │   ├── games/
│       │   │   ├── GameCard.tsx          # Animated card with glow, progress overlay
│       │   │   ├── GameContextMenu.tsx   # Right-click menu (play, shortcut, update, etc.)
│       │   │   ├── GameDetail.tsx        # Full detail view (tabs: Overview, Files, Settings)
│       │   │   ├── GameGrid.tsx          # Flex grid container
│       │   │   ├── GameHoverCard.tsx     # Inline hover preview card
│       │   │   ├── GameList.tsx          # List view with metadata columns
│       │   │   └── ReviewSection.tsx     # Reviews UI with rating distribution
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx           # Collapsible nav + disk space indicator
│       │   │   ├── StatusBar.tsx         # Connection status, download speed
│       │   │   └── TitleBar.tsx          # Window controls + search bar
│       │   ├── search/
│       │   │   └── SearchBar.tsx         # Fuse.js fuzzy search with keyboard nav
│       │   └── settings/
│       │       ├── AboutSection.tsx
│       │       ├── AppearanceSettings.tsx # Theme picker + custom color editor
│       │       ├── ConnectionSettings.tsx # Server URL, LAN discovery, auth status
│       │       ├── DownloadSettings.tsx   # Install dir, bandwidth, concurrency
│       │       ├── GeneralSettings.tsx    # Launch on startup, minimize to tray, start page
│       │       ├── IntegrationsSettings.tsx # External service integrations
│       │       └── integrations/
│       │           └── VeloraIntegrationCard.tsx # Velora setup UI (register, poll, test, clear)
│       ├── stores/
│       │   ├── useAuthStore.ts         # Authentication state & actions
│       │   ├── useDownloadStore.ts    # Download queue & progress tracking
│       │   ├── useGamepadStore.ts     # Gamepad detection & per-controller info (up to 4)
│       │   ├── useGamesStore.ts       # All games, installed list, filtering, sorting
│       │   ├── useInstallModal.ts     # Install modal state
│       │   ├── useMusicIntegrationsStore.ts # Multi-service music integration status
│       │   ├── useNotificationStore.ts # Notification fetch, read, dismiss, unread count
│       │   ├── useOwnershipStore.ts   # Owned games (library)
│       │   ├── useSettingsStore.ts    # App settings persistence
│       │   ├── useSocialStore.ts      # Friends list, requests, status, search
│       │   ├── useThemeStore.ts       # Theme management (built-in + custom)
│       │   ├── useVeloraStore.ts      # Velora connection, token, playback state
│       │   └── useVersionStore.ts     # App ↔ server version compatibility state
│       ├── styles/
│       │   └── globals.css          # CSS variables, custom scrollbars, animations
│       └── utils/
│           ├── constants.ts         # Routes, defaults, sort/filter options
│           └── formatters.ts        # Bytes, speed, duration, date formatters
└── dist/                            # Build output
```

---

## Settings

The Settings page has six tabs:

| Tab | Options |
|-----|----------|
| **Appearance** | Theme selection (Dark / Light / Midnight), custom color editor (12 color fields), import/export themes as JSON |
| **Downloads** | Install directory, max concurrent downloads (1–5), bandwidth limit presets (Unlimited / 1–100 MB/s), auto-update toggle |
| **Connection** | Server URL (with LAN discovery scanner), authentication status (login/logout/delete account) |
| **General** | Launch on startup, minimize to tray, start minimized, start page (Store / Library), reset to defaults |
| **Integrations** | Configure external services (Velora music player registration & connection) |
| **About** | App version, tech stack, GitHub links, Buy Me a Coffee support link |

---

## Admin Defaults

The `defaults.json` file allows pre-configuring the app for managed deployments:

```json
{
  "serverUrl": "https://your-game-server.com",
  "apiKey": "",
  "locked": {
    "serverUrl": false,
    "apiKey": true
  },
  "defaults": {
    "theme": "dark",
    "installDirectory": "",
    "maxConcurrentDownloads": 3,
    "bandwidthLimit": 0,
    "autoUpdate": true,
    "verifyAfterDownload": true,
    "preferDeltaUpdates": true,
    "launchOnStartup": false,
    "minimizeToTray": true,
    "startMinimized": false,
    "language": "en"
  }
}
```

The `locked` object controls which settings are read-only in the UI. Set a field to `true` to prevent users from changing it.

---

## Building a Branded Installer

To build a custom-branded `setup.exe` with your own name, icon, and server URL:

1. Copy the template config:
   ```bash
   cp scripts/build-config.example.json scripts/build-config.json
   ```

2. Edit `scripts/build-config.json` with your branding:
   ```json
   {
     "appName": "My Game Launcher",
     "appId": "com.mycompany.gamelauncher",
     "version": "1.0.0",
     "author": "My Company",
     "description": "Download, manage, and play games",
     "icon": "path/to/icon.ico",
     "serverUrl": "https://games.mycompany.com",
     "apiKey": "",
     "lockServerUrl": false,
     "lockApiKey": true,
     "installer": {
       "oneClick": false,
       "allowToChangeInstallationDirectory": true,
       "createDesktopShortcut": true,
       "createStartMenuShortcut": true,
       "license": null
     },
     "outputDir": "release"
   }
   ```

3. Build:
   ```bash
   npm run build:installer
   ```

The script patches `package.json` and `defaults.json` during the build, then restores the originals automatically. The resulting installer will be in the `outputDir` folder.

You can also pass a custom config path:
```bash
node scripts/build-installer.js --config path/to/my-config.json
```

---

## Deep Links & Desktop Shortcuts

The app registers the `gameapp://` protocol. When installing a game, users can create a desktop shortcut. Clicking it:

1. Opens the app (or brings the existing instance to front)
2. Navigates to the game's detail page
3. Automatically launches the game

Protocol format: `gameapp://launch/<gameId>`

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Electron 30 | Desktop shell |
| React 18 | UI framework |
| TypeScript 5 | Type safety |
| Vite 5 | Renderer bundler |
| Tailwind CSS 3 | Styling (CSS-variable color system) |
| Zustand 4 | State management (10 stores) |
| Axios | HTTP client |
| Framer Motion 11 | Animations |
| Fuse.js | Fuzzy search |
| Lucide React | Icons |
| React Markdown | Rich game descriptions (with remark-gfm) |
| electron-store | Persistent settings, install state, play stats |
| electron-updater | Self-hosted auto-update with dynamic feed URL |
| electron-builder | Packaging (NSIS installer + portable) |

---

## Requirements

- Node.js 18+
- A running [GameServer](https://github.com/Houloude9IOfficial/GameServer) instance

---

## License

MIT
