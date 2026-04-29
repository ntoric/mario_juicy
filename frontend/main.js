const { app, BrowserWindow, Menu, protocol, net, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;
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
    try {
      printerProcess = spawn(printerPath, [], {
        stdio: 'inherit',
        windowsHide: true,
        // Ensure the process is killed when the main process exits
        detached: false
      });

      printerProcess.on('error', (err) => {
        console.error('Failed to start printer service:', err);
      });

      printerProcess.on('exit', (code) => {
        console.log(`Printer service exited with code ${code}`);
      });
    } catch (err) {
      console.error('Error spawning printer service:', err);
    }
  } else {
    console.warn('Printer service binary not found at', printerPath);
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
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
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
      const mainIndexPath = path.join(__dirname, 'out', 'index.html');
      return net.fetch(`file://${mainIndexPath}`);
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
