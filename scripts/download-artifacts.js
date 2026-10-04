const fs = require('fs');
const path = require('path');
const https = require('https');

const files = [
  { name: 'Ridingo-User.apk', url: 'https://github.com/ANURAGKM4588/Ridingo-New-App/releases/download/release-build-3/Ridingo-User.apk' },
  { name: 'Ridingo-Driver.apk', url: 'https://github.com/ANURAGKM4588/Ridingo-New-App/releases/download/release-build-3/Ridingo-Driver.apk' },
  { name: 'Ridingo-User.ipa', url: 'https://github.com/ANURAGKM4588/Ridingo-New-App/releases/download/release-build-3/Ridingo-User.ipa' },
  { name: 'Ridingo-Driver.ipa', url: 'https://github.com/ANURAGKM4588/Ridingo-New-App/releases/download/release-build-3/Ridingo-Driver.ipa' },
];

const outDir = path.resolve(__dirname, '..', 'build-outputs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
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
          reject(new Error(`Failed to download ${fileObj.name}: status ${res.statusCode}`));
          return;
        }
        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          const stats = fs.statSync(dest);
          console.log(`Downloaded ${fileObj.name} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
          resolve();
        });
      }).on('error', reject);
    }

    fetchUrl(fileObj.url);
  });
}

async function run() {
  console.log(`Downloading all 4 mobile packages to ${outDir}...`);
  for (const f of files) {
    await downloadFile(f);
  }
  console.log('All 4 packages downloaded locally!');
}

run().catch(console.error);
