import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock, Gamepad2, Download, Play, RefreshCw } from 'lucide-react';
import { useGamesStore } from '../stores/useGamesStore';
import { formatPlayTime, formatRelativeTime } from '../utils/formatters';

interface ActivityEntry {
  id: string;
  type: 'play' | 'install' | 'update';
  gameId: string;
  gameName: string;
  timestamp: string;
  duration?: number;
  iconUrl?: string;
}

export function ActivityPage() {
  const navigate = useNavigate();
  const games = useGamesStore(s => s.games);
  const playStats = useGamesStore(s => s.playStats);
  const installedGames = useGamesStore(s => s.installedGames);
  const fetchGames = useGamesStore(s => s.fetchGames);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (games.length === 0) fetchGames();
    setLoading(false);
  }, []);

  // Build activity feed from play sessions and install history
  const activities: ActivityEntry[] = [];

  // Play sessions
  for (const [gameId, stats] of Object.entries(playStats)) {
    const game = games.find(g => g.id === gameId);
    if (!stats?.sessions) continue;
    for (const session of stats.sessions) {
      activities.push({
        id: `play-${gameId}-${session.startedAt}`,
        type: 'play',
        gameId,
        gameName: game?.name || gameId,
        timestamp: session.startedAt,
        duration: session.durationSeconds,
        iconUrl: game?.brandingUrls?.icon,
      });
    }
  }

  // Install/update history
  for (const installed of installedGames) {
    const game = games.find(g => g.id === installed.gameId);
    if (installed?.updateHistory) {
      for (const entry of installed.updateHistory) {
        activities.push({
          id: `${entry.type}-${installed.gameId}-${entry.date}`,
          type: entry.type === 'install' ? 'install' : 'update',
          gameId: installed.gameId,
          gameName: game?.name || installed.gameId,
          timestamp: entry.date,
          iconUrl: game?.brandingUrls?.icon,
        });
      }
    }
  }

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const typeIcons: Record<string, React.ReactNode> = {
    play: <Play size={14} className="text-success" />,
    install: <Download size={14} className="text-accent" />,
    update: <RefreshCw size={14} className="text-info" />,
  };

  const typeLabels: Record<string, string> = {
    play: 'Played',
    install: 'Installed',
    update: 'Updated',
  };

  // Group by date
  const grouped: Record<string, ActivityEntry[]> = {};
  for (const entry of activities) {
    const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(entry);
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Activity size={22} /> Activity
        </h1>

        {loading ? (
          <div className="py-8 text-center text-text-muted text-sm">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Clock size={32} className="mx-auto text-text-muted" />
            <p className="text-text-muted text-sm">No activity yet</p>
            <p className="text-text-muted text-xs">Play or install some games to see your activity here</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">{date}</h3>
              <div className="space-y-1">
                {entries.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => navigate(`/game/${entry.gameId}`)}
                    className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl hover:bg-card-hover transition-colors cursor-pointer"
                  >
                    {entry.iconUrl ? (
                      <img src={entry.iconUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                        <Gamepad2 size={14} className="text-text-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {typeIcons[entry.type]}
                        <span className="text-sm font-medium text-text-primary truncate">{entry.gameName}</span>
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center gap-2">
                        <span>{typeLabels[entry.type]}</span>
                        {entry.duration && entry.duration > 0 && (
                          <span>· {formatPlayTime(entry.duration)}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-text-muted shrink-0">{formatRelativeTime(entry.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
