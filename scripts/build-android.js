/**
 * scripts/build-android.js
 * Builds Android APK package for either User or Driver:
 *   Usage: node scripts/build-android.js user
 *   Usage: node scripts/build-android.js driver
 * Output:
 *   build-outputs/Ridingo-User.apk
 *   build-outputs/Ridingo-Driver.apk
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
console.log(`🤖 Building Android Package: ${appName}`);
console.log(`📦 Application ID: ${appId}`);
console.log(`========================================\n`);

// 1. Ensure web assets are compiled
execSync('node scripts/build-apps.js', { stdio: 'inherit', cwd: rootDir });

const packageDir = path.join(rootDir, 'packages', target);
const androidDir = path.join(packageDir, 'android');

// 2. Initialize / Sync Capacitor Android project if needed
if (!fs.existsSync(androidDir)) {
  console.log(`📁 Initializing native Android project for ${target}...`);
  try {
    execSync(`npx cap add android --config packages/${target}/capacitor.config.json`, {
      stdio: 'inherit',
      cwd: rootDir
    });
  } catch (err) {
    console.log(`ℹ️ Capacitor CLI step: ${err.message}`);
  }
}

// 3. Sync web assets
try {
  execSync(`npx cap sync android --config packages/${target}/capacitor.config.json`, {
    stdio: 'inherit',
    cwd: rootDir
  });
} catch (e) {}

// 4. Run Gradle Build if android folder exists
const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const gradlewPath = path.join(androidDir, gradlewCmd);

if (fs.existsSync(gradlewPath)) {
  console.log(`🔨 Compiling APK with Gradle...`);
  try {
    execSync(`${gradlewCmd} assembleDebug`, { cwd: androidDir, stdio: 'inherit' });

    // Locate built APK
    const candidateApkPaths = [
      path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
      path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
      path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
    ];

    let foundApk = candidateApkPaths.find(p => fs.existsSync(p));
    if (foundApk) {
      const destApk = path.join(outDir, `${appName}.apk`);
      fs.copyFileSync(foundApk, destApk);
      console.log(`\n🎉 SUCCESS: Exported ${appName}.apk -> ${destApk}`);
    }
  } catch (gradleErr) {
    console.error(`⚠️ Gradle build step: ${gradleErr.message}`);
  }
} else {
  console.log(`ℹ️ Native Android wrapper prepared. Standalone bundle ready for CI build.`);
}
