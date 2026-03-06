import React, { useState, useEffect } from 'react';
import { UserPlus, UserMinus, Search, Check, X, Shield, Circle, Gamepad2, Clock, Users } from 'lucide-react';
import { useSocialStore } from '../stores/useSocialStore';
import { Friend, FriendRequest } from '../../shared/types';
import { formatRelativeTime } from '../utils/formatters';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  online: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-text-muted',
  playing: 'bg-accent',
};

export function FriendsPage() {
  const { friends, requests, loading, fetchFriends, fetchRequests, sendRequest, acceptRequest, removeFriend, blockUser, searchUsers } = useSocialStore();
  const [tab, setTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string }[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (username: string) => {
    try {
      await sendRequest(username);
      toast.success(`Friend request sent to ${username}`);
      setSearchResults(r => r.filter(u => u.username !== username));
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
    }
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      await acceptRequest(friendshipId);
      toast.success('Friend request accepted');
      fetchFriends();
      fetchRequests();
    } catch {
      toast.error('Failed to accept request');
    }
  };

  const handleRemove = async (friendshipId: string) => {
    try {
      await removeFriend(friendshipId);
      toast.success('Friend removed');
      fetchFriends();
    } catch {
      toast.error('Failed to remove friend');
    }
  };

  const onlineFriends = friends.filter(f => f.onlineStatus !== 'offline');
  const offlineFriends = friends.filter(f => f.onlineStatus === 'offline');

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Users size={22} /> Friends
          </h1>
          {requests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-accent text-primary text-xs font-bold">
              {requests.length} pending
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-card-border rounded-lg p-1">
          {(['friends', 'requests', 'add'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-accent text-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t === 'add' ? 'Add Friend' : t}
              {t === 'requests' && requests.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-danger text-white text-[10px]">
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Friends List */}
        {tab === 'friends' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-8 text-center text-text-muted text-sm">Loading friends...</div>
            ) : friends.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Users size={32} className="mx-auto text-text-muted" />
                <p className="text-text-muted text-sm">No friends yet</p>
                <button
                  onClick={() => setTab('add')}
                  className="text-accent text-sm hover:underline"
                >
                  Add your first friend
                </button>
              </div>
            ) : (
              <>
                {onlineFriends.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
                      Online — {onlineFriends.length}
                    </h3>
                    <div className="space-y-1">
                      {onlineFriends.map(f => <FriendRow key={f.friendshipId} friend={f} onRemove={handleRemove} />)}
                    </div>
                  </div>
                )}
                {offlineFriends.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
                      Offline — {offlineFriends.length}
                    </h3>
                    <div className="space-y-1">
                      {offlineFriends.map(f => <FriendRow key={f.friendshipId} friend={f} onRemove={handleRemove} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Requests */}
        {tab === 'requests' && (
          <div className="space-y-2">
            {requests.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">No pending requests</div>
            ) : (
              requests.map(req => (
                <div key={req.friendshipId} className="flex items-center justify-between p-3 bg-card border border-card-border rounded-xl">
                  <div>
                    <span className="text-sm font-medium text-text-primary">{req.fromUsername}</span>
                    <span className="text-xs text-text-muted ml-2">{formatRelativeTime(req.createdAt)}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAccept(req.friendshipId)}
                      className="p-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors"
                      title="Accept"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await removeFriend(req.friendshipId);
                          fetchRequests();
                        } catch { /* silent */ }
                      }}
                      className="p-1.5 rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
                      title="Decline"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add Friend */}
        {tab === 'add' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by username..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-card-border text-sm text-text-primary focus:border-accent focus:outline-none"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.length < 2}
                className="px-4 py-2 rounded-lg bg-accent text-primary text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            <div className="space-y-1">
              {searchResults.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-card border border-card-border rounded-xl">
                  <span className="text-sm font-medium text-text-primary">{user.username}</span>
                  <button
                    onClick={() => handleSendRequest(user.username)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-primary text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    <UserPlus size={12} /> Add Friend
                  </button>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                <div className="py-4 text-center text-text-muted text-sm">
                  No users found. Try a different search.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FriendRow({ friend, onRemove }: { friend: Friend; onRemove: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-card border border-card-border rounded-xl hover:bg-card-hover transition-colors">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-sm font-bold text-text-secondary">
            {friend.username[0].toUpperCase()}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${statusColors[friend.onlineStatus] || statusColors.offline}`} />
        </div>
        <div>
          <span className="text-sm font-medium text-text-primary">{friend.username}</span>
          <div className="text-[11px] text-text-muted flex items-center gap-1">
            {friend.onlineStatus === 'playing' && friend.currentGameName ? (
              <><Gamepad2 size={10} /> Playing {friend.currentGameName}</>
            ) : friend.onlineStatus === 'online' ? (
              <><Circle size={8} className="fill-success text-success" /> Online</>
            ) : friend.onlineStatus === 'away' ? (
              <><Clock size={10} /> Away</>
            ) : (
              <>{friend.lastSeen ? `Last seen ${formatRelativeTime(friend.lastSeen)}` : 'Offline'}</>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => onRemove(friend.friendshipId)}
        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
        title="Remove friend"
      >
        <UserMinus size={14} />
      </button>
    </div>
  );
}
