import { create } from 'zustand';
import { ThemeConfig, ThemeColors } from '../../shared/types';

interface ThemeState {
  themes: ThemeConfig[];
  activeThemeId: string;
  activeTheme: ThemeConfig | null;

  loadThemes: () => Promise<void>;
  setTheme: (themeId: string) => Promise<void>;
  applyTheme: (theme?: ThemeConfig) => void;
  exportTheme: (theme: ThemeConfig) => Promise<string | null>;
  importTheme: (filePath: string) => Promise<ThemeConfig | null>;
  updateCustomColor: (key: keyof ThemeColors, value: string) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themes: [],
  activeThemeId: 'dark',
  activeTheme: null,

  loadThemes: async () => {
    try {
      const themes = await window.electronAPI.getAllThemes();
      const settings = await window.electronAPI.getSettings();
      const activeId = settings.theme || 'dark';
      const active = themes.find(t => t.id === activeId) || themes[0];

      set({ themes, activeThemeId: activeId, activeTheme: active });
    } catch (err) {
      console.error('Failed to load themes:', err);
    }
  },

  setTheme: async (themeId: string) => {
    const theme = get().themes.find(t => t.id === themeId);
    if (!theme) return;

    set({ activeThemeId: themeId, activeTheme: theme });
    get().applyTheme(theme);
    await window.electronAPI.setTheme(themeId);
    await window.electronAPI.setSettings({ theme: themeId });
  },

  applyTheme: (theme?: ThemeConfig) => {
    const t = theme || get().activeTheme;
    if (!t) return;

    const root = document.documentElement;
    const { colors } = t;

    const cssVarMap: Record<string, string> = {
      '--color-primary': colors.primary,
      '--color-secondary': colors.secondary,
      '--color-accent': colors.accent,
      '--color-surface': colors.surface,
      '--color-surface-hover': colors.surfaceHover,
      '--color-surface-active': colors.surfaceActive,
      '--color-sidebar': colors.sidebar,
      '--color-sidebar-hover': colors.sidebarHover,
      '--color-sidebar-active': colors.sidebarActive,
      '--color-sidebar-text': colors.sidebarText,
      '--color-card': colors.card,
      '--color-card-hover': colors.cardHover,
      '--color-card-border': colors.cardBorder,
      '--color-titlebar': colors.titlebar,
      '--color-titlebar-text': colors.titlebarText,
      '--color-statusbar': colors.statusbar,
      '--color-text-primary': colors.textPrimary,
      '--color-text-secondary': colors.textSecondary,
      '--color-text-muted': colors.textMuted,
      '--color-success': colors.success,
      '--color-warning': colors.warning,
      '--color-danger': colors.danger,
      '--color-info': colors.info,
      '--font-family': t.fontFamily,
      '--font-size-base': t.fontSizeBase,
      '--border-radius': t.borderRadius,
      '--sidebar-width': t.sidebarWidth,
      '--sidebar-width-collapsed': t.sidebarWidthCollapsed,
      '--titlebar-height': t.titlebarHeight,
      '--card-shadow': t.cardShadow,
    };

    for (const [prop, value] of Object.entries(cssVarMap)) {
      root.style.setProperty(prop, value);
    }
  },

  exportTheme: async (theme: ThemeConfig) => {
    try {
      return await window.electronAPI.exportTheme(theme);
    } catch {
      return null;
    }
  },

  importTheme: async (filePath: string) => {
    try {
      const theme = await window.electronAPI.importTheme(filePath);
      set(state => ({ themes: [...state.themes, theme] }));
      return theme;
    } catch {
      return null;
    }
  },

  updateCustomColor: (key: keyof ThemeColors, value: string) => {
    const { activeTheme } = get();
    if (!activeTheme) return;

    const updated: ThemeConfig = {
      ...activeTheme,
      id: activeTheme.id.startsWith('custom-') ? activeTheme.id : `custom-${Date.now()}`,
      name: activeTheme.name.includes('Custom') ? activeTheme.name : `${activeTheme.name} (Custom)`,
      colors: { ...activeTheme.colors, [key]: value },
    };

    set({ activeTheme: updated });
    get().applyTheme(updated);
  },
}));
