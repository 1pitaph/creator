import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === "analyze"
      ? [
          visualizer({
            filename: "dist/stats.html",
            gzipSize: true,
            brotliSize: true,
            template: "treemap"
          })
        ]
      : [])
  ],
  server: {
    proxy: {
      "/api": "http://localhost:8787",
      "/health": "http://localhost:8787"
    }
  },
  test: {
    css: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
}));
