import { StreamableHTTPTransport } from "@hono/mcp";
import { factory, type RouteModule } from "../factory.ts";
import { buildMcpServer } from "../mcp/server.ts";

const operationId = "mcp";

const mcp = buildMcpServer();

const handlers = factory.createHandlers(async (c) => {
	const transport = new StreamableHTTPTransport();
	await mcp.connect(transport);
	const res = await transport.handleRequest(c);
	return res ?? new Response(null, { status: 204 });
});

const route: RouteModule = {
	operationId,
	register(app) {
		app.all("/mcp", ...handlers);
	},
};

export default route;
