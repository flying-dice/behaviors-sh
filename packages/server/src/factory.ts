import type { Hono } from 'hono'
import { createFactory } from 'hono/factory'

export type AppEnv = {
  Variables: Record<string, never>
}

export const factory = createFactory<AppEnv>()

export type AppType = Hono<AppEnv>

export interface RouteModule {
  operationId: string
  register: (app: AppType) => void
}
