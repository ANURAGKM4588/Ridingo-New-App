/**
 * scripts/build-apps.js
 * Generates standalone, clean production web distributions for:
 * 1. User App   -> dist/user/ and packages/user/www/
 * 2. Driver App -> dist/driver/ and packages/driver/www/
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourceHtmlPath = path.join(rootDir, 'index.html');

const targets = [
  {
    type: 'user',
    name: 'Ridingo',
    appId: 'com.ridingo.user',
    distDirs: [
      path.join(rootDir, 'dist', 'user'),
      path.join(rootDir, 'packages', 'user', 'www')
    ]
  },
  {
    type: 'driver',
    name: 'Ridingo Driver',
    appId: 'com.ridingo.driver',
    distDirs: [
      path.join(rootDir, 'dist', 'driver'),
      path.join(rootDir, 'packages', 'driver', 'www')
    ]
  }
];

const originalHtml = fs.readFileSync(sourceHtmlPath, 'utf8');

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
  <meta name="theme-color" content="${isUser ? '#FFFFFF' : '#000000'}">
  <script>
    window.RIDINGO_TARGET = '${appType}';
    (function configureNativeBars(){
      function applyStatus(){
        try {
          var saved = null;
          try { saved = localStorage.getItem('ridingo_theme_pref'); } catch(e){}
          var isDark = false;
          if (saved === 'dark') {
            isDark = true;
          } else if (saved === 'light') {
            isDark = false;
          } else {
            var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            isDark = ('${appType}' === 'driver') ? true : sysDark;
          }
          var bgColor = isDark ? '#000000' : '#FFFFFF';
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
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), compiledHtml, 'utf8');
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  });

  console.log(`✅ Compiled production assets for ${t.name} -> ${t.distDirs.map(d => path.relative(rootDir, d)).join(', ')}`);
});
