const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes("id='u-nav'") || l.includes('id="u-nav"') || l.includes("u-nav") || l.includes("d-nav") || l.includes("nv on") || l.includes("class='nv'") || l.includes('class="nv"')) {
    console.log(`${i+1}: ${l.trim().slice(0, 100)}`);
  }
});
