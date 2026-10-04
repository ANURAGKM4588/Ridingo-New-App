const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/ANURAGKM4588/Ridingo-New-App/actions/runs?per_page=5',
  headers: { 'User-Agent': 'NodeJS-Agent' }
};

https.get(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.workflow_runs && parsed.workflow_runs.length > 0) {
        parsed.workflow_runs.forEach(r => {
          console.log(`[Run #${r.run_number}] ID: ${r.id} | Status: ${r.status} | Conclusion: ${r.conclusion} | Commit: ${(r.head_commit?.message || '').replace(/\n/g, ' ').slice(0, 60)}`);
          console.log(`  Details: ${r.html_url}\n`);
        });
      } else {
        console.log('No runs found or response:', data);
      }
    } catch(e) {
      console.log('Error parsing response:', e.message);
    }
  });
}).on('error', err => {
  console.error('Request error:', err.message);
});
