import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function buildMcpServer(): McpServer {
  const mcp = new McpServer({ name: 'behaviors-ui', version: '0.0.0' })

  mcp.registerTool(
    'ping',
    {
      title: 'Ping',
      description: 'Health-check tool. Echoes an optional message back as "pong".',
      inputSchema: { message: z.string().optional() },
    },
    async ({ message }) => ({
      content: [{ type: 'text', text: message ? `pong: ${message}` : 'pong' }],
    }),
  )

  return mcp
}
