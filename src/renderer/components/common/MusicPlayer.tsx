import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
import { useVeloraStore } from '../../stores/useVeloraStore';
import { useMusicIntegrationsStore } from '../../stores/useMusicIntegrationsStore';

interface MusicPlayerProps {
  collapsed: boolean;
}

/**
 * Generic Music Player Component
 * Works with any music integration (Velora, Spotify, Apple Music, etc.)
 * Only renders if at least one music service is configured
 */
export function MusicPlayer({ collapsed }: MusicPlayerProps) {
  const navigate = useNavigate();

  // Check if any music integration is available
  const hasAnyIntegration = useMusicIntegrationsStore(s => s.hasAnyIntegration());
  const activeIntegration = useMusicIntegrationsStore(s => s.getActiveIntegration());

  // If no integrations configured, don't render
  if (!hasAnyIntegration) {
    return null;
  }

  // Render Velora player when it's the active integration
  if (activeIntegration === 'velora') {
    return <VeloraPlayerContent collapsed={collapsed} />;
  }

  // Placeholder for other services (Spotify, etc.)
  // if (activeIntegration === 'spotify') {
  //   return <SpotifyPlayerContent collapsed={collapsed} />;
  // }

  // Default: show unconfigured message
  return (
    <div className={`border-t border-card-border bg-sidebar ${collapsed ? 'p-2' : 'p-4'}`}>
      {!collapsed && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Music size={16} className="text-text-muted shrink-0" />
            <span className="text-xs font-semibold uppercase text-text-muted">Music</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-text-muted">
              Music player not configured yet
            </p>
            <button
              onClick={() => navigate('/settings?tab=integrations')}
              className="w-full px-2 py-1.5 text-xs font-medium bg-accent text-primary rounded hover:opacity-90 transition-opacity"
            >
              Configure in Integrations
            </button>
          </div>
        </>
      )}
      {collapsed && (
        <div
          className="flex justify-center cursor-pointer hover:text-accent transition-colors"
          title="Configure Music Integration"
          onClick={() => navigate('/settings?tab=integrations')}
        >
          <Music size={16} className="text-text-muted" />
        </div>
      )}
    </div>
  );
}

/**
 * Velora-specific player content
 * Rendered when Velora is the active music integration
 */
function VeloraPlayerContent({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const isConfigured = useVeloraStore(s => s.isConfigured);
  const isWSConnected = useVeloraStore(s => s.isWSConnected);
  const currentTrack = useVeloraStore(s => s.currentTrack);
  const playbackState = useVeloraStore(s => s.playbackState);
  const error = useVeloraStore(s => s.error);

  const togglePlayPause = useVeloraStore(s => s.togglePlayPause);
  const play = useVeloraStore(s => s.play);
  const pause = useVeloraStore(s => s.pause);
  const next = useVeloraStore(s => s.next);
  const formatTime = useVeloraStore(s => s.formatTime);
  const getTrackProgress = useVeloraStore(s => s.getTrackProgress);

  const progress = currentTrack ? getTrackProgress() : 0;

  // Not configured - show setup message
  if (!isConfigured) {
    return (
      <div className={`border-t border-card-border bg-sidebar ${collapsed ? 'p-2' : 'p-4'}`}>
        {!collapsed && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Music size={16} className="text-text-muted shrink-0" />
              <span className="text-xs font-semibold uppercase text-text-muted">Music</span>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-text-muted">
                Music player not configured yet
              </p>
              <button
                onClick={() => navigate('/settings?tab=integrations')}
                className="w-full px-2 py-1.5 text-xs font-medium bg-accent text-primary rounded hover:opacity-90 transition-opacity"
              >
                Configure in Integrations
              </button>
            </div>
          </>
        )}
        {collapsed && (
          <div
            className="flex justify-center cursor-pointer hover:text-accent transition-colors"
            title="Configure Music in Integrations"
            onClick={() => navigate('/settings?tab=integrations')}
          >
            <Music size={16} className="text-text-muted" />
          </div>
        )}
      </div>
    );
  }

  // Configured but not connected
  if (!isWSConnected) {
    // If there's an error (service offline), hide the player
    if (error) {
      return null;
    }

    // Still connecting, show loading state
    return (
      <div className={`border-t border-card-border bg-sidebar ${collapsed ? 'p-2' : 'p-4'}`}>
        {!collapsed && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Music size={16} className="text-text-muted shrink-0" />
              <span className="text-xs font-semibold uppercase text-text-muted">Music</span>
            </div>
            <p className="text-xs text-text-muted">Connecting...</p>
          </>
        )}
        {collapsed && (
          <div
            className="flex justify-center opacity-50"
            title="Connecting..."
          >
            <Music size={16} className="text-text-muted animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  // Connected - show player
  if (!currentTrack) {
    return (
      <div className={`border-t border-card-border bg-sidebar ${collapsed ? 'p-2' : 'p-4'}`}>
        {!collapsed && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Music size={16} className="text-accent shrink-0" />
              <span className="text-xs font-semibold uppercase text-accent">Music</span>
            </div>
            <p className="text-xs text-text-muted">
              No track playing
            </p>
          </>
        )}
        {collapsed && (
          <div className="flex justify-center" title="Music: No track playing">
            <Music size={16} className="text-accent" />
          </div>
        )}
      </div>
    );
  }

  // Show track info and controls
  return (
    <div className={`border-t border-card-border bg-sidebar ${collapsed ? 'p-2' : 'p-4 space-y-3'}`}>
      {!collapsed ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-2">
            <Music size={14} className="text-accent shrink-0" />
            <span className="text-[10px] font-bold uppercase text-accent">Now Playing</span>
          </div>

          {/* Album Art */}
          {currentTrack.cover_url && (
            <div className="w-full aspect-square rounded-md overflow-hidden bg-surface-active">
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.album || currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Track Info */}
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-text-primary truncate">
              {currentTrack.title}
            </h3>
            <p className="text-[10px] text-text-muted truncate">
              {currentTrack.artist}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={togglePlayPause}
              className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors text-accent hover:text-text-primary"
              title={playbackState?.is_playing ? 'Pause' : 'Play'}
            >
              {playbackState?.is_playing ? (
                <Pause size={18} />
              ) : (
                <Play size={18} />
              )}
            </button>
            <button
              onClick={next}
              className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors text-text-muted hover:text-accent"
              title="Next"
            >
              <SkipForward size={18} />
            </button>
          </div>
        </>
      ) : (
        /* Collapsed view */
        <div className="flex flex-col items-center gap-2">
          {currentTrack.cover_url && (
            <div className="w-10 h-10 rounded overflow-hidden bg-surface-active">
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex gap-1">
            <button
              onClick={togglePlayPause}
              className="p-1.5 hover:bg-sidebar-hover rounded transition-colors text-accent"
              title={playbackState?.is_playing ? 'Pause' : 'Play'}
            >
              {playbackState?.is_playing ? (
                <Pause size={14} />
              ) : (
                <Play size={14} />
              )}
            </button>
            <button
              onClick={next}
              className="p-1.5 hover:bg-sidebar-hover rounded transition-colors text-text-muted hover:text-accent"
              title="Next"
            >
              <SkipForward size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
