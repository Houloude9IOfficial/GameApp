import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import log from 'electron-log';
import {
  Game, ServerHealth, ServerInfo, FileEntry, DeltaResult,
  Tag, Category, AuthState,
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

  async authenticateWithCode(code: string): Promise<AuthState> {
    try {
      const { data } = await this.client.post('/api/auth/token', { code });
      if (data.token) {
        this.updateConfig({ authToken: data.token });
      }
      return {
        isAuthenticated: true,
        username: data.username,
        token: data.token,
        expiresAt: data.expiresAt,
      };
    } catch (err: any) {
      log.error('Auth failed:', err.message);
      return { isAuthenticated: false };
    }
  }

  async verifyAuth(): Promise<boolean> {
    try {
      await this.client.get('/api/auth/verify');
      return true;
    } catch {
      return false;
    }
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
}
