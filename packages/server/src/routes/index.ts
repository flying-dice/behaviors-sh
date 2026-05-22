import type { RouteModule } from "../factory.ts";
import allApiFallback from "./all-api-fallback.ts";
import allMcp from "./all-mcp.ts";
import getHealth from "./get-health.ts";
import getOpenApi from "./get-openapi.ts";
import getReference from "./get-reference.ts";

export const routes: RouteModule[] = [
	getHealth,
	allMcp,
	getReference,
	allApiFallback,
	getOpenApi,
];
