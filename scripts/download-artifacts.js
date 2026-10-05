const fs = require('fs');
const path = require('path');
const https = require('https');

const outDir = path.resolve(__dirname, '..', 'build-outputs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'NodeJS-Downloader' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(fileObj) {
  return new Promise((resolve, reject) => {
    const dest = path.join(outDir, fileObj.name);

    function fetchUrl(url) {
      https.get(url, { headers: { 'User-Agent': 'NodeJS-Downloader' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download ${fileObj.name}: HTTP status ${res.statusCode}`));
          return;
        }
        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          const stats = fs.statSync(dest);
          console.log(`✅ Downloaded ${fileObj.name} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
          resolve();
        });
      }).on('error', reject);
    }

    fetchUrl(fileObj.url);
  });
}

async function run() {
  console.log('🔍 Checking latest GitHub Release for Ridingo mobile packages...');
  let filesToDownload = [];

  try {
    const latestRelease = await fetchJson('https://api.github.com/repos/ANURAGKM4588/Ridingo-New-App/releases/latest');
    if (latestRelease && latestRelease.assets && latestRelease.assets.length > 0) {
      console.log(`📦 Found Release: ${latestRelease.name || latestRelease.tag_name} (${latestRelease.tag_name})`);
      filesToDownload = latestRelease.assets
        .filter(a => a.name.endsWith('.apk') || a.name.endsWith('.ipa'))
        .map(a => ({ name: a.name, url: a.browser_download_url }));
    }
  } catch (err) {
    console.warn('⚠️ Could not query GitHub API, falling back to static release links:', err.message);
  }

  if (filesToDownload.length === 0) {
    filesToDownload = [
      { name: 'Ridingo-User.apk', url: 'https://github.com/ANURAGKM4588/Ridingo-New-App/releases/download/release-build-63/Ridingo-User.apk' },
      { name: 'Ridingo-Driver.apk', url: 'https://github.com/ANURAGKM4588/Ridingo-New-App/releases/download/release-build-63/Ridingo-Driver.apk' },
      { name: 'Ridingo-User.ipa', url: 'https://github.com/ANURAGKM4588/Ridingo-New-App/releases/download/release-build-63/Ridingo-User.ipa' },
      { name: 'Ridingo-Driver.ipa', url: 'https://github.com/ANURAGKM4588/Ridingo-New-App/releases/download/release-build-63/Ridingo-Driver.ipa' },
    ];
  }

  console.log(`\n📥 Downloading ${filesToDownload.length} mobile packages to: ${outDir}\n`);
  for (const f of filesToDownload) {
    await downloadFile(f);
  }
  console.log('\n🎉 All APK and IPA packages downloaded and saved to build-outputs!\n');
}

run().catch(console.error);
