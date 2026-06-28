import { app, BrowserWindow, shell } from "electron";
import { join, resolve } from "node:path";

const defaultDevUrl = "http://127.0.0.1:5174";

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: "抖音创作者中心 AI Demo",
    backgroundColor: "#f4f4f5",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const devUrl = process.env.DESKTOP_WEB_URL ?? (!app.isPackaged ? defaultDevUrl : undefined);

  if (devUrl) {
    void window.loadURL(devUrl);
    return;
  }

  void window.loadFile(resolve(__dirname, "../../../web/dist/index.html"));
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
