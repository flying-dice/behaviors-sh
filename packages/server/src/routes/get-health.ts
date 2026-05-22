import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import { factory, type RouteModule } from "../factory.ts";

const operationId = "getHealth";

const HealthResponse = z.object({
	status: z.literal("ok"),
	uptime: z.number(),
	bun: z.string().optional(),
	pid: z.number().optional(),
});

const HealthQuery = z.object({
	verbose: z.enum(["true", "false"]).optional(),
});

const handlers = factory.createHandlers(
	describeRoute({
		operationId,
		summary: "Health check",
		description: "Returns service status and process uptime in seconds.",
		tags: ["system"],
		responses: {
			200: {
				description: "Service is healthy",
				content: { "application/json": { schema: resolver(HealthResponse) } },
			},
		},
	}),
	validator("query", HealthQuery),
	(c) => {
		const { verbose } = c.req.valid("query");
		const body: z.infer<typeof HealthResponse> = {
			status: "ok",
			uptime: process.uptime(),
		};
		if (verbose === "true") {
			body.bun = Bun.version;
			body.pid = process.pid;
		}
		return c.json(body);
	},
);

const route: RouteModule = {
	operationId,
	register(app) {
		app.get("/api/health", ...handlers);
	},
};

export default route;
