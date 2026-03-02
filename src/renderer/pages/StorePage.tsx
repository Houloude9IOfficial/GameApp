import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List, Search, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, Download, Play, Info } from 'lucide-react';
import { useGamesStore } from '../stores/useGamesStore';
import { GameGrid } from '../components/games/GameGrid';
import { GameList } from '../components/games/GameList';
import { DEFAULT_BANNER, SORT_OPTIONS } from '../utils/constants';
import { Game } from '../../shared/types';

function HeroCarousel({ games }: { games: Game[] }) {
  const navigate = useNavigate();
  const { installedGames } = useGamesStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const featured = games.slice(0, 5);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const next = useCallback(() => goTo((activeIndex + 1) % featured.length), [activeIndex, featured.length, goTo]);
  const prev = useCallback(() => goTo((activeIndex - 1 + featured.length) % featured.length), [activeIndex, featured.length, goTo]);

  useEffect(() => {
    timerRef.current = setInterval(next, 6000);
    return () => clearInterval(timerRef.current);
  }, [next]);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 6000);
  };

  if (featured.length === 0) return null;

  const game = featured[activeIndex];
  const bannerUrl = game.brandingUrls?.banner || game.brandingUrls?.screenshots?.[0] || game.brandingUrls?.logo || DEFAULT_BANNER;
  const isInstalled = installedGames.some(g => g.gameId === game.id);

  return (
    <div className="relative w-full overflow-hidden rounded-xl group" style={{ height: '380px' }}>
      {/* Background Image */}
      <div className="absolute inset-0 transition-opacity duration-500">
        <img
          key={game.id}
          src={bannerUrl}
          alt={game.name}
          className="w-full h-full object-cover animate-fade-in"
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_BANNER; }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-8">
        {game.brandingUrls?.logo ? (
          <img src={game.brandingUrls.logo} alt={game.name} className="h-16 w-auto object-contain mb-3 drop-shadow-lg" style={{ maxWidth: '280px' }} />
        ) : (
          <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{game.name}</h2>
        )}

        {game.developer && (
          <p className="text-sm text-gray-300 mb-1">{game.developer}</p>
        )}

        <p className="text-sm text-gray-400 max-w-lg line-clamp-2 mb-4">
          {game.description || 'No description available'}
        </p>

        {/* Tags */}
        {game.tags && game.tags.length > 0 && (
          <div className="flex gap-2 mb-4">
            {game.tags.slice(0, 4).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded bg-white/10 text-xs text-gray-200 backdrop-blur-sm border border-white/10">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          {isInstalled ? (
            <button
              onClick={() => navigate(`/game/${game.id}`)}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:brightness-110 text-primary font-semibold rounded-lg transition-all shadow-lg"
            >
              <Play size={18} fill="currentColor" />
              Play Now
            </button>
          ) : (
            <button
              onClick={() => navigate(`/game/${game.id}`)}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:brightness-110 text-primary font-semibold rounded-lg transition-all shadow-lg"
            >
              <Download size={18} />
              Get Game
            </button>
          )}
          <button
            onClick={() => navigate(`/game/${game.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/10"
          >
            <Info size={16} />
            Details
          </button>
        </div>
      </div>

      {/* Nav Arrows */}
      {featured.length > 1 && (
        <>
          <button
            onClick={() => { prev(); resetTimer(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => { next(); resetTimer(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {featured.length > 1 && (
        <div className="absolute bottom-4 right-8 flex gap-2 z-20">
          {featured.map((g, i) => (
            <button
              key={g.id}
              onClick={() => { goTo(i); resetTimer(); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-8 bg-accent' : 'w-4 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function StorePage() {
  const {
    games,
    sortBy,
    viewMode,
    selectedTags,
    selectedCategory,
    tags,
    categories,
    setSortBy,
    setViewMode,
    setSelectedTags,
    setSelectedCategory,
    fetchGames,
    fetchTags,
    fetchCategories,
  } = useGamesStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [cardSize, setCardSize] = useState(3);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchGames();
    fetchTags();
    fetchCategories();
    useGamesStore.getState().fetchInstalledGames();
  }, []);

  // Simple local filter for store — shows all games
  let displayGames = [...games];

  // Search filter
  if (searchTerm.trim()) {
    const lower = searchTerm.toLowerCase();
    displayGames = displayGames.filter(g =>
      g.name.toLowerCase().includes(lower) ||
      g.developer?.toLowerCase().includes(lower) ||
      g.description?.toLowerCase().includes(lower)
    );
  }

  // Tag/category filters
  if (selectedTags.length > 0) {
    displayGames = displayGames.filter(g => selectedTags.some(t => g.tags?.includes(t)));
  }
  if (selectedCategory) {
    displayGames = displayGames.filter(g => g.category === selectedCategory);
  }

  // Sort
  displayGames.sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'size': return (a.totalSize || 0) - (b.totalSize || 0);
      case 'developer': return (a.developer || '').localeCompare(b.developer || '');
      default: return a.name.localeCompare(b.name);
    }
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero Carousel */}
      <div className="px-6 pt-5">
        <HeroCarousel games={games} />
      </div>

      {/* Toolbar */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">All Games</h2>
          <span className="text-xs text-text-muted">{displayGames.length} games</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search store..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-card-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Sort */}
          <div className="relative group">
            <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-card border border-card-border transition-colors">
              {SORT_OPTIONS.find(s => s.value === sortBy)?.label || 'Sort'}
              <ChevronDown size={12} />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-surface border border-card-border rounded-lg shadow-xl py-1 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {SORT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    sortBy === option.value ? 'text-accent bg-card' : 'text-text-secondary hover:bg-card'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* View toggle */}
          <div className="flex bg-card rounded-lg p-0.5 border border-card-border">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-accent text-primary' : 'text-text-muted'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-accent text-primary' : 'text-text-muted'}`}>
              <List size={14} />
            </button>
          </div>

          {viewMode === 'grid' && (
            <input type="range" min={1} max={5} value={cardSize} onChange={(e) => setCardSize(Number(e.target.value))} className="w-20 accent-[var(--color-accent)]" />
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-accent text-primary border-accent' : 'border-card-border text-text-muted hover:text-text-primary'}`}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="px-6 py-3 border-b border-card-border bg-surface/50 space-y-3">
          {tags.length > 0 && (
            <div>
              <span className="text-xs font-medium text-text-muted mb-1.5 block">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => {
                  const tagName = typeof tag === 'string' ? tag : tag.name;
                  return (
                    <button
                      key={tagName}
                      onClick={() => setSelectedTags(selectedTags.includes(tagName) ? selectedTags.filter(t => t !== tagName) : [...selectedTags, tagName])}
                      className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                        selectedTags.includes(tagName) ? 'bg-accent text-primary border-accent' : 'border-card-border text-text-muted hover:border-accent'
                      }`}
                    >
                      {tagName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {categories.length > 0 && (
            <div>
              <span className="text-xs font-medium text-text-muted mb-1.5 block">Category</span>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setSelectedCategory(null)} className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${!selectedCategory ? 'bg-accent text-primary border-accent' : 'border-card-border text-text-muted'}`}>All</button>
                {categories.map(cat => {
                  const catId = typeof cat === 'string' ? cat : cat.id;
                  const catName = typeof cat === 'string' ? cat : cat.name;
                  return (
                    <button key={catId} onClick={() => setSelectedCategory(selectedCategory === catId ? null : catId)} className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${selectedCategory === catId ? 'bg-accent text-primary border-accent' : 'border-card-border text-text-muted'}`}>
                      {catName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-6 pb-6">
        {viewMode === 'grid' ? (
          <GameGrid games={displayGames} cardSize={cardSize} emptyMessage="No games available" />
        ) : (
          <GameList games={displayGames} emptyMessage="No games available" />
        )}
      </div>
    </div>
  );
}
