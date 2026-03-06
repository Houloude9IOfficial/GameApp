import React from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Button } from '../common/Button';
import { RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export function GeneralSettings() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();

  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
    try {
      await resetSettings();
      toast.success('Settings reset to defaults');
    } catch {
      toast.error('Failed to reset settings');
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">General</h2>
        <p className="text-sm text-text-muted">General application settings</p>
      </div>

      {/* Startup */}
      <SettingsCard title="Launch on Startup" description="Start the launcher when you log in to your computer">
        <div className="mt-3">
          <ToggleSwitch
            enabled={settings.launchOnStartup || false}
            onChange={(v) => updateSettings({ launchOnStartup: v })}
          />
        </div>
      </SettingsCard>

      {/* Minimize to Tray */}
      <SettingsCard title="Minimize to Tray" description="Keep running in system tray when closing the window">
        <div className="mt-3">
          <ToggleSwitch
            enabled={settings.minimizeToTray !== false}
            onChange={(v) => updateSettings({ minimizeToTray: v })}
          />
        </div>
      </SettingsCard>

      {/* Start Minimized */}
      <SettingsCard title="Start Minimized" description="Launch the app minimized to the system tray">
        <div className="mt-3">
          <ToggleSwitch
            enabled={settings.startMinimized || false}
            onChange={(v) => updateSettings({ startMinimized: v })}
          />
        </div>
      </SettingsCard>

      {/* Start Page */}
      <SettingsCard title="Start Page" description="Choose which page opens when the app starts">
        <div className="mt-3">
          <select
            value={settings.startPage || 'store'}
            onChange={(e) => updateSettings({ startPage: e.target.value as 'store' | 'library' })}
            className="px-3 py-2 rounded-lg bg-surface border border-card-border text-text-primary text-sm focus:outline-none focus:border-accent"
          >
            <option value="store">Store</option>
            <option value="library">Library</option>
          </select>
        </div>
      </SettingsCard>

      {/* Language (future) no need since no extra languages are supported anyway.
      <SettingsCard title="Language" description="Interface language">
        <div className="mt-3">
          <select
            value={settings.language || 'en'}
            onChange={(e) => updateSettings({ language: e.target.value })}
            className="px-3 py-2 rounded-lg bg-surface border border-card-border text-text-primary text-sm focus:outline-none focus:border-accent"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="pt">Português</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </SettingsCard> */}

      {/* Reset */}
      <SettingsCard title="Reset Settings" description="Restore all settings to their default values">
        <div className="mt-3">
          <Button variant="danger" size="sm" onClick={handleReset}>
            <RotateCcw size={12} className="mr-1" />
            Reset All Settings
          </Button>
        </div>
      </SettingsCard>
    </div>
  );
}

function SettingsCard({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <h3 className="font-semibold text-text-primary">{title}</h3>
      {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      {children}
    </div>
  );
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-accent' : 'bg-card-border'} cursor-pointer`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}
