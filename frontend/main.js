const { app, BrowserWindow, Menu, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

// Register the custom protocol as privileged
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: "Mario Juicy",
    icon: path.join(__dirname, 'public/favicon.ico'),
    backgroundColor: '#E9762B',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
  });

  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Handle loading with custom protocol in production
  const startUrl = isDev
    ? 'http://localhost:3000'
    : 'app://./index.html';

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    app.quit();
  });
}

app.whenReady().then(() => {
  // Set up the custom protocol handler
  if (!isDev) {
    protocol.handle('app', (request) => {
      const url = new URL(request.url);
      let relativePath = url.hostname + url.pathname;
      
      // Clean up relative path if it starts with ./
      if (relativePath.startsWith('./')) {
        relativePath = relativePath.substring(2);
      }
      
      // Remove leading slash for path join if needed
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1);
      }

      let filePath = path.join(__dirname, 'out', relativePath);

      // Check if file exists direct
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return net.fetch(`file://${filePath}`);
      }

      // 1. Try adding .html (Next.js route mapping without trailing slash)
      const htmlPath = filePath + '.html';
      if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
        return net.fetch(`file://${htmlPath}`);
      }
        
      // 2. Try index.html within the path (Next.js route mapping with trailing slash)
      const indexPath = path.join(filePath, 'index.html');
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return net.fetch(`file://${indexPath}`);
      }

      // 3. Fallback to main index.html for SPA client-side routing
      // This is the safety net that prevents hanging on the preloader
      const mainIndexPath = path.join(__dirname, 'out', 'index.html');
      return net.fetch(`file://${mainIndexPath}`);
    });
  }

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
