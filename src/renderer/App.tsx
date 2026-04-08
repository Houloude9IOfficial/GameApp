import React, { useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { LibraryPage } from './pages/LibraryPage';
import { StorePage } from './pages/StorePage';
import { DownloadsPage } from './pages/DownloadsPage';
import { SettingsPage } from './pages/SettingsPage';
import { GameDetailPage } from './pages/GameDetailPage';
import { LoginPage } from './pages/LoginPage';
import { FriendsPage } from './pages/FriendsPage';
import { ActivityPage } from './pages/ActivityPage';
import { InstallModal } from './components/common/InstallModal';
import { GamepadHandler } from './components/common/GamepadHandler';
import { useGamepadPolling } from './hooks/useGamepadPolling';
import { useThemeStore } from './stores/useThemeStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useDownloadStore } from './stores/useDownloadStore';
import { useAuthStore } from './stores/useAuthStore';
import { useOwnershipStore } from './stores/useOwnershipStore';
import { useVersionStore } from './stores/useVersionStore';
import { useVeloraStore } from './stores/useVeloraStore';

/**
 * GamepadStatusManager - Initialize gamepad polling on app startup
 * This component ensures gamepad detection runs even before controllers connect
 */
function GamepadStatusManager() {
  useGamepadPolling();
  return null;
}

function StartPageRedirect() {
  const navigate = useNavigate();
  const hasRedirected = useRef(false);
  const settings = useSettingsStore((s) => s.settings);

  useEffect(() => {
    if (hasRedirected.current || !settings) return;   // wait until settings load
    hasRedirected.current = true;

    // Check if the app was launched via a deeplink — if so, skip the start page redirect
    window.electronAPI.getDeeplinkPending().then((gameId) => {
      if (gameId) {
        // Deeplink takes priority — navigate to the game
        navigate(`/game/${gameId}`, { replace: true });
        // Auto-launch after navigating
        setTimeout(async () => {
          try { await window.electronAPI.launchGame(gameId); } catch { /* game page will show status */ }
        }, 500);
      } else if (settings.startPage === 'store') {
        navigate('/store', { replace: true });
      }
    });
  }, [settings]);

  return null;
}

function DeeplinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for runtime deeplink events (e.g. if app is already open)
    const cleanup = window.electronAPI.onDeeplinkLaunch((gameId: string) => {
      navigate(`/game/${gameId}`);
      setTimeout(async () => {
        try { await window.electronAPI.launchGame(gameId); } catch { /* game page will show status */ }
      }, 500);
    });
    return cleanup;
  }, [navigate]);

  return null;
}

export function App() {
  const { applyTheme, loadThemes } = useThemeStore();
  const { loadSettings, settings } = useSettingsStore();
  const { initDownloadListeners } = useDownloadStore();
  const { isAuthenticated, checkStatus } = useAuthStore();
  const { fetchOwned } = useOwnershipStore();
  const { checkVersionCompatibility } = useVersionStore();
  const { initialize: initializeVelora, connectWebSocket: veloraConnect } = useVeloraStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    loadSettings();
    loadThemes().then(() => applyTheme());
    checkStatus().finally(() => setAuthChecked(true));
    checkVersionCompatibility(); // Check version compatibility on app startup
    const cleanup = initDownloadListeners();
    return cleanup;
  }, []);

  // Initialize Velora with stored token if available
  useEffect(() => {
    if (settings?.veloraToken && settings.veloraPermissions) {
      initializeVelora(settings.veloraToken, settings.veloraPermissions);
      // Auto-connect WebSocket on app start
      veloraConnect().catch(err => {
        console.warn('Failed to auto-connect Velora WebSocket:', err);
      });
    }
  }, [settings?.veloraToken, settings?.veloraPermissions, initializeVelora, veloraConnect]);

  // Set up Velora IPC listeners
  useEffect(() => {
    const { setWSConnected, setError, updateTrack, updatePlaybackState } = useVeloraStore.getState();

    const unlisteners: Array<() => void> = [];

    // Listen for WebSocket connected
    const unlistenWsConnected = window.electronAPI.velora.onWSConnected?.(() => {
      setWSConnected(true);
      setError(null);
    });
    if (unlistenWsConnected) unlisteners.push(unlistenWsConnected);

    // Listen for WebSocket disconnected
    const unlistenWsDisconnected = window.electronAPI.velora.onWSDisconnected?.(() => {
      setWSConnected(false);
    });
    if (unlistenWsDisconnected) unlisteners.push(unlistenWsDisconnected);

    // Listen for WebSocket errors
    const unlistenWsError = window.electronAPI.velora.onWSError?.(({ error }: { error: string }) => {
      setWSConnected(false);
      setError('Connection error: ' + error);
    });
    if (unlistenWsError) unlisteners.push(unlistenWsError);

    // Listen for track changes
    const unlistenTrackChanged = window.electronAPI.velora.onTrackChanged?.((track: any) => {
      updateTrack(track);
    });
    if (unlistenTrackChanged) unlisteners.push(unlistenTrackChanged);

    // Listen for playback state changes
    const unlistenPlaybackChanged = window.electronAPI.velora.onPlaybackStateChanged?.((state: any) => {
      updatePlaybackState(state);
    });
    if (unlistenPlaybackChanged) unlisteners.push(unlistenPlaybackChanged);

    return () => {
      unlisteners.forEach(unlisten => unlisten?.());
    };
  }, []);

  // Fetch ownership when authenticated
  useEffect(() => {
    if (isAuthenticated) fetchOwned();
  }, [isAuthenticated]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-primary">
        <div className="text-text-muted text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: '!bg-surface !text-text-primary !border !border-card-border',
            duration: 4000,
          }}
        />
      </>
    );
  }

  return (
    <HashRouter>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-primary">
        <GamepadStatusManager />
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden bg-surface">
            <StartPageRedirect />
            <DeeplinkHandler />
            <Routes>
              <Route path="/" element={<LibraryPage />} />
              <Route path="/store" element={<StorePage />} />
              <Route path="/downloads" element={<DownloadsPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/game/:id" element={<GameDetailPage />} />
            </Routes>
          </main>
        </div>
        <StatusBar />
      </div>
      <InstallModal />
      <GamepadHandler />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: '!bg-surface !text-text-primary !border !border-card-border',
          duration: 4000,
        }}
      />
    </HashRouter>
  );
}
