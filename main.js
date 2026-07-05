// main.js — Electron main process
//
// Design: instead of one giant transparent window covering the whole
// screen (fragile — click-through hit-testing across a full display is
// easy to get wrong), we use a SMALL frameless transparent window that
// contains just the pet + her speech bubble, and we move that whole
// window across the screen to make her "walk". This is the standard,
// reliable pattern for Electron desktop pets.

const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron');
const path = require('path');

const WIN_WIDTH = 240;
const WIN_HEIGHT = 270;

let win;

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    x: 100,
    y: workArea.height - WIN_HEIGHT,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    fullscreenable: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  // Keep the pet floating above everything, even other fullscreen apps/spaces.
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // The window is small now (just the pet + bubble), so we keep it fully
  // interactive rather than trying to click-through hit-test — far more
  // reliable, at the cost of a small invisible rectangle following her.
  win.setIgnoreMouseEvents(false);

  // Pass screen + window dimensions in as a query string so the renderer
  // can position things synchronously on load — no async IPC round trip
  // required just to know where the floor is.
  win.loadFile('index.html', {
    query: {
      screenWidth: String(workArea.width),
      screenHeight: String(workArea.height),
      winWidth: String(WIN_WIDTH),
      winHeight: String(WIN_HEIGHT),
    },
  });

  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- IPC handlers -----------------------------------------------------

// The renderer knows her walking/drag/fall logic; the main process just
// obeys and repositions the actual OS window to match.
ipcMain.on('move-window', (_event, { x, y }) => {
  if (!win) return;
  win.setBounds({ x: Math.round(x), y: Math.round(y), width: WIN_WIDTH, height: WIN_HEIGHT });
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// Native right-click context menu, built in the main process (safer than
// exposing full menu control to the renderer).
ipcMain.on('show-context-menu', () => {
  if (!win) return;

  const template = [
    {
      label: '🎯 Start 25m Focus Session',
      click: () => win.webContents.send('menu-action', 'start-focus'),
    },
    {
      label: '☕ Start 5m Break',
      click: () => win.webContents.send('menu-action', 'start-break'),
    },
    { type: 'separator' },
    {
      label: '💬 Speech Frequency',
      submenu: [
        { label: 'Every 15s', click: () => win.webContents.send('menu-action', 'freq-15') },
        { label: 'Every 30s', click: () => win.webContents.send('menu-action', 'freq-30') },
        { label: 'Every 60s', click: () => win.webContents.send('menu-action', 'freq-60') },
        { label: 'Off', click: () => win.webContents.send('menu-action', 'freq-off') },
      ],
    },
    { type: 'separator' },
    {
      label: '✖ Quit Mini Me',
      click: () => app.quit(),
    },
  ];

  Menu.buildFromTemplate(template).popup({ window: win });
});
