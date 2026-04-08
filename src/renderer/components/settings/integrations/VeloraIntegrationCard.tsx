import React, { useState } from 'react';
import { Music, Loader, Check, AlertCircle, Copy } from 'lucide-react';
import { useVeloraStore } from '../../../stores/useVeloraStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';

interface VeloraIntegrationCardProps {
  onStatusChange?: () => void;
}

export function VeloraIntegrationCard({ onStatusChange }: VeloraIntegrationCardProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [showRequestId, setShowRequestId] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  const isConfigured = useVeloraStore(s => s.isConfigured);
  const isWSConnected = useVeloraStore(s => s.isWSConnected);
  const permissions = useVeloraStore(s => s.permissions);
  const token = useVeloraStore(s => s.token);
  const setToken = useVeloraStore(s => s.setToken);
  const clearAll = useVeloraStore(s => s.clearAll);

  const updateSettings = useSettingsStore(s => s.updateSettings);

  // Handle registration
  const handleRegister = async () => {
    setIsRegistering(true);
    setPollError(null);

    try {
      const result = await window.electronAPI.velora.register({
        app: {
          name: 'Game Launcher',
          description: 'Local game launcher that allows downloading and playing games',
          developer: 'CrickDevs',
          website: 'https://gamelauncher.crickdevs.com',
        },
        permissions: ['read', 'write'],
      });

      setRequestId(result.request_id);
      setShowRequestId(true);
      setPollError(null);

      // Auto-start polling
      await handlePollStatus(result.request_id);
    } catch (err: any) {
      setPollError(err.message || 'Registration failed');
      setIsRegistering(false);
    }
  };

  // Handle polling for approval
  const handlePollStatus = async (reqId?: string) => {
    const idToPoll = reqId ?? requestId;
    if (!idToPoll) return;

    setIsPolling(true);
    setPollError(null);

    try {
      // Poll for up to 5 minutes with 1 second interval
      let attempts = 0;
      const maxAttempts = 300;

      while (attempts < maxAttempts) {
        const status = await window.electronAPI.velora.pollStatus(idToPoll);

        if (status.status === 'approved' && status.access_token) {
          // Ensure we have valid permissions (require at least 'read')
          const grantedPermissions = status.permissions || ['read', 'write'];
          
          if (!grantedPermissions.includes('read')) {
            setPollError('Insufficient permissions granted. Please approve read and write access.');
            setShowRequestId(true); // Allow retry
            break;
          }

          // Save token
          await window.electronAPI.velora.saveToken(
            status.access_token,
            grantedPermissions
          );

          // Update store
          setToken(status.access_token, grantedPermissions);

          // Update settings
          await updateSettings({
            veloraToken: status.access_token,
            veloraPermissions: grantedPermissions,
          });

          setShowRequestId(false);
          setRequestId(null);
          onStatusChange?.();
          break;
        } else if (status.status === 'denied' || (status as any).error === 'denied') {
          setPollError('Request was denied by user in Velora app.');
          setShowRequestId(false);
          setRequestId(null);
          break;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        setPollError('Request timed out (5 minutes). Please try again.');
        setShowRequestId(false);
        setRequestId(null);
      }
    } catch (err: any) {
      // Check if error indicates denial
      if (err.message?.includes('denied') || err.message?.includes('Denied')) {
        setPollError('Request was denied by user in Velora app.');
        setShowRequestId(false);
        setRequestId(null);
      } else {
        setPollError(err.message || 'Polling failed');
      }
    } finally {
      setIsPolling(false);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestError(null);

    try {
      // Test WebSocket connection via IPC
      await window.electronAPI.velora.connectWebSocket();
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch (err: any) {
      // Check for permission errors
      if (err.message?.includes('read permission') || err.message?.includes('AUTH_ERROR')) {
        setTestError('Missing read permission. Please register again with proper permissions.');
      } else if (err.message?.includes('offline') || err.message?.includes('ECONNREFUSED')) {
        setTestError('Velora app is not running or not accessible. Make sure Velora is running on localhost:39031.');
      } else {
        setTestError(err.message || 'Connection test failed');
      }
      setTestStatus('error');
    }
  };

  // Clear credentials
  const handleClear = async () => {
    if (!confirm('Are you sure? This will disconnect Velora and remove your token.')) {
      return;
    }

    try {
      await window.electronAPI.velora.clearToken();
      await clearAll();
      await updateSettings({
        veloraToken: undefined,
        veloraPermissions: undefined,
      });
      onStatusChange?.();
    } catch (err: any) {
      console.error('Failed to clear token:', err);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-card-border bg-surface-subtle">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded bg-accent/10">
          <Music size={20} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary">Velora Music Player</h3>
          <p className="text-sm text-text-muted">Control playback from your music app</p>
        </div>
        {isConfigured && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isWSConnected ? 'bg-success' : 'bg-warning'}`} />
            <span className="text-xs font-medium text-text-muted">
              {isWSConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        )}
      </div>

      {/* Unconfigured State */}
      {!isConfigured && !showRequestId && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Velora is not configured yet. Make sure that Velora is running, the local server is accessible, and then click below to set up the integration.
          </p>
          <button
            onClick={handleRegister}
            disabled={isRegistering}
            className="w-full px-4 py-2 bg-accent text-primary font-medium rounded hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {isRegistering ? (
              <>
                <Loader size={16} className="animate-spin" />
                Registering...
              </>
            ) : (
              'Register App'
            )}
          </button>
        </div>
      )}

      {/* Pending Approval State */}
      {showRequestId && requestId && (
        <div className="space-y-3">
          <div className="p-3 rounded bg-warning/10 border border-warning/20">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">Waiting for approval...</p>
                <p className="text-xs text-text-muted mt-1">
                  Check the Velora app for a request to authorize Game Launcher.
                </p>
              </div>
            </div>
          </div>

          {/* Request ID Display */}
          <div className="p-3 rounded bg-surface-active border border-card-border font-mono text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-muted break-all">{requestId}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(requestId);
                }}
                className="p-1 hover:bg-sidebar-hover rounded transition-colors shrink-0"
                title="Copy request ID"
              >
                <Copy size={14} className="text-text-muted" />
              </button>
            </div>
          </div>

          {pollError && (
            <div className="p-3 rounded bg-danger/10 border border-danger/20">
              <p className="text-xs text-danger">{pollError}</p>
            </div>
          )}

          <button
            onClick={() => handlePollStatus(requestId)}
            disabled={isPolling}
            className="w-full px-4 py-2 bg-primary/10 text-accent font-medium rounded border border-accent/30 hover:bg-primary/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isPolling ? (
              <>
                <Loader size={16} className="animate-spin" />
                Polling...
              </>
            ) : (
              'Check Status'
            )}
          </button>
        </div>
      )}

      {/* Configured State */}
      {isConfigured && !showRequestId && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 p-3 rounded bg-surface-active">
            <div>
              <p className="text-xs text-text-muted">Status</p>
              <p className="text-sm font-medium text-text-primary mt-1">
                {isWSConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Permissions</p>
              <div className="flex gap-1 mt-1">
                <span className={`text-xs font-medium px-2 py-1 rounded ${permissions?.includes('read') ? 'bg-success/20 text-success' : 'bg-surface-subtle text-text-muted'}`}>
                  Read
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${permissions?.includes('write') ? 'bg-success/20 text-success' : 'bg-surface-subtle text-text-muted'}`}>
                  Write
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className={`flex-1 px-4 py-2 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                testStatus === 'success'
                  ? 'bg-success/20 text-success border border-success/30'
                  : testStatus === 'error'
                  ? 'bg-danger/20 text-danger border border-danger/30'
                  : 'bg-primary/10 text-accent border border-accent/30 hover:bg-primary/20'
              }`}
            >
              {testStatus === 'testing' && (
                <>
                  <Loader size={16} className="animate-spin" />
                  Testing...
                </>
              )}
              {testStatus === 'success' && (
                <>
                  <Check size={16} />
                  Connected
                </>
              )}
              {testStatus === 'error' && (
                <>
                  <AlertCircle size={16} />
                  Failed
                </>
              )}
              {testStatus === 'idle' && 'Test Connection'}
            </button>

            <button
              onClick={handleClear}
              className="flex-1 px-4 py-2 bg-danger/10 text-danger font-medium rounded border border-danger/30 hover:bg-danger/20 transition-colors"
            >
              Clear Credentials
            </button>
          </div>

          {testError && (
            <div className="p-3 rounded bg-danger/10 border border-danger/20">
              <p className="text-xs text-danger">{testError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
