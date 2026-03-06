import { create } from 'zustand';
import toast from 'react-hot-toast';

interface OwnershipState {
  ownedGameIds: Set<string>;
  loaded: boolean;

  fetchOwned: () => Promise<void>;
  ownsGame: (gameId: string) => boolean;
  addGame: (gameId: string) => Promise<boolean>;
  removeGame: (gameId: string) => Promise<void>;
}

export const useOwnershipStore = create<OwnershipState>((set, get) => ({
  ownedGameIds: new Set(),
  loaded: false,

  fetchOwned: async () => {
    try {
      const games = await window.electronAPI.getOwnedGames();
      set({ ownedGameIds: new Set(games.map((g) => g.game_id)), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  ownsGame: (gameId: string) => {
    return get().ownedGameIds.has(gameId);
  },

  addGame: async (gameId: string) => {
    try {
      await window.electronAPI.addGameToLibrary(gameId);
      set((s) => {
        const next = new Set(s.ownedGameIds);
        next.add(gameId);
        return { ownedGameIds: next };
      });
      toast.success('Game added to your library');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add game');
      return false;
    }
  },

  removeGame: async (gameId: string) => {
    try {
      await window.electronAPI.removeGameFromLibrary(gameId);
      set((s) => {
        const next = new Set(s.ownedGameIds);
        next.delete(gameId);
        return { ownedGameIds: next };
      });
      toast.success('Game removed from your library');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove game');
    }
  },
}));
