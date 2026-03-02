import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import log from 'electron-log';

/**
 * Checks if a directory exists and is writable by the current user.
 */
export function isDirectoryWritable(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) return false;
    const testFile = path.join(dirPath, '.gl-write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the current Windows username in DOMAIN\User format for ACL rules.
 */
function getCurrentIdentity(): string {
  try {
    const output = execSync('whoami', { encoding: 'utf-8' }).trim();
    return output;
  } catch {
    return os.userInfo().username;
  }
}

/**
 * Ensures a directory exists and is writable.
 * First attempts normal creation. If that fails (e.g. Program Files),
 * triggers a UAC elevation prompt to create the directory and grant
 * the current user full control.
 *
 * Uses a .bat + .vbs approach so the UAC dialog shows
 * "Game Launcher Setup" instead of "powershell.exe".
 */
export async function ensureDirectoryAccess(dirPath: string): Promise<{ success: boolean; error?: string }> {
  // 1. Try normal creation
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const testFile = path.join(dirPath, '.gl-write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    log.info(`Directory accessible without elevation: ${dirPath}`);
    return { success: true };
  } catch {
    log.info(`Directory requires elevation: ${dirPath}`);
  }

  // 2. Elevate via UAC using a .bat + .vbs approach
  //    The .bat file does the actual work (mkdir + icacls).
  //    The .vbs file launches it elevated via ShellExecute "runas".
  //    UAC dialog will show the .bat description, not "powershell.exe".
  const ts = Date.now();
  const identity = getCurrentIdentity();
  const batPath = path.join(os.tmpdir(), `gl-setup-${ts}.bat`);
  const vbsPath = path.join(os.tmpdir(), `gl-setup-${ts}.vbs`);
  const donePath = path.join(os.tmpdir(), `gl-setup-${ts}.done`);

  // Batch script: create directory and grant the current user full control
  const batContent = [
    '@echo off',
    `mkdir "${dirPath}" 2>nul`,
    `icacls "${dirPath}" /grant "${identity}:(OI)(CI)F" /T /Q`,
    `echo done > "${donePath}"`,
  ].join('\r\n');

  // VBScript: launch the .bat elevated with a UAC prompt
  // The UAC dialog will show the .bat file path as the program requesting elevation
  const vbsContent = [
    `Set objShell = CreateObject("Shell.Application")`,
    `objShell.ShellExecute "${batPath}", "", "", "runas", 0`,
  ].join('\r\n');

  fs.writeFileSync(batPath, batContent, 'utf-8');
  fs.writeFileSync(vbsPath, vbsContent, 'utf-8');

  return new Promise((resolve) => {
    const child = spawn('wscript.exe', [vbsPath], {
      shell: false,
      windowsHide: true,
    });

    child.on('close', () => {
      // The VBS script exits immediately after launching the elevated .bat.
      // We need to wait for the .bat to finish (indicated by the .done sentinel file).
      const maxWait = 30000;
      const interval = 250;
      let waited = 0;

      const poll = setInterval(() => {
        waited += interval;

        if (fs.existsSync(donePath)) {
          clearInterval(poll);
          cleanup();

          if (fs.existsSync(dirPath) && isDirectoryWritable(dirPath)) {
            log.info(`Directory created with elevation: ${dirPath}`);
            resolve({ success: true });
          } else if (fs.existsSync(dirPath)) {
            log.warn(`Directory created but still not writable: ${dirPath}`);
            resolve({ success: false, error: 'Directory was created but write access was not granted. Try running the app as administrator.' });
          } else {
            resolve({ success: false, error: 'Elevation completed but directory was not created.' });
          }
        } else if (waited >= maxWait) {
          clearInterval(poll);
          cleanup();
          resolve({ success: false, error: 'Permission elevation was cancelled or timed out.' });
        }
      }, interval);
    });

    child.on('error', (err) => {
      cleanup();
      log.error('Elevation spawn error:', err.message);
      resolve({ success: false, error: `Failed to request permissions: ${err.message}` });
    });

    function cleanup(): void {
      try { fs.unlinkSync(batPath); } catch {}
      try { fs.unlinkSync(vbsPath); } catch {}
      try { fs.unlinkSync(donePath); } catch {}
    }
  });
}
