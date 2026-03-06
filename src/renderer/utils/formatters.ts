/**
 * Format bytes into human-readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** 
 * Format launch arguments into a user-friendly string
 * If it's a string, remove - prefix and join with commas. If it's an array, join with commas.
 */
export function formatLaunchArgs(args: string | string[]): string {
  if (typeof args === 'string') {
    return args.split(' ').map(arg => arg.replace(/^-+/, '')).join(', ');
  } else {
    return args.join(', ');
  }
}

/**
 * Format seconds into human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Format play time into friendly string
 */
export function formatPlayTime(totalSeconds: number): string {
  if (totalSeconds < 60) return 'Less than a minute';
  if (totalSeconds < 3600) return `${Math.round(totalSeconds / 60)} minutes`;
  const hours = Math.round(totalSeconds / 3600 * 10) / 10;
  return `${hours} hours`;
}

/**
 * Format speed (bytes/sec) into readable format
 */
export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

/**
 * Format ETA from seconds
 */
export function formatETA(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '--';
  return formatDuration(seconds);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a percentage string
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format an ISO date string to a readable date (e.g. "Nov 5, 2019")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a game state enum to a user-friendly label
 */
export function formatGameState(state: string): string {
  const labels: Record<string, string> = {
    'released': 'Released',
    'coming-soon': 'Coming Soon',
    'early-access': 'Early Access',
    'not-available': 'Not Available',
  };
  return labels[state] || state;
}

/**
 * Check if a game is available for download/installation.
 * Games that are "coming-soon" or "not-available" cannot be installed.
 */
export function isGameAvailable(gameState?: string): boolean {
  if (!gameState) return true; // default = released
  return gameState === 'released' || gameState === 'early-access';
}

/**
 * Calculate countdown to a release date.
 * Returns null if the date is in the past or invalid.
 */
export function getCountdown(releaseDate?: string): { days: number; hours: number; minutes: number; seconds: number; total: number } | null {
  if (!releaseDate) return null;
  const target = new Date(releaseDate).getTime();
  if (isNaN(target)) return null;
  const now = Date.now();
  const total = target - now;
  if (total <= 0) return null;
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
}

/**
 * Format a countdown into a human-readable string.
 */
export function formatCountdown(countdown: { days: number; hours: number; minutes: number; seconds: number }): string {
  const parts: string[] = [];
  if (countdown.days > 0) parts.push(`${countdown.days}d`);
  if (countdown.hours > 0) parts.push(`${countdown.hours}h`);
  if (countdown.minutes > 0) parts.push(`${countdown.minutes}m`);
  if (parts.length === 0) parts.push(`${countdown.seconds}s`);
  return parts.join(' ');
}
