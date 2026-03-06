import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { Game } from '../../../shared/types';
import { GameCard } from './GameCard';

interface GameGridProps {
  games: Game[];
  cardSize?: number;
  emptyMessage?: string;
}

export function GameGrid({ games, cardSize = 3, emptyMessage = 'No games found' }: GameGridProps) {
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <Gamepad2 size={48} className="mb-4 opacity-40" />
        <p className="text-lg font-medium">{emptyMessage}</p>
        <p className="text-sm mt-1">Try adjusting your filters or search</p>
      </div>
    );
  }

  const gapMap: Record<number, string> = {
    1: 'gap-3',
    2: 'gap-4',
    3: 'gap-5',
    4: 'gap-6',
    5: 'gap-7',
  };

  return (
    <div className={`flex flex-wrap ${gapMap[cardSize] || gapMap[3]}`}>
      <AnimatePresence mode="popLayout">
        {games.map((game) => (
          <GameCard key={game.id} game={game} size={cardSize} />
        ))}
      </AnimatePresence>
    </div>
  );
}
