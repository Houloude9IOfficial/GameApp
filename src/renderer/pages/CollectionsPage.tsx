import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, FolderOpen, MoreHorizontal, LayoutGrid, List, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Collection } from '../../shared/types';
import { useGamesStore } from '../stores/useGamesStore';
import { GameGrid } from '../components/games/GameGrid';
import { GameList } from '../components/games/GameList';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { DEFAULT_BANNER } from '../utils/constants';
import toast from 'react-hot-toast';

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const games = useGamesStore(s => s.games);

  const loadCollections = async () => {
    try {
      const result = await window.electronAPI.getCollections();
      setCollections(result || []);
    } catch {
      console.error('Failed to load collections');
    }
  };

  useEffect(() => { loadCollections(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection?')) return;
    try {
      await window.electronAPI.deleteCollection(id);
      setCollections(prev => prev.filter(c => c.id !== id));
      if (selectedCollection?.id === id) setSelectedCollection(null);
      toast.success('Collection deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const collectionGames = selectedCollection
    ? games.filter(g => selectedCollection.gameIds.includes(g.id))
    : [];

  return (
    <div className="flex h-full">
      {/* Collections Sidebar */}
      <div className="w-64 border-r border-card-border flex flex-col">
        <div className="p-4 border-b border-card-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-text-primary">Collections</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 rounded-lg bg-accent text-primary hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
            </button>
          </div>
          <p className="text-xs text-text-muted">{collections.length} collections</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {collections.map(col => (
            <button
              key={col.id}
              onClick={() => setSelectedCollection(col)}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group ${
                selectedCollection?.id === col.id
                  ? 'bg-card border border-accent'
                  : 'hover:bg-card border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-text-primary truncate">{col.name}</h3>
                  <p className="text-xs text-text-muted">{col.gameIds.length} games</p>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedCollection(col); setShowEditModal(true); }}
                    className="p-1 rounded text-text-muted hover:text-text-primary"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(col.id); }}
                    className="p-1 rounded text-text-muted hover:text-danger"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </button>
          ))}

          {collections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-text-muted">
              <FolderOpen size={32} className="mb-2 opacity-30" />
              <p className="text-sm">No collections yet</p>
              <button onClick={() => setShowCreateModal(true)} className="text-xs text-accent mt-1 hover:underline">Create one</button>
            </div>
          )}
        </div>
      </div>

      {/* Collection Content */}
      <div className="flex-1 flex flex-col">
        {selectedCollection ? (
          <>
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-text-primary">{selectedCollection.name}</h1>
                {selectedCollection.description && (
                  <p className="text-sm text-text-muted mt-0.5">{selectedCollection.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">{collectionGames.length} games</span>
                <div className="flex bg-card rounded-lg p-0.5">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-accent text-primary' : 'text-text-muted'}`}>
                    <LayoutGrid size={14} />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-accent text-primary' : 'text-text-muted'}`}>
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {viewMode === 'grid' ? (
                <GameGrid games={collectionGames} emptyMessage="No games in this collection" />
              ) : (
                <GameList games={collectionGames} emptyMessage="No games in this collection" />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
            <FolderOpen size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a collection</p>
            <p className="text-sm mt-1">Or create a new one to organize your games</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CollectionFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        games={games}
        onSave={async (data) => {
          try {
            await window.electronAPI.createCollection(data);
            await loadCollections();
            setShowCreateModal(false);
            toast.success('Collection created');
          } catch {
            toast.error('Failed to create');
          }
        }}
      />

      {/* Edit Modal */}
      {selectedCollection && (
        <CollectionFormModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          games={games}
          initialData={selectedCollection}
          onSave={async (data) => {
            try {
              await window.electronAPI.updateCollection(selectedCollection.id, data);
              await loadCollections();
              setShowEditModal(false);
              toast.success('Collection updated');
            } catch {
              toast.error('Failed to update');
            }
          }}
        />
      )}
    </div>
  );
}

function CollectionFormModal({ open, onClose, games, initialData, onSave }: {
  open: boolean;
  onClose: () => void;
  games: any[];
  initialData?: Collection;
  onSave: (data: { name: string; description?: string; gameIds: string[] }) => Promise<void>;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialData?.gameIds || []));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setSelectedIds(new Set(initialData?.gameIds || []));
    }
  }, [open, initialData]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), description: description.trim() || undefined, gameIds: Array.from(selectedIds) });
    setSaving(false);
  };

  const toggleGame = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initialData ? 'Edit Collection' : 'New Collection'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-text-primary block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Collection"
            className="w-full px-3 py-2 rounded-lg bg-card border border-card-border text-text-primary text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary block mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description..."
            className="w-full px-3 py-2 rounded-lg bg-card border border-card-border text-text-primary text-sm focus:outline-none focus:border-accent resize-none h-20"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary block mb-2">
            Games ({selectedIds.size} selected)
          </label>
          <div className="max-h-60 overflow-y-auto border border-card-border rounded-lg">
            {games.map(game => (
              <label
                key={game.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-card cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(game.id)}
                  onChange={() => toggleGame(game.id)}
                  className="rounded accent-accent"
                />
                <img
                  src={game.brandingUrls?.icon || DEFAULT_BANNER}
                  alt=""
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
                <span className="text-sm text-text-primary truncate">{game.name}</span>
              </label>
            ))}
            {games.length === 0 && (
              <p className="p-4 text-sm text-text-muted text-center">No games available</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!name.trim()}>
            {initialData ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
