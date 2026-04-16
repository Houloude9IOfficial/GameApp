import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGamesStore } from '../stores/useGamesStore';
import { GameDetail } from '../components/games/GameDetail';
import { RefreshCw } from 'lucide-react';

export function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const games = useGamesStore(s => s.games);
  const fetchGames = useGamesStore(s => s.fetchGames);
  const fetchPlayStats = useGamesStore(s => s.fetchPlayStats);

  useEffect(() => {
    // Refetch game details AND play stats whenever the page is visited or id changes
    // This ensures game sessions and stats are always up-to-date
    if (id) {
      fetchGames();
      fetchPlayStats(id);
    }
  }, [id, fetchGames, fetchPlayStats]);

  const game = games.find(g => g.id === id);

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <RefreshCw size={24} className="animate-spin mb-3" />
        <p>Loading game...</p>
      </div>
    );
  }

  return <GameDetail game={game} />;
}
