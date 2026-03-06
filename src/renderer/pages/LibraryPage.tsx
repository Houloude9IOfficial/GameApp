import React, { useEffect, useState } from 'react';
import { LayoutGrid, List, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useGamesStore } from '../stores/useGamesStore';
import { useOwnershipStore } from '../stores/useOwnershipStore';
import { GameGrid } from '../components/games/GameGrid';
import { GameList } from '../components/games/GameList';
import { Badge } from '../components/common/Badge';
import { FILTER_TABS, SORT_OPTIONS, VIEW_MODES } from '../utils/constants';

export function LibraryPage() {
  const {
    games,
    selectedFilter: filter,
    sortBy: sort,
    viewMode,
    selectedTags,
    selectedCategory,
    tags: allTags,
    categories: allCategories,
    setFilter,
    setSortBy: setSort,
    setViewMode,
    setSelectedTags,
    setSelectedCategory,
    fetchGames,
    fetchTags,
    fetchCategories,
    getFilteredGames,
  } = useGamesStore();

  const [showFilters, setShowFilters] = useState(false);
  const [cardSize, setCardSize] = useState(3);

  const fetchInstalledGames = useGamesStore(s => s.fetchInstalledGames);

  useEffect(() => {
    fetchGames();
    fetchTags();
    fetchCategories();
    fetchInstalledGames();
  }, []);

  const ownedGameIds = useOwnershipStore(s => s.ownedGameIds);
  const filteredGames = getFilteredGames().filter(g => ownedGameIds.has(g.id));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-text-primary">Library</h1>
          <span className="text-sm text-text-muted">{filteredGames.length} games</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Tabs */}
          <div className="flex bg-card rounded-lg p-0.5">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === tab.value
                    ? 'bg-accent text-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-card transition-colors">
              <SlidersHorizontal size={14} />
              {SORT_OPTIONS.find(s => s.value === sort)?.label || 'Sort'}
              <ChevronDown size={12} />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-surface border border-card-border rounded-lg shadow-xl py-1 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {SORT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSort(option.value as any)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    sort === option.value
                      ? 'text-accent bg-card'
                      : 'text-text-secondary hover:bg-card hover:text-text-primary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-card rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-accent text-primary' : 'text-text-muted hover:text-text-primary'}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-accent text-primary' : 'text-text-muted hover:text-text-primary'}`}
            >
              <List size={14} />
            </button>
          </div>

          {/* Card size slider (grid only) */}
          {viewMode === 'grid' && (
            <input
              type="range"
              min={1}
              max={5}
              value={cardSize}
              onChange={(e) => setCardSize(Number(e.target.value))}
              className="w-20 accent-[var(--color-accent)]"
              title="Card size"
            />
          )}

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg transition-colors ${showFilters ? 'bg-accent text-primary' : 'text-text-muted hover:text-text-primary hover:bg-card'}`}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="px-6 py-3 border-b border-card-border bg-surface/50 space-y-3">
          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <span className="text-xs font-medium text-text-muted mb-1.5 block">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map(tag => {
                  const tagName = typeof tag === 'string' ? tag : tag.name;
                  const isSelected = selectedTags.includes(tagName);
                  return (
                    <button
                      key={tagName}
                      onClick={() => {
                        setSelectedTags(
                          isSelected ? selectedTags.filter(t => t !== tagName) : [...selectedTags, tagName]
                        );
                      }}
                      className={`px-2 py-0.5 rounded-full text-xs transition-colors border ${
                        isSelected
                          ? 'bg-accent text-primary border-accent'
                          : 'border-card-border text-text-muted hover:border-accent hover:text-text-primary'
                      }`}
                    >
                      {tagName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Categories */}
          {allCategories.length > 0 && (
            <div>
              <span className="text-xs font-medium text-text-muted mb-1.5 block">Category</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-2 py-0.5 rounded-full text-xs transition-colors border ${
                    !selectedCategory
                      ? 'bg-accent text-primary border-accent'
                      : 'border-card-border text-text-muted hover:border-accent hover:text-text-primary'
                  }`}
                >
                  All
                </button>
                {allCategories.map(cat => {
                  const catId = typeof cat === 'string' ? cat : cat.id;
                  const catName = typeof cat === 'string' ? cat : cat.name;
                  return (
                    <button
                      key={catId}
                      onClick={() => setSelectedCategory(selectedCategory === catId ? null : catId)}
                      className={`px-2 py-0.5 rounded-full text-xs transition-colors border ${
                        selectedCategory === catId
                          ? 'bg-accent text-primary border-accent'
                          : 'border-card-border text-text-muted hover:border-accent hover:text-text-primary'
                      }`}
                    >
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
      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === 'grid' ? (
          <GameGrid games={filteredGames} cardSize={cardSize} emptyMessage={filter === 'installed' ? 'No installed games' : 'No games found'} />
        ) : (
          <GameList games={filteredGames} emptyMessage={filter === 'installed' ? 'No installed games' : 'No games found'} />
        )}
      </div>
    </div>
  );
}
