#!/usr/bin/env node
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

const program = new Command()
	.name("behaviors-sh")
	.description(
		"Expose the behaviour-tree runtime over MCP. Drop-in for any agent that speaks the protocol — Claude Code, Claude Desktop, or your own client.",
	)
	.version(pkg.version, "-v, --version");

program
	.command("mcp", { isDefault: true })
	.description(
		"Run the runtime as an MCP server.\n" +
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
