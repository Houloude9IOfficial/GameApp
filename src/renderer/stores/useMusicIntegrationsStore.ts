import { create } from 'zustand';
import { useVeloraStore } from './useVeloraStore';

/**
 * Centralized store for checking which music integrations are available/configured
 * This enables easy addition of new music services (Spotify, Apple Music, etc.)
 */
export type MusicService = 'velora' | 'spotify' | 'apple-music' | 'youtube-music';

export interface MusicIntegrationStatus {
  service: MusicService;
  isConfigured: boolean;
  isConnected: boolean;
  isAvailable: boolean; // Has token/permission
}

export interface MusicIntegrationsState {
  // Query available integrations
  getActiveIntegration: () => MusicService | null; // Returns first active integration
  getAvailableIntegrations: () => MusicService[];
  hasAnyIntegration: () => boolean;
  getIntegrationStatus: (service: MusicService) => MusicIntegrationStatus;

  // Service-specific getters (delegated to respective stores)
  veloraInfo: {
    isConfigured: boolean;
    isConnected: boolean;
    currentTrack?: any;
    playbackState?: any;
  };
  spotifyInfo: {
    isConfigured: boolean;
    isConnected: boolean;
  };
}

export const useMusicIntegrationsStore = create<MusicIntegrationsState>((set) => ({
  veloraInfo: {
    isConfigured: false,
    isConnected: false,
  },
  spotifyInfo: {
    isConfigured: false,
    isConnected: false,
  },

  getActiveIntegration: () => {
    // Check in priority order: velora, spotify, apple-music, youtube-music
    const services: MusicService[] = ['velora', 'spotify', 'apple-music', 'youtube-music'];

    for (const service of services) {
      const veloraState = useVeloraStore.getState();

      // Check Velora
      if (service === 'velora' && veloraState.isConfigured) {
        return 'velora';
      }

      // Check Spotify (placeholder)
      // if (service === 'spotify' && spotifyState.isConfigured) {
      //   return 'spotify';
      // }

      // Add more services as they're implemented
    }

    return null;
  },

  getAvailableIntegrations: () => {
    const available: MusicService[] = [];
    const veloraState = useVeloraStore.getState();

    if (veloraState.isConfigured) available.push('velora');
    // if (spotifyState.isConfigured) available.push('spotify');
    // if (appleMusicState.isConfigured) available.push('apple-music');

    return available;
  },

  hasAnyIntegration: () => {
    const veloraState = useVeloraStore.getState();
    return veloraState.isConfigured;
    // || spotifyState.isConfigured
    // || appleMusicState.isConfigured
  },

  getIntegrationStatus: (service: MusicService) => {
    const veloraState = useVeloraStore.getState();

    switch (service) {
      case 'velora':
        return {
          service: 'velora',
          isConfigured: veloraState.isConfigured,
          isConnected: veloraState.isWSConnected && veloraState.isConfigured,
          isAvailable: veloraState.isConfigured,
        };
      case 'spotify':
        // Placeholder
        return {
          service: 'spotify',
          isConfigured: false,
          isConnected: false,
          isAvailable: false,
        };
      case 'apple-music':
        // Placeholder
        return {
          service: 'apple-music',
          isConfigured: false,
          isConnected: false,
          isAvailable: false,
        };
      case 'youtube-music':
        // Placeholder
        return {
          service: 'youtube-music',
          isConfigured: false,
          isConnected: false,
          isAvailable: false,
        };
      default:
        return {
          service,
          isConfigured: false,
          isConnected: false,
          isAvailable: false,
        };
    }
  },
}));
