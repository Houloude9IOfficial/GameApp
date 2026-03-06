import { create } from 'zustand';
import { Friend, FriendRequest } from '../../shared/types';

interface SocialState {
  friends: Friend[];
  requests: FriendRequest[];
  loading: boolean;
  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  sendRequest: (username: string) => Promise<void>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  blockUser: (friendshipId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<{ id: string; username: string }[]>;
}

export const useSocialStore = create<SocialState>((set) => ({
  friends: [],
  requests: [],
  loading: false,

  fetchFriends: async () => {
    set({ loading: true });
    try {
      const friends = await window.electronAPI.getFriends();
      set({ friends, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchRequests: async () => {
    try {
      const requests = await window.electronAPI.getFriendRequests();
      set({ requests });
    } catch { /* silent */ }
  },

  sendRequest: async (username: string) => {
    await window.electronAPI.sendFriendRequest(username);
  },

  acceptRequest: async (friendshipId: string) => {
    await window.electronAPI.acceptFriendRequest(friendshipId);
  },

  removeFriend: async (friendshipId: string) => {
    await window.electronAPI.removeFriend(friendshipId);
  },

  blockUser: async (friendshipId: string) => {
    await window.electronAPI.blockUser(friendshipId);
  },

  searchUsers: async (query: string) => {
    return await window.electronAPI.searchUsers(query);
  },
}));
