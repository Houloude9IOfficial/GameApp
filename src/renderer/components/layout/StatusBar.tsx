import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, ArrowUpCircle, AlertCircle } from 'lucide-react';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { useVersionStore } from '../../stores/useVersionStore';
import { formatSpeed } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

export function StatusBar() {
  const [connected, setConnected] = useState(false);
  const [connectionMS, setConnectionMS] = useState<number | null>(null);
  const [serverUptime, setServerUptime] = useState(0);
  const [serverName, setServerName] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const activeCount = useDownloadStore(s => s.getActiveCount());
  const totalSpeed = useDownloadStore(s => s.getTotalSpeed());
  const { isCompatible, compatibilityMessage } = useVersionStore(s => ({
    isCompatible: s.isCompatible,
    compatibilityMessage: s.compatibilityMessage,
  }));

  useEffect(() => {
    const cleanup = window.electronAPI.onUpdateAvailable(() => {
      setUpdateAvailable(true);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const start = Date.now();
        const health = await window.electronAPI.getServerHealth();
        const end = Date.now();
        setConnectionMS(end - start);
        setConnected(health.status === 'ok');
        setServerUptime(health.uptime);
        setServerName(health.version || '');
      } catch {
        setConnected(false);
        setServerName('');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  function FormatToMinutesOrHours(uptime: number) {
    if (uptime < 3600) {
      return `${Math.floor(uptime / 60)}m`;
    } else {
      return `${Math.floor(uptime / 3600)}h`;
    }
  }

  return (
    <div className="flex items-center justify-between h-6 px-3 bg-statusbar text-[11px] text-text-muted border-t border-card-border shrink-0 select-none">
      {/* Left: Connection Status */}
      <div className="flex items-center gap-2">
        {connected ? (
          <div className="flex items-center gap-1.5 text-success">
            <Wifi size={11} />
            <span>Connected</span>
            {serverName && <span className="text-text-muted">• Version: v{serverName}</span>}
            {connectionMS !== null && (
              <span className="text-text-muted">• Response time: {connectionMS}ms</span>
            )}
            {serverUptime > 0 && (
              <span className="text-text-muted">• Uptime: {FormatToMinutesOrHours(serverUptime)}</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-danger">
            <WifiOff size={11} />
            <span>Disconnected</span>
          </div>
        )}
      </div>

      {/* Right: Download Status + Update Indicator + Version Warning */}
      <div className="flex items-center gap-3">
        {isCompatible === false && compatibilityMessage && (
          <div className="flex items-center gap-1.5 text-danger" title={compatibilityMessage}>
            <AlertCircle size={11} />
            <span>{compatibilityMessage}</span>
          </div>
        )}
        {updateAvailable && (
          <div className="flex items-center gap-1.5 text-accent cursor-pointer hover:underline" onClick={() => {
            // Navigate to settings About tab
            window.location.hash = '#/settings';
          }}>
            <ArrowUpCircle size={11} />
            <span>Update available</span>
          </div>
        )}
        {activeCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Download size={11} className="text-accent animate-pulse-soft" />
            <span>{activeCount} active</span>
            <span className="text-accent">{formatSpeed(totalSpeed)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
