/**
 * scripts/build-apps.js
 * Generates standalone, clean production web distributions for:
 * 1. User App -> dist/user/
 * 2. Driver App -> dist/driver/
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourceHtmlPath = path.join(rootDir, 'index.html');
const distUserDir = path.join(rootDir, 'dist', 'user');
const distDriverDir = path.join(rootDir, 'dist', 'driver');

fs.mkdirSync(distUserDir, { recursive: true });
fs.mkdirSync(distDriverDir, { recursive: true });

const originalHtml = fs.readFileSync(sourceHtmlPath, 'utf8');

function compileStandaloneHtml(appType) {
  const isUser = appType === 'user';
  const appName = isUser ? 'Ridingo' : 'Ridingo Driver';
  const standaloneClass = isUser ? 'standalone-app standalone-user' : 'standalone-app standalone-driver';

  let html = originalHtml;

  // Set accurate native title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${appName}</title>`);

  // Inject target definition early in head
  const headInjection = `
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#FFFFFF">
  <script>window.RIDINGO_TARGET = '${appType}';</script>
`;
  html = html.replace('</head>', `${headInjection}\n</head>`);

  // Pre-apply standalone class to body tag
  html = html.replace(/<body([^>]*)>/i, `<body$1 class="${standaloneClass}">`);

  return html;
}

// User distribution
const userHtml = compileStandaloneHtml('user');
fs.writeFileSync(path.join(distUserDir, 'index.html'), userHtml, 'utf8');

const userManifest = {
  name: 'Ridingo',
  short_name: 'Ridingo',
  start_url: './index.html',
  display: 'standalone',
  background_color: '#FFFFFF',
  theme_color: '#FFC70A',
  orientation: 'portrait'
};
fs.writeFileSync(path.join(distUserDir, 'manifest.json'), JSON.stringify(userManifest, null, 2), 'utf8');

// Driver distribution
const driverHtml = compileStandaloneHtml('driver');
fs.writeFileSync(path.join(distDriverDir, 'index.html'), driverHtml, 'utf8');

const driverManifest = {
  name: 'Ridingo Driver',
  short_name: 'Driver',
  start_url: './index.html',
  display: 'standalone',
  background_color: '#0B0B0C',
  theme_color: '#0B0B0C',
  orientation: 'portrait'
};
fs.writeFileSync(path.join(distDriverDir, 'manifest.json'), JSON.stringify(driverManifest, null, 2), 'utf8');

console.log('✅ Generated dist/user/index.html (Ridingo)');
console.log('✅ Generated dist/driver/index.html (Ridingo Driver)');
