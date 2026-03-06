import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, Download, Pause, Square, Trash2, Folder, RefreshCw,
  Clock, HardDrive, Calendar, ChevronLeft, Tag, Hash,
  ExternalLink, Shield, Settings, MoreHorizontal, CheckCircle, AlertCircle, Wrench,
  Copy, ShieldCheck, Monitor, Film, CalendarClock, Ban, PackagePlus
} from 'lucide-react';
import { Game, InstalledGame, DownloadTask } from '../../../shared/types';
import { useGamesStore } from '../../stores/useGamesStore';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { useInstallModal } from '../../stores/useInstallModal';
import { useOwnershipStore } from '../../stores/useOwnershipStore';
import { ScreenshotLightbox } from '../common/ScreenshotLightbox';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatBytes, formatPlayTime, formatRelativeTime, formatSpeed, formatETA, formatDate, formatGameState, isGameAvailable, getCountdown, formatLaunchArgs } from '../../utils/formatters';
import { DEFAULT_BANNER } from '../../utils/constants';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { PlatformIcons } from '../common/PlatformIcon';
import { YouTubePlayer } from '../common/YouTubePlayer';
import { ReviewSection } from './ReviewSection';
import toast from 'react-hot-toast';

interface GameDetailProps {
  game: Game;
}

export function GameDetail({ game }: GameDetailProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'settings'>('overview');
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const installStatus = useGamesStore(s => s.getInstallStatus(game.id));
  const installedGame = useGamesStore(s => s.getInstalledGame(game.id));
  const playStats = useGamesStore(s => s.playStats[game.id]);
  const [isRunning, setIsRunning] = useState(false);
  const owned = useOwnershipStore(s => s.ownsGame(game.id));
  const addGameToLibrary = useOwnershipStore(s => s.addGame);

  const startDownload = useDownloadStore(s => s.startDownload);
  const pauseDownload = useDownloadStore(s => s.pauseDownload);
  const resumeDownload = useDownloadStore(s => s.resumeDownload);
  const cancelDownload = useDownloadStore(s => s.cancelDownload);
  const downloadQueue = useDownloadStore(s => s.queue);

  const currentDownload = downloadQueue.find(d => d.gameId === game.id);
  const isDownloading = currentDownload && (currentDownload.status === 'downloading' || currentDownload.status === 'queued');

  const available = isGameAvailable(game.gameState);
  const [countdown, setCountdown] = useState(getCountdown(game.releaseDate));

  // Live countdown ticker
  useEffect(() => {
    if (available || !game.releaseDate) return;
    const timer = setInterval(() => setCountdown(getCountdown(game.releaseDate)), 1000);
    return () => clearInterval(timer);
  }, [game.releaseDate, available]);

  const bannerUrl = game.brandingUrls?.banner || DEFAULT_BANNER;
  const logoUrl = game.brandingUrls?.logo;
  const iconUrl = game.brandingUrls?.icon;
  const screenshotsUrls = game.brandingUrls?.screenshots || [];
  const accentColor = game.branding?.primaryColor || 'var(--color-accent)';

  useEffect(() => {
    checkForUpdates();
  }, [game.id]);

  const checkForUpdates = async () => {
    if (installStatus !== 'installed' || !installedGame) return;
    setCheckingUpdate(true);
    try {
      const result = await window.electronAPI.checkGameUpdate(game.id, installedGame.version);
      setUpdateAvailable(result.updateAvailable);
    } catch {
      // silent
    } finally {
      setCheckingUpdate(false);
    }
  };

  const loadFiles = async () => {
    setLoadingFiles(true);
    try {
      const result = await window.electronAPI.getGameFiles(game.id);
      setFiles(Array.isArray(result) ? result : result?.files || []);
    } catch {
      toast.error('Failed to load file list');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'files') loadFiles();
  }, [activeTab]);

  const handlePrimaryAction = async () => {
    if (!available) return; // Block action for unreleased games
    if (!owned) {
      await addGameToLibrary(game.id);
      return;
    }
    if (isRunning) {
      try { await window.electronAPI.stopGame(game.id); } catch { toast.error('Failed to stop'); }
      return;
    }
    if (installStatus === 'installed' && !updateAvailable) {
      try { await window.electronAPI.launchGame(game.id); } catch (err: any) { toast.error(err.message || 'Failed to launch'); }
      return;
    }
    if (updateAvailable) {
      startDownload(game.id, 'update');
      return;
    }
    useInstallModal.getState().open(game);
  };

  const primaryButtonLabel = () => {
    if (!available) {
      if (countdown) return 'Coming Soon';
      return formatGameState(game.gameState!);
    }
    if (!owned) return 'Add to account';
    if (isRunning) return 'Stop';
    if (isDownloading) return 'Downloading...';
    if (updateAvailable) return 'Update';
    if (installStatus === 'installed') return 'Play';
    return 'Install';
  };

  const primaryButtonIcon = () => {
    if (!available) {
      if (countdown) return <CalendarClock size={16} />;
      return <Ban size={16} />;
    }
    if (!owned) return <PackagePlus size={16} />;
    if (isRunning) return <Square size={16} fill="currentColor" />;
    if (isDownloading) return <Download size={16} />;
    if (updateAvailable) return <RefreshCw size={16} />;
    if (installStatus === 'installed') return <Play size={16} fill="currentColor" />;
    return <Download size={16} />;
  };

  // ── Scroll-driven banner fade ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bannerOpacity, setBannerOpacity] = useState(1);
  const [bannerTranslateY, setBannerTranslateY] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollY = el.scrollTop;
    const fadeEnd = 280; // fully faded at this scroll position
    const opacity = Math.max(0, 1 - scrollY / fadeEnd);
    const translateY = scrollY * 0.4; // parallax
    setBannerOpacity(opacity);
    setBannerTranslateY(translateY);
  }, []);

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex flex-col h-full overflow-y-auto">
      {/* Hero Banner */}
      <div className="relative h-96 flex-shrink-0 overflow-hidden">
        <div
          className="absolute inset-0 transition-none"
          style={{
            opacity: bannerOpacity,
            transform: `translateY(${bannerTranslateY}px)`,
            willChange: 'opacity, transform',
          }}
        >
          <img
            src={bannerUrl}
            alt={game.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_BANNER; }}
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-primary/5" />

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white text-sm backdrop-blur-sm transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="flex items-end gap-6">
            {/* Logo/Icon */}
            {(iconUrl || logoUrl) && (
              <img
                src={iconUrl || logoUrl}
                alt=""
                className="w-24 h-24 rounded-xl object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-white mb-2">{game.name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                {game.developer && (
                  <span className="text-sm text-white/70">{game.developer}</span>
                )}
                {game.version && (
                  <Badge variant="default" size="sm">v{game.version}</Badge>
                )}
                {game.gameState && game.gameState !== 'released' && (
                  <Badge
                    variant={game.gameState === 'coming-soon' ? 'info' : game.gameState === 'early-access' ? 'warning' : 'danger'}
                    size="sm"
                  >
                    {formatGameState(game.gameState)}
                  </Badge>
                )}
                {installStatus === 'installed' && (
                  <Badge variant="success" size="sm">
                    <CheckCircle size={10} className="mr-1" />Installed
                  </Badge>
                )}
                {updateAvailable && (
                  <Badge variant="warning" size="sm">
                    <AlertCircle size={10} className="mr-1" />Update Available
                  </Badge>
                )}
                {/* Platforms in hero */}
                <PlatformIcons platforms={game.platforms} sourcePlatform={game.sourcePlatform} size={16} />
              </div>
            </div>

            {/* Primary Action */}
            <div className="flex items-center gap-3">
              {!available && countdown && (
                <div className="flex gap-1.5 mr-2">
                  {countdown.days > 0 && (
                    <div className="flex flex-col items-center bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5 min-w-[44px] border border-white/10">
                      <span className="text-white font-bold text-base leading-none">{countdown.days}</span>
                      <span className="text-white/50 text-[8px] mt-0.5">DAY{countdown.days !== 1 ? 'S' : ''}</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5 min-w-[44px] border border-white/10">
                    <span className="text-white font-bold text-base leading-none">{String(countdown.hours).padStart(2, '0')}</span>
                    <span className="text-white/50 text-[8px] mt-0.5">HRS</span>
                  </div>
                  <div className="flex flex-col items-center bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5 min-w-[44px] border border-white/10">
                    <span className="text-white font-bold text-base leading-none">{String(countdown.minutes).padStart(2, '0')}</span>
                    <span className="text-white/50 text-[8px] mt-0.5">MIN</span>
                  </div>
                  <div className="flex flex-col items-center bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5 min-w-[44px] border border-white/10">
                    <span className="text-white font-bold text-base leading-none">{String(countdown.seconds).padStart(2, '0')}</span>
                    <span className="text-white/50 text-[8px] mt-0.5">SEC</span>
                  </div>
                </div>
              )}
              <button
                onClick={handlePrimaryAction}
                disabled={!available || (isDownloading && currentDownload?.status === 'downloading')}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl text-base font-semibold transition-all shadow-lg ${
                  !available
                    ? 'text-white/70 bg-white/10 cursor-not-allowed backdrop-blur-sm border border-white/10'
                    : 'text-primary hover:opacity-90 hover:scale-100 disabled:opacity-50'
                }`}
                style={available ? { backgroundColor: accentColor } : undefined}
              >
                {primaryButtonIcon()}
                {primaryButtonLabel()}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Download Progress Bar */}
      {currentDownload && (currentDownload.status === 'downloading' || currentDownload.status === 'queued' || currentDownload.status === 'paused') && (
        <div className="px-8 py-4 bg-surface border-b border-card-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-primary">
                {currentDownload.status === 'queued' ? 'Queued' : currentDownload.status === 'paused' ? 'Paused' : 'Downloading'}
              </span>
              {currentDownload.status === 'downloading' && (
                <span className="text-xs text-text-muted">
                  {formatSpeed(currentDownload.speed || 0)} • {formatETA(currentDownload.eta || 0)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentDownload.status === 'downloading' && (
                <button onClick={() => pauseDownload(currentDownload.id)} className="p-1.5 rounded hover:bg-card text-text-muted hover:text-text-primary">
                  <Pause size={14} />
                </button>
              )}
              {currentDownload.status === 'paused' && (
                <button onClick={() => resumeDownload(currentDownload.id)} className="p-1.5 rounded hover:bg-card text-text-muted hover:text-text-primary">
                  <Play size={14} />
                </button>
              )}
              <button onClick={() => cancelDownload(currentDownload.id)} className="p-1.5 rounded hover:bg-card text-danger">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <ProgressBar
            value={currentDownload.progress}
            size="md"
            color="accent"
            showLabel
          />
        </div>
      )}

      {/* Tabs */}
      <div className="px-8 bg-surface border-b border-card-border">
        <div className="flex gap-1">
          {(['overview', 'files', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-8">
        {activeTab === 'overview' && (
          <OverviewTab game={game} installStatus={installStatus} installedGame={installedGame} playStats={playStats} screenshots={screenshotsUrls} />
        )}
        {activeTab === 'files' && (
          <FilesTab files={files} loading={loadingFiles} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab game={game} installStatus={installStatus} installedGame={installedGame} />
        )}
      </div>
    </div>
  );
}

/* ─── Sub-tabs ─── */

function OverviewTab({ game, installStatus, installedGame, playStats, screenshots }: {
  game: Game;
  installStatus: string;
  installedGame?: InstalledGame;
  playStats?: { totalPlayTimeSeconds: number; lastPlayed?: string; sessions: any[] };
  screenshots: string[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
    {lightboxIndex !== null && (
      <ScreenshotLightbox
        screenshots={screenshots}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    )}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Main Info */}
      <div className="lg:col-span-2 space-y-6">
        {/* Description */}
        {(game.descriptionMarkdown || game.description) && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">About</h2>
            {game.descriptionMarkdown ? (
              <div className="prose prose-sm prose-invert max-w-none text-text-secondary
                prose-headings:text-text-primary prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                prose-p:leading-relaxed prose-p:my-2
                prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                prose-strong:text-text-primary
                prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
                prose-blockquote:border-accent prose-blockquote:text-text-muted
                prose-code:text-accent prose-code:bg-card prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-card prose-pre:border prose-pre:border-card-border prose-pre:rounded-lg
                prose-hr:border-card-border
                prose-img:rounded-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {game.descriptionMarkdown}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {game.description}
              </p>
            )}
          </div>
        )}

        {/* Screenshots */}
        {screenshots.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">Screenshots</h2>
            <div className="grid grid-cols-2 gap-3">
              {screenshots.map((url, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-card-border aspect-video">
                  <img
                    src={url}
                    alt={`Screenshot ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                    onClick={() => setLightboxIndex(i)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trailers */}
        {game.trailers && game.trailers.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              <Film size={18} className="inline mr-2 -mt-0.5" />
              Trailers
            </h2>
            <div className="space-y-4">
              {game.trailers.map((trailer, i) => (
                <YouTubePlayer
                  key={i}
                  youtubeUrl={trailer.youtubeUrl}
                  title={trailer.title}
                />
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <ReviewSection gameId={game.id} />
      </div>

      {/* Right Column - Details Sidebar */}
      <div className="space-y-4">
        {/* Game Info Card */}
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">Details</h3>
          <InfoRow icon={<Tag size={14} />} label="Developer" value={game.developer || 'Unknown'} />
          <InfoRow icon={<Hash size={14} />} label="Version" value={game.version || 'N/A'} />
          <InfoRow icon={<HardDrive size={14} />} label="Size" value={game.totalSize ? formatBytes(game.totalSize) : 'N/A'} />
          <InfoRow icon={<Hash size={14} />} label="Files" value={game.fileCount?.toString() || 'N/A'} />
          {game.launchArgs && <InfoRow icon={<Wrench size={14} />} label="Launch Args" value={formatLaunchArgs(game.launchArgs)} />}
          {game.category && <InfoRow icon={<Tag size={14} />} label="Category" value={game.category} />}
          {game.executable && <InfoRow icon={<ExternalLink size={14} />} label="Executable" value={game.executable} />}
          {game.releaseDate && <InfoRow icon={<Calendar size={14} />} label="Released" value={formatDate(game.releaseDate)} />}
          {game.gameState && <InfoRow icon={<Monitor size={14} />} label="Status" value={formatGameState(game.gameState)} />}
          {game.isDrmFree !== undefined && (
            <div className="flex items-start gap-2 text-xs">
              <span className="text-text-muted mt-0.5 flex-shrink-0"><ShieldCheck size={14} /></span>
              <span className="text-text-muted flex-shrink-0 w-20">DRM</span>
              <span className={game.isDrmFree ? 'text-success font-medium' : 'text-text-secondary'}>
                {game.isDrmFree ? 'This game is DRM-Free' : 'This game has DRM protection'}
              </span>
            </div>
          )}
        </div>

        {/* Platforms Card */}
        {game.platforms && game.platforms.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Platforms</h3>
            <PlatformIcons platforms={game.platforms} sourcePlatform={game.sourcePlatform} size={20} />
          </div>
        )}

        {/* Play Stats Card */}
        {playStats && (
          <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Play Stats</h3>
            <InfoRow icon={<Clock size={14} />} label="Total Time" value={formatPlayTime(playStats.totalPlayTimeSeconds)} />
            {playStats.lastPlayed && (
              <InfoRow icon={<Calendar size={14} />} label="Last Played" value={formatRelativeTime(playStats.lastPlayed)} />
            )}
            <InfoRow icon={<Hash size={14} />} label="Sessions" value={playStats.sessions?.length?.toString() || '0'} />
          </div>
        )}

        {/* Install Info Card */}
        {installStatus === 'installed' && installedGame && (
          <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Installation</h3>
            <InfoRow icon={<Folder size={14} />} label="Path" value={installedGame.installPath} />
            <InfoRow icon={<Hash size={14} />} label="Version" value={installedGame.version} />
            {installedGame.installedAt && (
              <InfoRow icon={<Calendar size={14} />} label="Installed" value={formatRelativeTime(installedGame.installedAt)} />
            )}
            <button
              onClick={() => window.electronAPI.openFolder(installedGame.installPath)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-text-secondary bg-surface hover:bg-card-border transition-colors"
            >
              <Folder size={14} />
              Open Folder
            </button>
          </div>
        )}

        {/* Tags */}
        {game.tags && game.tags.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {game.tags.map(tag => (
                <Badge key={tag} variant="default" size="sm">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-text-muted mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-text-muted flex-shrink-0 w-20">{label}</span>
      <span className="text-text-secondary break-all">{value}</span>
    </div>
  );
}

function FilesTab({ files, loading }: { files: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={20} className="animate-spin text-text-muted mr-2" />
        <span className="text-text-muted">Loading files...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <p>No file information available</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_100px_140px] gap-4 px-4 py-2 text-xs font-medium text-text-muted uppercase">
        <span>Name</span>
        <span className="text-right">Size</span>
        <span className="text-right">Hash</span>
      </div>
      {files.map((file: any, i: number) => (
        <div key={i} className="grid grid-cols-[1fr_100px_140px] gap-4 px-4 py-2 rounded-lg hover:bg-card text-sm transition-colors">
          <span className="text-text-primary truncate">{file.path || file.name}</span>
          <span className="text-right text-text-muted">{file.size ? formatBytes(file.size) : '—'}</span>
          <span className="text-right text-text-muted font-mono text-xs truncate" title={file.hash}>
            {file.hash ? file.hash.substring(0, 12) + '...' : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({ game, installStatus, installedGame }: {
  game: Game;
  installStatus: string;
  installedGame?: InstalledGame;
}) {
  const startDownload = useDownloadStore.getState().startDownload;

  const handleShortcutCreation = async () => {
    try {
      const iconUrl = game.brandingUrls?.icon || game.brandingUrls?.logo;
      await window.electronAPI.createDesktopShortcut(game.id, game.name, iconUrl || '');
      toast.success('Desktop shortcut created');
    } catch (err) {
      toast.error('Failed to create desktop shortcut');
    }
  };

  const handleVerify = async () => {
    toast.loading(`Verifying ${game.name}...`, { id: `verify-${game.id}` });
    try {
      const result = await window.electronAPI.verifyIntegrity(game.id);
      if (result.totalChanges === 0) {
        toast.success('All files verified successfully', { id: `verify-${game.id}` });
      } else {
        const count = (result.added?.length || 0) + (result.updated?.length || 0) + (result.deleted?.length || 0);
        toast.loading(`${count} file(s) need repair — downloading...`, { id: `verify-${game.id}` });
        try {
          await startDownload(game.id, 'repair');
          toast.success(`Repairing ${count} file(s)`, { id: `verify-${game.id}` });
        } catch {
          toast.error(`${count} file(s) need repair but download failed`, { id: `verify-${game.id}` });
        }
      }
    } catch {
      toast.error('Verification failed', { id: `verify-${game.id}` });
    }
  };

  const handleUninstall = async () => {
    if (confirm(`Are you sure you want to uninstall ${game.name}? This will delete all game files.`)) {
      try {
        await window.electronAPI.uninstallGame(game.id);
        useGamesStore.getState().fetchInstalledGames();
        toast.success(`${game.name} has been uninstalled`);
      } catch {
        toast.error('Failed to uninstall');
      }
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      {installStatus === 'installed' && (
        <>
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h3 className="font-semibold text-text-primary mb-1">Create Shortcut</h3>
            <p className="text-sm text-text-muted mb-4">
              Create a desktop shortcut for {game.name} to easily launch it from your desktop or start menu.
            </p>
            <Button variant="secondary" onClick={handleShortcutCreation}>
              <Copy size={14} className="mr-2" />
              Create Desktop Shortcut
            </Button>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5">
            <h3 className="font-semibold text-text-primary mb-1">Verify Game Files</h3>
            <p className="text-sm text-text-muted mb-4">
              Check game integrity by comparing file hashes with the server.
            </p>
            <Button variant="secondary" onClick={handleVerify}>
              <Wrench size={14} className="mr-2" />
              Verify & Repair
            </Button>
          </div>

          <div className="bg-card border border-danger/20 rounded-xl p-5">
            <h3 className="font-semibold text-danger mb-1">Uninstall Game</h3>
            <p className="text-sm text-text-muted mb-4">
              Remove all game files from your computer. This cannot be undone.
            </p>
            <Button variant="danger" onClick={handleUninstall}>
              <Trash2 size={14} className="mr-2" />
              Uninstall {game.name}
            </Button>
          </div>
        </>
      )}

      {installStatus !== 'installed' && (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Settings size={32} className="mb-3 opacity-50" />
          <p>Install the game to access settings</p>
        </div>
      )}
    </div>
  );
}
