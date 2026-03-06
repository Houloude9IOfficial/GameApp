import React, { useEffect, useState } from 'react';
import { Download, HardDrive, Monitor, X, AlertTriangle, CheckCircle, CalendarClock, Ban } from 'lucide-react';
import { useInstallModal } from '../../stores/useInstallModal';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { useOwnershipStore } from '../../stores/useOwnershipStore';
import { formatBytes, isGameAvailable, getCountdown, formatGameState } from '../../utils/formatters';
import { DEFAULT_BANNER } from '../../utils/constants';

export function InstallModal() {
  const game = useInstallModal((s) => s.game);
  const close = useInstallModal((s) => s.close);

  if (!game) return null;
  return <InstallModalInner game={game} onClose={close} />;
}

function InstallModalInner({ game, onClose }: { game: any; onClose: () => void }) {
  const settings = useSettingsStore((s) => s.settings);
  const startDownload = useDownloadStore((s) => s.startDownload);
  const owned = useOwnershipStore((s) => s.ownsGame(game.id));

  const [diskSpace, setDiskSpace] = useState<{ free: number; total: number } | null>(null);
  const [createShortcut, setCreateShortcut] = useState(true);
  const [loading, setLoading] = useState(false);

  const installDir = settings?.installDirectory || 'C:\\Program Files\\GL\\Games';
  const requiredSize = game.totalSize || 0;
  const available = isGameAvailable(game.gameState);
  const countdown = getCountdown(game.releaseDate);

  useEffect(() => {
    window.electronAPI.getDiskSpace(installDir).then(setDiskSpace);
  }, [installDir]);

  const hasEnoughSpace = diskSpace ? diskSpace.free > requiredSize : true;
  const bannerUrl = game.brandingUrls?.banner || DEFAULT_BANNER;
  const iconUrl = game.brandingUrls?.icon || game.brandingUrls?.logo;

  const handleInstall = async () => {
    if (!available) return; // Block install for unreleased games
    // Prevent starting a duplicate download
    const { useDownloadStore } = await import('../../stores/useDownloadStore');
    if (useDownloadStore.getState().isGameInQueue(game.id)) {
      const { default: toast } = await import('react-hot-toast');
      toast('Already installing', { icon: '⏳' });
      return;
    }
    setLoading(true);
    try {
      await startDownload(game.id, 'install');
      if (createShortcut) {
        try {
          await window.electronAPI.createDesktopShortcut(game.id, game.name, iconUrl || '');
        } catch {
          // non-fatal
        }
      }
      onClose();
    } catch {
      setLoading(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner header */}
        <div className="relative h-36 overflow-hidden">
          <img src={bannerUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <X size={16} />
          </button>

          {/* Game info overlay */}
          <div className="absolute bottom-4 left-5 flex items-center gap-3">
            {iconUrl && (
              <img src={iconUrl} alt="" className="w-12 h-12 rounded-lg border border-white/20 object-cover shadow-lg" />
            )}
            <div>
              <h2 className="text-lg font-bold text-white drop-shadow-lg">{game.name}</h2>
              {game.developer && <p className="text-xs text-white/70">{game.developer}</p>}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Install location */}
          <div className="flex items-center gap-3 text-sm">
            <HardDrive size={16} className="text-text-muted flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-text-muted text-xs">Install location</p>
              <p className="text-text-primary truncate" title={installDir}>{installDir}</p>
            </div>
          </div>

          {/* Storage info */}
          <div className="bg-surface rounded-xl p-4 space-y-3 border border-card-border">
            {/* Required */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Required space</span>
              <span className="font-semibold text-text-primary">{requiredSize > 0 ? formatBytes(requiredSize) : 'Unknown'}</span>
            </div>

            {/* Available */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Available space</span>
              <span className={`font-semibold ${hasEnoughSpace ? 'text-success' : 'text-danger'}`}>
                {diskSpace ? formatBytes(diskSpace.free) : 'Checking...'}
              </span>
            </div>

            {/* Progress bar showing usage */}
            {diskSpace && diskSpace.total > 0 && (() => {
              const used = diskSpace.total - diskSpace.free;
              const usedPercent = (used / diskSpace.total) * 100;
              const newUsagePercent = (requiredSize / diskSpace.total) * 100;
              return (
                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-primary/30 overflow-hidden border border-card-border">
                    <div className="h-full flex">
                      {/* Already occupied space */}
                      <div
                        className="h-full bg-text-secondary transition-all"
                        style={{ width: `${usedPercent}%` }}
                      />
                      {/* This install */}
                      <div
                        className={`h-full transition-all ${hasEnoughSpace ? 'bg-accent' : 'bg-danger'}`}
                        style={{ width: `${Math.min(newUsagePercent, 100 - usedPercent)}%` }}
                      />
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-4 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-text-secondary" />
                      Used ({formatBytes(used)})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${hasEnoughSpace ? 'bg-accent' : 'bg-danger'}`} />
                      This install ({requiredSize > 0 ? formatBytes(requiredSize) : '?'})
                    </span>
                    <span className="flex items-center gap-1.5 ml-auto">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary/30 border border-card-border" />
                      Free ({formatBytes(diskSpace.free)})
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Not enough space warning */}
            {!hasEnoughSpace && (
              <div className="flex items-center gap-2 text-danger text-xs mt-1">
                <AlertTriangle size={14} />
                <span>Not enough disk space to install this game</span>
              </div>
            )}
          </div>

          {/* Game details */}
          <div className="flex items-center gap-4 text-xs text-text-muted">
            {game.version && <span>Version {game.version}</span>}
            {game.fileCount && <span>{game.fileCount} files</span>}
            {game.category && <span className="capitalize">{game.category}</span>}
          </div>

          {/* Shortcut checkbox */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                createShortcut
                  ? 'bg-accent border-accent'
                  : 'border-card-border group-hover:border-text-muted'
              }`}
              onClick={() => setCreateShortcut(!createShortcut)}
            >
              {createShortcut && <CheckCircle size={12} className="text-primary" />}
            </div>
            <div onClick={() => setCreateShortcut(!createShortcut)}>
              <span className="text-sm text-text-primary">Create desktop shortcut</span>
              <p className="text-[10px] text-text-muted">Adds a shortcut that launches the game through the app</p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-text-secondary bg-surface hover:bg-surface-hover border border-card-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInstall}
            disabled={!owned || !hasEnoughSpace || loading || !available}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-primary bg-accent hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {!owned ? (
              <>
                <Ban size={16} />
                Not Owned
              </>
            ) : !available ? (
              <>
                {game.gameState === 'coming-soon' ? <CalendarClock size={16} /> : <Ban size={16} />}
                {formatGameState(game.gameState!)}
              </>
            ) : (
              <>
                <Download size={16} />
                {loading ? 'Starting...' : 'Install'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
