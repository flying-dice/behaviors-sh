// STDIO MCP entrypoint: wires the runtime against the default URI-scheme
// adapters and runs an MCP server over stdin/stdout. Logs go to stderr
// so they don't corrupt the JSON-RPC framing on stdout.

import {
	buildRuntime,
	defaultExecutionsDir,
	ensureDir,
} from "@behaviors-sh/runtime";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import pkg from "../../package.json" with { type: "json" };
import { buildDefaultIoAdapters } from "./io/index.ts";
import { registerRuntimeTools } from "./register-runtime-tools.ts";

export interface RunStdioMcpOptions {
	executionsDir?: string;
	cwd?: string;
}

export async function runStdioMcp(
	opts: RunStdioMcpOptions = {},
): Promise<void> {
	const executionsDir = opts.executionsDir ?? defaultExecutionsDir(opts.cwd);
	ensureDir(executionsDir);

	const { trees, executionsRead, executionsWrite } = buildDefaultIoAdapters({
		executionsDir,
		cwd: opts.cwd,
	});

	const runtime = buildRuntime({ trees, executionsRead, executionsWrite });

	const server = new McpServer({ name: "behaviors-sh", version: pkg.version });
	registerRuntimeTools(server, runtime);

	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error(`[cli] mcp stdio ready — executionsDir=${executionsDir}`);
}
