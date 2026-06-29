import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vitest/config";

export default defineConfig(({ command, mode }) => {
  const nodeEnv = command === "build" ? "production" : "development";

  return {
    define: {
      "process.env.NODE_ENV": JSON.stringify(nodeEnv)
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          "process.env.NODE_ENV": JSON.stringify(nodeEnv)
        }
      }
    },
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
  };
});
