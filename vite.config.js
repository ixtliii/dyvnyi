import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => ({
    base: "/dyvnyi/", // must match the repo name
    plugins: [react(), ...(mode === "single" ? [viteSingleFile()] : [])],
    build: { assetsInlineLimit: mode === "single" ? 100000000 : 4096, chunkSizeWarningLimit: 2000 }
}));