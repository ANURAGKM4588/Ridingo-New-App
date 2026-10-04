/**
 * scripts/build-ios.js
 * Builds iOS IPA package for either User or Driver:
 *   Usage: node scripts/build-ios.js user
 *   Usage: node scripts/build-ios.js driver
 * Output:
 *   build-outputs/Ridingo-User.ipa
 *   build-outputs/Ridingo-Driver.ipa
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = (process.argv[2] || 'user').toLowerCase();
const isUser = target === 'user';
const appName = isUser ? 'Ridingo-User' : 'Ridingo-Driver';
const appId = isUser ? 'com.ridingo.user' : 'com.ridingo.driver';

const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'build-outputs');
fs.mkdirSync(outDir, { recursive: true });

console.log(`\n========================================`);
console.log(`🍎 Building iOS Package: ${appName}`);
console.log(`📦 Bundle Identifier: ${appId}`);
console.log(`========================================\n`);

// 1. Ensure web assets are compiled
execSync('node scripts/build-apps.js', { stdio: 'inherit', cwd: rootDir });

const packageDir = path.join(rootDir, 'packages', target);
const iosDir = path.join(packageDir, 'ios');

// 2. Initialize / Sync Capacitor iOS project if needed
if (!fs.existsSync(iosDir)) {
  console.log(`📁 Initializing native iOS project for ${target}...`);
  try {
    execSync(`npx cap add ios --config packages/${target}/capacitor.config.json`, {
      stdio: 'inherit',
      cwd: rootDir
    });
  } catch (err) {
    console.log(`ℹ️ Capacitor CLI step: ${err.message}`);
  }
}

// 3. Sync web assets
try {
  execSync(`npx cap sync ios --config packages/${target}/capacitor.config.json`, {
    stdio: 'inherit',
    cwd: rootDir
  });
} catch (e) {}

// 4. Run Xcodebuild if running on macOS
if (process.platform === 'darwin') {
  console.log(`🔨 Compiling and Archiving iOS project with xcodebuild...`);
  try {
    const archivePath = path.join(iosDir, 'build', `${appName}.xcarchive`);
    const workspacePath = path.join(iosDir, 'App', 'App.xcworkspace');
    
    // Archive
    execSync(`xcodebuild -workspace "${workspacePath}" -scheme App -archivePath "${archivePath}" archive CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`, {
      stdio: 'inherit'
    });

    // Package to Payload / IPA
    const payloadDir = path.join(iosDir, 'build', 'Payload');
    fs.mkdirSync(payloadDir, { recursive: true });
    execSync(`cp -r "${archivePath}/Products/Applications/App.app" "${payloadDir}/"`);
    
    const destIpa = path.join(outDir, `${appName}.ipa`);
    execSync(`cd "${path.join(iosDir, 'build')}" && zip -r "${destIpa}" Payload`);
    console.log(`\n🎉 SUCCESS: Exported ${appName}.ipa -> ${destIpa}`);
  } catch (xcodeErr) {
    console.error(`⚠️ Xcodebuild step: ${xcodeErr.message}`);
  }
} else {
  console.log(`ℹ️ iOS Native project prepared. On non-macOS host, full IPA compilation will execute in GitHub Actions macOS runner.`);
}
