import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { SearchBar } from '../search/SearchBar';
import { NotificationDropdown } from '../common/NotificationDropdown';
import logoImg from '../../assets/logo-rounded.png';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const check = async () => {
      const max = await window.electronAPI.isMaximized();
      setIsMaximized(max);
    };
    check();

    // Re-check on window resize events
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => window.electronAPI.minimize();
  const handleMaximize = async () => {
    await window.electronAPI.maximize();
    setIsMaximized(!isMaximized);
  };
  const handleClose = () => window.electronAPI.close();

  return (
    <div
      className="flex items-center h-[var(--titlebar-height)] bg-titlebar text-titlebar-text px-3 select-none drag-region shrink-0"
      style={{ minHeight: 'var(--titlebar-height)' }}
    >
      {/* App Branding */}
      <div className="flex items-center gap-2 no-drag mr-4">
        <img src={logoImg} alt="Logo" className="w-6 h-6 rounded-md" draggable={false} />
        <span className="text-sm font-semibold tracking-wide">Game Launcher</span>
      </div>

      {/* Search Bar */}
      <div className="flex-1 flex justify-center no-drag max-w-xl mx-auto">
        <SearchBar />
      </div>

      {/* Notifications + Window Controls */}
      <div className="flex items-center gap-0.5 no-drag ml-4">
        <NotificationDropdown />
        <button
          onClick={handleMinimize}
          className="w-10 h-8 flex items-center justify-center rounded hover:bg-surface-hover transition-colors"
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-8 flex items-center justify-center rounded hover:bg-surface-hover transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-8 flex items-center justify-center rounded hover:bg-danger hover:text-white transition-colors"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
