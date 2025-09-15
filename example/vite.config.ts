import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	root: path.resolve(__dirname),
	server: {
		port: 5173,
	},
	resolve: {
		alias: {
			"tiptap-extension-freehand": path.resolve(__dirname, "../src/index.ts"),
		},
	},
});
