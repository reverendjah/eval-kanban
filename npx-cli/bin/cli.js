#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const { ensureBinary, getLatestRelease, CACHE_DIR } = require('./download');

const CLI_VERSION = require('../package.json').version;

function getEffectiveArch() {
  const platform = process.platform;
  const nodeArch = process.arch;

  if (platform === 'darwin') {
    if (nodeArch === 'arm64') return 'arm64';
    try {
      const translated = execSync('sysctl -in sysctl.proc_translated', {
        encoding: 'utf8',
      }).trim();
      if (translated === '1') return 'arm64';
    } catch {}
    return 'x64';
  }

  if (/arm/i.test(nodeArch)) return 'arm64';

  if (platform === 'win32') {
    const pa = process.env.PROCESSOR_ARCHITECTURE || '';
    const paw = process.env.PROCESSOR_ARCHITEW6432 || '';
    if (/arm/i.test(pa) || /arm/i.test(paw)) return 'arm64';
  }

  return 'x64';
}

function getPlatformDir() {
  const platform = process.platform;
  const arch = getEffectiveArch();

  if (platform === 'linux' && arch === 'x64') return 'linux-x64';
  if (platform === 'win32' && arch === 'x64') return 'windows-x64';
  if (platform === 'darwin' && arch === 'arm64') return 'macos-arm64';

  if (platform === 'darwin' && arch === 'x64') {
    console.error('Intel Macs are not supported.');
    console.error('eval-kanban requires Apple Silicon (M1 or later).');
    process.exit(1);
  }

  if (platform === 'linux' && arch === 'arm64') {
    console.error('Linux ARM64 is not supported yet.');
    console.error('Please use Linux x64 or open an issue for ARM64 support.');
    process.exit(1);
  }

  console.error(`Unsupported platform: ${platform}-${arch}`);
  console.error('Supported platforms:');
  console.error('  - Linux x64');
  console.error('  - Windows x64');
  console.error('  - macOS ARM64 (Apple Silicon M1+)');
  process.exit(1);
}

function getBinaryName() {
  return process.platform === 'win32' ? 'eval-kanban-server.exe' : 'eval-kanban-server';
}

function showProgress(downloaded, total) {
  const percent = total ? Math.round((downloaded / total) * 100) : 0;
  const mb = (downloaded / (1024 * 1024)).toFixed(1);
  const totalMb = total ? (total / (1024 * 1024)).toFixed(1) : '?';
  process.stderr.write(`\r   Downloading: ${mb}MB / ${totalMb}MB (${percent}%)`);
}

async function main() {
  const platformDir = getPlatformDir();
  const cwd = process.cwd();

  console.log(`eval-kanban v${CLI_VERSION}`);

  // Get latest release info
  let release;
  try {
    release = await getLatestRelease();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error('Make sure you have internet connection and the release exists.');
    process.exit(1);
  }

  const version = release.tag_name;
  const versionDir = path.join(CACHE_DIR, version, platformDir);
  const binPath = path.join(versionDir, getBinaryName());
  const extractedMarker = path.join(versionDir, '.extracted');

  // Download and extract if needed
  if (!fs.existsSync(extractedMarker)) {
    try {
      const { zipPath } = await ensureBinary(platformDir, version, showProgress);

      console.log('Extracting...');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(versionDir, true);

      // Mark as extracted
      fs.writeFileSync(extractedMarker, new Date().toISOString());

      // Set permissions on Unix
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(binPath, 0o755);
        } catch {}
      }

      // Clean up zip
      try {
        fs.unlinkSync(zipPath);
      } catch {}
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      process.exit(1);
    }
  }

  if (!fs.existsSync(binPath)) {
    console.error(`Error: Binary not found at ${binPath}`);
    console.error('Try deleting ~/.eval-kanban/bin and running again.');
    process.exit(1);
  }

  console.log('Starting server...');

  const server = spawn(binPath, [], {
    cwd: cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      RUST_LOG: process.env.RUST_LOG || 'eval_kanban_server=info',
    },
  });

  server.on('error', (err) => {
    console.error('Server error:', err.message);
    process.exit(1);
  });

  server.on('exit', (code) => {
    process.exit(code || 0);
  });

  process.on('SIGINT', () => {
    server.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
  });
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
