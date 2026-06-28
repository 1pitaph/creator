import { app, BrowserWindow, dialog } from "electron";
import type { DesktopAppServer } from "./appServer.js";
import { startDesktopAppServer } from "./appServer.js";
import { createMainWindow } from "./window.js";

const defaultDevUrl = "http://127.0.0.1:5174";
let desktopAppServer: DesktopAppServer | null = null;

const resolveAppUrl = async () => {
  const devUrl = process.env.DESKTOP_WEB_URL ?? (!app.isPackaged ? defaultDevUrl : undefined);

  if (devUrl) {
    return devUrl;
  }

  if (!desktopAppServer) {
    desktopAppServer = await startDesktopAppServer();
  }

  return desktopAppServer.url;
};

const createWindow = async () => {
  const appUrl = await resolveAppUrl();
  return createMainWindow({
    allowedAppUrls: [appUrl, defaultDevUrl],
    appUrl
  });
};

app.whenReady().then(() => {
  void createWindow().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    console.error(error);
    dialog.showErrorBox("Desktop startup failed", message);
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("before-quit", () => {
  void desktopAppServer?.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
