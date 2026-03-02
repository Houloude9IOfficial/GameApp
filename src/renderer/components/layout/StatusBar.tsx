import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download } from 'lucide-react';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { formatSpeed } from '../../utils/formatters';

export function StatusBar() {
  const [connected, setConnected] = useState(false);
  const [serverName, setServerName] = useState('');
  const activeCount = useDownloadStore(s => s.getActiveCount());
  const totalSpeed = useDownloadStore(s => s.getTotalSpeed());

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const health = await window.electronAPI.getServerHealth();
        setConnected(health.status === 'ok');
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

  return (
    <div className="flex items-center justify-between h-6 px-3 bg-statusbar text-[11px] text-text-muted border-t border-card-border shrink-0 select-none">
      {/* Left: Connection Status */}
      <div className="flex items-center gap-2">
        {connected ? (
          <div className="flex items-center gap-1.5 text-success">
            <Wifi size={11} />
            <span>Connected</span>
            {serverName && <span className="text-text-muted">• v{serverName}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-danger">
            <WifiOff size={11} />
            <span>Disconnected</span>
          </div>
        )}
      </div>

      {/* Right: Download Status */}
      <div className="flex items-center gap-3">
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
