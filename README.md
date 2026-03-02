# GameApp

An all-in-one game store and launcher built with Electron — download, manage, and play games from your [GameServer](https://github.com/Houloude9IOfficial/GameServer).

Built with [Electron](https://www.electronjs.org/) 30, [React](https://react.dev/) 18, [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/) 5, [Tailwind CSS](https://tailwindcss.com/) 3, and [Zustand](https://zustand-demo.pmnd.rs/) 4.

---

## Features

- **Game Store** — Browse and search the remote game catalog with a hero carousel, grid/list views, tag & category filtering
- **Library Management** — View all/installed/not-installed games, sort by name, last played, size, install date, or developer
- **Download Manager** — Concurrent downloads with queue, pause/resume, bandwidth throttling, byte-range resume, SHA-256 integrity verification, delta updates
- **Install Modal** — Pre-download confirmation with storage validation, disk space visualization, and optional desktop shortcut creation
- **Game Launching** — Spawn executables with custom args and pre-launch commands, play time tracking with per-session statistics
- **Desktop Shortcuts** — Create Windows desktop shortcuts with `--launch-game` deep link support to launch directly through the app
- **Verify & Repair** — Verify game file integrity against server hashes, auto-repair corrupted or missing files
- **Theming** — 3 built-in themes (Dark, Light, Midnight), full CSS-variable color system, import/export custom themes as JSON
- **Markdown Descriptions** — Render rich game descriptions from `description.md` files served by the GameServer
- **Screenshot Lightbox** — Full-screen screenshot viewer with keyboard and swipe navigation
- **Collections** — Create and manage custom game collections
- **Authentication** — Code-based auth flow to the GameServer with token management
- **System Tray** — Minimize to tray, restore on double-click, quit from context menu
- **Custom Title Bar** — Frameless window with custom minimize/maximize/close buttons
- **Admin Defaults** — `defaults.json` allows pre-configuring and locking server URL / API key for managed deployments
- **Configurable Start Page** — Choose whether the app opens to the Store or Library

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
| `npm run dist` | Build + package with electron-builder |
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
├── src/
│   ├── shared/
│   │   └── types.ts            # Shared types between main & renderer
│   ├── main/
│   │   ├── index.ts            # Electron main entry (window, tray, lifecycle)
│   │   ├── themes.ts           # Built-in theme definitions
│   │   ├── ipc/
│   │   │   ├── auth.ts         # Auth IPC handlers
│   │   │   ├── collections.ts  # Collections CRUD
│   │   │   ├── downloads.ts    # Download queue management
│   │   │   ├── filesystem.ts   # File system, disk space, shortcuts
│   │   │   ├── games.ts        # Game catalog & install management
│   │   │   ├── launch.ts       # Game launching & play time tracking
│   │   │   └── settings.ts     # Settings, themes, server connection
│   │   ├── services/
│   │   │   ├── ServerClient.ts # HTTP client for GameServer API
│   │   │   ├── DownloadManager.ts # Queue-based concurrent downloader
│   │   │   └── GameLauncher.ts # Game process spawner & session tracker
│   │   └── utils/
│   │       └── elevate.ts      # UAC elevation helper (Windows)
│   ├── preload/
│   │   └── index.ts            # Context bridge (~50 API methods)
│   └── renderer/
│       ├── App.tsx             # Root layout (router, sidebar, title bar, modals)
│       ├── index.tsx           # React entry point
│       ├── index.css           # Tailwind imports
│       ├── pages/
│       │   ├── LibraryPage.tsx     # User's game library
│       │   ├── StorePage.tsx       # Browse server catalog
│       │   ├── DownloadsPage.tsx   # Download queue management
│       │   ├── SettingsPage.tsx    # Tabbed settings UI
│       │   ├── GameDetailPage.tsx  # Game detail view
│       │   └── CollectionsPage.tsx # Custom game collections
│       ├── components/
│       │   ├── common/
│       │   │   ├── Badge.tsx
│       │   │   ├── Button.tsx
│       │   │   ├── InstallModal.tsx      # Pre-download dialog with storage info
│       │   │   ├── Modal.tsx
│       │   │   ├── ProgressBar.tsx
│       │   │   ├── ScreenshotLightbox.tsx # Full-screen screenshot viewer
│       │   │   └── Tooltip.tsx
│       │   ├── games/
│       │   │   ├── GameCard.tsx
│       │   │   ├── GameContextMenu.tsx
│       │   │   ├── GameDetail.tsx
│       │   │   ├── GameGrid.tsx
│       │   │   ├── GameHoverCard.tsx
│       │   │   └── GameList.tsx
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── StatusBar.tsx
│       │   │   └── TitleBar.tsx
│       │   ├── search/
│       │   │   └── SearchBar.tsx
│       │   └── settings/
│       │       ├── AboutSection.tsx
│       │       ├── AppearanceSettings.tsx
│       │       ├── ConnectionSettings.tsx
│       │       ├── DownloadSettings.tsx
│       │       └── GeneralSettings.tsx
│       ├── stores/
│       │   ├── useGamesStore.ts     # Games, install state, filters
│       │   ├── useDownloadStore.ts  # Download queue & progress
│       │   ├── useSettingsStore.ts  # App settings persistence
│       │   ├── useThemeStore.ts     # Theme management
│       │   ├── useAuthStore.ts      # Authentication state
│       │   └── useInstallModal.ts   # Install modal state
│       └── utils/
│           ├── constants.ts
│           └── formatters.ts
└── dist/                       # Build output
```

---

## Settings

The Settings page has five tabs:

| Tab | Options |
|-----|---------|
| **Appearance** | Theme selection (Dark/Light/Midnight), UI scale, sidebar position, card size, import/export themes |
| **Downloads** | Install directory, max concurrent downloads, bandwidth limit, auto-update, delta updates preference |
| **Connection** | Server URL, API key (can be locked via `defaults.json`) |
| **General** | Start page (Store/Library), minimize to tray, launch on startup, language |
| **About** | App version, update check, links |

---

## Admin Defaults

The `defaults.json` file allows pre-configuring the app for managed deployments:

```json
{
  "serverUrl": "http://your-game-server:3000",
  "apiKey": "your-api-key",
  "locked": ["serverUrl", "apiKey"],
  "theme": "dark",
  "installDirectory": "C:\\Games",
  "startPage": "store"
}
```

Fields listed in `locked` will be read-only in the Settings UI, preventing users from changing them.

---

## Deep Links & Desktop Shortcuts

When installing a game, users can opt to create a desktop shortcut. Shortcuts launch the app with `--launch-game="<gameId>"`, which:

1. Opens the app (or focuses it if already running)
2. Navigates to the game's detail page
3. Automatically launches the game

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Electron 30 | Desktop shell |
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite 5 | Renderer bundler |
| Tailwind CSS 3 | Styling (CSS-variable color system) |
| Zustand 4 | State management |
| Axios | HTTP client |
| Framer Motion | Animations |
| Lucide React | Icons |
| React Markdown | Rich game descriptions |
| electron-store | Persistent settings |
| electron-builder | Packaging (NSIS installer + portable) |

---

## Requirements

- Node.js 18+
- A running [GameServer](../GameServer) instance

---

## License

MIT
