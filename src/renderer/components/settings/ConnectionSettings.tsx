import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Lock, Key, Globe } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import toast from 'react-hot-toast';

export function ConnectionSettings() {
  const { settings, updateSettings, isLocked } = useSettingsStore();
  const { isAuthenticated, username, connect, disconnect, checkStatus } = useAuthStore();
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [connectCode, setConnectCode] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkServerStatus();
    checkStatus();
  }, []);

  const checkServerStatus = async () => {
    setServerStatus('checking');
    try {
      const health = await window.electronAPI.getServerHealth();
      if (health) {
        setServerStatus('online');
        const info = await window.electronAPI.getServerInfo();
        setServerInfo(info);
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  };

  const handleConnect = async () => {
    if (!connectCode.trim()) return;
    setConnecting(true);
    try {
      await connect(connectCode.trim());
      setConnectCode('');
      toast.success('Connected successfully');
    } catch {
      toast.error('Invalid code or connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success('Disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">Connection</h2>
        <p className="text-sm text-text-muted">Server connection and authentication settings</p>
      </div>

      {/* Server Status */}
      <SettingsCard title="Server Status">
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            {serverStatus === 'checking' && (
              <RefreshCw size={16} className="animate-spin text-text-muted" />
            )}
            {serverStatus === 'online' && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-sm text-success font-medium">Connected</span>
              </div>
            )}
            {serverStatus === 'offline' && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                <span className="text-sm text-danger font-medium">Offline</span>
              </div>
            )}
            {serverInfo && (
              <span className="text-xs text-text-muted">
                {serverInfo.name} v{serverInfo.version} • {serverInfo.gamesCount} games
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={checkServerStatus}>
            <RefreshCw size={12} className="mr-1" />
            Refresh
          </Button>
        </div>
      </SettingsCard>

      {/* Server URL */}
      <SettingsCard title="Server URL" description="The GameServer address to connect to" locked={isLocked('serverUrl')}>
        <div className="flex items-center gap-3 mt-3">
          <Globe size={16} className="text-text-muted flex-shrink-0" />
          <input
            type="url"
            value={settings.serverUrl || ''}
            onChange={(e) => updateSettings({ serverUrl: e.target.value })}
            disabled={isLocked('serverUrl')}
            placeholder="http://localhost:3000"
            className="flex-1 px-3 py-2 rounded-lg bg-surface border border-card-border text-text-primary text-sm focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <Button variant="secondary" size="sm" onClick={async () => {
            try {
              const ok = await window.electronAPI.testServerConnection(settings.serverUrl || '');
              toast.success(ok?.success ? 'Connection successful' : 'Connection failed');
            } catch {
              toast.error('Connection failed');
            }
          }}>
            Test
          </Button>
        </div>
      </SettingsCard>

      {/* API Key */}
      <SettingsCard title="API Key" description="Authentication key for the server" locked={isLocked('apiKey')}>
        <div className="flex items-center gap-3 mt-3">
          <Key size={16} className="text-text-muted flex-shrink-0" />
          <input
            type="password"
            value={settings.apiKey || ''}
            onChange={(e) => updateSettings({ apiKey: e.target.value })}
            disabled={isLocked('apiKey')}
            placeholder="Enter API key..."
            className="flex-1 px-3 py-2 rounded-lg bg-surface border border-card-border text-text-primary text-sm focus:outline-none focus:border-accent disabled:opacity-50"
          />
        </div>
      </SettingsCard>

      {/* User Auth */}
      <SettingsCard title="User Authentication" description="Connect with a token or invite code">
        {isAuthenticated ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                {username?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{username || 'Connected'}</p>
                <p className="text-xs text-text-muted">Authenticated</p>
              </div>
              <Badge variant="success" size="sm">
                <CheckCircle size={10} className="mr-1" />
                Connected
              </Badge>
            </div>
            <Button variant="danger" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={connectCode}
                onChange={(e) => setConnectCode(e.target.value)}
                placeholder="Enter invite code or token..."
                className="flex-1 px-3 py-2 rounded-lg bg-surface border border-card-border text-text-primary text-sm focus:outline-none focus:border-accent"
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
              <Button variant="primary" size="sm" onClick={handleConnect} loading={connecting} disabled={!connectCode.trim()}>
                Connect
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Get an invite code from the server administrator to connect.
            </p>
          </div>
        )}
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
        {locked && <span className="text-xs text-warning flex items-center gap-1"><Lock size={12} /> Locked</span>}
      </div>
      {children}
    </div>
  );
}
