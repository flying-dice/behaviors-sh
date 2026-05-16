import { factory, type RouteModule } from '../factory.ts'

const operationId = 'apiFallback'

const handlers = factory.createHandlers((c) => c.json({ error: 'not found' }, 404))

const route: RouteModule = {
  operationId,
  register(app) {
    app.all('/api/*', ...handlers)
  },
}

export default route
