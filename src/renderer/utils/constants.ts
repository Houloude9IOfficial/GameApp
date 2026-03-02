export const ROUTES = {
  LIBRARY: '/',
  STORE: '/store',
  DOWNLOADS: '/downloads',
  COLLECTIONS: '/collections',
  SETTINGS: '/settings',
  GAME_DETAIL: '/game/:id',
} as const;

export const DEFAULT_BANNER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExZDI2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM1YzYxNzQiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';

export const VIEW_MODES = {
  GRID: 'grid' as const,
  LIST: 'list' as const,
};

export const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'lastPlayed', label: 'Last Played' },
  { value: 'size', label: 'Size' },
  { value: 'installDate', label: 'Install Date' },
  { value: 'developer', label: 'Developer' },
];

export const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'installed', label: 'Installed' },
  { value: 'not-installed', label: 'Not Installed' },
] as const;
