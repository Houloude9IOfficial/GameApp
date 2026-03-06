import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Download, MoreHorizontal, Clock, CheckCircle, CalendarClock, Ban, PackagePlus } from 'lucide-react';
import { Game, GameInstallStatus } from '../../../shared/types';
import { useGamesStore } from '../../stores/useGamesStore';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { useInstallModal } from '../../stores/useInstallModal';
import { useOwnershipStore } from '../../stores/useOwnershipStore';
import { formatBytes, formatPlayTime, isGameAvailable, getCountdown, formatCountdown, formatGameState } from '../../utils/formatters';
import { DEFAULT_BANNER } from '../../utils/constants';
import { Badge } from '../common/Badge';
import { GameContextMenu } from './GameContextMenu';

interface GameCardProps {
  game: Game;
  size?: number;  // 1-5
}

export function GameCard({ game, size = 3 }: GameCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const installStatus = useGamesStore(s => s.getInstallStatus(game.id));
  const playStats = useGamesStore(s => s.playStats[game.id]);
  const downloadQueue = useDownloadStore(s => s.queue);
  const owned = useOwnershipStore(s => s.ownsGame(game.id));
  const addGameToLibrary = useOwnershipStore(s => s.addGame);

  const isDownloading = downloadQueue.some(t => t.gameId === game.id && (t.status === 'downloading' || t.status === 'queued'));
  const downloadProgress = downloadQueue.find(t => t.gameId === game.id && t.status === 'downloading');

  const available = isGameAvailable(game.gameState);
  const [countdown, setCountdown] = useState(getCountdown(game.releaseDate));

  // Live countdown ticker
  useEffect(() => {
    if (available || !game.releaseDate) return;
    const timer = setInterval(() => setCountdown(getCountdown(game.releaseDate)), 1000);
    return () => clearInterval(timer);
  }, [game.releaseDate, available]);

  const bannerUrl = game.brandingUrls?.banner || game.brandingUrls?.logo || DEFAULT_BANNER;
  const capsuleUrl = game.brandingUrls?.capsule;

  // Dynamic sizing
  const sizeMap = {
    1: 'w-36',
    2: 'w-44',
    3: 'w-52',
    4: 'w-64',
    5: 'w-80',
  } as Record<number, string>;

  const heightMap = {
    1: 'h-48',
    2: 'h-56',
    3: 'h-72',
    4: 'h-80',
    5: 'h-96',
  } as Record<number, string>;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!available) return; // Block action for unreleased games
    if (!owned) {
      await addGameToLibrary(game.id);
      return;
    }
    if (installStatus === 'installed') {
      try {
        await window.electronAPI.launchGame(game.id);
      } catch (err: any) {
        console.error('Failed to launch:', err);
      }
    } else {
      if (useDownloadStore.getState().isGameInQueue(game.id)) {
        const toast = (await import('react-hot-toast')).default;
        toast('Already installing', { icon: '⏳' });
        return;
      }
      useInstallModal.getState().open(game);
    }
  };

  const accentColor = game.branding?.primaryColor || 'var(--color-accent)';

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`${sizeMap[size] || sizeMap[3]} group relative cursor-pointer select-none`}
        onClick={() => navigate(`/game/${game.id}`)}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Card Image */}
        <div
          className={`relative ${heightMap[size] || heightMap[3]} rounded-xl overflow-hidden border-2 transition-all duration-300`}
          style={{
            borderColor: hovered ? accentColor : 'var(--color-card-border)',
            boxShadow: hovered ? `0 8px 30px ${accentColor}22` : 'var(--card-shadow)',
          }}
        >
          {/* Banner Image */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-card animate-pulse-soft" />
          )}
          <img
            src={capsuleUrl || bannerUrl}
            alt={game.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${hovered ? 'scale-100' : 'scale-100'} ${imageLoaded ? '' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_BANNER; setImageLoaded(true); }}
            draggable={false}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Download Progress Overlay */}
          {isDownloading && downloadProgress && (
            <div className="absolute inset-x-0 bottom-0">
              <div className="h-1 bg-black/40">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${downloadProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Game State Overlay (Coming Soon / Not Available) */}
          {!available && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px]">
              {countdown ? (
                <div className="text-center">
                  <div className="flex items-center gap-1 text-white/90 text-xs font-medium mb-2">
                    <CalendarClock size={12} />
                    <span>{formatGameState(game.gameState!)}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {countdown.days > 0 && (
                      <div className="flex flex-col items-center bg-black/60 rounded-lg px-2 py-1.5 min-w-[36px]">
                        <span className="text-white font-bold text-sm leading-none">{countdown.days}</span>
                        <span className="text-white/50 text-[8px] mt-0.5">DAY{countdown.days !== 1 ? 'S' : ''}</span>
                      </div>
                    )}
                    <div className="flex flex-col items-center bg-black/60 rounded-lg px-2 py-1.5 min-w-[36px]">
                      <span className="text-white font-bold text-sm leading-none">{String(countdown.hours).padStart(2, '0')}</span>
                      <span className="text-white/50 text-[8px] mt-0.5">HRS</span>
                    </div>
                    <div className="flex flex-col items-center bg-black/60 rounded-lg px-2 py-1.5 min-w-[36px]">
                      <span className="text-white font-bold text-sm leading-none">{String(countdown.minutes).padStart(2, '0')}</span>
                      <span className="text-white/50 text-[8px] mt-0.5">MIN</span>
                    </div>
                    <div className="flex flex-col items-center bg-black/60 rounded-lg px-2 py-1.5 min-w-[36px]">
                      <span className="text-white font-bold text-sm leading-none">{String(countdown.seconds).padStart(2, '0')}</span>
                      <span className="text-white/50 text-[8px] mt-0.5">SEC</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-white/80">
                  <Ban size={20} />
                  <span className="text-xs font-medium">{formatGameState(game.gameState!)}</span>
                </div>
              )}
            </div>
          )}

          {/* Hover Overlay */}
          {available && (
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2">
                {/* Play/Install Button */}
                <button
                  onClick={handlePlay}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-100"
                  style={{ backgroundColor: accentColor }}
                >
                  {!owned ? (
                    <PackagePlus size={20} className="text-primary" />
                  ) : installStatus === 'installed' ? (
                    <Play size={22} className="text-primary ml-0.5" fill="currentColor" />
                  ) : (
                    <Download size={20} className="text-primary" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* More Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleContextMenu(e); }}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <MoreHorizontal size={14} />
          </button>

          {/* Status Badge */}
          {!available && (
            <div className="absolute top-2 left-2">
              <Badge
                variant={game.gameState === 'coming-soon' ? 'info' : 'danger'}
                size="sm"
              >
                {game.gameState === 'coming-soon' ? (
                  <><CalendarClock size={10} className="mr-0.5" /> Coming Soon</>
                ) : (
                  <><Ban size={10} className="mr-0.5" /> Not Available</>
                )}
              </Badge>
            </div>
          )}
          {available && installStatus === 'installed' && (
            <div className="absolute top-2 left-2">
              <Badge variant="success" size="sm">
                <CheckCircle size={10} className="mr-0.5" /> Installed
              </Badge>
            </div>
          )}

          {/* Bottom Info */}
          <div className="absolute bottom-0 inset-x-0 p-3">
            {playStats && playStats.totalPlayTimeSeconds > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-white/70 mb-1">
                <Clock size={10} />
                <span>{formatPlayTime(playStats.totalPlayTimeSeconds)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Title */}
        <div className="mt-2 px-1">
          <h3 className="text-sm font-semibold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
            {game.name}
          </h3>
          {size >= 3 && (
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
              {game.developer || 'Unknown Developer'}
            </p>
          )}
        </div>
      </motion.div>

      {/* Context Menu */}
      {showMenu && (
        <GameContextMenu
          game={game}
          installStatus={installStatus}
          position={menuPos}
          onClose={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
