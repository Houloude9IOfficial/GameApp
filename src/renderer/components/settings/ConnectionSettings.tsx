import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Lock, Key, Globe, Search, Radio, Zap, Server } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { DiscoveredServer } from '../../../shared/types';
import toast from 'react-hot-toast';

export function ConnectionSettings({ minimal = false }: { minimal?: boolean } = {}) {
  const { settings, updateSettings, isLocked } = useSettingsStore();
  const { isAuthenticated, username, logout, deleteAccount, checkStatus } = useAuthStore();
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Discovery state
  const [scanning, setScanning] = useState(false);
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);
  const [portsInput, setPortsInput] = useState('');
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    checkServerStatus();
    checkStatus();
  }, []);

  // Sync ports input from settings
  useEffect(() => {
    if (settings?.scanPorts) {
      setPortsInput(settings.scanPorts.join(', '));
    }
  }, [settings?.scanPorts]);

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast.error('Failed to log out');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      setConfirmDelete(false);
    } catch {
      toast.error('Failed to delete account');
    }
  };

  const parsePorts = (input: string): number[] => {
    return input
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0 && n <= 65535);
  };

  const handleScanLAN = async () => {
    setScanning(true);
    setDiscoveredServers([]);
    setHasScanned(true);
    try {
      const ports = parsePorts(portsInput);
      if (ports.length === 0) {
        toast.error('Enter at least one valid port');
        setScanning(false);
        return;
      }
      // Save ports preference
      await updateSettings({ scanPorts: ports });
      const servers = await window.electronAPI.scanForServers(ports);
      setDiscoveredServers(servers);
      if (servers.length === 0) {
        toast('No servers found on the network', { icon: '📡' });
      } else {
        toast.success(`Found ${servers.length} server${servers.length > 1 ? 's' : ''}`);
      }
    } catch (err: any) {
      toast.error('Scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setScanning(false);
    }
  };

  const handleSelectServer = async (server: DiscoveredServer) => {
    await updateSettings({ serverUrl: server.url });
    toast.success(`Connected to ${server.name || server.url}`);
    checkServerStatus();
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

      {/* Server Discovery */}
      <SettingsCard title="Server Discovery" description="Scan your local network for available GameServers">
        <div className="mt-3 space-y-4">
          {/* Ports config */}
          <div className="flex items-center gap-3">
            <Radio size={16} className="text-text-muted flex-shrink-0" />
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Ports to scan</label>
              <input
                type="text"
                value={portsInput}
                onChange={(e) => setPortsInput(e.target.value)}
                placeholder="3000"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-card-border text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleScanLAN}
              loading={scanning}
              disabled={scanning}
              className="self-end"
            >
              <Search size={14} className="mr-1" />
              {scanning ? 'Scanning...' : 'Scan LAN'}
            </Button>
          </div>

          {/* Scanning indicator */}
          {scanning && (
            <div className="flex items-center gap-2 text-sm text-text-muted py-2">
              <RefreshCw size={14} className="animate-spin" />
              Scanning network — this may take a few seconds...
            </div>
          )}

          {/* Results */}
          {!scanning && hasScanned && discoveredServers.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-text-muted py-3 justify-center">
              <WifiOff size={14} />
              No servers found. Check that the server is running and try different ports.
            </div>
          )}

          {discoveredServers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-text-muted font-medium">
                Found {discoveredServers.length} server{discoveredServers.length > 1 ? 's' : ''}
              </p>
              {discoveredServers.map((server) => {
                const isActive = settings.serverUrl === server.url;
                return (
                  <button
                    key={server.url}
                    onClick={() => handleSelectServer(server)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      isActive
                        ? 'bg-accent/10 border-accent'
                        : 'bg-surface border-card-border hover:border-accent/50 hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                    </div>
                    <Server size={16} className="text-text-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {server.name || server.url}
                        </span>
                        {isActive && (
                          <Badge variant="success" size="sm">Active</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-text-muted truncate">{server.url}</span>
                        {server.version && (
                          <span className="text-xs text-text-muted">v{server.version}</span>
                        )}
                        {server.gamesCount !== undefined && (
                          <span className="text-xs text-text-muted">{server.gamesCount} games</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <Zap size={12} className={server.latency < 50 ? 'text-success' : server.latency < 200 ? 'text-warning' : 'text-danger'} />
                      <span className={`text-xs font-mono ${server.latency < 50 ? 'text-success' : server.latency < 200 ? 'text-warning' : 'text-danger'}`}>
                        {server.latency}ms
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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

      {!minimal && (
        <>
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

          {/* Account */}
          <SettingsCard title="Account" description="Manage your account">
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                  {username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{username || 'User'}</p>
                  <p className="text-xs text-text-muted">Signed in</p>
                </div>
                <Badge variant="success" size="sm">
                  <CheckCircle size={10} className="mr-1" />
                  Connected
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleLogout}>
                  Log Out
                </Button>
                {!confirmDelete ? (
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                    Delete Account
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-danger">Are you sure?</span>
                    <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
                      Yes, delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </SettingsCard>
        </>
      )}
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
