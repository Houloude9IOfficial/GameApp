import { IpcMain } from 'electron';
import { ServerClient } from '../services/ServerClient';
import { IPC_CHANNELS } from '../../shared/types';
import log from 'electron-log';

export function registerReviewHandlers(ipcMain: IpcMain, serverClient: ServerClient): void {
  ipcMain.handle(IPC_CHANNELS.REVIEWS_GET, async (_e, gameId: string, opts?: { sort?: string; page?: number; limit?: number }) => {
    try {
      return await serverClient.getReviews(gameId, opts);
    } catch (err: any) {
      log.error('Failed to get reviews:', err.message);
      return { reviews: [], total: 0 };
    }
  });

  ipcMain.handle(IPC_CHANNELS.REVIEWS_GET_SUMMARY, async (_e, gameId: string) => {
    try {
      return await serverClient.getReviewSummary(gameId);
    } catch (err: any) {
      log.error('Failed to get review summary:', err.message);
      return { averageRating: 0, totalReviews: 0, distribution: {} };
    }
  });

  ipcMain.handle(IPC_CHANNELS.REVIEWS_CREATE, async (_e, gameId: string, data: { rating: number; title?: string; body?: string }) => {
    try {
      return await serverClient.createReview(gameId, data);
    } catch (err: any) {
      log.error('Failed to create review:', err.message);
      throw new Error(err.message || 'Failed to create review.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.REVIEWS_UPDATE, async (_e, gameId: string, reviewId: string, data: { rating?: number; title?: string; body?: string }) => {
    try {
      return await serverClient.updateReview(gameId, reviewId, data);
    } catch (err: any) {
      log.error('Failed to update review:', err.message);
      throw new Error(err.message || 'Failed to update review.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.REVIEWS_DELETE, async (_e, gameId: string, reviewId: string) => {
    try {
      await serverClient.deleteReview(gameId, reviewId);
    } catch (err: any) {
      log.error('Failed to delete review:', err.message);
      throw new Error('Failed to delete review.');
    }
  });
}
