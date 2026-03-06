import React, { useState, useEffect, useRef } from 'react';
import { Play, Download, Clock, Info, ChevronRight, Settings, CalendarClock, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game, GameInstallStatus } from '../../../shared/types';
import { useGamesStore } from '../../stores/useGamesStore';
import { useInstallModal } from '../../stores/useInstallModal';
import { formatBytes, formatPlayTime, formatRelativeTime, isGameAvailable, formatGameState } from '../../utils/formatters';
import { DEFAULT_BANNER } from '../../utils/constants';
import { Badge } from '../common/Badge';
import { useNavigate } from 'react-router-dom';

interface GameHoverCardProps {
  game: Game;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function GameHoverCard({ game, anchorRect, onClose }: GameHoverCardProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const installStatus = useGamesStore(s => s.getInstallStatus(game.id));
  const playStats = useGamesStore(s => s.playStats[game.id]);
  const [position, setPosition] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useEffect(() => {
    if (cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Place to the right of the anchor, or left if no space
      let left = anchorRect.right + 12;
      if (left + cardRect.width > viewportWidth - 20) {
        left = anchorRect.left - cardRect.width - 12;
      }
      if (left < 20) left = 20;

      let top = anchorRect.top;
      if (top + cardRect.height > viewportHeight - 20) {
        top = viewportHeight - cardRect.height - 20;
      }
      if (top < 20) top = 20;

      setPosition({ left, top });
    }
  }, [anchorRect]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const bannerUrl = game.brandingUrls?.banner || DEFAULT_BANNER;
  const accentColor = game.branding?.primaryColor || 'var(--color-accent)';
  const available = isGameAvailable(game.gameState);

  const handleAction = async () => {
    if (!available) return; // Block action for unreleased games
    if (installStatus === 'installed') {
      try {
        await window.electronAPI.launchGame(game.id);
      } catch (err) {
        console.error('Failed to launch:', err);
      }
    } else {
      useInstallModal.getState().open(game);
    }
    onClose();
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[100] w-72"
      style={{ left: position.left, top: position.top }}
    >
      <div className="bg-surface border border-card-border rounded-xl overflow-hidden shadow-2xl">
        {/* Header Banner */}
        <div className="relative h-32">
          <img
            src={bannerUrl}
            alt={game.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_BANNER; }}
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="p-4 -mt-6 relative">
          <h3 className="text-base font-bold text-text-primary mb-1">{game.name}</h3>
          
          <div className="flex items-center gap-2 mb-3">
            {game.developer && (
              <span className="text-xs text-text-muted">{game.developer}</span>
            )}
            {game.version && (
              <Badge variant="default" size="sm">v{game.version}</Badge>
            )}
          </div>

          {game.description && (
            <p className="text-xs text-text-secondary line-clamp-3 mb-3 leading-relaxed">
              {game.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mb-3 text-xs text-text-muted">
            {playStats && playStats.totalPlayTimeSeconds > 0 && (
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{formatPlayTime(playStats.totalPlayTimeSeconds)}</span>
              </div>
            )}
            {playStats?.lastPlayedAt && (
              <div className="flex items-center gap-1">
                <span>Last: {formatRelativeTime(playStats.lastPlayedAt)}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {game.tags && game.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {game.tags.slice(0, 4).map(tag => (
                <Badge key={tag} variant="default" size="sm">{tag}</Badge>
              ))}
              {game.tags.length > 4 && (
                <Badge variant="default" size="sm">+{game.tags.length - 4}</Badge>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleAction}
              disabled={!available}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                !available ? 'text-text-muted bg-surface cursor-not-allowed border border-card-border' : 'text-primary hover:opacity-90'
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
              ) : (
                <>
                  <Download size={14} />
                  Install
                </>
              )}
            </button>
            <button
              onClick={() => { navigate(`/game/${game.id}`); onClose(); }}
              className="px-3 py-2 rounded-lg text-sm text-text-secondary bg-card hover:bg-card-border transition-colors"
            >
              <Info size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
