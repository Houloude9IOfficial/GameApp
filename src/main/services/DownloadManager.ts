import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { pipeline } from 'stream/promises';
import { Transform, TransformCallback } from 'stream';
import log from 'electron-log';
import Store from 'electron-store';
import { ServerClient } from './ServerClient';
import { ensureDirectoryAccess } from '../utils/elevate';
import {
  DownloadTask, DownloadFileTask, DownloadProgress,
  InstalledGame, FileEntry,
} from '../../shared/types';

interface DownloadManagerConfig {
  serverClient: ServerClient;
  installDirectory: string;
  maxConcurrent: number;
  bandwidthLimit: number;
  verifyAfterDownload: boolean;
  store: Store<any>;
  onProgress: (progress: DownloadProgress) => void;
  onComplete: (task: DownloadTask) => void;
  onError: (taskId: string, error: string) => void;
}

// Throttle transform stream for bandwidth limiting
class ThrottleTransform extends Transform {
  private bytesPerSecond: number;
  private bytesThisSecond = 0;
  private lastReset = Date.now();

  constructor(bytesPerSecond: number) {
    super();
    this.bytesPerSecond = bytesPerSecond;
  }

  setBandwidth(bps: number): void {
    this.bytesPerSecond = bps;
  }

  _transform(chunk: Buffer, _encoding: string, callback: TransformCallback): void {
    if (this.bytesPerSecond <= 0) {
      this.push(chunk);
      callback();
      return;
    }

    const now = Date.now();
    if (now - this.lastReset >= 1000) {
      this.bytesThisSecond = 0;
      this.lastReset = now;
    }

    if (this.bytesThisSecond + chunk.length <= this.bytesPerSecond) {
      this.bytesThisSecond += chunk.length;
      this.push(chunk);
      callback();
    } else {
      const delay = 1000 - (now - this.lastReset);
      setTimeout(() => {
        this.bytesThisSecond = chunk.length;
        this.lastReset = Date.now();
        this.push(chunk);
        callback();
      }, Math.max(delay, 10));
    }
  }
}

export class DownloadManager {
  private config: DownloadManagerConfig;
  private queue: DownloadTask[] = [];
  private activeDownloads = new Map<string, { abort: () => void }>();
  private progressInterval: NodeJS.Timeout | null = null;
  private speedTracker = new Map<string, { bytes: number; timestamp: number }[]>();

  constructor(config: DownloadManagerConfig) {
    this.config = config;
    this.restoreState();
    this.startProgressReporting();
  }

  // ── Public API ──

  async startDownload(gameId: string, gameName: string, type: 'install' | 'update' | 'repair'): Promise<DownloadTask> {
    log.info(`Starting ${type} for ${gameId}`);

    // Prevent duplicate downloads for the same game
    const existing = this.queue.find(t => t.gameId === gameId && !['completed', 'failed', 'cancelled'].includes(t.status));
    if (existing) {
      throw new Error('Game is already in the download queue');
    }

    // Get file manifest from server
    let files: DownloadFileTask[];

    if (type === 'install') {
      const manifest = await this.config.serverClient.getFiles(gameId);
      files = manifest.files.map((f: FileEntry) => ({
        path: f.path,
        url: this.config.serverClient.getDownloadUrl(gameId, f.path),
        size: f.size,
        hash: f.hash,
        downloaded: 0,
        completed: false,
      }));
    } else {
      // Delta update or repair
      const installDir = path.join(this.config.installDirectory, gameId);
      const localFiles = await this.hashLocalFiles(installDir);
      const delta = await this.config.serverClient.getDelta(gameId, localFiles);

      const toDownload = [...delta.added, ...delta.updated];
      files = toDownload.map((f) => ({
        path: f.path,
        url: f.downloadUrl.startsWith('http') ? f.downloadUrl : `${this.config.serverClient.getBaseUrl()}${f.downloadUrl}`,
        size: f.size,
        hash: f.hash,
        downloaded: 0,
        completed: false,
      }));

      // For repair/update, also delete removed files
      if (delta.deleted.length > 0) {
        for (const entry of delta.deleted) {
          // Handle both string paths and {path: string} objects from server
          const delPath = typeof entry === 'string' ? entry : (entry as any).path;
          if (!delPath) continue;
          const fullPath = path.join(installDir, delPath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }
    }

    const task: DownloadTask = {
      id: crypto.randomBytes(16).toString('hex'),
      gameId,
      gameName,
      type,
      status: 'queued',
      files,
      totalBytes: files.reduce((sum, f) => sum + f.size, 0),
      downloadedBytes: 0,
      speed: 0,
      eta: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    this.queue.push(task);
    this.saveState();
    this.processQueue();

    return task;
  }

  async pauseDownload(taskId: string): Promise<void> {
    const task = this.queue.find(t => t.id === taskId);
    if (!task || task.status !== 'downloading') return;

    task.status = 'paused';
    const active = this.activeDownloads.get(taskId);
    if (active) {
      active.abort();
      this.activeDownloads.delete(taskId);
    }
    this.saveState();
  }

  async resumeDownload(taskId: string): Promise<void> {
    const task = this.queue.find(t => t.id === taskId);
    if (!task || task.status !== 'paused') return;

    task.status = 'queued';
    this.saveState();
    this.processQueue();
  }

  async cancelDownload(taskId: string): Promise<void> {
    const task = this.queue.find(t => t.id === taskId);
    if (!task) return;

    const active = this.activeDownloads.get(taskId);
    if (active) {
      active.abort();
      this.activeDownloads.delete(taskId);
    }

    task.status = 'cancelled';
    this.queue = this.queue.filter(t => t.id !== taskId);
    this.saveState();
    this.processQueue();
  }

  getQueue(): DownloadTask[] {
    return this.queue;
  }

  setBandwidthLimit(bytesPerSec: number): void {
    this.config.bandwidthLimit = bytesPerSec;
  }

  saveState(): void {
    const saveable = this.queue
      .filter(t => t.status !== 'cancelled')
      .map(t => ({ ...t }));
    this.config.store.set('downloadQueue', saveable);
  }

  // ── Internal ──

  private restoreState(): void {
    try {
      const saved = this.config.store.get('downloadQueue', []) as DownloadTask[];
      this.queue = saved.map(t => ({
        ...t,
        status: t.status === 'downloading' ? 'queued' : t.status,
        speed: 0,
        eta: 0,
      }));
    } catch {
      this.queue = [];
    }
  }

  private processQueue(): void {
    const activeCount = this.activeDownloads.size;
    const available = this.config.maxConcurrent - activeCount;

    if (available <= 0) return;

    const pending = this.queue.filter(t => t.status === 'queued');
    const toStart = pending.slice(0, available);

    for (const task of toStart) {
      this.executeDownload(task);
    }
  }

  private async executeDownload(task: DownloadTask): Promise<void> {
    task.status = 'downloading';
    task.startedAt = new Date().toISOString();

    const abortController = new AbortController();
    this.activeDownloads.set(task.id, {
      abort: () => abortController.abort(),
    });

    try {
      const installDir = path.join(this.config.installDirectory, task.gameId);

      // Ensure install directory is accessible (triggers UAC if needed)
      const access = await ensureDirectoryAccess(installDir);
      if (!access.success) {
        throw new Error(`Cannot access install directory: ${access.error || 'Permission denied'}`);
      }

      for (const file of task.files) {
        if (file.completed) continue;
        if (abortController.signal.aborted) break;

        await this.downloadFile(task, file, installDir, abortController.signal);
      }

      if (!abortController.signal.aborted) {
        // Verify if configured
        if (this.config.verifyAfterDownload) {
          const localFiles = await this.hashLocalFiles(installDir);
          const manifest = task.files.map(f => ({ path: f.path, hash: f.hash }));
          const mismatches = manifest.filter(m => {
            const local = localFiles.find(l => l.path === m.path);
            return !local || local.hash !== m.hash;
          });

          if (mismatches.length > 0) {
            log.warn(`Integrity check: ${mismatches.length} mismatches for ${task.gameId}`);
          }
        }

        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        task.progress = 100;

        // Save installed game metadata
        await this.saveInstalledGame(task, installDir);
        this.config.onComplete(task);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && (task.status as string) !== 'paused') {
        task.status = 'failed';
        task.error = err.message;
        this.config.onError(task.id, err.message);
        log.error(`Download failed for ${task.gameId}:`, err.message);
      }
    } finally {
      this.activeDownloads.delete(task.id);
      this.saveState();
      this.processQueue();
    }
  }

  private async downloadFile(
    task: DownloadTask,
    file: DownloadFileTask,
    installDir: string,
    signal: AbortSignal,
  ): Promise<void> {
    const filePath = path.join(installDir, file.path);
    const fileDir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Check for partial download (resume support)
    let startByte = 0;
    const tempPath = filePath + '.partial';
    if (fs.existsSync(tempPath)) {
      const stats = fs.statSync(tempPath);
      startByte = stats.size;
      file.downloaded = startByte;
    }

    // Pre-hash existing partial content before starting HTTP request (streaming to support >2 GiB)
    const hasher = crypto.createHash('sha256');
    if (startByte > 0) {
      await new Promise<void>((res, rej) => {
        const rs = fs.createReadStream(tempPath, { highWaterMark: 64 * 1024 });
        rs.on('data', (chunk: any) => hasher.update(chunk));
        rs.on('end', () => res());
        rs.on('error', rej);
      });
    }

    return new Promise((resolve, reject) => {
      const url = new URL(file.url);
      const requester = url.protocol === 'https:' ? https : http;

      const headers: Record<string, string> = {};
      if (startByte > 0) {
        headers['Range'] = `bytes=${startByte}-`;
      }
      if (this.config.serverClient) {
        // Add auth headers
        const baseUrl = this.config.serverClient.getBaseUrl();
        if (baseUrl) {
          // API key is handled through the URL construction
        }
      }

      const req = requester.get(url, { headers, signal: signal as any }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} for ${file.path}`));
          return;
        }

        const writeStream = fs.createWriteStream(tempPath, {
          flags: startByte > 0 ? 'a' : 'w',
        });

        let downloaded = startByte;

        // Optional bandwidth throttling
        let dataStream: NodeJS.ReadableStream = res;
        if (this.config.bandwidthLimit > 0) {
          const throttle = new ThrottleTransform(
            this.config.bandwidthLimit / Math.max(this.activeDownloads.size, 1)
          );
          res.pipe(throttle);
          dataStream = throttle;
        }

        dataStream.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          file.downloaded = downloaded;
          task.downloadedBytes = task.files.reduce((sum, f) => sum + f.downloaded, 0);

          // Speed tracking
          this.trackSpeed(task.id, chunk.length);

          hasher.update(chunk);
          writeStream.write(chunk);
        });

        dataStream.on('end', () => {
          writeStream.end(() => {
            // Verify hash
            const hash = hasher.digest('hex');
            if (file.hash && hash !== file.hash) {
              fs.unlinkSync(tempPath);
              reject(new Error(`Hash mismatch for ${file.path}: expected ${file.hash}, got ${hash}`));
              return;
            }

            // Rename from .partial to final
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            fs.renameSync(tempPath, filePath);
            file.completed = true;
            resolve();
          });
        });

        dataStream.on('error', (err: Error) => {
          writeStream.end();
          reject(err);
        });
      });

      req.on('error', (err: Error) => {
        if (err.name !== 'AbortError') reject(err);
      });
    });
  }

  private trackSpeed(taskId: string, bytes: number): void {
    const now = Date.now();
    let entries = this.speedTracker.get(taskId) || [];
    entries.push({ bytes, timestamp: now });
    // Keep last 5 seconds
    entries = entries.filter(e => now - e.timestamp < 5000);
    this.speedTracker.set(taskId, entries);
  }

  private calculateSpeed(taskId: string): number {
    const entries = this.speedTracker.get(taskId) || [];
    if (entries.length === 0) return 0;
    const totalBytes = entries.reduce((sum, e) => sum + e.bytes, 0);
    const timeSpan = (Date.now() - entries[0].timestamp) / 1000 || 1;
    return totalBytes / timeSpan;
  }

  private startProgressReporting(): void {
    this.progressInterval = setInterval(() => {
      for (const task of this.queue) {
        if (task.status !== 'downloading') continue;

        const speed = this.calculateSpeed(task.id);
        task.speed = speed;
        task.progress = task.totalBytes > 0
          ? Math.round((task.downloadedBytes / task.totalBytes) * 100)
          : 0;
        task.eta = speed > 0
          ? Math.round((task.totalBytes - task.downloadedBytes) / speed)
          : 0;

        const progress: DownloadProgress = {
          taskId: task.id,
          gameId: task.gameId,
          downloadedBytes: task.downloadedBytes,
          totalBytes: task.totalBytes,
          speed,
          eta: task.eta,
          progress: task.progress,
          currentFile: task.files.find(f => !f.completed && f.downloaded > 0)?.path,
          filesCompleted: task.files.filter(f => f.completed).length,
          filesTotal: task.files.length,
        };

        this.config.onProgress(progress);
      }
    }, 500);
  }

  private async hashLocalFiles(dir: string): Promise<{ path: string; hash: string }[]> {
    const results: { path: string; hash: string }[] = [];
    if (!fs.existsSync(dir)) return results;

    const hashFile = (filePath: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const h = crypto.createHash('sha256');
        const rs = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
        rs.on('data', (chunk: any) => h.update(chunk));
        rs.on('end', () => resolve(h.digest('hex')));
        rs.on('error', reject);
      });
    };

    const walk = async (currentDir: string, baseDir: string): Promise<void> => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath, baseDir);
        } else {
          const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
          const hash = await hashFile(fullPath);
          results.push({ path: relativePath, hash });
        }
      }
    };

    await walk(dir, dir);
    return results;
  }

  private async saveInstalledGame(task: DownloadTask, installDir: string): Promise<void> {
    const installed: InstalledGame = {
      gameId: task.gameId,
      version: '', // Will be filled from server data
      installPath: installDir,
      installedAt: new Date().toISOString(),
      totalSize: task.totalBytes,
      totalFiles: task.files.length,
      integrityVerified: this.config.verifyAfterDownload,
      files: task.files.map(f => ({ path: f.path, size: f.size, hash: f.hash })),
      updateHistory: [{
        version: '',
        date: new Date().toISOString(),
        type: task.type,
        filesChanged: task.files.length,
      }],
    };

    // Fetch version and executable from server
    try {
      const game = await this.config.serverClient.getGame(task.gameId);
      installed.version = game.version;
      installed.executable = game.executable;
      installed.launchArgs = game.launchArgs;
      installed.preLaunchCommand = game.preLaunchCommand;
      installed.updateHistory[0].version = game.version;

      const existing = this.config.store.get(`installedGames.${task.gameId}`) as InstalledGame | undefined;
      if (existing && task.type !== 'install') {
        installed.installedAt = existing.installedAt;
        installed.updateHistory = [
          ...existing.updateHistory,
          installed.updateHistory[0],
        ];
      }

      this.config.store.set(`installedGames.${task.gameId}`, installed);

      // Write .game metadata file in the install directory
      this.writeGameFile(installDir, installed, game);
    } catch (err: any) {
      log.warn('Failed to get game version after install:', err.message);
      this.config.store.set(`installedGames.${task.gameId}`, installed);
      this.writeGameFile(installDir, installed);
    }
  }

  private writeGameFile(installDir: string, installed: InstalledGame, game?: any): void {
    try {
      const gameFileData = {
        gameId: installed.gameId,
        name: game?.name || installed.gameId,
        version: installed.version,
        executable: installed.executable || null,
        launchArgs: installed.launchArgs || null,
        preLaunchCommand: installed.preLaunchCommand || null,
        installPath: installed.installPath,
        installedAt: installed.installedAt,
        updatedAt: installed.updatedAt || null,
        totalSize: installed.totalSize,
        totalFiles: installed.totalFiles,
        integrityVerified: installed.integrityVerified,
        developer: game?.developer || null,
        category: game?.category || null,
        tags: game?.tags || [],
      };

      const gameFilePath = path.join(installDir, `${installed.gameId}.game`);
      fs.writeFileSync(gameFilePath, JSON.stringify(gameFileData, null, 2), 'utf-8');
      log.info(`Wrote .game metadata file: ${gameFilePath}`);
    } catch (err: any) {
      log.warn(`Failed to write .game file for ${installed.gameId}:`, err.message);
    }
  }

  stopAll(): void {
    for (const [taskId, active] of this.activeDownloads) {
      active.abort();
    }
    this.activeDownloads.clear();
    if (this.progressInterval) clearInterval(this.progressInterval);
  }
}
