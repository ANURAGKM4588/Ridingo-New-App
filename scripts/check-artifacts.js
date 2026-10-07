const https = require('https');

const runId = '37235404274';
const options = {
  hostname: 'api.github.com',
  path: `/repos/ANURAGKM4588/Ridingo-New-App/actions/runs/${runId}/artifacts`,
  headers: { 'User-Agent': 'NodeJS-Agent' }
};

https.get(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Artifacts Count:', parsed.total_count);
      if (parsed.artifacts) {
        parsed.artifacts.forEach(a => {
          console.log(`- ${a.name} (${(a.size_in_bytes / 1024 / 1024).toFixed(2)} MB) | ID: ${a.id}`);
        });
      }
    } catch(e) {
      console.error('Error:', e.message);
    }
  });
});
