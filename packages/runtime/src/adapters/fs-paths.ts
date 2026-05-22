// Helpers for callers that want the historic default layout for the FS
// adapter: `<cwd>/.behaviors-sh/executions`, overridable via the
// `BEHAVIORS_SH_EXECUTIONS_DIR` env var. The FS adapter itself takes
// `executionsDir` as a constructor arg — these helpers are purely a
// convenience for constructing one with the defaults.

import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

function expandHome(p: string): string {
	if (p === "~") return homedir();
	if (p.startsWith("~/")) return join(homedir(), p.slice(2));
	return p;
}

export function defaultBehaviorsUiDir(cwd: string = process.cwd()): string {
	return resolve(cwd, ".behaviors-sh");
}

export function defaultExecutionsDir(cwd: string = process.cwd()): string {
	const fromEnv = process.env.BEHAVIORS_SH_EXECUTIONS_DIR;
	if (fromEnv) return resolve(expandHome(fromEnv));
	return join(defaultBehaviorsUiDir(cwd), "executions");
}

export function ensureDir(dir: string) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
