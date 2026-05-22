import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig({
	// `@apidevtools/json-schema-ref-parser` (used to expand `$ref`s in the
	// YAML panel) reaches for Node globals like `Buffer` even on browser
	// input. The polyfill plugin shims them so dereferencing works in-app.
	plugins: [tailwindcss(), svelte(), nodePolyfills({ include: ["buffer"] })],
	resolve: {
		alias: {
			$lib: path.resolve("./src/lib"),
		},
	},
});
