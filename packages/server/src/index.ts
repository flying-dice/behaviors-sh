import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import type { AppEnv, AppType } from "./factory.ts";
import { routes } from "./routes/index.ts";

export interface StartServerOptions {
	port?: number;
	clientDist?: string;
	hostname?: string;
	silent?: boolean;
}

export interface RunningServer {
	server: ReturnType<typeof Bun.serve>;
	url: string;
	app: AppType;
	stop: () => Promise<void>;
}

const DEFAULT_CLIENT_DIST = resolve(import.meta.dir, "../../client/dist");

export function startServer(opts: StartServerOptions = {}): RunningServer {
	const port = opts.port ?? Number(process.env.PORT ?? 3000);
	const hostname = opts.hostname ?? "127.0.0.1";
	const log = opts.silent ? () => {} : (msg: string) => console.log(msg);

	const clientDist = resolve(opts.clientDist ?? DEFAULT_CLIENT_DIST);
	if (!existsSync(clientDist)) {
		console.warn(
			`[server] client build not found at ${clientDist} — run \`bun run build\` from the workspace root first.`,
		);
	}

	const app = new Hono<AppEnv>();

	for (const route of routes) route.register(app);

	app.use("*", serveStatic({ root: clientDist }));
	app.get("*", serveStatic({ root: clientDist, path: "index.html" }));

	const server = Bun.serve({ port, hostname, fetch: app.fetch });

	const url = `http://${hostname}:${server.port}`;
	log(`[server] listening on ${url}`);
	log(`[server]   openapi: ${url}/openapi.json`);
	log(`[server]   scalar:  ${url}/reference`);
	log(`[server]   mcp:     ${url}/mcp`);

	return {
		server,
		url,
		app,
		stop: async () => {
			await server.stop(true);
		},
	};
}

if (import.meta.main) {
	startServer();
}
