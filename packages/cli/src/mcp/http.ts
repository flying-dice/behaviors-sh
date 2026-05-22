// HTTP MCP entrypoint: wires the runtime against the default URI-scheme
// adapters and serves MCP over Streamable HTTP at `POST /mcp`.
//
// Standalone Hono app served via `@hono/node-server` so callers can
// run MCP without pulling in the UI server. `GET /health` is exposed
// for liveness checks.
//
// Stateless mode — each request gets a fresh McpServer + transport
// (the SDK rejects reuse of a stateless transport). The runtime is
// constructed once and shared across all requests: runtime state lives
// in the URI-addressed stores (file:// / memory://), so concurrent
// requests cooperate via the same `Runtime` instance.

import {
	buildRuntime,
	defaultExecutionsDir,
	ensureDir,
} from "@behaviors-sh/runtime";
import { StreamableHTTPTransport } from "@hono/mcp";
import { type ServerType, serve } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import pkg from "../../package.json" with { type: "json" };
import { buildDefaultIoAdapters } from "./io/index.ts";
import { registerRuntimeTools } from "./register-runtime-tools.ts";

export interface RunHttpMcpOptions {
	port?: number;
	host?: string;
	executionsDir?: string;
	cwd?: string;
}

export interface RunningHttpMcp {
	url: string;
	stop: () => Promise<void>;
}

export async function runHttpMcp(
	opts: RunHttpMcpOptions = {},
): Promise<RunningHttpMcp> {
	const port = opts.port ?? Number(process.env.PORT ?? 3001);
	const host = opts.host ?? "127.0.0.1";
	const executionsDir = opts.executionsDir ?? defaultExecutionsDir(opts.cwd);
	ensureDir(executionsDir);

	const { trees, executionsRead, executionsWrite } = buildDefaultIoAdapters({
		executionsDir,
		cwd: opts.cwd,
	});
	const runtime = buildRuntime({ trees, executionsRead, executionsWrite });

	const app = new Hono();

	app.get("/health", (c) => c.json({ ok: true }));

	app.all("/mcp", async (c) => {
		// Fresh McpServer + transport per request. The SDK rejects reuse
		// of a stateless transport, and the server is bound to its
		// transport at `connect()` time, so the pair must be 1:1 per
		// request.
		const mcp = new McpServer({ name: "behaviors-sh", version: pkg.version });
		registerRuntimeTools(mcp, runtime);
		const transport = new StreamableHTTPTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true,
		});
		await mcp.connect(transport);
		try {
			const res = await transport.handleRequest(c);
			return res ?? c.body(null, 204);
		} finally {
			await mcp.close().catch(() => {});
		}
	});

	const server: ServerType = await new Promise((resolve) => {
		const s = serve({ fetch: app.fetch, port, hostname: host }, () => {
			resolve(s);
		});
	});

	const actualPort =
		typeof server.address() === "object" && server.address()
			? (server.address() as { port: number }).port
			: port;
	const url = `http://${host}:${actualPort}`;
	console.log(
		`[cli] mcp http ready — ${url}/mcp (executionsDir=${executionsDir})`,
	);

	return {
		url,
		stop: () =>
			new Promise<void>((resolve, reject) =>
				server.close((err) => (err ? reject(err) : resolve())),
			),
	};
}
