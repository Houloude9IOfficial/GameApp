/**
 * build-installer.js — Build a branded NSIS setup.exe for the Game Launcher.
 *
 * Usage:
 *   node scripts/build-installer.js                     # uses scripts/build-config.json
 *   node scripts/build-installer.js --config my.json    # custom config path
 *
 * The script:
 *   1. Reads a build-config.json with branding / server settings
 *   2. Patches package.json and defaults.json in-place
 *   3. Runs `npm run build` then `npx electron-builder --win nsis`
 *   4. Restores the original files regardless of success or failure
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const PKG_PATH = path.join(ROOT, "package.json");
const DEFAULTS_PATH = path.join(ROOT, "defaults.json");
const PKG_BACKUP = PKG_PATH + ".backup";
const DEFAULTS_BACKUP = DEFAULTS_PATH + ".backup";

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}

function backup(src) {
  fs.copyFileSync(src, src + ".backup");
}

function restore(src) {
  const bak = src + ".backup";
  if (fs.existsSync(bak)) {
    fs.copyFileSync(bak, src);
    fs.unlinkSync(bak);
  }
}

function fatal(msg) {
  console.error(`\n  ERROR: ${msg}\n`);
  process.exit(1);
}

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

// ── Parse CLI args ───────────────────────────────────────────────────────────

function getConfigPath() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--config");
  if (idx !== -1 && args[idx + 1]) {
    return path.resolve(args[idx + 1]);
  }
  return path.join(__dirname, "build-config.json");
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    fatal(
      `Config file not found: ${configPath}\n` +
      `  Copy scripts/build-config.example.json to scripts/build-config.json and edit it.`
    );
  }

  const cfg = readJSON(configPath);
  console.log(`\n  Building installer with config: ${configPath}`);
  console.log(`  App name   : ${cfg.appName || "Game Launcher"}`);
  console.log(`  App ID     : ${cfg.appId || "com.gamelauncher.app"}`);
  console.log(`  Version    : ${cfg.version || "1.0.0"}`);
  console.log(`  Author     : ${cfg.author || ""}`);
  console.log(`  Server URL : ${cfg.serverUrl || "(default)"}`);
  console.log(`  Output dir : ${cfg.outputDir || "release"}`);

  // Validate icon
  const iconPath = cfg.icon
    ? path.resolve(ROOT, cfg.icon)
    : path.join(ROOT, "src", "renderer", "assets", "favicon.ico");

  if (!fs.existsSync(iconPath)) {
    fatal(`Icon file not found: ${iconPath}`);
  }
  if (!iconPath.endsWith(".ico")) {
    fatal(`Icon must be a .ico file (got ${path.basename(iconPath)}). Convert your image to ICO format first.`);
  }

  // ── Backup originals ────────────────────────────────────────────────────
  backup(PKG_PATH);
  backup(DEFAULTS_PATH);
  console.log("\n  Originals backed up.");

  try {
    // ── Patch package.json ───────────────────────────────────────────────
    const pkg = readJSON(PKG_PATH);

    if (cfg.appName) pkg.name = cfg.appName.toLowerCase().replace(/\s+/g, "-");
    if (cfg.version) pkg.version = cfg.version;
    if (cfg.author) pkg.author = cfg.author;
    if (cfg.description) pkg.description = cfg.description;

    pkg.build = pkg.build || {};
    if (cfg.appId) pkg.build.appId = cfg.appId;
    if (cfg.appName) pkg.build.productName = cfg.appName;
    if (cfg.outputDir) pkg.build.directories = { output: cfg.outputDir };

    pkg.build.files = pkg.build.files || ["dist/**/*", "defaults.json"];

    // Windows target
    pkg.build.win = pkg.build.win || {};
    pkg.build.win.target = ["nsis"];
    pkg.build.win.icon = path.relative(ROOT, iconPath).replace(/\\/g, "/");

    // NSIS options
    const nsis = cfg.installer || {};
    pkg.build.nsis = {
      oneClick: nsis.oneClick !== undefined ? nsis.oneClick : false,
      allowToChangeInstallationDirectory:
        nsis.allowToChangeInstallationDirectory !== undefined
          ? nsis.allowToChangeInstallationDirectory
          : true,
      createDesktopShortcut:
        nsis.createDesktopShortcut !== undefined ? nsis.createDesktopShortcut : true,
      createStartMenuShortcut:
        nsis.createStartMenuShortcut !== undefined ? nsis.createStartMenuShortcut : true,
    };

    if (nsis.license) {
      const licensePath = path.resolve(ROOT, nsis.license);
      if (!fs.existsSync(licensePath)) {
        fatal(`License file not found: ${licensePath}`);
      }
      pkg.build.nsis.license = path.relative(ROOT, licensePath).replace(/\\/g, "/");
    }

    if (nsis.installerIcon) {
      pkg.build.nsis.installerIcon = path.relative(ROOT, path.resolve(ROOT, nsis.installerIcon)).replace(/\\/g, "/");
    }
    if (nsis.uninstallerIcon) {
      pkg.build.nsis.uninstallerIcon = path.relative(ROOT, path.resolve(ROOT, nsis.uninstallerIcon)).replace(/\\/g, "/");
    }
    if (nsis.installerHeaderIcon) {
      pkg.build.nsis.installerHeaderIcon = path.relative(ROOT, path.resolve(ROOT, nsis.installerHeaderIcon)).replace(/\\/g, "/");
    }

    writeJSON(PKG_PATH, pkg);
    console.log("  package.json patched.");

    // ── Patch defaults.json ──────────────────────────────────────────────
    const defaults = readJSON(DEFAULTS_PATH);

    if (cfg.serverUrl) defaults.serverUrl = cfg.serverUrl;
    if (cfg.apiKey !== undefined) defaults.apiKey = cfg.apiKey;

    defaults.locked = defaults.locked || {};
    if (cfg.lockServerUrl !== undefined) defaults.locked.serverUrl = cfg.lockServerUrl;
    if (cfg.lockApiKey !== undefined) defaults.locked.apiKey = cfg.lockApiKey;

    writeJSON(DEFAULTS_PATH, defaults);
    console.log("  defaults.json patched.");

    // ── Build ────────────────────────────────────────────────────────────
    console.log("\n  Step 1/2: Building app...\n");
    run("npm run build");

    console.log("\n  Step 2/2: Packaging installer...\n");
    run("npx electron-builder --win nsis");

    const outDir = path.join(ROOT, cfg.outputDir || "release");
    console.log(`\n  Done! Installer written to: ${outDir}\n`);
  } finally {
    // ── Restore originals (always) ─────────────────────────────────────
    restore(PKG_PATH);
    restore(DEFAULTS_PATH);
    console.log("  Original package.json and defaults.json restored.\n");
  }
}

main();
