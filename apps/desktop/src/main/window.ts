import { BrowserWindow } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installWindowSecurity } from "./security.js";

export type MainWindowOptions = {
  allowedAppUrls: string[];
  appUrl: string;
};

const mainDirname = dirname(fileURLToPath(import.meta.url));

export const createMainWindow = ({ allowedAppUrls, appUrl }: MainWindowOptions) => {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: "抖音创作者中心 AI Demo",
    backgroundColor: "#f4f4f5",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: join(mainDirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  installWindowSecurity(window, allowedAppUrls);
  void window.loadURL(appUrl);

  return window;
};
