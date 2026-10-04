const https = require('https');

function getLatestRun() {
  const options = {
    hostname: 'api.github.com',
    path: '/repos/ANURAGKM4588/Ridingo-New-App/actions/runs?per_page=1',
    headers: { 'User-Agent': 'NodeJS-Agent' }
  };

  https.get(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const latestRun = parsed.workflow_runs?.[0];
        if (latestRun) {
          checkJobs(latestRun.id, latestRun.run_number);
        } else {
          console.log('No runs found');
        }
      } catch(e) {
        console.error('Error getting latest run:', e.message);
      }
    });
  });
}

function checkJobs(runId, runNumber) {
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
        console.log(`=== Run #${runNumber} (ID: ${runId}) ===`);
        if (parsed.jobs) {
          parsed.jobs.forEach(job => {
            console.log(`[Job: ${job.name}] Status: ${job.status} | Conclusion: ${job.conclusion}`);
            if (job.steps) {
              job.steps.forEach(s => {
                if (s.status === 'in_progress' || s.conclusion === 'failure') {
                  console.log(`   -> Step: ${s.name} (${s.status}, ${s.conclusion})`);
                }
              });
            }
          });
        }
      } catch(e) {
        console.error('Error getting jobs:', e.message);
      }
    });
  });
}

getLatestRun();
