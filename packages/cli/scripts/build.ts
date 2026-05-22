// Produces a Node-runnable `dist/index.js` from the TypeScript source.
// Bundles workspace dependencies inline so the published npm package
// is self-contained (only external runtime deps live in
// `dependencies`). Bun is the bundler; the output runs on Node ≥18.

import { chmodSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { $ } from "bun";

const cliRoot = resolve(import.meta.dir, "..");
const entry = "src/index.ts";
const outdir = "dist";
const outfile = `${outdir}/index.js`;

// External deps stay as runtime `import`s — they're declared in
// package.json `dependencies` and resolved by npm at install time.
// Everything else (workspace packages, relative imports) is bundled.
const externals = [
	"@hono/mcp",
	"@hono/node-server",
	"@modelcontextprotocol/sdk",
	"commander",
	"hono",
	"zod",
];
const externalArgs = externals.flatMap((e) => ["--external", e]);

console.log(`[build] bundling ${entry} → ${outfile}`);
await $`bun build ${entry} --target node --outdir ${outdir} ${externalArgs}`.cwd(
	cliRoot,
);

// Make the file executable so npm's bin linker resolves
// `npx @behaviors-sh/cli` correctly. The `#!/usr/bin/env node` shebang
// at the top of src/index.ts is preserved by bun's bundler.
const path = resolve(cliRoot, outfile);
chmodSync(path, 0o755);
const body = readFileSync(path, "utf8");
console.log(
	`[build] done — ${outfile} (${body.length.toLocaleString()} bytes)`,
);
