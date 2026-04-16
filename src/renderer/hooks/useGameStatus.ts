import { useEffect, useState } from 'react';
import { IPC_CHANNELS } from '../../shared/types';

interface GameStatus {
  running: boolean;
  pid?: number;
  startedAt?: string;
}

/**
 * Hook to poll the game running status.
 * Polls every 1 second to check if a game is running.
 * Useful for displaying "Running" state and disabling launch button while a game is active.
 *
 * @param gameId - The game ID to monitor
 * @param enabled - Whether polling is enabled (default: true)
 * @returns Game status object
 */
export function useGameStatus(gameId: string, enabled = true): GameStatus {
  const [status, setStatus] = useState<GameStatus>({ running: false });

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    const fetchStatus = async () => {
      try {
        const result = await window.electronAPI.getLaunchStatus(gameId);
        setStatus(result || { running: false });
      } catch (err) {
        console.error(`Failed to fetch game status for ${gameId}:`, err);
      }
    };

    fetchStatus();

    // Poll every 1 second
    const interval = setInterval(fetchStatus, 1000);

    return () => clearInterval(interval);
  }, [gameId, enabled]);

  return status;
}
