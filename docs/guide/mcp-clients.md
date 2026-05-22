---
title: Registering an MCP client
description: Wire behaviors-sh into Claude Code, Claude Desktop, or any agent that speaks MCP — one config snippet per client. The runtime ships as a single npm-installable CLI; you never run it directly, the client spawns it on demand.
---

# Registering an MCP client

behaviors-sh ships as a single MCP server. You register it once with your agent's MCP client; the client spawns the server on demand and routes tool calls to it.

There is no global install. `npx -y @behaviors-sh/cli mcp` does the work — the client runs that command, the server starts on stdio, twelve tools become available.

## Claude Code

Project-scoped (`./.mcp.json`, checked into the repo):

```json
{
  "mcpServers": {
    "behaviors-sh": {
      "command": "npx",
      "args": ["-y", "@behaviors-sh/cli", "mcp"]
    }
  }
}
```

User-scoped (`~/.claude.json`): same shape under `mcpServers`. Restart Claude Code. The twelve tools appear as `mcp__behaviors-sh__next_step`, `…__eval`, `…__submit`, etc.

## Claude Desktop

Edit the platform-specific config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Same `mcpServers` block as above. Restart the app.

## Any other MCP client

If the client supports stdio MCP servers, point it at the same command:

```sh
npx -y @behaviors-sh/cli mcp
```

It speaks the standard protocol — no behaviors-sh-specific handshake. The first `next_step` on every execution surfaces the protocol gate; that's the only ritual.

## Streamable HTTP

For multi-process setups or remote clients, run the server yourself and let the client connect over HTTP:

```sh
npx -y @behaviors-sh/cli mcp --http --port 3001
```

`POST /mcp` accepts the Streamable HTTP transport. Stateless — each request gets a fresh `McpServer` + transport pair; runtime state persists in the URI-addressed stores.

## Next

- [Drive over MCP](/guide/mcp) — the twelve-tool surface, the phase machine, the protocol gate.
- [URI schemes](/guide/uris) — `file://`, `memory://`, and how the runtime addresses trees and traces.
