import { openAPIRouteHandler } from 'hono-openapi'
import type { RouteModule } from '../factory.ts'

const operationId = 'getOpenApi'

const route: RouteModule = {
  operationId,
  register(app) {
    app.get(
      '/openapi.json',
      openAPIRouteHandler(app, {
        documentation: {
          info: {
            title: 'Behaviors API',
            version: '0.0.0',
            description: 'HTTP + MCP API exposed alongside the behaviors UI.',
          },
        },
        excludeStaticFile: true,
      }),
    )
  },
}

export default route
