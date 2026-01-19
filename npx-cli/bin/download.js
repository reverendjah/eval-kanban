const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GITHUB_REPO = 'reverendjah/eval-kanban';
const CACHE_DIR = path.join(require('os').homedir(), '.eval-kanban', 'bin');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'eval-kanban-cli' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}`));
        }
      });
    }).on('error', reject);
  });
}

async function downloadFile(url, destPath, onProgress) {
  const tempPath = destPath + '.tmp';

  return new Promise((resolve, reject) => {
    let file = null;

    const cleanup = () => {
      if (file) {
        try { file.close(); } catch {}
      }
      try { fs.unlinkSync(tempPath); } catch {}
    };

    const doRequest = (requestUrl) => {
      // Create new WriteStream for each request (including after redirects)
      file = fs.createWriteStream(tempPath);

      https.get(requestUrl, { headers: { 'User-Agent': 'eval-kanban-cli' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          // Don't cleanup here - just close the stream and follow redirect
          return doRequest(res.headers.location);
        }

        if (res.statusCode !== 200) {
          cleanup();
          return reject(new Error(`HTTP ${res.statusCode} downloading ${requestUrl}`));
        }

        const totalSize = parseInt(res.headers['content-length'], 10);
        let downloadedSize = 0;

        res.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (onProgress) onProgress(downloadedSize, totalSize);
        });

        res.pipe(file);

        file.on('finish', () => {
          file.close();
          try {
            fs.renameSync(tempPath, destPath);
            resolve(destPath);
          } catch (err) {
            cleanup();
            reject(err);
          }
        });
      }).on('error', (err) => {
        cleanup();
        reject(err);
      });
    };

    doRequest(url);
  });
}

async function getLatestRelease() {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
  try {
    const release = await fetchJson(url);
    return release;
  } catch (err) {
    throw new Error(`Failed to fetch latest release: ${err.message}`);
  }
}

async function ensureBinary(platform, version, onProgress) {
  const versionDir = path.join(CACHE_DIR, version, platform);
  const zipPath = path.join(versionDir, 'eval-kanban.zip');
  const extractedMarker = path.join(versionDir, '.extracted');

  // Already downloaded and extracted
  if (fs.existsSync(extractedMarker)) {
    return versionDir;
  }

  fs.mkdirSync(versionDir, { recursive: true });

  // Download if not cached
  if (!fs.existsSync(zipPath)) {
    const release = await getLatestRelease();
    const asset = release.assets.find((a) => a.name === `eval-kanban-${platform}.zip`);

    if (!asset) {
      throw new Error(`No binary available for platform: ${platform}`);
    }

    console.error(`Downloading eval-kanban ${version} for ${platform}...`);
    await downloadFile(asset.browser_download_url, zipPath, onProgress);
    console.error(''); // newline after progress
  }

  return { zipPath, versionDir };
}

module.exports = {
  GITHUB_REPO,
  CACHE_DIR,
  fetchJson,
  downloadFile,
  getLatestRelease,
  ensureBinary,
};
