const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'build-outputs');
const tempDir = path.join(root, 'temp-ipa-repack');
const ipaPath = path.join(outDir, 'Ridingo-User.ipa');
const publicSrc = path.join(root, 'packages', 'user', 'ios', 'App', 'App', 'public');

if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

console.log('Extracting existing IPA...');
execSync(`tar -xf "${ipaPath}" -C "${tempDir}"`, { stdio: 'inherit' });

const targetPublic = path.join(tempDir, 'Payload', 'App.app', 'public');
if (fs.existsSync(targetPublic)) {
  fs.rmSync(targetPublic, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    if (fs.statSync(s).isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

console.log('Copying fresh compiled public web bundle...');
copyRecursive(publicSrc, targetPublic);

console.log('Repackaging fresh Ridingo-User.ipa...');
if (fs.existsSync(ipaPath)) {
  fs.unlinkSync(ipaPath);
}
execSync(`tar -a -cf "${ipaPath}" Payload`, { cwd: tempDir, stdio: 'inherit' });

fs.rmSync(tempDir, { recursive: true, force: true });
const stats = fs.statSync(ipaPath);
console.log(`\n🎉 SUCCESS: Exported updated Ridingo-User.ipa (${(stats.size / 1024 / 1024).toFixed(2)} MB) -> ${ipaPath}`);
