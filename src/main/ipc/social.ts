import { IpcMain } from 'electron';
import { ServerClient } from '../services/ServerClient';
import { IPC_CHANNELS } from '../../shared/types';
import log from 'electron-log';

export function registerSocialHandlers(ipcMain: IpcMain, serverClient: ServerClient): void {
  ipcMain.handle(IPC_CHANNELS.SOCIAL_GET_FRIENDS, async () => {
    try {
      return await serverClient.getFriends();
    } catch (err: any) {
      log.error('Failed to get friends:', err.message);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.SOCIAL_SEND_REQUEST, async (_e, username: string) => {
    try {
      await serverClient.sendFriendRequest(username);
    } catch (err: any) {
      log.error('Failed to send friend request:', err.message);
      throw new Error(err.message || 'Failed to send friend request.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SOCIAL_ACCEPT_REQUEST, async (_e, friendshipId: string) => {
    try {
      await serverClient.acceptFriendRequest(friendshipId);
    } catch (err: any) {
      log.error('Failed to accept friend request:', err.message);
      throw new Error('Failed to accept friend request.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SOCIAL_REMOVE_FRIEND, async (_e, friendshipId: string) => {
    try {
      await serverClient.removeFriend(friendshipId);
    } catch (err: any) {
      log.error('Failed to remove friend:', err.message);
      throw new Error('Failed to remove friend.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SOCIAL_BLOCK_USER, async (_e, friendshipId: string) => {
    try {
      await serverClient.blockUser(friendshipId);
    } catch (err: any) {
      log.error('Failed to block user:', err.message);
      throw new Error('Failed to block user.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SOCIAL_GET_REQUESTS, async () => {
    try {
      return await serverClient.getFriendRequests();
    } catch (err: any) {
      log.error('Failed to get friend requests:', err.message);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.SOCIAL_UPDATE_STATUS, async (_e, status: string, gameId?: string) => {
    try {
      await serverClient.updateUserStatus(status, gameId);
    } catch (err: any) {
      log.error('Failed to update status:', err.message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SOCIAL_SEARCH_USERS, async (_e, query: string) => {
    try {
      return await serverClient.searchUsers(query);
    } catch (err: any) {
      log.error('Failed to search users:', err.message);
      return [];
    }
  });
}
