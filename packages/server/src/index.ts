import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import type { AppEnv, AppType } from "./factory.ts";
import { routes } from "./routes/index.ts";

export interface EmbeddedAsset {
	data: Uint8Array;
	contentType: string;
}

export interface StartServerOptions {
	port?: number;
	clientDist?: string;
	hostname?: string;
	silent?: boolean;
	embeddedAssets?: Record<string, EmbeddedAsset>;
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

	const useEmbedded =
		!!opts.embeddedAssets && Object.keys(opts.embeddedAssets).length > 0;

	const clientDist = useEmbedded
		? ""
		: resolve(opts.clientDist ?? DEFAULT_CLIENT_DIST);

	if (!useEmbedded && !existsSync(clientDist)) {
		console.warn(
			`[server] client build not found at ${clientDist} — run \`bun run build\` from the workspace root first.`,
		);
	}

	const app = new Hono<AppEnv>();

	for (const route of routes) route.register(app);

	if (useEmbedded) {
		const ea = opts.embeddedAssets!;
		const indexHtml = ea["/index.html"];
		app.use("*", async (c, next) => {
			const hit = ea[c.req.path];
			if (hit) {
				return new Response(hit.data as BodyInit, {
					headers: { "content-type": hit.contentType },
				});
			}
			if (c.req.method === "GET" && indexHtml) {
				return new Response(indexHtml.data as BodyInit, {
					headers: { "content-type": indexHtml.contentType },
				});
			}
			return next();
		});
	} else {
		app.use("*", serveStatic({ root: clientDist }));
		app.get("*", serveStatic({ root: clientDist, path: "index.html" }));
	}

	const server = Bun.serve({ port, hostname, fetch: app.fetch });

	const url = `http://${hostname}:${server.port}`;
	log(`[server] listening on ${url}`);
	log(`[server]   openapi: ${url}/openapi.json`);
	log(`[server]   scalar:  ${url}/reference`);
	log(`[server]   mcp:     ${url}/mcp`);
	if (useEmbedded)
		log(
			`[server]   serving ${Object.keys(opts.embeddedAssets!).length} embedded asset(s)`,
		);

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
