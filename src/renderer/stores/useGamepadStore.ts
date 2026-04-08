import { create } from 'zustand';
import { GamepadInfo } from '../../shared/types';

interface GamepadState {
  // Legacy: single controller detection (for backward compatibility)
  connected: boolean;
  controllerName: string | null;
  enabled: boolean;

  // New: detailed controller info (up to 4 gamepads)
  gamepads: GamepadInfo[];

  // Actions
  setEnabled: (enabled: boolean) => void;
  setConnected: (connected: boolean, name?: string) => void;
  setGamepads: (gamepads: GamepadInfo[]) => void;

  // Selectors
  getConnectedGamepads: () => GamepadInfo[];
  getGamepadByIndex: (index: number) => GamepadInfo | undefined;
  getGamepadCount: () => number;
}

export const useGamepadStore = create<GamepadState>((set, get) => ({
  connected: false,
  controllerName: null,
  enabled: true,
  gamepads: [],

  setEnabled: (enabled) => set({ enabled }),

  setConnected: (connected, name) => set({ connected, controllerName: name || null }),

  setGamepads: (gamepads) => {
    set({ gamepads });
    // Update legacy fields for backward compatibility
    const connectedGamepads = gamepads.filter(g => g.connected);
    set({
      connected: connectedGamepads.length > 0,
      controllerName: connectedGamepads.length > 0 ? connectedGamepads[0].name : null,
    });
  },

  getConnectedGamepads: () => get().gamepads.filter(g => g.connected),

  getGamepadByIndex: (index) => get().gamepads.find(g => g.index === index),

  getGamepadCount: () => get().gamepads.filter(g => g.connected).length,
}));
