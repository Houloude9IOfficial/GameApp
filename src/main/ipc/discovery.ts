import { IpcMain } from 'electron';
import axios from 'axios';
import * as os from 'os';
import * as net from 'net';
import { exec } from 'child_process';
import log from 'electron-log';
import { IPC_CHANNELS, DiscoveredServer } from '../../shared/types';

const DEFAULT_PORTS = [3000];
const TCP_TIMEOUT = 800;    // ms — TCP connect check (needs margin for ARP + firewall)
const HTTP_TIMEOUT = 2500;  // ms — HTTP health check (only for open ports)
const TCP_BATCH = 100;      // concurrent TCP probes

// Common private subnets to always try as fallback
const FALLBACK_SUBNETS = [
  '192.168.0',
  '192.168.1',
  '192.168.2',
  '192.168.10',
  '192.168.100',
  '10.0.0',
  '10.0.1',
];

/**
 * Get all local IPv4 subnets from network interfaces.
 * Properly handles netmasks and skips link-local (APIPA) addresses.
 */
function getLocalSubnets(): { subnets: Set<string>; localIps: Set<string> } {
  const interfaces = os.networkInterfaces();
  const subnets = new Set<string>();
  const localIps = new Set<string>(['127.0.0.1']);

  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name];
    if (!addrs) continue;
    for (const addr of addrs) {
      // Handle both string 'IPv4' and numeric 4
      const isV4 = addr.family === 'IPv4' || (addr.family as any) === 4;
      if (!isV4 || addr.internal) continue;

      // Skip APIPA / link-local (169.254.x.x) — not routable
      if (addr.address.startsWith('169.254.')) continue;

      localIps.add(addr.address);

      // Calculate subnet base from address + netmask
      const ipParts = addr.address.split('.').map(Number);
      const maskParts = (addr.netmask || '255.255.255.0').split('.').map(Number);

      // For /24 and smaller, derive the /24 subnet base
      if (maskParts[2] === 255) {
        subnets.add(`${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`);
      } else {
        // For larger subnets (/16, /20, etc.), add common sub-ranges
        // around the host's own address to keep scan manageable
        const base2 = ipParts[2];
        for (let offset = -2; offset <= 2; offset++) {
          const octet3 = base2 + offset;
          if (octet3 >= 0 && octet3 <= 255) {
            subnets.add(`${ipParts[0]}.${ipParts[1]}.${octet3}`);
          }
        }
      }

      log.info(`  Interface "${name}": ${addr.address}/${addr.netmask}`);
    }
  }

  return { subnets, localIps };
}

/**
 * Parse the OS ARP table to find known hosts on the network.
 * These are hosts the machine has recently communicated with,
 * making them high-priority scan targets.
 */
function getArpHosts(): Promise<string[]> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'arp -a' : 'arp -an';
    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve([]);
        return;
      }
      const ips = new Set<string>();
      // Match IPv4 addresses in ARP output
      const regex = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(stdout)) !== null) {
        const ip = match[1];
        // Skip broadcast (.255), network (.0), multicast (224+), and APIPA
        const parts = ip.split('.').map(Number);
        if (
          parts[3] !== 255 &&
          parts[3] !== 0 &&
          parts[0] < 224 &&
          !ip.startsWith('169.254.') &&
          ip !== '127.0.0.1'
        ) {
          ips.add(ip);
        }
      }
      resolve(Array.from(ips));
    });
  });
}

/**
 * Fast TCP port check — returns true if the port is open.
 */
function isPortOpen(ip: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (open: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(TCP_TIMEOUT);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, ip);
  });
}

/**
 * HTTP health-check a confirmed-open host.
 */
async function probeServer(url: string): Promise<DiscoveredServer | null> {
  const start = Date.now();
  try {
    const { data } = await axios.get(`${url}/api/health`, {
      timeout: HTTP_TIMEOUT,
      validateStatus: (s) => s === 200,
    });
    const latency = Date.now() - start;

    if (data && data.status === 'ok') {
      let name: string | undefined;
      try {
        const infoRes = await axios.get(`${url}/api/info`, { timeout: HTTP_TIMEOUT });
        name = infoRes.data?.name;
      } catch {
        // info endpoint is optional
      }
      return {
        url,
        name: name || undefined,
        version: data.version,
        gamesCount: data.gamesCount,
        latency,
      };
    }
  } catch {
    // Not a GameServer
  }
  return null;
}

/**
 * Run functions in batches.
 */
async function batchRun<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map((fn) => fn()));
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(r.value);
    }
  }
  return results;
}

export function registerDiscoveryHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.SERVER_SCAN_LAN,
    async (_e, ports?: number[]): Promise<DiscoveredServer[]> => {
      const scanPorts = ports && ports.length > 0 ? ports : DEFAULT_PORTS;
      const { subnets, localIps } = getLocalSubnets();

      // Add fallback subnets (common home/office ranges)
      for (const fb of FALLBACK_SUBNETS) {
        subnets.add(fb);
      }

      log.info(`LAN scan — subnets: [${Array.from(subnets).join(', ')}], ports: [${scanPorts.join(', ')}]`);

      // ── Phase 0: Get ARP table for high-priority targets ──
      const arpHosts = await getArpHosts();
      log.info(`LAN scan: ${arpHosts.length} host(s) from ARP table`);

      // Build unique set of IPs to probe
      const allIps = new Set<string>();
      allIps.add('127.0.0.1');

      // ARP hosts first (most likely to respond)
      for (const ip of arpHosts) {
        allIps.add(ip);
      }

      // Full subnet sweep
      for (const subnet of subnets) {
        for (let host = 1; host <= 254; host++) {
          allIps.add(`${subnet}.${host}`);
        }
      }

      // Remove local machine IPs (no point scanning ourselves)
      for (const lip of localIps) {
        // Keep localhost, remove other local IPs
        if (lip !== '127.0.0.1') allIps.delete(lip);
      }

      // Build targets: each IP × each port
      const targets: { ip: string; port: number }[] = [];
      for (const ip of allIps) {
        for (const port of scanPorts) {
          targets.push({ ip, port });
        }
      }

      log.info(`LAN scan: TCP-probing ${targets.length} addresses...`);

      // ── Phase 1: fast TCP port scan ──
      const openHosts = await batchRun(
        targets.map((t) => async () => {
          const open = await isPortOpen(t.ip, t.port);
          return open ? t : null;
        }),
        TCP_BATCH,
      );

      const confirmed = openHosts.filter(
        (t): t is { ip: string; port: number } => t !== null,
      );

      log.info(`LAN scan: ${confirmed.length} open port(s) found, running health checks...`);

      // ── Phase 2: HTTP health check only on open ports ──
      const servers = await Promise.all(
        confirmed.map((t) => probeServer(`http://${t.ip}:${t.port}`)),
      );

      // De-duplicate by URL
      const seen = new Set<string>();
      const unique: DiscoveredServer[] = [];
      for (const server of servers) {
        if (server && !seen.has(server.url)) {
          seen.add(server.url);
          unique.push(server);
        }
      }

      // Sort by latency (fastest first)
      unique.sort((a, b) => a.latency - b.latency);

      log.info(`LAN scan complete — found ${unique.length} server(s)`);
      return unique;
    },
  );
}
