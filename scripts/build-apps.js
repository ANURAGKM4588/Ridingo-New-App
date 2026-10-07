/**
 * scripts/build-apps.js
 * Generates standalone, clean production web distributions for:
 * 1. User App   -> packages/user/www/
 * 2. Driver App -> packages/driver/www/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const reactDistDir = path.join(rootDir, 'dist');

if (!fs.existsSync(path.join(reactDistDir, 'index.html'))) {
  console.log('🔨 Building production bundle in root...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

const sourceHtmlPath = path.join(reactDistDir, 'index.html');
console.log(`📦 Using source React production bundle from: ${path.relative(rootDir, sourceHtmlPath)}`);
const originalHtml = fs.readFileSync(sourceHtmlPath, 'utf8');

const targets = [
  {
    type: 'user',
    name: 'Ridingo',
    appId: 'com.ridingo.user',
    distDirs: [
      path.join(rootDir, 'packages', 'user', 'www')
    ]
  },
  {
    type: 'driver',
    name: 'Ridingo Driver',
    appId: 'com.ridingo.driver',
    distDirs: [
      path.join(rootDir, 'packages', 'driver', 'www')
    ]
  }
];

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
  const items = fs.readdirSync(source);
  for (const item of items) {
    if (item === 'user' || item === 'driver') continue; // Prevent self-referencing loops
    const srcPath = path.join(source, item);
    const destPath = path.join(target, item);
    if (fs.statSync(srcPath).isDirectory()) {
      copyFolderRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function compileStandaloneHtml(appType, appName) {
  const isUser = appType === 'user';
  const standaloneClass = isUser ? 'standalone-app standalone-user' : 'standalone-app standalone-driver';

  let html = originalHtml;

  // Set accurate native title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${appName}</title>`);

  // Inject target definition and dynamic native status bar configuration early in head
  const headInjection = `
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="${isUser ? '#F2F2F7' : '#0D0E12'}">
  <script>
    window.RIDINGO_TARGET = '${appType}';
    (function configureNativeBars(){
      function applyStatus(){
        try {
          var saved = null;
          try { saved = localStorage.getItem('ridingo_${appType}_theme'); } catch(e){}
          if (!saved) {
            try { saved = localStorage.getItem('ridingo_theme_pref'); } catch(e){}
          }
          var isDark = false;
          if (saved === 'dark') {
            isDark = true;
          } else if (saved === 'light') {
            isDark = false;
          } else {
            var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            isDark = ('${appType}' === 'driver') ? true : sysDark;
          }
          var bgColor = isDark ? '#0D0E12' : '#F2F2F7';
          var barStyle = isDark ? 'black-translucent' : 'default';

          var metaTheme = document.querySelector('meta[name="theme-color"]');
          if (metaTheme) metaTheme.content = bgColor;
          var metaApple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
          if (metaApple) metaApple.content = barStyle;

          if (saved === 'light' || saved === 'dark') {
            document.documentElement.setAttribute('data-theme', saved);
            if (document.body) document.body.setAttribute('data-theme', saved);
          }

          if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
            var SB = window.Capacitor.Plugins.StatusBar;
            SB.setStyle({ style: isDark ? 'DARK' : 'LIGHT' }).catch(function(){});
            SB.setBackgroundColor({ color: bgColor }).catch(function(){});
            SB.setOverlaysWebView({ overlay: true }).catch(function(){});
          }
        } catch(e){}
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyStatus);
      } else {
        applyStatus();
      }
      setTimeout(applyStatus, 250);
      setTimeout(applyStatus, 800);
    })();
  </script>
`;
  html = html.replace('</head>', `${headInjection}\n</head>`);

  // Pre-apply standalone class to html and body tags
  html = html.replace(/<html([^>]*)>/i, `<html$1 class="standalone-app">`);
  html = html.replace(/<body([^>]*)>/i, `<body$1 class="${standaloneClass}">`);

  return html;
}

targets.forEach(t => {
  const compiledHtml = compileStandaloneHtml(t.type, t.name);
  const manifest = {
    name: t.name,
    short_name: t.name,
    start_url: './index.html',
    display: 'standalone',
    background_color: t.type === 'user' ? '#FFFFFF' : '#0B0B0C',
    theme_color: t.type === 'user' ? '#FFC70A' : '#0B0B0C',
    orientation: 'portrait'
  };

  t.distDirs.forEach(dir => {
    // Clean target dir and re-populate
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true });

    // Copy reactDist files into target directory
    copyFolderRecursiveSync(reactDistDir, dir);

    fs.writeFileSync(path.join(dir, 'index.html'), compiledHtml, 'utf8');
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  });

  console.log(`✅ Compiled production assets for ${t.name} -> ${t.distDirs.map(d => path.relative(rootDir, d)).join(', ')}`);
});
