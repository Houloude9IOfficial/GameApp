import React, { useState, useEffect, useRef } from 'react';
import { Play, Download, Folder, Trash2, RefreshCw, Info, Copy, Bolt, Wrench, CalendarClock, Ban } from 'lucide-react';
import { Game, GameInstallStatus } from '../../../shared/types';
import { useGamesStore } from '../../stores/useGamesStore';
import { useInstallModal } from '../../stores/useInstallModal';
import { useNavigate } from 'react-router-dom';
import { isGameAvailable, formatGameState } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface GameContextMenuProps {
  game: Game;
  installStatus: GameInstallStatus;
  position: { x: number; y: number };
  onClose: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
  disabled?: boolean;
}

export function GameContextMenu({ game, installStatus, position, onClose }: GameContextMenuProps) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = position.x;
      let y = position.y;
      if (x + rect.width > vw - 10) x = vw - rect.width - 10;
      if (y + rect.height > vh - 10) y = vh - rect.height - 10;
      if (x < 10) x = 10;
      if (y < 10) y = 10;
      setAdjustedPos({ x, y });
    }
  }, [position]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const items: MenuItem[] = [];

  if (installStatus === 'installed') {
    items.push({
      label: 'Play',
      icon: <Play size={14} />,
      onClick: async () => {
        try { await window.electronAPI.launchGame(game.id); } catch (err) { console.error(err); }
        onClose();
      },
    });
    items.push({ label: '', icon: null, onClick: () => {}, separator: true });
    items.push({
      label: 'Create Shortcut',
      icon: <Copy size={14} />,
      onClick: async () => {
        try {
          const iconUrl = game.brandingUrls?.icon || game.brandingUrls?.logo;
          await window.electronAPI.createDesktopShortcut(game.id, game.name, iconUrl || '');
          toast.success('Desktop shortcut created');
        } catch (err) {
          toast.error('Failed to create desktop shortcut');
        }
        onClose();
      },
    });
    items.push({
      label: 'Check for Updates',
      icon: <RefreshCw size={14} />,
      onClick: async () => {
        try {
          const installed = useGamesStore.getState().getInstalledGame(game.id);
          const result = await window.electronAPI.checkGameUpdate(game.id, installed?.version || '0.0.0');
          if (result.updateAvailable) {
            toast.success(`Update available for ${game.name}`);
          } else {
            toast.success('Already up to date');
          }
        } catch (err) {
          toast.error('Failed to check for updates');
        }
        onClose();
      },
    });
    items.push({
      label: 'Verify & Repair',
      icon: <Wrench size={14} />,
      onClick: async () => {
        toast.loading(`Verifying ${game.name}...`, { id: `verify-${game.id}` });
        try {
          const result = await window.electronAPI.verifyIntegrity(game.id);
          if (result.totalChanges === 0) {
            toast.success('All files verified', { id: `verify-${game.id}` });
          } else {
            const count = (result.added?.length || 0) + (result.updated?.length || 0) + (result.deleted?.length || 0);
            toast.loading(`${count} file(s) need repair — downloading...`, { id: `verify-${game.id}` });
            try {
              const { useDownloadStore } = await import('../../stores/useDownloadStore');
              await useDownloadStore.getState().startDownload(game.id, 'repair');
              toast.success(`Repairing ${count} file(s)`, { id: `verify-${game.id}` });
            } catch (err) {
              toast.error(`${count} file(s) need repair but download failed`, { id: `verify-${game.id}` });
            }
          }
        } catch (err) {
          toast.error('Verification failed', { id: `verify-${game.id}` });
        }
        onClose();
      },
    });
    items.push({
      label: 'Open Install Folder',
      icon: <Folder size={14} />,
      onClick: async () => {
        const installed = useGamesStore.getState().getInstalledGame(game.id);
        if (installed?.installPath) {
          window.electronAPI.openFolder(installed.installPath);
        }
        onClose();
      },
    });
    items.push({ label: '', icon: null, onClick: () => {}, separator: true });
    items.push({
      label: 'Uninstall',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: async () => {
        if (confirm(`Uninstall ${game.name}?`)) {
          try {
            await window.electronAPI.uninstallGame(game.id);
            useGamesStore.getState().fetchInstalledGames();
            toast.success(`${game.name} uninstalled`);
          } catch {
            toast.error('Uninstall failed');
          }
        }
        onClose();
      },
    });
  } else {
    const available = isGameAvailable(game.gameState);
    if (available) {
      items.push({
        label: 'Install',
        icon: <Download size={14} />,
        onClick: () => {
          useInstallModal.getState().open(game);
          onClose();
        },
      });
    } else {
      items.push({
        label: formatGameState(game.gameState!),
        icon: game.gameState === 'coming-soon' ? <CalendarClock size={14} /> : <Ban size={14} />,
        onClick: () => onClose(),
        disabled: true,
      });
    }
  }

  items.push({ label: '', icon: null, onClick: () => {}, separator: true });
  items.push({
    label: 'View Details',
    icon: <Info size={14} />,
    onClick: () => { navigate(`/game/${game.id}`); onClose(); },
  });
  items.push({
    label: 'Copy Game ID',
    icon: <Copy size={14} />,
    onClick: () => {
      navigator.clipboard.writeText(game.id);
      toast.success('Game ID copied');
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-[200]" onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={menuRef}
        className="absolute bg-surface border border-card-border rounded-lg shadow-2xl py-1 min-w-[180px] animate-fade-in"
        style={{ left: adjustedPos.x, top: adjustedPos.y }}
      >
        {items.map((item, i) => {
          if (item.separator) {
            return <div key={i} className="h-px bg-card-border my-1 mx-2" />;
          }
          return (
            <button
              key={i}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
                item.danger
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-text-secondary hover:bg-card hover:text-text-primary'
              } ${item.disabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
