const { app, BrowserWindow, Menu, protocol, net, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

// Robust isDev check
const isDev = !app.isPackaged || process.env.ELECTRON_IS_DEV === '1';
let printerProcess = null;

function startPrinterService() {
  const binaryName = process.platform === 'win32' ? 'mario-printer.exe' : 'mario-printer';

  // In development, look in the sibling directory
  // In production, electron-builder will put it in resources/bin
  const printerPath = isDev
    ? path.join(__dirname, '..', 'mario-printer', binaryName)
    : path.join(process.resourcesPath, 'bin', binaryName);

  console.log('Starting printer service from:', printerPath);

  if (fs.existsSync(printerPath)) {
    console.log('Spawning printer service...');
    try {
      printerProcess = spawn(printerPath, [], {
        stdio: 'inherit',
        windowsHide: true,
        detached: false
      });

      printerProcess.on('error', (err) => {
        console.error('[Printer Service Error]:', err);
      });

      printerProcess.on('exit', (code) => {
        console.log(`[Printer Service] Exited with code ${code}`);
      });

      console.log('[Printer Service] Started successfully');
    } catch (err) {
      console.error('[Printer Service Spawn Error]:', err);
    }
  } else {
    console.error('[Printer Service] Binary NOT found at:', printerPath);
  }
}

function stopPrinterService() {
  if (printerProcess) {
    console.log('Stopping printer service...');
    try {
      printerProcess.kill();
    } catch (err) {
      console.error('Error killing printer service:', err);
    }
    printerProcess = null;
  }
}

// Register the custom protocol as privileged
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: false,
      allowServiceWorkers: true
    }
  }
]);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
    },
    title: "Mario Juicy",
    icon: path.join(__dirname, 'public/logo.png'),
    backgroundColor: '#E9762B',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
  });

  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://localhost:3000; connect-src 'self' http://localhost:3000 http://localhost:8020 ws://localhost:8020 http://localhost:8085 https://mario-api.ntoric.com wss://mario-api.ntoric.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
      : "default-src 'self' app: 'unsafe-inline' data:; connect-src 'self' app: http: https: ws: wss:; img-src 'self' app: data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval';";
    
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : 'app://./index.html';

  mainWindow.loadURL(startUrl).catch(err => {
    console.error('Failed to load URL:', err);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-printers', async () => {
  return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle('print-invoice', async (event, { html, printerName, paperSize }) => {
  const isSmall = paperSize === '2_INCH';

  return new Promise((resolve, reject) => {
    let workerWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false
      }
    });

    const fullHtml = `
      <html>
        <head>
          <style>
            @page { margin: 0; }
            body, html { 
              margin: 0 !important; 
              padding: 0 !important; 
              width: ${isSmall ? '58mm' : '80mm'} !important;
              overflow: hidden;
            }
            * { -webkit-print-color-adjust: exact; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    workerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

    workerWindow.webContents.on('did-finish-load', async () => {
      try {
        const printOptions = {
          silent: true,
          deviceName: printerName,
          printBackground: true,
          color: false,
          margin: {
            marginType: 'none'
          },
          pageSize: {
            width: isSmall ? 58000 : 80000,
            height: 250000
          }
        };
        await workerWindow.webContents.print(printOptions);
        workerWindow.close();
        event.sender.send('print-success');
        resolve(true);
      } catch (err) {
        console.error('Printing failed:', err);
        workerWindow.close();
        event.sender.send('print-error', err.message);
        reject(err);
      }
    });
  });
});

ipcMain.handle('print-to-service', async (event, data) => {
  try {
    const response = await net.fetch('http://localhost:8085/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      throw new Error(`Printer service error: ${errorText}`);
    }
  } catch (err) {
    console.error('Failed to send print request to service:', err);
    throw err;
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

app.whenReady().then(() => {
  if (!isDev) {
    protocol.handle('app', async (request) => {
      try {
        const url = new URL(request.url);
        let relativePath = url.hostname + url.pathname;

        // Clean up relative path
        if (relativePath.startsWith('./')) relativePath = relativePath.substring(2);
        if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
        if (!relativePath || relativePath === '.') relativePath = 'index.html';

        let filePath = path.join(__dirname, 'out', relativePath);

        // 1. Direct file check
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          return net.fetch(pathToFileURL(filePath).toString());
        }

        // 2. Try index.html for directories (Next.js trailingSlash: true)
        const indexPath = path.join(filePath, 'index.html');
        if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
          return net.fetch(pathToFileURL(indexPath).toString());
        }

        // 3. Try .html extension (Next.js trailingSlash: false)
        const htmlPath = filePath + '.html';
        if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
          return net.fetch(pathToFileURL(htmlPath).toString());
        }

        // 4. Fallback to main index.html for SPA routing
        const mainIndexPath = path.join(__dirname, 'out', 'index.html');
        return net.fetch(pathToFileURL(mainIndexPath).toString());
      } catch (err) {
        console.error('Protocol handler error:', err);
        return new Response('Not Found', { status: 404 });
      }
    });
  }

  createWindow();
  startPrinterService();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  stopPrinterService();
});
