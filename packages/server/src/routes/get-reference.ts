import { Scalar } from '@scalar/hono-api-reference'
import { factory, type RouteModule } from '../factory.ts'

const operationId = 'getReference'

const handlers = factory.createHandlers(
  Scalar({ url: '/openapi.json', pageTitle: 'Behaviors · API reference' }),
)

const route: RouteModule = {
  operationId,
  register(app) {
    app.get('/reference', ...handlers)
  },
}

export default route
