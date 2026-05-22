import { resolve } from "node:path";
import { $ } from "bun";

const workspaceRoot = resolve(import.meta.dir, "../../..");
const cliRoot = resolve(import.meta.dir, "..");

const outfile = process.argv[2] ?? "dist/behaviors-sh";

console.log("[compile] building client...");
await $`bun --filter @behaviors-sh/client build`.cwd(workspaceRoot);

console.log(`[compile] compiling cli → ${outfile} ...`);
await $`bun build --compile src/index.ts --outfile ${outfile}`.cwd(cliRoot);

console.log(`[compile] done — packages/cli/${outfile}`);
