import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills({ include: ["buffer"] })],
  base: "/Memo_Blog/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
