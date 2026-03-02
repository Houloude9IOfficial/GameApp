import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import Store from 'electron-store';
import { GamePlayStats, PlaySession } from '../../shared/types';

interface GameLauncherConfig {
  store: Store<any>;
}

interface RunningGame {
  gameId: string;
  process: ChildProcess;
  pid: number;
  startedAt: string;
}

export class GameLauncher {
  private config: GameLauncherConfig;
  private running = new Map<string, RunningGame>();

  constructor(config: GameLauncherConfig) {
    this.config = config;
  }

  async launch(gameId: string, executablePath: string, installDir: string, launchArgs?: string, preLaunchCommand?: string): Promise<void> {
    if (this.running.has(gameId)) {
      throw new Error(`${gameId} is already running`);
    }

    const fullExePath = path.join(installDir, executablePath);
    if (!fs.existsSync(fullExePath)) {
      throw new Error(`Executable not found: ${fullExePath}`);
    }

    // Pre-launch command
    if (preLaunchCommand) {
      log.info(`Running pre-launch command for ${gameId}: ${preLaunchCommand}`);
      await new Promise<void>((resolve, reject) => {
        const pre = spawn(preLaunchCommand, { shell: true, cwd: installDir });
        pre.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Pre-launch command exited with code ${code}`));
        });
        pre.on('error', reject);
      });
    }

    // Parse launch args
    const args = launchArgs ? launchArgs.split(/\s+/) : [];

    log.info(`Launching ${gameId}: ${fullExePath} ${args.join(' ')}`);

    const child = spawn(fullExePath, args, {
      cwd: installDir,
      detached: true,
      stdio: 'ignore',
    });

    child.unref();

    const runningGame: RunningGame = {
      gameId,
      process: child,
      pid: child.pid || 0,
      startedAt: new Date().toISOString(),
    };

    this.running.set(gameId, runningGame);

    // Track when game exits
    child.on('exit', () => {
      this.onGameExit(gameId);
    });

    child.on('error', (err) => {
      log.error(`Game ${gameId} error:`, err.message);
      this.onGameExit(gameId);
    });
  }

  private onGameExit(gameId: string): void {
    const game = this.running.get(gameId);
    if (!game) return;

    const endTime = new Date().toISOString();
    const startTime = new Date(game.startedAt).getTime();
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);

    // Record play session
    const session: PlaySession = {
      gameId,
      startedAt: game.startedAt,
      endedAt: endTime,
      durationSeconds,
    };

    const stats = this.config.store.get(`playStats.${gameId}`, {
      gameId,
      totalPlayTimeSeconds: 0,
      sessions: [],
    }) as GamePlayStats;

    stats.totalPlayTimeSeconds += durationSeconds;
    stats.lastPlayedAt = endTime;
    stats.sessions.push(session);

    // Keep last 100 sessions
    if (stats.sessions.length > 100) {
      stats.sessions = stats.sessions.slice(-100);
    }

    this.config.store.set(`playStats.${gameId}`, stats);

    this.running.delete(gameId);
    log.info(`Game ${gameId} exited after ${durationSeconds}s`);
  }

  isRunning(gameId: string): boolean {
    return this.running.has(gameId);
  }

  getStatus(gameId: string): { running: boolean; pid?: number; startedAt?: string } {
    const game = this.running.get(gameId);
    if (!game) return { running: false };
    return { running: true, pid: game.pid, startedAt: game.startedAt };
  }

  getPlayStats(gameId: string): GamePlayStats {
    return this.config.store.get(`playStats.${gameId}`, {
      gameId,
      totalPlayTimeSeconds: 0,
      sessions: [],
    }) as GamePlayStats;
  }

  async stop(gameId: string): Promise<void> {
    const game = this.running.get(gameId);
    if (!game) return;

    try {
      game.process.kill();
    } catch (err: any) {
      log.warn(`Failed to kill ${gameId}:`, err.message);
    }
  }

  /**
   * Record play sessions for all running games without killing them.
   * Called when the launcher is closing so games keep running.
   */
  recordAllSessions(): void {
    for (const [gameId, game] of this.running) {
      const endTime = new Date().toISOString();
      const startTime = new Date(game.startedAt).getTime();
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);

      const session: PlaySession = {
        gameId,
        startedAt: game.startedAt,
        endedAt: endTime,
        durationSeconds,
      };

      const stats = this.config.store.get(`playStats.${gameId}`, {
        gameId,
        totalPlayTimeSeconds: 0,
        sessions: [],
      }) as GamePlayStats;

      stats.totalPlayTimeSeconds += durationSeconds;
      stats.lastPlayedAt = endTime;
      stats.sessions.push(session);

      if (stats.sessions.length > 100) {
        stats.sessions = stats.sessions.slice(-100);
      }

      this.config.store.set(`playStats.${gameId}`, stats);
      log.info(`Recorded session for ${gameId} (${durationSeconds}s) — game keeps running`);
    }
    this.running.clear();
  }

  stopAll(): void {
    for (const [gameId] of this.running) {
      this.stop(gameId);
    }
  }
}
