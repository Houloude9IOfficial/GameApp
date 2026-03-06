import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Download, MoreHorizontal, Clock, CheckCircle, HardDrive, Calendar, Gamepad2, CalendarClock, Ban } from 'lucide-react';
import { Game } from '../../../shared/types';
import { useGamesStore } from '../../stores/useGamesStore';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { useInstallModal } from '../../stores/useInstallModal';
import { formatBytes, formatPlayTime, formatRelativeTime, isGameAvailable, formatGameState } from '../../utils/formatters';
import { DEFAULT_BANNER } from '../../utils/constants';
import { Badge } from '../common/Badge';
import { GameContextMenu } from './GameContextMenu';
import { ProgressBar } from '../common/ProgressBar';

interface GameListItemProps {
  game: Game;
}

function GameListItem({ game }: GameListItemProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const installStatus = useGamesStore(s => s.getInstallStatus(game.id));
  const playStats = useGamesStore(s => s.playStats[game.id]);
  const downloadQueue = useDownloadStore(s => s.queue);

  const isDownloading = downloadQueue.some(t => t.gameId === game.id && (t.status === 'downloading' || t.status === 'queued'));
  const downloadProgress = downloadQueue.find(t => t.gameId === game.id && t.status === 'downloading');

  const bannerUrl = game.brandingUrls?.icon || game.brandingUrls?.logo || DEFAULT_BANNER;
  const accentColor = game.branding?.primaryColor || 'var(--color-accent)';
  const available = isGameAvailable(game.gameState);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!available) return; // Block action for unreleased games
    if (installStatus === 'installed') {
      try { await window.electronAPI.launchGame(game.id); } catch (err) { console.error(err); }
    } else {
      useInstallModal.getState().open(game);
    }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="group flex items-center gap-4 py-3 px-4 rounded-xl cursor-pointer
                   hover:bg-card transition-all duration-200 border border-transparent hover:border-card-border"
        onClick={() => navigate(`/game/${game.id}`)}
        onContextMenu={handleContextMenu}
      >
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-card-border">
          <img
            src={bannerUrl}
            alt={game.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_BANNER; }}
            draggable={false}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-text-primary truncate">{game.name}</h3>
            {installStatus === 'installed' && (
              <CheckCircle size={14} className="text-success flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
            {game.developer && <span>{game.developer}</span>}
            {game.version && <span>v{game.version}</span>}
            {game.totalSize && (
              <span className="flex items-center gap-1">
                <HardDrive size={10} />
                {formatBytes(game.totalSize)}
              </span>
            )}
          </div>
          {/* Download progress */}
          {isDownloading && downloadProgress && (
            <div className="mt-1.5">
              <ProgressBar
                value={downloadProgress.progress}
                size="sm"
                color="accent"
                showLabel
              />
            </div>
          )}
        </div>

        {/* Play Stats */}
        <div className="hidden md:flex flex-col items-end gap-1 text-xs text-text-muted flex-shrink-0">
          {playStats && playStats.totalPlayTimeSeconds > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatPlayTime(playStats.totalPlayTimeSeconds)}
            </span>
          )}
          {playStats?.lastPlayedAt && (
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {formatRelativeTime(new Date(Number(playStats.lastPlayedAt)).toISOString())}
            </span>
          )}
        </div>

        {/* Tags (hidden on small screens) */}
        <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
          {game.tags?.slice(0, 3).map(tag => (
            <Badge key={tag} variant="default" size="sm">{tag}</Badge>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={handleAction}
          disabled={!available}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
            !available
              ? 'opacity-70 cursor-not-allowed bg-surface border border-card-border text-text-muted'
              : 'text-primary opacity-0 group-hover:opacity-100 hover:opacity-90'
          }`}
          style={available ? { backgroundColor: accentColor } : undefined}
        >
          {!available ? (
            <>
              {game.gameState === 'coming-soon' ? <CalendarClock size={14} /> : <Ban size={14} />}
              {formatGameState(game.gameState!)}
            </>
          ) : installStatus === 'installed' ? (
            <>
              <Play size={14} fill="currentColor" />
              Play
            </>
          ) : isDownloading ? (
            <span className="text-xs">Downloading...</span>
          ) : (
            <>
              <Download size={14} />
              Install
            </>
          )}
        </button>

        {/* More */}
        <button
          onClick={(e) => { e.stopPropagation(); handleContextMenu(e); }}
          className="p-1 rounded text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <MoreHorizontal size={16} />
        </button>
      </motion.div>

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

interface GameListProps {
  games: Game[];
  emptyMessage?: string;
}

export function GameList({ games, emptyMessage = 'No games found' }: GameListProps) {
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <Gamepad2 size={48} className="mb-4 opacity-40" />
        <p className="text-lg font-medium">{emptyMessage}</p>
        <p className="text-sm mt-1">Try adjusting your filters or search</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {games.map((game) => (
        <GameListItem key={game.id} game={game} />
      ))}
    </div>
  );
}
