import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'build-outputs');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
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

// 1. Build latest production code
console.log('🔨 Step 1: Compiling latest production web bundle...');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

console.log('📦 Step 2: Generating standalone web apps (User & Driver)...');
execSync('node scripts/build-apps.js', { cwd: root, stdio: 'inherit' });

function repackTarget(target) {
  const isUser = target === 'user';
  const ipaName = isUser ? 'Ridingo-User.ipa' : 'Ridingo-Driver.ipa';
  const ipaPath = path.join(outDir, ipaName);
  const tempDir = path.join(root, `temp-ipa-repack-${target}`);
  const wwwSrc = path.join(root, 'packages', target, 'www');
  const iosPublic = path.join(root, 'packages', target, 'ios', 'App', 'App', 'public');

  console.log(`\n========================================`);
  console.log(`🍎 Packaging updated IPA: ${ipaName}`);
  console.log(`========================================`);

  if (!fs.existsSync(ipaPath)) {
    console.warn(`⚠️ Base IPA not found at ${ipaPath}`);
    return;
  }

  // Update packages/{target}/ios/App/App/public from packages/{target}/www
  if (fs.existsSync(wwwSrc)) {
    console.log(`🔄 Syncing latest web assets into iOS project (${target})...`);
    copyRecursive(wwwSrc, iosPublic);
  }

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  console.log(`📂 Extracting existing ${ipaName}...`);
  execSync(`tar -xf "${ipaPath}" -C "${tempDir}"`, { stdio: 'inherit' });

  const targetPublic = path.join(tempDir, 'Payload', 'App.app', 'public');
  if (fs.existsSync(targetPublic)) {
    fs.rmSync(targetPublic, { recursive: true, force: true });
  }

  console.log(`📋 Injecting latest 6-digit OTP code & UI into Payload/App.app/public...`);
  copyRecursive(iosPublic, targetPublic);

  console.log(`📦 Archiving ${ipaName}...`);
  if (fs.existsSync(ipaPath)) {
    fs.unlinkSync(ipaPath);
  }
  execSync(`tar -a -cf "${ipaPath}" Payload`, { cwd: tempDir, stdio: 'inherit' });

  fs.rmSync(tempDir, { recursive: true, force: true });
  const stats = fs.statSync(ipaPath);
  console.log(`🎉 SUCCESS: ${ipaName} successfully updated! (${(stats.size / 1024 / 1024).toFixed(2)} MB) -> ${ipaPath}`);
}

const reqTarget = process.argv[2];
if (reqTarget === 'driver') {
  repackTarget('driver');
} else if (reqTarget === 'user') {
  repackTarget('user');
} else {
  repackTarget('user');
  repackTarget('driver');
}
