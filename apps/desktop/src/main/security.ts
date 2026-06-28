import type { BrowserWindow } from "electron";
import { shell } from "electron";

const originFromUrl = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const isAllowedAppUrl = (url: string, allowedOrigins: Set<string>) => {
  const origin = originFromUrl(url);
  return origin !== null && allowedOrigins.has(origin);
};

const isAllowedExternalUrl = (url: string) => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

export const installWindowSecurity = (window: BrowserWindow, allowedAppUrls: string[]) => {
  const allowedOrigins = new Set(
    allowedAppUrls
      .map((url) => originFromUrl(url))
      .filter((origin): origin is string => origin !== null)
  );

  window.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedAppUrl(url, allowedOrigins)) {
      event.preventDefault();
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
};
