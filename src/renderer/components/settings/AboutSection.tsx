import React, { useState } from 'react';
import { Heart, Github, ExternalLink, Shield, Download, RefreshCw, CheckCircle, Coffee } from 'lucide-react';
import logoImg from '../../assets/logo-rounded.png';
import { UpdateInfo, UpdateProgress } from '../../../shared/types';
import { formatBytes, formatSpeed } from '../../utils/formatters';

export function AboutSection() {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<UpdateProgress | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [noUpdate, setNoUpdate] = useState(false);

  const handleCheckUpdates = async () => {
    setChecking(true);
    setNoUpdate(false);
    try {
      const info = await window.electronAPI.checkForUpdates();
      if (info) {
        setUpdateInfo(info);
      } else {
        setNoUpdate(true);
      }
    } catch {
      setNoUpdate(true);
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setDownloading(true);
    const cleanupProgress = window.electronAPI.onUpdateProgress((progress) => {
      setDownloadProgress(progress);
    });
    const cleanupDownloaded = window.electronAPI.onUpdateDownloaded(() => {
      setDownloaded(true);
      setDownloading(false);
      cleanupProgress();
      cleanupDownloaded();
    });
    try {
      await window.electronAPI.downloadUpdate();
    } catch {
      setDownloading(false);
      cleanupProgress();
      cleanupDownloaded();
    }
  };

  const handleInstallUpdate = () => {
    window.electronAPI.installUpdate();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">About</h2>
        <p className="text-sm text-text-muted">Game Launcher information</p>
      </div>

      {/* App Info */}
      <div className="bg-card border border-card-border rounded-xl p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl overflow-hidden">
          <img src={logoImg} alt="Game Launcher" className="w-full h-full object-contain" />
        </div>
        <h3 className="text-xl font-bold text-text-primary">Game Launcher</h3>
        <p className="text-sm text-text-muted mt-1">Version 1.0.0</p>
        <p className="text-xs text-text-muted mt-3 max-w-sm mx-auto">
          An open-source, customizable game launcher and store built with Electron, React, and Tailwind CSS.
          Connects to a self-hosted GameServer for game management and distribution.
        </p>
      </div>

      {/* Update Section
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="font-semibold text-text-primary mb-3">Updates</h3>

        {updateInfo && !downloaded && (
          <div className="mb-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-sm font-medium text-text-primary">Update available: v{updateInfo.version}</p>
            {updateInfo.releaseNotes && (
              <p className="text-xs text-text-muted mt-1">{typeof updateInfo.releaseNotes === 'string' ? updateInfo.releaseNotes : ''}</p>
            )}
            {downloading && downloadProgress && (
              <div className="mt-2">
                <div className="h-2 rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${downloadProgress.percent}%` }} />
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)} — {formatSpeed(downloadProgress.bytesPerSecond)}
                </p>
              </div>
            )}
            {!downloading && (
              <button onClick={handleDownloadUpdate} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-primary text-xs font-medium hover:brightness-110 transition">
                <Download size={12} /> Download Update
              </button>
            )}
          </div>
        )}

        {downloaded && (
          <div className="mb-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm font-medium text-success">Update downloaded! Restart to apply.</p>
            <button onClick={handleInstallUpdate} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success text-primary text-xs font-medium hover:brightness-110 transition">
              <RefreshCw size={12} /> Restart & Install
            </button>
          </div>
        )}

        {noUpdate && !updateInfo && (
          <div className="mb-3 flex items-center gap-2 text-sm text-success">
            <CheckCircle size={14} /> You're up to date!
          </div>
        )}

        <button
          onClick={handleCheckUpdates}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover text-text-primary text-sm font-medium border border-card-border transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking...' : 'Check for Updates'}
        </button>
      </div> */}

      {/* Tech Stack */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="font-semibold text-text-primary mb-3">Built With</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Electron', version: '30.x' },
            { name: 'React', version: '18.x' },
            { name: 'TypeScript', version: '5.x' },
            { name: 'Vite', version: '5.x' },
            { name: 'Tailwind CSS', version: '3.4' },
            { name: 'Zustand', version: '4.5' },
            { name: 'Framer Motion', version: '11.x' },
            { name: 'Axios', version: '1.7' },
          ].map(tech => (
            <div key={tech.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface text-sm">
              <span className="text-text-primary">{tech.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="font-semibold text-text-primary mb-3">Links</h3>
        <div className="space-y-2">
          <LinkButton href="https://github.com/Houloude9IOfficial/GameApp" icon={<Github size={16} />} label="Source Code" description="View on GitHub" />
          {/* <LinkButton href="https://github.com/Houloude9IOfficial/GameApp" icon={<Shield size={16} />} label="Licenses" description="Open source licenses" /> */}
          <LinkButton href="https://github.com/Houloude9IOfficial/GameServer" icon={<ExternalLink size={16} />} label="Documentation" description="Setup and usage guide" />
          <LinkButton href="https://buymeacoffee.com/houloude" icon={<Coffee size={16} />} label="Buy Me a Coffee" description="Support the project" />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-text-muted flex items-center justify-center gap-1">
          Made with <Heart size={12} className="text-danger" /> by Houloude9
        </p>
      </div>
    </div>
  );
}

function LinkButton({ icon, label, description, href }: { icon: React.ReactNode; label: string; description: string; href?: string }) {
  return (
    <button onClick={() => href && window.electronAPI.openUrl(href)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface transition-colors text-left">
      <span className="text-text-muted">{icon}</span>
      <div>
        <span className="text-sm font-medium text-text-primary block">{label}</span>
        <span className="text-xs text-text-muted">{description}</span>
      </div>
    </button>
  );
}
