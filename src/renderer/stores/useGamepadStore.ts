import { create } from 'zustand';

interface GamepadState {
  connected: boolean;
  controllerName: string | null;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  setConnected: (connected: boolean, name?: string) => void;
}

export const useGamepadStore = create<GamepadState>((set) => ({
  connected: false,
  controllerName: null,
  enabled: true,

  setEnabled: (enabled) => set({ enabled }),
  setConnected: (connected, name) => set({ connected, controllerName: name || null }),
}));
