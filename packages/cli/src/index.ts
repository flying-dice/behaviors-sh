#!/usr/bin/env bun
import { startServer } from "@behaviors-sh/server";
import { Command, InvalidArgumentError } from "commander";
import pkg from "../package.json" with { type: "json" };
import { runHttpMcp } from "./mcp/http.ts";
import { runStdioMcp } from "./mcp/stdio.ts";

function intArg(name: string) {
	return (value: string) => {
		const n = Number.parseInt(value, 10);
		if (!Number.isFinite(n) || n < 0) {
			throw new InvalidArgumentError(`${name} must be a non-negative integer`);
		}
		return n;
	};
}

interface ServeOptions {
	port?: number;
	host?: string;
}

function trapSignals(cleanup: () => void): void {
	const shutdown = (code: number) => {
		cleanup();
		process.exit(code);
	};
	process.on("SIGINT", () => shutdown(130));
	process.on("SIGTERM", () => shutdown(143));
}

async function runServer(opts: ServeOptions): Promise<void> {
	const running = startServer({
		port: opts.port,
		hostname: opts.host,
	});
	trapSignals(() => {
		try {
			running.stop();
		} catch {}
	});
	console.log(`[cli] open ${running.url} in your browser (Ctrl+C to stop)`);
}

const program = new Command()
	.name("behaviors-sh")
	.description(
		"Run the behaviors-sh HTTP UI server or expose the runtime over MCP.\n\n" +
			"  (default)   start the HTTP UI on http://127.0.0.1:3000\n" +
			"  mcp         expose the runtime over MCP (STDIO or HTTP)",
	)
	.version(pkg.version, "-v, --version")
	.option(
		"-p, --port <n>",
		"port to listen on (default: 3000, or $PORT)",
		intArg("port"),
	)
	.option("-H, --host <name>", "hostname to bind", "127.0.0.1")
	.action(async (opts: ServeOptions) => {
		await runServer(opts);
	});

program
	.command("mcp")
	.description(
		"Expose the behaviour-tree runtime over MCP.\n" +
			"  (default)  STDIO transport (use when launched by an MCP client over stdin/stdout)\n" +
			"  --http     Streamable HTTP transport on POST /mcp (use for remote clients / multi-process setups)",
	)
	.option("--http", "serve over Streamable HTTP at POST /mcp instead of STDIO")
	.option(
		"-p, --port <n>",
		"port for --http mode (default: 3001, or $PORT)",
		intArg("port"),
	)
	.option("-H, --host <name>", "hostname to bind in --http mode", "127.0.0.1")
	.option(
		"--executions-dir <path>",
		"base directory for listing file:// executions (default: $BEHAVIORS_SH_EXECUTIONS_DIR or <cwd>/.behaviors-sh/executions)",
	)
	.option("--cwd <path>", "working directory for resolving relative tree paths")
	.action(
		async (opts: {
			http?: boolean;
			port?: number;
			host?: string;
			executionsDir?: string;
			cwd?: string;
		}) => {
			if (opts.http) {
				await runHttpMcp({
					port: opts.port,
					host: opts.host,
					executionsDir: opts.executionsDir,
					cwd: opts.cwd,
				});
			} else {
				await runStdioMcp({ executionsDir: opts.executionsDir, cwd: opts.cwd });
			}
		},
	);

await program.parseAsync(process.argv);
