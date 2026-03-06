import React from 'react';
import { Download, Pause, Play, Trash2, ChevronDown, ChevronUp, HardDrive } from 'lucide-react';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useGamesStore } from '../stores/useGamesStore';
import { formatBytes, formatSpeed, formatETA, formatPercent } from '../utils/formatters';
import { DEFAULT_BANNER } from '../utils/constants';
import { ProgressBar } from '../components/common/ProgressBar';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { BandwidthGraph } from '../components/common/BandwidthGraph';

export function DownloadsPage() {
  const queue = useDownloadStore(s => s.queue);
  const pauseDownload = useDownloadStore(s => s.pauseDownload);
  const resumeDownload = useDownloadStore(s => s.resumeDownload);
  const cancelDownload = useDownloadStore(s => s.cancelDownload);
  const getTotalSpeed = useDownloadStore(s => s.getTotalSpeed);
  const speedHistory = useDownloadStore(s => s.speedHistory);

  const games = useGamesStore(s => s.games);

  const totalSpeed = getTotalSpeed();
  const activeDownloads = queue.filter(d => d.status === 'downloading' || d.status === 'queued');
  const pausedDownloads = queue.filter(d => d.status === 'paused');
  const failedDownloads = queue.filter(d => d.status === 'failed');
  const completedDownloads = queue.filter(d => d.status === 'completed');

  const getGame = (gameId: string) => games.find(g => g.id === gameId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-card-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Downloads</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {activeDownloads.length > 0
                ? `${activeDownloads.length} active • ${formatSpeed(totalSpeed)}`
                : 'No active downloads'}
            </p>
          </div>
          {activeDownloads.length > 0 && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => queue.forEach(d => { if (d.status === 'downloading') pauseDownload(d.id); })}>
                <Pause size={12} className="mr-1" /> Pause All
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Bandwidth Graph */}
        {activeDownloads.length > 0 && speedHistory.length > 1 && (
          <BandwidthGraph speedHistory={speedHistory} />
        )}

        {/* Active Downloads */}
        {activeDownloads.length > 0 && (
          <Section title="Active" count={activeDownloads.length}>
            {activeDownloads.map(dl => (
              <DownloadItem
                key={dl.id}
                download={dl}
                game={getGame(dl.gameId)}
                onPause={() => pauseDownload(dl.id)}
                onResume={() => resumeDownload(dl.id)}
                onCancel={() => cancelDownload(dl.id)}
              />
            ))}
          </Section>
        )}

        {/* Paused Downloads */}
        {pausedDownloads.length > 0 && (
          <Section title="Paused" count={pausedDownloads.length}>
            {pausedDownloads.map(dl => (
              <DownloadItem
                key={dl.id}
                download={dl}
                game={getGame(dl.gameId)}
                onPause={() => pauseDownload(dl.id)}
                onResume={() => resumeDownload(dl.id)}
                onCancel={() => cancelDownload(dl.id)}
              />
            ))}
          </Section>
        )}

        {/* Failed Downloads */}
        {failedDownloads.length > 0 && (
          <Section title="Failed" count={failedDownloads.length}>
            {failedDownloads.map(dl => (
              <DownloadItem
                key={dl.id}
                download={dl}
                game={getGame(dl.gameId)}
                onPause={() => {}}
                onResume={() => resumeDownload(dl.id)}
                onCancel={() => cancelDownload(dl.id)}
              />
            ))}
          </Section>
        )}

        {/* Completed */}
        {completedDownloads.length > 0 && (
          <Section title="Completed" count={completedDownloads.length}>
            {completedDownloads.map((dl: typeof queue[number], i: number) => (
              <div key={i} className="flex items-center gap-4 py-3 px-4 rounded-xl bg-card border border-card-border">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
                  <img
                    src={getGame(dl.gameId)?.brandingUrls?.icon || DEFAULT_BANNER}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-text-primary truncate">{dl.gameName || dl.gameId}</h3>
                  <span className="text-xs text-text-muted">{dl.type === 'update' ? 'Updated' : 'Installed'}</span>
                </div>
                <Badge variant="success" size="sm">Complete</Badge>
              </div>
            ))}
          </Section>
        )}

        {/* Empty State */}
        {queue.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Download size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">No downloads</p>
            <p className="text-sm mt-1">Go to the Store or Library to install games</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{title}</h2>
        <Badge variant="default" size="sm">{count}</Badge>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function DownloadItem({ download, game, onPause, onResume, onCancel }: {
  download: any;
  game?: any;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  const bannerUrl = game?.brandingUrls?.icon || DEFAULT_BANNER;
  const isActive = download.status === 'downloading';
  const isPaused = download.status === 'paused';
  const isQueued = download.status === 'queued';
  const isError = download.status === 'failed';

  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-card border border-card-border">
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
        <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Info + Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-text-primary truncate">{game?.name || download.gameId}</h3>
          {isActive && <Badge variant="info" size="sm">Downloading</Badge>}
          {isPaused && <Badge variant="warning" size="sm">Paused</Badge>}
          {isQueued && <Badge variant="default" size="sm">Queued</Badge>}
          {isError && <Badge variant="danger" size="sm">Error</Badge>}
        </div>

        {(isActive || isPaused || isQueued) && (
          <>
            <ProgressBar
              value={download.progress || 0}
              size="sm"
              color={isPaused ? 'warning' : 'accent'}
            />
            <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
              {isQueued ? (
                <span>Starting download...</span>
              ) : (
                <>
                  <span>{formatPercent(download.progress || 0)}</span>
                  <span>{formatBytes(download.downloadedBytes || 0)} / {formatBytes(download.totalBytes || 0)}</span>
                  {isActive && <span>{formatSpeed(download.speed || 0)}</span>}
                  {isActive && download.eta > 0 && <span>ETA: {formatETA(download.eta)}</span>}
                </>
              )}
            </div>
          </>
        )}

        {isError && download.error && (
          <p className="text-xs text-danger mt-1">{download.error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isActive && (
          <button onClick={onPause} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors" title="Pause">
            <Pause size={16} />
          </button>
        )}
        {(isPaused || isError) && (
          <button onClick={onResume} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors" title="Resume">
            <Play size={16} />
          </button>
        )}
        {(isActive || isPaused || isQueued || isError) && (
          <button onClick={onCancel} className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-surface transition-colors" title="Cancel">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
