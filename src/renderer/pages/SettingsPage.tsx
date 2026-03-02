import React, { useState } from 'react';
import { Palette, Download, Wifi, Settings as SettingsIcon, Info, Lock } from 'lucide-react';
import { AppearanceSettings } from '../components/settings/AppearanceSettings';
import { DownloadSettings } from '../components/settings/DownloadSettings';
import { ConnectionSettings } from '../components/settings/ConnectionSettings';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { AboutSection } from '../components/settings/AboutSection';

const TABS = [
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
  { id: 'downloads', label: 'Downloads', icon: <Download size={16} /> },
  { id: 'connection', label: 'Connection', icon: <Wifi size={16} /> },
  { id: 'general', label: 'General', icon: <SettingsIcon size={16} /> },
  { id: 'about', label: 'About', icon: <Info size={16} /> },
] as const;

type TabId = typeof TABS[number]['id'];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('appearance');

  return (
    <div className="flex h-full">
      {/* Settings Sidebar */}
      <div className="w-52 border-r border-card-border flex flex-col">
        <div className="p-4 border-b border-card-border">
          <h1 className="text-lg font-bold text-text-primary">Settings</h1>
        </div>
        <div className="flex-1 p-2 space-y-0.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-card text-accent font-medium'
                  : 'text-text-muted hover:text-text-primary hover:bg-card/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl">
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'downloads' && <DownloadSettings />}
          {activeTab === 'connection' && <ConnectionSettings />}
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'about' && <AboutSection />}
        </div>
      </div>
    </div>
  );
}
