import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("creatorDesktop", {
  appInfo: {
    name: "抖音创作者中心 AI Demo"
  },
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  }
});
