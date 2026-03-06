import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import log from 'electron-log';
import {
  Game, ServerHealth, ServerInfo, FileEntry, DeltaResult,
  Tag, Category, AuthState, OwnedGame,
} from '../../shared/types';

export interface ServerClientConfig {
  baseUrl: string;
  apiKey?: string;
  authToken?: string;
  timeout?: number;
}

export class ServerClient {
  private client: AxiosInstance;
  private config: ServerClientConfig;

  constructor(config: ServerClientConfig) {
    this.config = config;
    this.client = this.createClient(config);
  }

  private createClient(config: ServerClientConfig): AxiosInstance {
    const headers: Record<string, string> = {};
    if (config.apiKey) headers['x-api-key'] = config.apiKey;
    if (config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;

    return axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers,
    });
  }

  updateConfig(config: Partial<ServerClientConfig>): void {
    this.config = { ...this.config, ...config };
    this.client = this.createClient(this.config);
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Resolve relative branding URLs (e.g. /api/games/…) to full URLs
   * so the renderer can load them directly in <img> tags.
   */
  private resolveGameUrls(game: Game): Game {
    if (!game.brandingUrls) return game;
    const base = this.config.baseUrl.replace(/\/+$/, '');
    const resolve = (url?: string) => url && url.startsWith('/') ? `${base}${url}` : url;
    return {
      ...game,
      brandingUrls: {
        logo: resolve(game.brandingUrls.logo),
        banner: resolve(game.brandingUrls.banner),
        capsule: resolve(game.brandingUrls.capsule),
        icon: resolve(game.brandingUrls.icon),
        video: resolve(game.brandingUrls.video),
        screenshots: game.brandingUrls.screenshots?.map(s => resolve(s)!),
      },
    };
  }

  // ── Health & Info ──

  async health(): Promise<ServerHealth> {
    const { data } = await this.client.get('/api/health');
    return data;
  }

  async info(): Promise<ServerInfo> {
    const { data } = await this.client.get('/api/info');
    return data;
  }

  async testConnection(url?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const testUrl = url || this.config.baseUrl;
      await axios.get(`${testUrl}/api/health`, { timeout: 5000 });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  }

  // ── Games ──

  async getGames(fields?: string): Promise<{ games: Game[]; total: number }> {
    const params: Record<string, string> = {};
    if (fields) params.fields = fields;
    const { data } = await this.client.get('/api/games', { params });
    return {
      ...data,
      games: (data.games || []).map((g: Game) => this.resolveGameUrls(g)),
    };
  }

  async getGame(id: string): Promise<Game> {
    const { data } = await this.client.get(`/api/games/${id}`);
    return this.resolveGameUrls(data);
  }

  async searchGames(params: Record<string, string>): Promise<{ results: Game[]; total: number }> {
    const { data } = await this.client.get('/api/games/search', { params });
    return {
      ...data,
      results: (data.results || []).map((g: Game) => this.resolveGameUrls(g)),
    };
  }

  async getTags(): Promise<{ tags: Tag[] }> {
    const { data } = await this.client.get('/api/tags');
    return data;
  }

  async getCategories(): Promise<{ categories: Category[] }> {
    const { data } = await this.client.get('/api/categories');
    return data;
  }

  async checkVersion(gameId: string, currentVersion: string): Promise<{
    updateAvailable: boolean;
    latestVersion: string;
    currentVersion: string;
    totalSize: number;
  }> {
    const { data } = await this.client.get(`/api/games/${gameId}/version`, {
      params: { current: currentVersion },
    });
    return data;
  }

  // ── Files ──

  async getFiles(gameId: string): Promise<{ files: FileEntry[]; totalSize: number; totalFiles: number }> {
    const { data } = await this.client.get(`/api/games/${gameId}/files`);
    return data;
  }

  async getDelta(gameId: string, localFiles: { path: string; hash: string }[]): Promise<DeltaResult> {
    const { data } = await this.client.post(`/api/games/${gameId}/delta`, { files: localFiles });
    return data;
  }

  // ── Downloads (raw streams) ──

  async downloadFile(gameId: string, filePath: string, options?: {
    rangeStart?: number;
    rangeEnd?: number;
    onProgress?: (downloaded: number) => void;
  }): Promise<NodeJS.ReadableStream> {
    const headers: Record<string, string> = {};
    if (options?.rangeStart !== undefined) {
      headers['Range'] = `bytes=${options.rangeStart}-${options.rangeEnd || ''}`;
    }

    const response = await this.client.get(`/api/games/${gameId}/download/${filePath}`, {
      responseType: 'stream',
      headers,
    });

    return response.data;
  }

  getDownloadUrl(gameId: string, filePath: string): string {
    return `${this.config.baseUrl}/api/games/${gameId}/download/${filePath}`;
  }

  getBrandingUrl(gameId: string, asset: string): string {
    return `${this.config.baseUrl}/api/games/${gameId}/branding/${asset}`;
  }

  // ── Download Sessions ──

  async createDownloadSession(gameId: string, clientId?: string): Promise<any> {
    const { data } = await this.client.post('/api/downloads', { gameId, clientId });
    return data;
  }

  async updateDownloadSession(sessionId: string, update: any): Promise<any> {
    const { data } = await this.client.patch(`/api/downloads/${sessionId}`, update);
    return data;
  }

  // ── Auth ──

  async register(username: string, password: string): Promise<AuthState> {
    try {
      const { data } = await this.client.post('/api/auth/register', { username, password });
      if (data.token) {
        this.updateConfig({ authToken: data.token });
      }
      return {
        isAuthenticated: true,
        username: data.user.username,
        token: data.token,
        expiresAt: data.expiresAt,
      };
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      log.error('Registration failed:', msg);
      throw new Error(msg);
    }
  }

  async login(username: string, password: string): Promise<AuthState> {
    try {
      const { data } = await this.client.post('/api/auth/login', { username, password });
      if (data.token) {
        this.updateConfig({ authToken: data.token });
      }
      return {
        isAuthenticated: true,
        username: data.user.username,
        token: data.token,
        expiresAt: data.expiresAt,
      };
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      log.error('Login failed:', msg);
      throw new Error(msg);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } catch {
      // silent
    }
    this.updateConfig({ authToken: undefined });
  }

  async deleteAccount(): Promise<void> {
    await this.client.delete('/api/auth/account');
    this.updateConfig({ authToken: undefined });
  }

  async verifyAuth(): Promise<{ valid: boolean; username?: string }> {
    try {
      const { data } = await this.client.get('/api/auth/verify');
      return { valid: true, username: data.user?.username };
    } catch {
      return { valid: false };
    }
  }

  // ── Library / Ownership ──

  async getOwnedGames(): Promise<OwnedGame[]> {
    const { data } = await this.client.get('/api/auth/library');
    return data.ownedGames || [];
  }

  async addGameToLibrary(gameId: string): Promise<{ ok: boolean; alreadyOwned: boolean }> {
    const { data } = await this.client.post(`/api/auth/library/${encodeURIComponent(gameId)}`, {});
    return data;
  }

  async removeGameFromLibrary(gameId: string): Promise<void> {
    await this.client.delete(`/api/auth/library/${encodeURIComponent(gameId)}`);
  }

  async ownsGame(gameId: string): Promise<boolean> {
    const { data } = await this.client.get(`/api/auth/owns/${encodeURIComponent(gameId)}`);
    return data.owns;
  }

  // ── Patch Notes ──

  async getPatchNotes(gameId: string): Promise<any> {
    try {
      const { data } = await this.client.get(`/api/games/${gameId}/patchnotes`);
      return data;
    } catch {
      return { patchNotes: [] };
    }
  }

  // ── Library Sync ──

  async syncLibrary(libraryData: any): Promise<void> {
    try {
      await this.client.put('/api/library', libraryData);
    } catch (err: any) {
      log.warn('Library sync failed:', err.message);
    }
  }

  async getLibrary(): Promise<any> {
    try {
      const { data } = await this.client.get('/api/library');
      return data;
    } catch {
      return null;
    }
  }

  // ── Launcher Version ──

  async getLauncherVersion(): Promise<{ version: string; downloadUrl?: string } | null> {
    try {
      const { data } = await this.client.get('/api/launcher/version');
      return data;
    } catch {
      return null;
    }
  }

  // ── Notifications ──

  async getNotifications(opts?: { unread?: boolean; limit?: number }): Promise<any[]> {
    const params: Record<string, string> = {};
    if (opts?.unread) params.unread = 'true';
    if (opts?.limit) params.limit = String(opts.limit);
    const { data } = await this.client.get('/api/notifications', { params });
    return data.notifications || [];
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.client.patch(`/api/notifications/${encodeURIComponent(id)}/read`);
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.client.post('/api/notifications/read-all');
  }

  async dismissNotification(id: string): Promise<void> {
    await this.client.delete(`/api/notifications/${encodeURIComponent(id)}`);
  }

  // ── Reviews ──

  async getReviews(gameId: string, opts?: { sort?: string; page?: number; limit?: number }): Promise<{ reviews: any[]; total: number }> {
    const params: Record<string, string> = {};
    if (opts?.sort) params.sort = opts.sort;
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);
    const { data } = await this.client.get(`/api/games/${encodeURIComponent(gameId)}/reviews`, { params });
    return data;
  }

  async getReviewSummary(gameId: string): Promise<any> {
    const { data } = await this.client.get(`/api/games/${encodeURIComponent(gameId)}/reviews/summary`);
    return data;
  }

  async createReview(gameId: string, reviewData: { rating: number; title?: string; body?: string }): Promise<any> {
    const { data } = await this.client.post(`/api/games/${encodeURIComponent(gameId)}/reviews`, reviewData);
    return data;
  }

  async updateReview(gameId: string, reviewId: string, reviewData: { rating?: number; title?: string; body?: string }): Promise<any> {
    const { data } = await this.client.put(`/api/games/${encodeURIComponent(gameId)}/reviews/${encodeURIComponent(reviewId)}`, reviewData);
    return data;
  }

  async deleteReview(gameId: string, reviewId: string): Promise<void> {
    await this.client.delete(`/api/games/${encodeURIComponent(gameId)}/reviews/${encodeURIComponent(reviewId)}`);
  }

  // ── Social ──

  async getFriends(): Promise<any[]> {
    const { data } = await this.client.get('/api/social/friends');
    return data.friends || [];
  }

  async sendFriendRequest(username: string): Promise<void> {
    await this.client.post('/api/social/friends/request', { username });
  }

  async acceptFriendRequest(friendshipId: string): Promise<void> {
    await this.client.post(`/api/social/friends/${encodeURIComponent(friendshipId)}/accept`);
  }

  async removeFriend(friendshipId: string): Promise<void> {
    await this.client.delete(`/api/social/friends/${encodeURIComponent(friendshipId)}`);
  }

  async blockUser(friendshipId: string): Promise<void> {
    await this.client.post(`/api/social/friends/${encodeURIComponent(friendshipId)}/block`);
  }

  async getFriendRequests(): Promise<any[]> {
    const { data } = await this.client.get('/api/social/friends/requests');
    return data.requests || [];
  }

  async updateUserStatus(status: string, gameId?: string): Promise<void> {
    await this.client.put('/api/social/status', { status, gameId });
  }

  async searchUsers(query: string): Promise<{ id: string; username: string }[]> {
    const { data } = await this.client.get('/api/social/users/search', { params: { q: query } });
    return data.users || [];
  }
}
