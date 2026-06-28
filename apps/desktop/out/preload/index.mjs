import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("creatorDesktop", {
  platform: process.platform,
  versions: process.versions
});
