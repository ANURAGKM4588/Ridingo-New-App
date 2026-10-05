const fs = require('fs');
const path = require('path');
const https = require('https');

const outDir = path.resolve(__dirname, '..', 'build-outputs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function fetchLatestReleaseTag() {
  return new Promise((resolve, reject) => {
    https.get('https://api.github.com/repos/ANURAGKM4588/Ridingo-New-App/releases', {
      headers: { 'User-Agent': 'NodeJS' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const flutterRel = list.find(r => r.tag_name && r.tag_name.startsWith('release-flutter-'));
          if (flutterRel) {
            resolve(flutterRel.tag_name);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(name, url) {
  return new Promise((resolve, reject) => {
    const dest = path.join(outDir, name);
    function fetchUrl(targetUrl) {
      https.get(targetUrl, { headers: { 'User-Agent': 'NodeJS' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download ${name}: status ${res.statusCode}`));
          return;
        }
        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          const stats = fs.statSync(dest);
          console.log(`✅ Downloaded ${name} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
          resolve();
        });
      }).on('error', reject);
    }
    fetchUrl(url);
  });
}

async function run() {
  console.log('Fetching latest Flutter release tag...');
  const tag = await fetchLatestReleaseTag();
  if (!tag) {
    console.error('No Flutter release found yet. Please wait for CI build to complete.');
    process.exit(1);
  }
  console.log(`Downloading Flutter release ${tag} to ${outDir}...`);

  const files = [
    'Ridingo-User.apk',
    'Ridingo-Driver.apk',
    'Ridingo-User.ipa',
    'Ridingo-Driver.ipa',
  ];

  for (const f of files) {
    const url = `https://github.com/ANURAGKM4588/Ridingo-New-App/releases/download/${tag}/${f}`;
    await downloadFile(f, url);
  }

  console.log('🎉 All 4 Flutter production packages downloaded to build-outputs/ successfully!');
}

run().catch(console.error);
