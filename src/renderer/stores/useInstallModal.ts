import { create } from 'zustand';
import { Game } from '../../shared/types';

interface InstallModalState {
  game: Game | null;
  open: (game: Game) => void;
  close: () => void;
}

export const useInstallModal = create<InstallModalState>((set) => ({
  game: null,
  open: (game) => set({ game }),
  close: () => set({ game: null }),
}));
