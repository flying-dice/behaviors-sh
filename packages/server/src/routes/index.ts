import type { RouteModule } from '../factory.ts'
import getHealth from './get-health.ts'
import allMcp from './all-mcp.ts'
import getReference from './get-reference.ts'
import allApiFallback from './all-api-fallback.ts'
import getOpenApi from './get-openapi.ts'

export const routes: RouteModule[] = [
  getHealth,
  allMcp,
  getReference,
  allApiFallback,
  getOpenApi,
]
