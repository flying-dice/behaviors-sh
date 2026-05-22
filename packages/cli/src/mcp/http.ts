// HTTP MCP entrypoint: wires the runtime against the default URI-scheme
// adapters and serves MCP over Streamable HTTP at `POST /mcp`.
//
// Standalone Bun server (not mounted on @behaviors-ui/server) so callers
// can run MCP without pulling in the UI server. `GET /health` is exposed
// for liveness checks.
//
// Stateless mode — each request gets a fresh McpServer + transport
// (the SDK rejects reuse of a stateless transport). The runtime is
// constructed once and shared across all requests: runtime state lives
// in the URI-addressed stores (file:// / memory://), so concurrent
// requests cooperate via the same `Runtime` instance.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import {
	buildRuntime,
	defaultExecutionsDir,
	ensureDir,
	type Runtime,
} from '@behaviors-ui/runtime'
import pkg from '../../package.json' with { type: 'json' }
import { buildDefaultIoAdapters } from './io/index.ts'
import { registerRuntimeTools } from './register-runtime-tools.ts'

export interface RunHttpMcpOptions {
	port?: number
	host?: string
	executionsDir?: string
	cwd?: string
}

export interface RunningHttpMcp {
	url: string
	stop: () => Promise<void>
}

export async function runHttpMcp(
	opts: RunHttpMcpOptions = {},
): Promise<RunningHttpMcp> {
	const port = opts.port ?? Number(process.env.PORT ?? 3001)
	const host = opts.host ?? '127.0.0.1'
	const executionsDir = opts.executionsDir ?? defaultExecutionsDir(opts.cwd)
	ensureDir(executionsDir)

	const { trees, executionsRead, executionsWrite } = buildDefaultIoAdapters({
		executionsDir,
		cwd: opts.cwd,
	})
	const runtime = buildRuntime({ trees, executionsRead, executionsWrite })

	const bun = Bun.serve({
		port,
		hostname: host,
		fetch: async (req) => {
			const url = new URL(req.url)
			if (url.pathname === '/health') {
				return new Response(JSON.stringify({ ok: true }), {
					headers: { 'content-type': 'application/json' },
				})
			}
			if (url.pathname === '/mcp') {
				return handleMcpRequest(req, runtime)
			}
			return new Response('Not Found', { status: 404 })
		},
	})

	const url = `http://${host}:${bun.port}`
	console.log(
		`[cli] mcp http ready — ${url}/mcp (executionsDir=${executionsDir})`,
	)

	return {
		url,
		stop: async () => {
			bun.stop(true)
		},
	}
}

async function handleMcpRequest(req: Request, runtime: Runtime): Promise<Response> {
	// Fresh McpServer + transport per request. The SDK rejects reuse of
	// a stateless transport, and the server is bound to its transport
	// at `connect()` time, so the pair must be 1:1 per request.
	const server = new McpServer({ name: 'behaviors-ui', version: pkg.version })
	registerRuntimeTools(server, runtime)
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true,
	})
	await server.connect(transport)
	try {
		return await transport.handleRequest(req)
	} finally {
		// Release resources held by the per-request server/transport pair.
		await server.close().catch(() => {})
	}
}
