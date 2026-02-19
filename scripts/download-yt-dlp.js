/**
 * Downloads the yt-dlp binary into ./bin/yt-dlp using the yt-dlp-wrap package.
 * Run via: node scripts/download-yt-dlp.js
 * Called automatically during Dockerfile production build.
 */
const { default: YTDlpWrap } = require('yt-dlp-wrap');
const path = require('path');
const fs = require('fs');

const binDir = path.join(process.cwd(), 'bin');
const binPath = path.join(binDir, 'yt-dlp');

fs.mkdirSync(binDir, { recursive: true });

YTDlpWrap.downloadFromGithub(binPath)
  .then(() => console.log(`[download-yt-dlp] yt-dlp downloaded to ${binPath}`))
  .catch((err) => {
    console.error('[download-yt-dlp] failed to download yt-dlp:', err.message);
    process.exit(1);
  });
