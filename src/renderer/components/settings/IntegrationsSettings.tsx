import React from 'react';
import { VeloraIntegrationCard } from './integrations/VeloraIntegrationCard';

interface IntegrationsSettingsProps {
  onUpdate?: () => void;
}

export function IntegrationsSettings({ onUpdate }: IntegrationsSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-2">Integrations</h2>
        <p className="text-sm text-text-muted">
          Connect external services to enhance your Game Launcher experience
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 gap-4">
        {/* Velora */}
        <VeloraIntegrationCard onStatusChange={onUpdate} />

        {/* Other Integrations - Coming Soon */}
        <div className="p-4 rounded-lg border border-dashed border-card-border bg-surface-subtle">
          <div className="text-center">
            <h3 className="font-semibold text-text-primary mb-1">More Integrations</h3>
            <p className="text-sm text-text-muted">
              Discord, Twitch, and more coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
