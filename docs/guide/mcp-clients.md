---
title: Registering an MCP client
description: Wire behaviors-sh into Claude Code, Claude Desktop, or any agent that speaks MCP — one config snippet per client. The runtime ships as a single npm-installable CLI; you never run it directly, the client spawns it on demand.
---

# Registering an MCP client

Point your agent's MCP client at `npx -y @behaviors-sh/cli mcp`. The client spawns the server on demand; twelve tools become available. No global install needed.

## Claude Code

Add an entry under `mcpServers`. Project-scoped (`./.mcp.json`, checked into the repo) or user-scoped (`~/.claude.json`) — same shape either way:

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

Restart Claude Code. The tools appear as `mcp__behaviors-sh__next_step`, `…__eval`, `…__submit`, and so on.

## Claude Desktop

Edit the platform's config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add the same `mcpServers` block as above. Restart the app.

## Any other MCP client

If the client supports stdio MCP servers, point it at the same command:

```sh
npx -y @behaviors-sh/cli mcp
```

No behaviors-sh-specific handshake — the first `next_step` on every execution surfaces the protocol gate, and that's the only ritual.

## Streamable HTTP

For multi-process setups or remote agents, run the server yourself and connect over HTTP:

```sh
npx -y @behaviors-sh/cli mcp --http --port 3001
```

`POST /mcp` accepts the Streamable HTTP transport. Stateless: each request gets a fresh `McpServer` + transport pair; runtime state lives in the URI-addressed stores, shared across requests.

## Next

- [Drive over MCP](/guide/mcp) — the twelve-tool surface, the phase machine, the protocol gate.
- [URI schemes](/guide/uris) — `file://`, `memory://`, and how the runtime addresses trees and traces.
