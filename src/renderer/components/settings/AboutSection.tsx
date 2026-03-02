import React from 'react';
import { Heart, Github, ExternalLink, Shield } from 'lucide-react';
import logoImg from '../../assets/logo-rounded.png';

export function AboutSection() {
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
