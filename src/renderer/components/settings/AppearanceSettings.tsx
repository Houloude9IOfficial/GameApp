import React, { useState } from 'react';
import { Palette, Check, Upload, Download as DownloadIcon, RotateCcw } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button } from '../common/Button';
import toast from 'react-hot-toast';

const BUILT_IN_THEMES = [
  { id: 'dark', name: 'Dark', preview: ['#0f172a', '#1e293b', '#3dd8b0'] },
  { id: 'light', name: 'Light', preview: ['#f8fafc', '#ffffff', '#059669'] },
  { id: 'midnight', name: 'Midnight', preview: ['#09090b', '#18181b', '#7c3aed'] },
];

const COLOR_FIELDS = [
  { key: 'accent', label: 'Accent' },
  { key: 'primary', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'card', label: 'Card' },
  { key: 'sidebar', label: 'Sidebar' },
  { key: 'titlebar', label: 'Title Bar' },
  { key: 'textPrimary', label: 'Text Primary' },
  { key: 'textSecondary', label: 'Text Secondary' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'danger', label: 'Danger' },
  { key: 'info', label: 'Info' },
];

export function AppearanceSettings() {
  const {
    activeThemeId, activeTheme, themes,
    setTheme, updateCustomColor, exportTheme, importTheme, loadThemes, applyTheme
  } = useThemeStore();

  const [showCustomize, setShowCustomize] = useState(false);

  const handleExport = async () => {
    if (!activeTheme) return;
    try {
      await exportTheme(activeTheme);
      toast.success('Theme exported');
    } catch {
      toast.error('Failed to export theme');
    }
  };

  const handleImport = async () => {
    try {
      // The IPC handler shows a file dialog; pass empty string to trigger it
      await importTheme('');
      toast.success('Theme imported');
    } catch (err: any) {
      if (err.message !== 'cancelled') toast.error('Failed to import theme');
    }
  };

  const resetCustomColors = () => {
    const base = themes.find(t => t.id === activeThemeId);
    if (base) {
      useThemeStore.setState({ activeTheme: base });
      applyTheme(base);
    }
  };

  // Get current color value from active theme or CSS variable
  const getColor = (key: string): string => {
    if (activeTheme?.colors) {
      const val = (activeTheme.colors as any)[key];
      if (val) return val;
    }
    return getCSSVariable(`--color-${key}`) || '#000000';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">Appearance</h2>
        <p className="text-sm text-text-muted">Customize the look and feel of your launcher</p>
      </div>

      {/* Theme Selector */}
      <SettingsSection title="Theme" description="Choose a base theme">
        <div className="grid grid-cols-3 gap-3">
          {BUILT_IN_THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={`relative p-3 rounded-xl border-2 transition-all ${
                activeThemeId === theme.id
                  ? 'border-accent shadow-lg shadow-accent/10'
                  : 'border-card-border hover:border-accent/50'
              }`}
            >
              {/* Preview Colors */}
              <div className="flex gap-1 mb-2">
                {theme.preview.map((color, i) => (
                  <div key={i} className="h-8 flex-1 rounded" style={{ backgroundColor: color }} />
                ))}
              </div>
              <span className="text-xs font-medium text-text-primary">{theme.name}</span>
              {activeThemeId === theme.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                  <Check size={12} className="text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      </SettingsSection>

      {/* Customize Colors */}
      <SettingsSection
        title="Custom Colors"
        description="Fine-tune individual colors. Changes are applied on top of the selected theme."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCustomize(!showCustomize)}>
              <Palette size={12} className="mr-1" />
              {showCustomize ? 'Hide' : 'Customize'}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetCustomColors}>
              <RotateCcw size={12} className="mr-1" />
              Reset
            </Button>
          </div>
        }
      >
        {showCustomize && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {COLOR_FIELDS.map(field => (
              <div key={field.key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={getColor(field.key)}
                  onChange={(e) => updateCustomColor(field.key as any, e.target.value)}
                  className="w-8 h-8 rounded-lg border border-card-border cursor-pointer bg-transparent"
                />
                <div>
                  <span className="text-xs font-medium text-text-primary">{field.label}</span>
                  <span className="text-[10px] text-text-muted block">
                    {getColor(field.key)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      {/* Import/Export */}
      <SettingsSection title="Theme Sharing" description="Import or export your custom theme">
        <div className="flex gap-2 mt-2">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Upload size={12} className="mr-1" />
            Export Theme
          </Button>
          <Button variant="secondary" size="sm" onClick={handleImport}>
            <DownloadIcon size={12} className="mr-1" />
            Import Theme
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ title, description, action, children }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-semibold text-text-primary">{title}</h3>
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
