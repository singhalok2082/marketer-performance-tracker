import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Only set when the GitHub Actions Pages workflow builds this — keeps
  // local dev/build serving from "/" as before.
  base: process.env.GH_PAGES_BASE || "/",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
