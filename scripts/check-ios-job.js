const https = require('https');

const runId = '37235186993';
const options = {
  hostname: 'api.github.com',
  path: `/repos/ANURAGKM4588/Ridingo-New-App/actions/runs/${runId}/jobs`,
  headers: { 'User-Agent': 'NodeJS-Agent' }
};

https.get(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const iosJob = parsed.jobs.find(j => j.name.includes('iOS'));
      if (iosJob) {
        console.log('iOS Job Steps:');
        iosJob.steps.forEach(s => {
          console.log(`- ${s.name}: ${s.conclusion} (status: ${s.status})`);
        });
      }
    } catch(e) {
      console.log('Error:', e.message);
    }
  });
});
