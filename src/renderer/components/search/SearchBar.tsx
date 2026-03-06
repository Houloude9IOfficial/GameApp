import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGamesStore } from '../../stores/useGamesStore';
import { Game } from '../../../shared/types';
import { DEFAULT_BANNER } from '../../utils/constants';
import Fuse from 'fuse.js';

export function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Game[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const games = useGamesStore(s => s.games);

const fuse = useMemo(() => new Fuse(games, {
  keys: [
    { name: 'name', weight: 2.5 },
    { name: 'developer', weight: 1.2 },
    { name: 'description', weight: 1 },
    { name: 'tags', weight: 1.5 },
    { name: 'category', weight: 1.5 },
    { name: 'id', weight: 0.3 },
    { name: 'platforms', weight: 0.3 },
  ],
  threshold: 0.45,
  includeScore: true,
}), [games]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const fuseResults = fuse.search(query).slice(0, 8).map(r => r.item);
    setResults(fuseResults);
    setOpen(fuseResults.length > 0);
    setSelectedIndex(-1);
  }, [query, fuse]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        navigate(`/game/${results[selectedIndex].id}`);
        setOpen(false);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (game: Game) => {
    navigate(`/game/${game.id}`);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search size={15} className="absolute left-3 text-text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search game titles..."
          className="w-full h-8 pl-9 pr-8 bg-surface border border-card-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            className="absolute right-2 text-text-muted hover:text-text-primary"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-surface border border-card-border rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
          {results.map((game, index) => (
            <button
              key={game.id}
              onClick={() => handleSelect(game)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                index === selectedIndex ? 'bg-surface-hover' : 'hover:bg-surface-hover'
              }`}
            >
              <img
                src={game.brandingUrls?.icon || game.brandingUrls?.logo || DEFAULT_BANNER}
                alt=""
                className="w-8 h-8 rounded object-cover bg-card"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_BANNER; }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">{game.name}</div>
                <div className="text-xs text-text-muted truncate">{game.developer || 'Unknown'}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
