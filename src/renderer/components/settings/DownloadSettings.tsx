import React, { useState, useEffect } from 'react';
import { Folder, HardDrive, Gauge, Lock } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { formatBytes } from '../../utils/formatters';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import toast from 'react-hot-toast';

export function DownloadSettings() {
  const { settings, updateSettings, isLocked } = useSettingsStore();
  const [diskSpace, setDiskSpace] = useState<{ free: number; total: number } | null>(null);

  useEffect(() => {
    loadDiskSpace();
  }, [settings?.installDirectory]);

  const loadDiskSpace = async () => {
    if (!settings?.installDirectory) return;
    try {
      const space = await window.electronAPI.getDiskSpace(settings.installDirectory);
      setDiskSpace(space);
    } catch {
      // silent
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const dir = await window.electronAPI.selectDirectory();
      if (dir) {
        // Ensure directory is accessible (may trigger UAC elevation)
        const access = await window.electronAPI.ensureDirectoryAccess(dir);
        if (access.success) {
          await updateSettings({ installDirectory: dir });
          toast.success('Install directory updated');
        } else {
          toast.error(access.error || 'Cannot access selected directory');
        }
      }
    } catch {
      toast.error('Failed to select directory');
    }
  };

  const handleBandwidthChange = (value: number) => {
    updateSettings({ bandwidthLimit: value });
  };

  if (!settings) return null;

  const bandwidthOptions = [
    { label: 'Unlimited', value: 0 },
    { label: '1 MB/s', value: 1024 * 1024 },
    { label: '5 MB/s', value: 5 * 1024 * 1024 },
    { label: '10 MB/s', value: 10 * 1024 * 1024 },
    { label: '25 MB/s', value: 25 * 1024 * 1024 },
    { label: '50 MB/s', value: 50 * 1024 * 1024 },
    { label: '100 MB/s', value: 100 * 1024 * 1024 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">Downloads</h2>
        <p className="text-sm text-text-muted">Configure download behavior and storage</p>
      </div>

      {/* Install Directory */}
      <SettingsCard
        title="Install Directory"
        description="Where games will be installed"
        locked={isLocked('installDirectory')}
      >
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 px-3 py-2 rounded-lg bg-surface border border-card-border text-sm text-text-secondary truncate">
            {settings.installDirectory || 'Not set'}
          </div>
          <Button variant="secondary" size="sm" onClick={handleSelectDirectory} disabled={isLocked('installDirectory')}>
            <Folder size={14} className="mr-1" />
            Browse
          </Button>
        </div>
        {diskSpace && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span className="flex items-center gap-1">
                <HardDrive size={12} />
                Disk Space
              </span>
              <span>{formatBytes(diskSpace.free)} free of {formatBytes(diskSpace.total)}</span>
            </div>
            <ProgressBar
              value={Math.round(((diskSpace.total - diskSpace.free) / diskSpace.total) * 100)}
              size="sm"
              color={diskSpace.free < 10 * 1024 * 1024 * 1024 ? 'danger' : 'accent'}
            />
          </div>
        )}
      </SettingsCard>

      {/* Bandwidth Limit */}
      <SettingsCard
        title="Bandwidth Limit"
        description="Maximum download speed (0 = unlimited)"
        locked={isLocked('bandwidthLimit')}
      >
        <div className="grid grid-cols-4 gap-2 mt-3">
          {bandwidthOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleBandwidthChange(opt.value)}
              disabled={isLocked('bandwidthLimit')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                settings.bandwidthLimit === opt.value
                  ? 'bg-accent text-primary border-accent'
                  : 'border-card-border text-text-muted hover:border-accent hover:text-text-primary'
              } disabled:opacity-50`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SettingsCard>

      {/* Max Concurrent Downloads */}
      <SettingsCard
        title="Concurrent Downloads"
        description="Number of games downloading at the same time"
      >
        <div className="flex items-center gap-4 mt-3">
          <input
            type="range"
            min={1}
            max={5}
            value={settings.maxConcurrentDownloads || 2}
            onChange={(e) => updateSettings({ maxConcurrentDownloads: Number(e.target.value) })}
            className="flex-1 accent-[var(--color-accent)]"
          />
          <span className="text-sm font-medium text-text-primary w-6 text-center">{settings.maxConcurrentDownloads || 2}</span>
        </div>
      </SettingsCard>

      {/* Auto Update */}
      <SettingsCard
        title="Auto Update Games"
        description="Automatically download updates when available"
      >
        <div className="mt-3">
          <ToggleSwitch
            enabled={settings.autoUpdate !== false}
            onChange={(v) => updateSettings({ autoUpdate: v })}
          />
        </div>
      </SettingsCard>

      {/* Verify after download */}
      <SettingsCard
        title="Verify After Download"
        description="Check file integrity after each download completes"
      >
        <div className="mt-3">
          <ToggleSwitch
            enabled={settings.verifyAfterDownload !== false}
            onChange={(v) => updateSettings({ verifyAfterDownload: v })}
          />
        </div>
      </SettingsCard>
    </div>
  );
}

function SettingsCard({ title, description, locked, children }: {
  title: string;
  description?: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-card border rounded-xl p-5 ${locked ? 'border-warning/30' : 'border-card-border'}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">{title}</h3>
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
        {locked && (
          <span className="text-xs text-warning flex items-center gap-1">
            <Lock size={12} /> Locked
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-accent' : 'bg-card-border'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}
