import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
import { useVeloraStore } from '../../stores/useVeloraStore';

interface VeloraPlayerProps {
  collapsed: boolean;
}

export function VeloraPlayer({ collapsed }: VeloraPlayerProps) {
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
              <span className="text-xs font-semibold uppercase text-text-muted">Velora</span>
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
            title="Configure Velora in Integrations"
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
    return (
      <div className={`border-t border-card-border bg-sidebar ${collapsed ? 'p-2' : 'p-4'}`}>
        {!collapsed && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Music size={16} className="text-text-muted shrink-0" />
              <span className="text-xs font-semibold uppercase text-text-muted">Velora</span>
            </div>
            <p className="text-xs text-text-muted">
              {error ? 'Velora offline' : 'Connecting...'}
            </p>
            {error && <p className="text-[10px] text-danger mt-1 break-words">{error}</p>}
          </>
        )}
        {collapsed && (
          <div
            className="flex justify-center opacity-50"
            title={error || 'Connecting...'}
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
              <span className="text-xs font-semibold uppercase text-accent">Velora</span>
            </div>
            <p className="text-xs text-text-muted">No track playing</p>
          </>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <Music size={16} className="text-accent" />
          </div>
        )}
      </div>
    );
  }

  // Expanded view
  if (!collapsed) {
    return (
      <div className="border-t border-card-border bg-sidebar p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Music size={16} className="text-accent shrink-0" />
          <span className="text-xs font-semibold uppercase text-accent">Now Playing</span>
        </div>

        {/* Cover Art */}
        {currentTrack.cover_url && (
          <div className="w-full aspect-square mb-3 rounded overflow-hidden bg-surface-active flex items-center justify-center">
            <img
              src={currentTrack.cover_url}
              alt={currentTrack.album || 'Album art'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Track Info */}
        <div className="mb-3 space-y-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {currentTrack.title}
          </p>
          <p className="text-xs text-text-muted truncate">
            {currentTrack.artist}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="w-full h-1 bg-surface-active rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>{formatTime(currentTrack.position)}</span>
            <span>{formatTime(currentTrack.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {/* Play/Pause button */}
          <button
            onClick={togglePlayPause}
            className="p-2 bg-accent rounded-full hover:opacity-90 transition-opacity"
            title={playbackState?.is_playing ? 'Pause' : 'Play'}
          >
            {playbackState?.is_playing ? (
              <Pause size={18} className="text-primary fill-primary" />
            ) : (
              <Play size={18} className="text-primary fill-primary" />
            )}
          </button>

          {/* Next button */}
          <button
            onClick={next}
            title="Next"
            className="p-1.5 hover:bg-sidebar-hover rounded transition-colors"
          >
            <SkipForward size={16} className="text-text-primary" />
          </button>
        </div>
      </div>
    );
  }

  // Collapsed view - minimal
  return (
    <div className="border-t border-card-border bg-sidebar p-2 flex flex-col items-center gap-2">
      {/* Album art or icon */}
      {currentTrack.thumbnail_url ? (
        <div className="w-10 h-10 rounded overflow-hidden bg-surface-active flex items-center justify-center">
          <img
            src={currentTrack.thumbnail_url}
            alt={currentTrack.album || 'Album'}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded bg-surface-active flex items-center justify-center">
          <Music size={18} className="text-accent" />
        </div>
      )}

      {/* Minimal controls */}
      <div className="flex gap-1 justify-center">
        <button
          onClick={togglePlayPause}
          className="p-1 hover:bg-accent rounded transition-colors"
          title={playbackState?.is_playing ? 'Pause' : 'Play'}
        >
          {playbackState?.is_playing ? (
            <Pause size={14} className="text-primary" />
          ) : (
            <Play size={14} className="text-primary" />
          )}
        </button>
        <button
          onClick={next}
          className="p-1 hover:bg-sidebar-hover rounded transition-colors"
          title="Next"
        >
          <SkipForward size={14} className="text-text-primary" />
        </button>
      </div>
    </div>
  );
}
