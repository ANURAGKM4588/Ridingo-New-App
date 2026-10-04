const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/ANURAGKM4588/Ridingo-New-App/releases/latest',
  headers: { 'User-Agent': 'NodeJS-Agent' }
};

https.get(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const rel = JSON.parse(data);
      console.log('Release Title:', rel.name);
      console.log('Tag:', rel.tag_name);
      console.log('Release URL:', rel.html_url);
      console.log('Direct Download Assets:');
      if (rel.assets) {
        rel.assets.forEach(a => {
          console.log(`- ${a.name} (${(a.size / 1024 / 1024).toFixed(2)} MB): ${a.browser_download_url}`);
        });
      }
    } catch(e) {
      console.error('Error:', e.message);
    }
  });
});
