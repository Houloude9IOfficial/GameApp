import { create } from 'zustand';
import { Game, Tag, Category, InstalledGame, GameInstallStatus, GamePlayStats } from '../../shared/types';

interface GamesState {
  games: Game[];
  installedGames: InstalledGame[];
  tags: Tag[];
  categories: Category[];
  playStats: Record<string, GamePlayStats>;
  loading: boolean;
  error: string | null;
  selectedFilter: 'all' | 'installed' | 'not-installed';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  cardSize: number;
  searchQuery: string;
  selectedTags: string[];
  selectedCategory: string | null;

  // Actions
  fetchGames: () => Promise<void>;
  fetchInstalledGames: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchPlayStats: (gameId: string) => Promise<void>;
  getInstallStatus: (gameId: string) => GameInstallStatus;
  getInstalledGame: (gameId: string) => InstalledGame | undefined;
  setFilter: (filter: 'all' | 'installed' | 'not-installed') => void;
  setSortBy: (sort: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setCardSize: (size: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSelectedCategory: (category: string | null) => void;
  getFilteredGames: () => Game[];
}

export const useGamesStore = create<GamesState>((set, get) => ({
  games: [],
  installedGames: [],
  tags: [],
  categories: [],
  playStats: {},
  loading: false,
  error: null,
  selectedFilter: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
  viewMode: 'grid',
  cardSize: 3,
  searchQuery: '',
  selectedTags: [],
  selectedCategory: null,

  fetchGames: async () => {
    set({ loading: true, error: null });
    try {
      const data = await window.electronAPI.getGames();
      set({ games: data.games, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchInstalledGames: async () => {
    try {
      const installed = await window.electronAPI.getAllInstalled();
      set({ installedGames: installed });
    } catch (err: any) {
      console.error('Failed to fetch installed games:', err);
    }
  },

  fetchTags: async () => {
    try {
      const data = await window.electronAPI.getTags();
      set({ tags: data.tags });
    } catch (err: any) {
      console.error('Failed to fetch tags:', err);
    }
  },

  fetchCategories: async () => {
    try {
      const data = await window.electronAPI.getCategories();
      set({ categories: data.categories });
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    }
  },

  fetchPlayStats: async (gameId: string) => {
    try {
      const stats = await window.electronAPI.getPlayTime(gameId);
      set(state => ({
        playStats: { ...state.playStats, [gameId]: stats },
      }));
    } catch {}
  },

  getInstallStatus: (gameId: string) => {
    const { installedGames } = get();
    const installed = installedGames.find(g => g.gameId === gameId);
    return installed ? 'installed' : 'not-installed';
  },

  getInstalledGame: (gameId: string) => {
    return get().installedGames.find(g => g.gameId === gameId);
  },

  setFilter: (filter) => set({ selectedFilter: filter }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setCardSize: (size) => set({ cardSize: size }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getFilteredGames: () => {
    const { games, installedGames, selectedFilter, sortBy, sortOrder, searchQuery, selectedTags, selectedCategory } = get();

    let filtered = [...games];

    // Filter by install status
    if (selectedFilter === 'installed') {
      const installedIds = new Set(installedGames.map(g => g.gameId));
      filtered = filtered.filter(g => installedIds.has(g.id));
    } else if (selectedFilter === 'not-installed') {
      const installedIds = new Set(installedGames.map(g => g.gameId));
      filtered = filtered.filter(g => !installedIds.has(g.id));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.developer?.toLowerCase().includes(q)
      );
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(g =>
        g.tags?.some(t => selectedTags.includes(t))
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(g => g.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'size':
          cmp = (a.totalSize || 0) - (b.totalSize || 0);
          break;
        case 'developer':
          cmp = (a.developer || '').localeCompare(b.developer || '');
          break;
        default:
          cmp = a.name.localeCompare(b.name);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  },
}));
